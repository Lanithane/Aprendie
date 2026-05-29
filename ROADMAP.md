# Conjecter — Feature Roadmap

Living roadmap for the post-MVP feature work. Build order was chosen deliberately: the
**language generalization refactor first** (it touches the most files), then the small
contained features, then the **backend-heavy epics** (RBAC + admin, server-side history,
usage-cost showback, API-key hardening, the Pokédex), and a **full Material Design 3 overhaul
last** (so it styles the final component set once). See [BLUEPRINT.md](BLUEPRINT.md) for
product/architecture context and [CLAUDE.md](CLAUDE.md) for the layer rules that govern every
change here.

## Status at a glance

| Epic | Scope                                                                         | Status                      |
| ---- | ----------------------------------------------------------------------------- | --------------------------- |
| 0    | Tab title → "Conjecter"                                                       | ✅ Done (merged)            |
| 1    | Language generalization + CEFR levels + word-breakdown data + location→locale | ✅ Done (merged + deployed) |
| 2    | Word-root-on-click UI                                                         | ✅ Done                     |
| 3    | Text-to-speech + rate slider                                                  | ⬜ Not started              |
| 4    | RBAC + admin console (roles, users CRUD, key support)                         | ✅ Done (migration on prod) |
| 5    | History → Postgres, per user account                                          | ⬜ Not started              |
| 6    | Usage-cost showback + contribute CTAs                                         | ⬜ Not started              |
| 7    | API-key security hardening                                                    | ⬜ Not started              |
| 8    | Word "Pokédex" (seen roots + variants)                                        | ⬜ Not started              |
| 9    | Full MD3 overhaul + centered "Google homepage" layout                         | ⬜ Not started (last)       |

### Decisions locked (from clarifying Q&A)

- **Languages:** fully generic any-source → any-target pairs (registry-driven).
- **Word roots:** generated **upfront** with each sentence (stored in `word_breakdown`),
  surfaced in the UI in Epic 2.
- **M3:** full overhaul, done last so it styles the final component set once.
- **Difficulty → Levels:** CEFR long names + two pre-A1 levels.
- **Prefs stay client-side** (localStorage); the unused `users.locale_preference` column was
  dropped in Epic 1's migration.
- **Epic 2 UI:** clicking a word reveals its root via a popover — there is **no** root-word
  hint chip next to the level chip (the click interaction replaces that idea).
- **RBAC (Epic 4):** dedicated `/admin` section (admin-only route + nav), **not** nested in
  Settings. The site admin is the account whose email matches `ADMIN_EMAIL`; all other and all
  new accounts are users.
- **Admin over user keys (Epic 4):** **revoke + re-validate, never view** — an admin can clear a
  user's key or re-test it against Anthropic, but plaintext is never decrypted to the admin.
- **Contribute CTAs (Epic 6):** compute showback now; the two sidebar buttons are **config-link
  CTAs** (offset-provider URL + tip/sponsor URL set via config later) — no vendor wiring this epic.
- **Pokédex counts (Epic 8):** correct/incorrect are **derived from correction
  `mistakes[].sourceText`** (a lemma is "incorrect" for an attempt when it appears in that attempt's
  mistakes, else "correct"; every appearance counts "seen"). Its sole data source is the Epic 5
  Postgres history — **Epic 8 builds only after Epic 5.**
- **Numbering:** numeric order = build order. The MD3 overhaul stays **last** (now Epic 9); the
  five new backend-heavy epics are 4–8. They are otherwise independent and reprioritizable, except
  Epic 8 → after 5 and Epic 7 → after 4.

### Open questions (unresolved — decide before the relevant epic)

- **Epic 6:** the offset-provider URL + tip/sponsor URL, and the carbon/water estimate
  factor/methodology.
- **Epic 7:** keep the master key in the `ENCRYPTION_KEY` env var vs. move it to a KMS / managed
  secret.
- **Epic 5:** whether to import each user's existing localStorage history into Postgres on their
  next login (one-time), or start fresh server-side.

---

## ✅ Epic 0 — Tab title

- [x] [index.html](index.html) `<title>` → `Conjecter`.

## ✅ Epic 1 — Language generalization + CEFR levels (the foundation)

Generalized the English↔Spanish assumption to arbitrary pairs, replaced numeric difficulty
with named CEFR levels, plumbed the upfront word-breakdown data, and added location→locale
resolution.

- [x] **[shared/languages.ts](shared/languages.ts)** — `LANGUAGES` registry, `LanguagePair`,
      `DEFAULT_PAIR`, `WordToken`, locale helpers.
- [x] **[shared/levels.ts](shared/levels.ts)** — ordered `LEVELS` ladder (starter → foundation
      → a1…c2), `levelByCode`, `DEFAULT_LEVEL`.
- [x] DB migration `0001`: `sentence_cache` renamed/added columns (`prompt_text`, `answer_text`,
      `learn_language`, `guess_language`, `word_breakdown`, `level`), reindexed; dropped
      `users.locale_preference`. Applied to **both local and Railway prod** (verified 2026-05-29).
- [x] Backend `sentence` + `correction` modules made language-agnostic; system blocks kept
      byte-static for prompt caching, variable parts moved to the user turn.
- [x] New stateless `language` module: `POST /api/language/resolve-locale`.
- [x] Frontend: `useLanguagePair`, `useLevelPreference`, `useLocaleResolver`, level chip+menu,
      `LanguagePairPicker`, DTO renames, history keying.

## ✅ Epic 2 — Word-root-on-click UI

Consumes the `wordBreakdown` produced by Epic 1 (no new backend).

- [x] **[src/components/SentenceTokens/](src/components/SentenceTokens/)** — `tokenize.ts`
      aligns `promptText` to `wordBreakdown` by surface (case-insensitive, keeps
      punctuation/whitespace inert); `SentenceTokens.tsx` renders each matched word as a clickable,
      underdotted button (Duolingo style) and owns the popover state.
- [x] **[src/components/WordPopover/WordPopover.tsx](src/components/WordPopover/WordPopover.tsx)**
      — MUI `Popover` anchored to the clicked token, showing `lemma` (root), `partOfSpeech`, and
      `gloss` (meaning in the guess language).
- [x] Wired into [PracticeCard.tsx](src/components/PracticeCard/PracticeCard.tsx) /
      [HomePage.tsx](src/pages/HomePage.tsx) (passes `wordBreakdown` through).
- [ ] _Deferred:_ reuse the tokenized renderer in
      [CorrectionDisplay.tsx](src/components/CorrectionDisplay/CorrectionDisplay.tsx) — skipped
      because `CorrectionDto` doesn't carry `wordBreakdown`; would need a backend change, out of
      Epic 2's "no new backend" scope.

## ⬜ Epic 3 — Text-to-speech + rate slider

Pure frontend (Web Speech API `SpeechSynthesis`); uses the learn-language locale for voice
selection. No backend.

- [ ] **src/hooks/useSpeech.ts** (new) — wrap `speechSynthesis` + `SpeechSynthesisUtterance`;
      pick a voice for the sentence's `locale` (fall back to base language); expose
      `speak(text, locale)`, `cancel()`, `speaking`, `supported`. Subscribe to `voiceschanged`
      (voices load async — the external-subscription case the hooks rule allows).
- [ ] **src/hooks/useSpeechRate.ts** (new) — persisted pref (`gac:speechRate`, default 1.0),
      same pattern as `useLevelPreference`.
- [ ] **PracticeCard** — speaker/play `IconButton` near the sentence + a rate `Slider`
      (~0.5–1.5×). Gracefully hide if `!supported`.

## ✅ Epic 4 — RBAC + admin console

Adds roles and an admin-only console so the site admin can manage the user list and do API-key
support. The work extends the `user` module, adds a `requireAdmin` guard, and surfaces a
dedicated `/admin` section.

**Decided:** dedicated `/admin` route (not nested in Settings); site admin = the account matching
`ADMIN_EMAIL`, everyone else (and every new account) is a user; admins may **revoke + re-validate**
a user's key but **never view** plaintext.

- [x] **DB migration `0002`** ([drizzle/0002_rbac_roles.sql](drizzle/0002_rbac_roles.sql)) — add
      `users.role` (`text not null default 'user'`, typed `$type<'admin' | 'user'>()` to match the
      loose-typed `level` column; avoids pg-enum alter friction). Applied to **Railway prod**
      (verified 2026-05-29: column present, 3 existing rows defaulted to `user`). _Local skipped —
      no local Postgres running; `.env` points at prod._
- [x] **[server/env.ts](server/env.ts)** — added `ADMIN_EMAIL` (zod email, optional).
- [x] **[findOrCreateGoogleUser.ts](server/modules/user/application/findOrCreateGoogleUser.ts)** —
      defaults new users to `'user'`; promotes to `'admin'` when `email === env.ADMIN_EMAIL`
      (case-insensitive; promotes the existing admin row on next login; manual `UPDATE` as fallback).
- [x] **[server/infrastructure/http/requireAdmin.ts](server/infrastructure/http/requireAdmin.ts)**
      (new) — 403 unless `req.user.role === 'admin'`; composes after
      [requireAuth.ts](server/infrastructure/http/requireAuth.ts).
- [x] **[User.ts](server/modules/user/domain/User.ts)** — added `role` to `UserView`; added
      `AdminUserView` (id, email, name, role, hasApiKey, createdAt; `totalCostUsd` once Epic 6 lands).
      Never exposes `encryptedAnthropicKey`.
- [x] **[userRepository.ts](server/modules/user/persistence/userRepository.ts)** — `listAll()`,
      `updateRole(id, role)`, `countAdmins()`; reuses `updateEncryptedApiKey(id, null)` for revoke.
- [x] **user application** ([adminUsers.ts](server/modules/user/application/adminUsers.ts)) —
      `listUsers`, `setUserRole` (guards against demoting the last admin), `adminRevokeUserKey`,
      `adminRevalidateUserKey` (decrypt server-side → ping Anthropic → return ok/fail, **never the
      key**). Re-validate reuses `validateApiKey`, extracted from
      [saveApiKey.ts](server/modules/apiKey/application/saveApiKey.ts) into
      [validateApiKey.ts](server/modules/apiKey/application/validateApiKey.ts) (cross-module
      application→application).
- [x] **[adminUserController.ts](server/modules/user/controllers/adminUserController.ts)** (new) —
      mounted `/api/admin/users` in [server/index.ts](server/index.ts), guarded `requireAuth` +
      `requireAdmin`: `GET /`, `PATCH /:id/role`, `DELETE /:id/key`, `POST /:id/key/revalidate`.
- [x] **Frontend** — `CurrentUserDto` gained `role` in [userApi.ts](src/api/userApi.ts); new
      [adminApi.ts](src/api/adminApi.ts); `isAdmin` from [AuthContext.tsx](src/auth/AuthContext.tsx);
      `RequireAdmin` guard + `/admin` route in [routes.tsx](src/routes.tsx); admin-only nav item in
      [Sidebar.tsx](src/components/Sidebar/Sidebar.tsx); [AdminPage.tsx](src/pages/AdminPage.tsx)
      (thin) + [UsersTable.tsx](src/components/Admin/UsersTable.tsx) +
      [useAdminUsers.ts](src/hooks/useAdminUsers.ts).

_To activate your admin account:_ set `ADMIN_EMAIL` (local `.env` + Railway service var) and sign in
again, or run `UPDATE users SET role='admin' WHERE email='…'` once.

## ⬜ Epic 5 — History → Postgres (per user account)

Moves history off `localStorage` into a per-user `attempts` table. The table is denormalized (a
full snapshot per attempt) so history survives `sentence_cache` pruning — and it becomes the
**single aggregation source for the Epic 8 Pokédex.**

- [ ] **DB migration `0003`** — new `attempts`: id, `userId` FK→users (cascade), nullable
      `sentenceId`, plus a denormalized snapshot mirroring the current
      [HistoryEntry](src/history/index.ts): promptText, answerText, learn/guessLanguage, locale, level,
      userAnswer, correctedAnswer, score, isCorrect, `mistakes` (json), notes, `wordBreakdown` (json —
      kept for Epic 8 + the deferred tokenized correction view), createdAt. Indexes
      `(userId, createdAt desc)` and `(userId, learnLanguage, guessLanguage, locale)`. Apply to
      **local + Railway prod**.
- [ ] **New `modules/history/`** (full DDD) — domain `Attempt.ts` (`AttemptView`, reusing the
      correction `Mistake` shape); persistence `historyRepository.ts` (`insert`,
      `listForUser(userId, pair?, limit, cursor)`, `getById`); application `recordAttempt`,
      `listHistory`, `getHistoryEntry`; controllers `/api/history` (`GET /` paginated + optional pair
      filter, `GET /:id`), requireAuth.
- [ ] **Wire recording** —
      [correctTranslation.ts](server/modules/correction/application/correctTranslation.ts) already
      loads the sentence (with `wordBreakdown`) and produces the result; after grading it calls
      `history.recordAttempt(...)` (cross-module correction→history application).
- [ ] **Frontend** — new `src/api/historyApi.ts`; rewrite [useHistory.ts](src/hooks/useHistory.ts)
      to read from the server (same hook shape so [HistoryPage.tsx](src/pages/HistoryPage.tsx) barely
      changes); drop the client write path (remove `appendHistory` + gut
      [src/history/index.ts](src/history/index.ts); remove its call, likely in `useCorrectionSubmission`).
- [ ] _Optional:_ one-time import of a user's existing localStorage history into Postgres on next
      login. _Optional:_ admin view of a user's history via `/api/admin/users/:id/history` reusing
      `listForUser`.

## ⬜ Epic 6 — Usage-cost showback + contribute CTAs

Captures Claude token usage per user (a showback table keyed by `userId`), surfaces each account's
cost, and adds two sidebar "contribute" options sized by that cost. Showback is **informational** —
users run on their own key (per BLUEPRINT), so this is visibility, not billing.

**Decided:** showback math now; the two sidebar buttons are **config-link CTAs** (URLs set later).

- [ ] **Capture usage** — both call sites currently discard `resp.usage`:
      [scoreTranslation.ts](server/modules/correction/application/scoreTranslation.ts) and
      [generateSentenceBatch.ts](server/modules/sentence/application/generateSentenceBatch.ts). Return
      `usage` from both up to their application callers.
- [ ] **DB migration `0004`** — new `usage_events` (the showback table): id, `userId` FK→users
      (cascade), `operation` (`'correction' | 'sentence_batch'`), model, inputTokens, outputTokens,
      cacheCreationInputTokens, cacheReadInputTokens, `costUsd numeric(12,6)` (snapshot — prices drift),
      createdAt. Index `(userId, createdAt)`. Apply to **local + Railway prod**.
- [ ] **server/infrastructure/claude/pricing.ts** (new) — per-model USD rates + `costUsd(model, usage)`.
- [ ] **New `modules/usage/`** (full DDD) — persistence `usageRepository.ts` (insert + sum
      aggregations); application `recordUsage` (computes `costUsd`, inserts), `getUserShowback(userId)`
      (total + by-operation + token totals + carbon/water estimate), `getShowbackForAllUsers()` (admin);
      controllers `/api/usage` (`GET /me`). Admin per-user totals fold into Epic 4's `AdminUserView`
      (`totalCostUsd`).
- [ ] **Wire** — `correctTranslation` → `recordUsage(op:'correction')`; the sentence-batch trigger
      → `recordUsage(op:'sentence_batch')` (cross-module application→usage application).
- [ ] **server/infrastructure/claude/sustainability.ts** (new) — configurable Wh/token → CO₂ g +
      water mL factors; **clearly labeled an estimate.**
- [ ] **Frontend** — new `src/api/usageApi.ts` + `src/hooks/useShowback.ts`; a new
      `src/components/Sidebar/ContributeSection.tsx` in the
      [Sidebar.tsx](src/components/Sidebar/Sidebar.tsx) BottomRail with two items — **Offset
      carbon/water** and **Support the developer** — each showing the estimate and linking to a config
      URL (`VITE_OFFSET_URL` / `VITE_SUPPORT_URL`; hide if unset).
- [ ] _Open:_ the two CTA URLs + the carbon/water factor methodology.

## ⬜ Epic 7 — API-key security hardening ("super doubly secure")

Hardens the already-solid AES-256-GCM scheme in
[encryption.ts](server/infrastructure/crypto/encryption.ts) into a layered, rotatable one.
**Sequenced after Epic 4** so it also covers the new admin key-access path.

- [ ] **AAD-bind to userId** — pass `user.id` as GCM additional authenticated data in
      encrypt/decrypt so a ciphertext can't be transplanted between rows. Callers:
      [saveApiKey.ts](server/modules/apiKey/application/saveApiKey.ts),
      [anthropicClientForUser.ts](server/modules/apiKey/application/anthropicClientForUser.ts).
- [ ] **HKDF per-record subkey** — derive a per-user subkey `HKDF(master, salt=userId)` so the
      master key is never used to encrypt directly (the "doubly" layer).
- [ ] **Key versioning / rotation** — prefix the blob with a keyId (`v2$…`); accept current +
      previous master (`ENCRYPTION_KEY` + `ENCRYPTION_KEY_PREVIOUS` in [server/env.ts](server/env.ts));
      decrypt tries both; re-encrypt-on-read upgrades old blobs. This is also the **migration path** for
      adding AAD/HKDF without downtime.
- [ ] **Scrub plaintext** — never attach the decrypted key to `req`; build the client and drop the
      reference; prefer Buffers (note: JS strings can't be zeroed — document the limit).
- [ ] **Leak/redaction test** — assert the key never appears in logs/errors/JSON; confirm `UserView`
  - all `users` responses omit `encryptedAnthropicKey`;
    [errorHandler](server/infrastructure/http/errorHandler.ts) never echoes it.
- [ ] **Admin boundary test** — admin paths only revoke / re-validate (decrypt→ping→discard), never
      return plaintext (enforces Epic 4's decision).
- [ ] _Consider:_ master key in a KMS / managed secret vs. env; ciphertext in a dedicated table;
      rate-limit key endpoints + a small `key_audit` log of admin key ops (recommended now that admins
      touch keys).

## ⬜ Epic 8 — Word "Pokédex"

A per-user "seen root words" page with correct/incorrect counts; drilling into a root reveals its
variants with their own seen counts.

**Hard dependency (user-confirmed): build only after Epic 5.** The Pokédex's sole data source is
the **Postgres-persisted history** (`attempts`) from Epic 5 — its `wordBreakdown` and `mistakes`.
It never reads localStorage or any client source; both live aggregation and backfill read that
table.

**Decided:** correct/incorrect derive from `mistakes[].sourceText` — a lemma is "incorrect" for an
attempt when it appears in that attempt's mistakes, else "correct"; every appearance counts "seen".

- [ ] **DB migration `0005`** — two grains, both per user + learnLanguage. `lexeme_stats` (root):
      id, userId FK, learnLanguage, lemma, partOfSpeech, seenCount, correctCount, incorrectCount,
      firstSeenAt, lastSeenAt, unique `(userId, learnLanguage, lemma)`. `lexeme_variant_stats`
      (variant): id, userId FK, learnLanguage, lemma, surface, seenCount, lastSeenAt, unique
      `(userId, learnLanguage, lemma, surface)`. Apply to **local + Railway prod**.
- [ ] **New `modules/pokedex/`** (full DDD) — application
      `recordSeenWords(userId, learnLanguage, wordBreakdown, mistakes)` called from Epic 5's
      `recordAttempt` (cross-module history→pokedex): per `WordToken`, upsert root + variant seenCount;
      a lemma/surface appearing (case-insensitive, word-boundary) in any `mistakes[].sourceText` →
      incorrectCount, else correctCount (reuse the surface-matching idea from
      [tokenize.ts](src/components/SentenceTokens/tokenize.ts); document the heuristic). Persistence
      `pokedexRepository.ts` (upsertLexeme / upsertVariant / listLexemes(sort) / getLexemeWithVariants);
      read application `listPokedex`, `getRootDetail`; controllers `/api/pokedex` (`GET /` by
      learnLanguage + sortable, `GET /:lemma`), requireAuth.
- [ ] **Backfill** existing `attempts` (one-off script) to seed the Pokédex from prior history.
- [ ] **Frontend** — new `src/api/pokedexApi.ts`; `src/hooks/usePokedex.ts` +
      `src/hooks/usePokedexEntry.ts`; `src/pages/PokedexPage.tsx` (thin) + `src/components/Pokedex/`
      (RootList, RootCard, VariantList) reusing `components/shared/`; `/pokedex` route + Sidebar nav
      item.

## ⬜ Epic 9 — Full MD3 overhaul + centered layout (last)

Done last so it styles the final component set (including Epics 2–8 UI) once. The "Google
homepage" centering folds in here.

- [ ] **[src/theme.ts](src/theme.ts)** — expand into an MD3 token set: color roles
      (primary/secondary/tertiary, surface tones, outline, on-\* pairs) for light + dark, MD3 type
      scale, shape (corner radii), state-layer/elevation. Keep the light/dark/system mechanism in
      [ThemeModeProvider.tsx](src/ThemeModeProvider.tsx).
- [ ] **Centered home** — in [AppShell.tsx](src/components/AppShell/AppShell.tsx) /
      [HomePage.tsx](src/pages/HomePage.tsx), wrap content in a centered max-width container and
      vertically center the practice card.
- [ ] **Restyle screens** to MD3 — Sidebar (nav rail/drawer + mobile drawer), PracticeCard,
      CorrectionDisplay, SettingsPage, WordPopover/LanguagePairPicker, and `components/shared/`.
      Keep the `@emotion/styled` template-literal convention; route colors/shape through the new
      theme tokens (no hardcoded hex).

---

## Verification

Per epic, run `npm run typecheck` (both tsconfigs) + `npm run lint`, then:

- **Epic 2** — click words; confirm the popover shows root/meaning/POS in the guess language;
  punctuation isn't clickable.
- **Epic 3** — play a sentence; confirm correct-language voice and that the rate slider changes
  speed and persists across reload.
- **Epic 4** — visually QA every screen in light/dark/system and at mobile width (drawer);
  confirm centered home; grep for stray hardcoded colors.

Use the `/verify` skill for end-to-end confirmation and `/code-review` before declaring an epic
done. Each epic is a natural PR/commit boundary.
