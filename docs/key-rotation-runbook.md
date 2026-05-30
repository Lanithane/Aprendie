# API-key encryption — key rotation runbook

Operational runbook for the at-rest encryption that protects user-supplied
Anthropic API keys (Epic 7). For the product/architecture context see
[BLUEPRINT.md](../BLUEPRINT.md); for the checklist see [ROADMAP.md](../ROADMAP.md).
Implementation: [server/infrastructure/crypto/encryption.ts](../server/infrastructure/crypto/encryption.ts).

## How the scheme works

User keys live in `api_keys.encrypted_key` as a `$`-delimited, all-base64
**envelope**. Two formats are read; writes are always v2:

```
v1 (legacy):   iv$ciphertext$authTag              # master key used directly, no binding
v2 (current):  v2$keyId$iv$ciphertext$authTag     # per-record subkey + AAD, both bound to userId
```

- **keyId** — a short fingerprint of the master key that wrote the row
  (`base64url(sha256(key)[:6])`). It tells decrypt which configured key to try
  first, and tells `isCurrentEncoding()` whether a row was written under the
  *current* key.
- Each record is encrypted with a **per-user subkey** derived via HKDF-SHA256
  from the master key (`salt = userId`, `info = "gac/apiKey/v2"`), so the master
  key never encrypts directly.
- AES-256-GCM, with the **userId also bound in as AAD** — a second, independent
  binding. A ciphertext copied onto another user's row decrypts under a
  different subkey *and* fails the GCM tag.

### Env vars (see [server/env.ts](../server/env.ts))

| Var | Meaning |
| --- | --- |
| `ENCRYPTION_KEY` | The **current** master key — base64 of 32 bytes. Used for all writes and re-wraps. Required. |
| `ENCRYPTION_KEY_PREVIOUS` | Optional **previous** master key (base64 of 32 bytes). Set only during a rotation so rows still wrapped under the old key stay readable. Remove once all rows have rotated forward. |

On boot each key must base64-decode to exactly 32 bytes or the process throws.

### Lazy re-encryption (how rows migrate to a new key)

`anthropicClientForUser` decrypts the stored blob, and **if it isn't the current
encoding (`isCurrentEncoding` → false: a legacy v1 blob, or a v2 blob whose
keyId ≠ the current key's), it re-encrypts the row with the current key on
read.** So rows migrate forward naturally as their owners make requests.

> ⚠️ **Migration is read-driven only.** A row is re-wrapped the next time that
> user's key is *read* (i.e. they make a correction request). Dormant users'
> rows stay on the old key indefinitely; there is no forced-backfill job today.
> **Do not unset `ENCRYPTION_KEY_PREVIOUS` until every live row has migrated**
> (see "Retiring the previous key"). Leaving it set is cheap and safe.

## Generate a new key

A key is 32 random bytes, base64-encoded:

```sh
openssl rand -base64 32
```

Generate it on a trusted machine. Never commit a real key; never paste a
production key into chat, a PR, or a log.

## Routine rotation

1. Generate the new key (above).
2. In the deploy environment, set `ENCRYPTION_KEY_PREVIOUS` to the **current**
   `ENCRYPTION_KEY` value, then set `ENCRYPTION_KEY` to the **new** key.
3. Deploy. From now on, writes and re-reads wrap with the new key; rows under the
   old key still decrypt (via `ENCRYPTION_KEY_PREVIOUS`) and lazily re-wrap to
   the new key as their owners are active.
4. Leave `ENCRYPTION_KEY_PREVIOUS` set until all rows have migrated, then retire
   it (below).

## First production rotation — off the bootstrap value

The production deploy was bootstrapped with an initial `ENCRYPTION_KEY`. To
rotate it off that value, run the routine rotation against **Railway** (project
`guess-and-correct-production`):

1. `openssl rand -base64 32` → the new key.
2. Set `ENCRYPTION_KEY_PREVIOUS` = the current prod `ENCRYPTION_KEY`; set
   `ENCRYPTION_KEY` = the new key.
3. Redeploy. Verify a user can still load and use their saved key — this both
   confirms decryption under the previous key and triggers the lazy re-wrap to
   the new key.
4. Plan to retire the previous key later (next section).

> The original bootstrap key should be treated as compromised-by-convention (it
> was the first value, possibly seen in setup notes). Retiring it is the goal of
> this rotation — but it must stay in `ENCRYPTION_KEY_PREVIOUS` until rows
> migrate.

## Retiring the previous key

You may unset `ENCRYPTION_KEY_PREVIOUS` only once **no live row is still wrapped
under it**. A row is still on an old key if it's a legacy v1 blob (no `v2$`
prefix) or a v2 blob whose `keyId` isn't the current key's. Until a
forced-backfill job exists, the safe options are:

- **Confirm via the DB.** Count rows not yet on the current encoding. Legacy
  rows are easy:

  ```sql
  -- rows still in the legacy v1 format (no version prefix)
  SELECT count(*) FROM api_keys WHERE encrypted_key NOT LIKE 'v2$%';

  -- rows under any v2 key other than <currentKeyId>
  SELECT count(*) FROM api_keys
  WHERE encrypted_key LIKE 'v2$%' AND encrypted_key NOT LIKE 'v2$<currentKeyId>$%';
  ```

  `<currentKeyId>` is the fingerprint of the current `ENCRYPTION_KEY`:
  `node -e "const c=require('crypto');console.log(c.createHash('sha256').update(Buffer.from(process.env.ENCRYPTION_KEY,'base64')).digest().subarray(0,6).toString('base64url'))"`.
  When both counts are `0`, it's safe to unset `ENCRYPTION_KEY_PREVIOUS`.

- **Force migration** with a one-off script that calls `anthropicClientForUser`
  (or `getApiKeyRecord` + re-wrap) for every `userId` in `api_keys`, then
  re-check the counts. _(No such script is committed yet — write one if/when
  retirement is needed.)_

After the counts are zero: unset `ENCRYPTION_KEY_PREVIOUS`, redeploy, and
securely destroy the retired key material.

## Disaster note

The master key(s) are the only thing that can decrypt stored user keys. If both
`ENCRYPTION_KEY` and `ENCRYPTION_KEY_PREVIOUS` are lost, every stored key is
unrecoverable (users simply re-enter theirs). Back up the production values in
your secrets manager, separate from the database.
