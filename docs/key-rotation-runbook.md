# API-key encryption — key rotation runbook

Operational runbook for the at-rest encryption that protects user-supplied
Anthropic API keys (Epic 7). For the product/architecture context see
[BLUEPRINT.md](../BLUEPRINT.md); for the checklist see [ROADMAP.md](../ROADMAP.md).
Implementation: [server/infrastructure/crypto/encryption.ts](../server/infrastructure/crypto/encryption.ts).

## Two different "keys" — don't confuse them

| Thing                                       | What it is                                                                         | Where it lives                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Master key** (`ENCRYPTION_KEY`)           | The AES-256 key the _server_ uses to encrypt/decrypt stored Anthropic keys at rest | `.env` / Railway env var                             |
| **A user's Anthropic API key** (`sk-ant-…`) | The key copied from the Anthropic dashboard, encrypted and stored per user         | Postgres `users.encrypted_anthropic_key` (encrypted) |

"Rotating the master key" means replacing `ENCRYPTION_KEY` — _not_ the user's
`sk-ant-…`.

## How the scheme works

User keys live in `users.encrypted_anthropic_key` as a `$`-delimited, all-base64
**envelope**:

```
v3$iv$ciphertext$authTag
```

- AES-256-GCM, with the owning **userId bound in two independent ways**:
  - **HKDF per-user subkey** — the AES key is `HKDF(ENCRYPTION_KEY, salt=userId,
info="gac/apiKey")`, so the master key never encrypts directly and each
    row's key is user-bound.
  - **AAD** — the userId is also fed as GCM additional authenticated data.
- A ciphertext copied onto another user's row decrypts under a different subkey
  _and_ fails the GCM tag — transplant is cryptographically blocked.

There is **a single master key and no legacy/previous-key read path**. A blob
written under one `ENCRYPTION_KEY` is only readable under that exact key; change
the key and old blobs become undecryptable garbage (by design — see rotation
below).

### Env var (see [server/env.ts](../server/env.ts))

| Var              | Meaning                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `ENCRYPTION_KEY` | The master key — base64 of 32 bytes. Required; the server exits on boot if it's missing or not 32 bytes. |

## Rotating the master key (wipe-and-re-enter)

There is intentionally **no zero-downtime, backwards-compatible rotation**. With
no real users yet, rotation is simply: swap the key, discard the now-unreadable
stored keys, and have users re-paste theirs. The only user-visible effect is a
prompt to re-enter their Anthropic key.

### Generate a new key

```sh
openssl rand -base64 32
```

Generate it on a trusted machine. Never commit a real key; never paste a
production key into chat, a PR, or a log.

### Local

1. `openssl rand -base64 32` → new key.
2. Replace `ENCRYPTION_KEY=` in `.env`.
3. Null the now-unreadable stored keys:
   ```sql
   UPDATE users SET encrypted_anthropic_key = NULL;
   ```
4. Restart the server, log in, re-paste your `sk-ant-…` from the Anthropic
   dashboard.

### Production (Railway — project `guess-and-correct-production`)

1. `openssl rand -base64 32` → new key.
2. Set `ENCRYPTION_KEY` to the new value in the Railway service env vars.
3. Run the wipe against the prod database:
   ```sql
   UPDATE users SET encrypted_anthropic_key = NULL;
   ```
4. Redeploy (or let the env-var change trigger a restart). Each affected user
   re-enters their key on next use.

> ⚠️ **Order matters only loosely, but the wipe is mandatory.** If you change
> `ENCRYPTION_KEY` without nulling the column, every stored blob fails to decrypt
> and those users hit errors until they re-enter their key. Running the
> `UPDATE … SET NULL` makes that an explicit "please re-enter" instead.

### Tooling notes (DB targeting + migrations)

- **Two DB URLs, selected by `NODE_ENV`** (see [server/env.ts](../server/env.ts) and
  `.env`): `DATABASE_URL_LOCAL` is used in dev/test, `DATABASE_URL` in production
  (also the var Railway injects). So you no longer comment/uncomment a URL to
  switch targets — set `NODE_ENV=production` to point local tooling at prod.
- **Running the wipe against prod from your machine:** the simplest path is the
  raw `UPDATE` above via `psql "$DATABASE_URL"`. (Migration `0007` already
  performed the one-time wipe for the single-key cutover; a _future_ rotation is
  not a migration, so use the manual `UPDATE`.)
- **Deploys run migrations automatically:** Railway's start command is
  `npm run db:migrate:deploy && npm start` ([railway.json](../railway.json)), so
  schema/data migrations apply on each deploy. To run migrations manually:
  `npm run db:migrate` (local) or `npm run db:migrate:prod` (prod, from local).

### First production rotation — off the bootstrap value

The prod deploy was bootstrapped with an initial `ENCRYPTION_KEY`. Treat that
value as compromised-by-convention (first value, possibly in setup notes) and
rotate it off using the **Production** steps above. This is the one outstanding
Epic 7 ops task.

## Disaster note

`ENCRYPTION_KEY` is the only thing that can decrypt stored user keys. If it's
lost, every stored key is unrecoverable — but recovery is trivial here: null the
column and users re-enter theirs. Back up the production value in your secrets
manager anyway to avoid forcing an unnecessary mass re-entry.
