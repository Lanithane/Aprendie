# Guess and Correct — Feature Roadmap

Living roadmap for the post-MVP feature work. Build order was chosen deliberately: the
**language generalization refactor first** (it touches the most files), then the small
contained features, then the **backend-heavy epics** (RBAC + admin, server-side history,
usage-cost showback, API-key hardening, the Pokédex). See [BLUEPRINT.md](BLUEPRINT.md) for
product/architecture context and [CLAUDE.md](CLAUDE.md) for the layer rules that govern every
change here.

**Reprioritized (2026-05-29):** an **accessibility pass** (Epic A, done) lands first, then the
**MD3 overhaul (Epic 9) moves next** — we'd rather settle the final visual language before
building the remaining feature UI (TTS, showback, Pokédex), so those screens are styled in MD3
from the start instead of being restyled afterward. The backend-heavy epics (3, 6, 7, 8) follow.
Epic numbers are stable identifiers, not build order — see the status table.

## Status at a glance

Epics are listed by number (a stable identifier); see the intro for the current build order.

| Epic | Scope                                                                         | Status                              |
| ---- | ----------------------------------------------------------------------------- | ----------------------------------- |
| 0    | Tab title → "Guess and Correct"                                               | ✅ Done (merged)                    |
| 1    | Language generalization + CEFR levels + word-breakdown data + location→locale | ✅ Done (merged + deployed)         |
| 2    | Word-root-on-click UI                                                         | ✅ Done                             |
| A    | Accessibility pass (focus flow, skip link, labels)                            | ✅ Done                             |
| 3    | Text-to-speech + rate slider                                                  | ⬜ Not started                      |
| 4    | RBAC + admin console (roles, users CRUD, key support)                         | ✅ Done (migration on prod)         |
| 5    | History → Postgres, per user account                                          | ✅ Done (local migrated)            |
| 6    | Usage-cost showback + contribute CTAs                                         | ⬜ Not started                      |
| 7    | API-key security hardening                                                    | ✅ Done (AAD+HKDF+vitest)           |
| 8    | Word "Pokédex" (seen roots + variants)                                        | ⬜ Not started                      |
| 9    | Full MD3 overhaul + centered "Google homepage" layout                         | ✅ Done (merged to main + deployed) |
| 10   | Built-in translator (known → learning+locale, + usage note)                   | ⬜ Not started                      |

### Decisions locked (from clarifying Q&A)

- **Languages:** fully generic any-source → any-target pairs (registry-driven).
- **Word roots:** generated **upfront** with each sentence (stored in `word_breakdown`),
  surfaced in the UI in Epic 2.
- **M3:** full overhaul. ~~Done last so it styles the final component set once.~~ **Reprioritized
  2026-05-29 to run next** (after the accessibility pass) so the remaining feature UI (Epics 3, 6, 8)
  is built directly in MD3 rather than restyled afterward.
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
- **Translator (Epic 10):** runs on **Claude Haiku via the user's own key** — free third-party
  translation APIs (LibreTranslate, MyMemory, DeepL Free) were rejected: they translate at the
  language level only (no `es-MX`/`es-ES`/`es-AR` dialect control), return a bare string, and add a
  new external dependency, all while Claude already costs the operator nothing (user-supplied key).
  Output is the **translation + one optional usage note** (no per-word `WordToken` breakdown).
  **Stateless** (no persistence/history) — mirrors the existing `language` module. Direction is fixed
  known→learning (`guessLanguage` → `learnLanguage` + `locale`); the active pair comes from
  `useLanguagePair` (changed in Settings).

### Open questions (unresolved — decide before the relevant epic)

- **Epic 6:** the offset-provider URL + tip/sponsor URL, and the carbon/water estimate
  factor/methodology.
- **Epic 7:** ~~keep the master key in the `ENCRYPTION_KEY` env var vs. move it to a KMS / managed
  secret.~~ — **resolved: stay on the `ENCRYPTION_KEY` env var (a Railway-managed secret) for now.**
  Railway env vars are treated as sufficiently secret for the current threat model (single
  deployment, pre-scale, no real users yet). Revisit a KMS if the blast radius grows. To rotate the
  master key, null out stored keys and have users re-enter them (no real users yet, so this is cheap)
  — see [docs/key-rotation-runbook.md](docs/key-rotation-runbook.md).
- **Epic 5:** ~~import existing localStorage history vs. start fresh~~ — **resolved: start fresh
  server-side, no one-time import.** _(Epic 5 shipped: cursor pagination, denormalized `attempts`.)_

---

## ✅ Epic 0 — Tab title

- [x] [index.html](index.html) `<title>` → `Guess and Correct`.

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

## ✅ Epic A — Accessibility pass

A focused a11y sweep done **before the MD3 overhaul** so the new design system inherits good
keyboard/screen-reader behavior rather than bolting it on after. Pure frontend, no backend.

- [x] **src/hooks/useAutoFocus.ts** (new) — `useAutoFocus<T>(key?)` focuses a ref'd element on
      mount and whenever `key` changes; keeps the "focus a DOM node on prop change" effect in a hook
      per the [CLAUDE.md](CLAUDE.md) useEffect rules.
- [x] **Keyboard flow sentence→sentence** —
      [CorrectionDisplay.tsx](src/components/CorrectionDisplay/CorrectionDisplay.tsx) lands focus on
      the **Next →** button when a result renders, so `Enter` to submit flows straight into `Enter`
      to advance. [PracticeCard.tsx](src/components/PracticeCard/PracticeCard.tsx) refactored onto
      `useAutoFocus` (refocuses the answer field on each new sentence; replaces its inline effect).
- [x] **Skip-to-content link** — [AppShell.tsx](src/components/AppShell/AppShell.tsx) adds a
      hidden-until-focused skip link jumping past the nav to `<main id="main-content" tabIndex={-1}>`.
- [x] **Labeled status indicators** — `aria-label` on the score
      [LinearProgress](src/components/CorrectionDisplay/CorrectionDisplay.tsx) and the
      [LoadingSpinner](src/components/shared/LoadingSpinner.tsx) `CircularProgress`.
- _Already in place (kept):_ `aria-live='polite'` on the correction card; `aria-label`s on every
  sidebar/appbar icon button; `:focus-visible` outlines + per-token `aria-label`s in
  [SentenceTokens.tsx](src/components/SentenceTokens/SentenceTokens.tsx); `lang` attributes on
  learn/guess-language text.

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

## ✅ Epic 5 — History → Postgres (per user account)

Moves history off `localStorage` into a per-user `attempts` table. The table is denormalized (a
full snapshot per attempt) so history survives `sentence_cache` pruning — and it becomes the
**single aggregation source for the Epic 8 Pokédex.**

- [x] **DB migration `0003`** ([drizzle/0003_attempts_history.sql](drizzle/0003_attempts_history.sql))
      — new `attempts`: id, `userId` FK→users (cascade), nullable `sentenceId` (soft ref, no FK, so
      pruning the source sentence doesn't orphan the row), plus a denormalized snapshot: promptText,
      answerText, learn/guessLanguage, locale, level, userAnswer, correctedAnswer, score, isCorrect,
      `mistakes` (json), notes, `wordBreakdown` (json — kept for Epic 8 + the deferred tokenized
      correction view), createdAt. Indexes `(userId, createdAt desc)` and
      `(userId, learnLanguage, guessLanguage, locale)`. **Applied to local** (dev `.env` now points at
      local Postgres, not prod). _Railway prod: apply with `npm run db:migrate` against the prod URL._
- [x] **New `modules/history/`** (full DDD) —
      [domain/Attempt.ts](server/modules/history/domain/Attempt.ts) (`AttemptView` + `toAttemptView`,
      local `AttemptMistake` mirroring the correction `Mistake` shape);
      [persistence/historyRepository.ts](server/modules/history/persistence/historyRepository.ts)
      (`insert`, `listForUser(userId, {pair?, limit, cursor})` keyset-paginated, `getByIdForUser`);
      application [recordAttempt.ts](server/modules/history/application/recordAttempt.ts) +
      [listHistory.ts](server/modules/history/application/listHistory.ts) (`listHistory` with opaque
      base64 `createdAt|id` cursor, `getHistoryEntry`);
      [controllers/historyController.ts](server/modules/history/controllers/historyController.ts)
      (`GET /` paginated + all-or-nothing pair filter, `GET /:id`), requireAuth.
- [x] **Wire recording** —
      [correctTranslation.ts](server/modules/correction/application/correctTranslation.ts) calls
      `recordAttempt(...)` after grading, passing the sentence's `wordBreakdown`
      (cross-module correction→history application).
- [x] **Frontend** — new [src/api/historyApi.ts](src/api/historyApi.ts);
      [useHistory.ts](src/hooks/useHistory.ts) rewritten to read from the server with
      `loadMore`/`hasMore` cursor pagination; [HistoryPage.tsx](src/pages/HistoryPage.tsx) reads the
      server hook (+ "Load more" button); client write path removed (`src/history/index.ts` deleted,
      `appendHistory` call dropped from [HomePage.tsx](src/pages/HomePage.tsx),
      [CorrectionDisplay.tsx](src/components/CorrectionDisplay/CorrectionDisplay.tsx) now imports its
      mistake type from `correctionApi`). **History starts fresh server-side — no localStorage import.**
- [ ] _Optional (deferred):_ admin view of a user's history via `/api/admin/users/:id/history`
      reusing `listForUser`.

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

## ✅ Epic 7 — API-key security hardening ("super doubly secure")

Hardened the AES-256-GCM scheme in
[encryption.ts](server/infrastructure/crypto/encryption.ts) into a layered, rotatable one.
**Sequenced after Epic 4** so it also covers the admin key-access path. Vitest was added as the test
runner in this epic (`npm test`).

- [x] **AAD-bind to userId** — `user.id` is passed as GCM additional authenticated data in
      encrypt/decrypt so a ciphertext can't be transplanted between rows. Callers:
      [saveApiKey.ts](server/modules/apiKey/application/saveApiKey.ts),
      [anthropicClientForUser.ts](server/modules/apiKey/application/anthropicClientForUser.ts),
      [adminUsers.ts](server/modules/user/application/adminUsers.ts).
- [x] **HKDF per-record subkey** — the AES key is `HKDF(master, salt=userId, info='gac/apiKey')`,
      so the master key never encrypts directly (the "doubly" layer) and the subkey is itself
      user-bound.
- [x] **Versioned blob format** — blobs are `v3$iv$ct$tag` under a single `ENCRYPTION_KEY`
      ([server/env.ts](server/env.ts)). There is no multi-key read path or in-place migration: with
      no real users yet, master-key rotation is a wipe-and-re-enter (null the stored keys, users
      re-paste from the Anthropic dashboard). Operational steps live in the
      [key-rotation runbook](docs/key-rotation-runbook.md).
- [x] **Scrub plaintext** — the decrypted key is never attached to `req`/`user`; it lives only as a
      local in `anthropicClientForUser`, is handed to the SDK, and drops on return. (JS strings can't
      be zeroed — documented in the file.)
- [x] **Leak/redaction test** — `toUserView`/`toAdminUserView` omit `encryptedAnthropicKey`;
      [errorHandler](server/infrastructure/http/errorHandler.ts) returns a generic 500 and never
      echoes the error. ([User.test.ts](server/modules/user/domain/User.test.ts),
      [errorHandler.test.ts](server/infrastructure/http/errorHandler.test.ts))
- [x] **Admin boundary test** — admin paths only revoke / re-validate (decrypt→ping→discard), never
      return plaintext, enforcing Epic 4's decision.
      ([adminUsers.test.ts](server/modules/user/application/adminUsers.test.ts))
- [ ] _Deferred (consider):_ master key in a KMS / managed secret vs. env (**decided: stay on env —
      see Open questions**); ciphertext in a dedicated table; rate-limit key endpoints + a small
      `key_audit` log of admin key ops.

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

## ✅ Epic 9 — Full MD3 overhaul + centered layout (merged to main + deployed)

Styles the final component set (including Epics 2–8 UI) once. The "Google homepage" centering
folds in here. **MD3 is now the binding design standard** — see the
[Material Design 3 section in CLAUDE.md](CLAUDE.md) for the rules every future screen must follow.

- [x] **MD3 token system** — palettes generated at **build time** from seeds
      (primary teal `#00696E`, secondary Payne's grey `#536878`, tertiary amber-yellow) via
      [scripts/gen-md3-tokens.ts](scripts/gen-md3-tokens.ts) (`npm run gen:tokens`,
      `@material/material-color-utilities` as **devDependency only** — zero runtime dep) into the
      committed [src/theme/tokens.ts](src/theme/tokens.ts) (light+dark schemes, full surface-container
      ladder). [src/theme/index.ts](src/theme/index.ts) maps roles → MUI palette, adds the MD3 type
      scale, shape, and component overrides (elevation-as-surface-tone: the dark `MuiPaper` overlay is
      off; pill nav active-indicator; silvery-blue captions); MD3 roles augmented onto the palette in
      [src/theme/theme.d.ts](src/theme/theme.d.ts). Replaced the old `src/theme.ts`. Light/dark/system
      mechanism unchanged in [ThemeModeProvider.tsx](src/ThemeModeProvider.tsx).
- [x] **Centered home** — [AppShell.tsx](src/components/AppShell/AppShell.tsx) centers content in a
      760px max-width column; [HomePage.tsx](src/pages/HomePage.tsx) floats the practice flow vertically
      via auto block margins. Branding fixed to **Guess and Correct** (AppShell app bar + LoginPage).
- [x] **Restyle screens** to MD3 — Sidebar (inset pill nav rail/drawer), CorrectionDisplay
      (surface-container fills + tertiary accent), History (silvery-blue captions + whole summary row
      clickable via `CardActionArea`), LoginPage. Most other screens inherit the new theme directly
      (rounded cards, pill buttons, type scale, container tones) since they already read
      `theme.palette.*`.
- [x] **Opinionated tinted environment** — raised neutral-palette chroma (16 / variant 24) so every
      surface carries the teal hue; the page is a tinted canvas and cards float as a lighter layer in
      both modes (no plain white or neutral-grey panes).
- [x] **Admin master-detail redesign** — replaced the wide users table with a tappable user **list**
      ([AdminPage.tsx](src/pages/AdminPage.tsx)) + nested **detail route** `/admin/users/:id`
      ([AdminUserDetailPage.tsx](src/pages/AdminUserDetailPage.tsx)) to edit role, do key support, and
      view history. Shared state via an [AdminLayout](src/components/Admin/AdminLayout.tsx) outlet
      context. Removed `UsersTable.tsx`.
- [x] **Mobile responsiveness** — long-width content wraps/truncates or scrolls (e.g. history prompt
      truncation, admin history panel wrap); centered max-width column adapts to mobile padding + drawer.
- [ ] **Visual QA** — confirm every screen in light/dark/system + mobile drawer (run locally, logged in).

## ⬜ Epic 10 — Built-in translator widget

Lets a learner translate **their own** free text (not just prompted sentences) from the language
they know into the one they're studying. The user types in their **known** language (`guessLanguage`)
and gets a natural translation into their **learning** language honoring the selected regional
**locale** (`learnLanguage` + `locale`), plus one optional short usage note. **Stateless** — a new
`application/` + `controllers/` module mirroring `language`, no DB/history.

**Decided:** Claude **Haiku** on the user's own key (free third-party APIs rejected — see Decisions
locked); output = translation + one optional usage note (no `WordToken` breakdown); dedicated
`/translator` page; direction fixed known→learning.

- [ ] **New stateless `server/modules/translator/`** — `application/translateText.ts` (cached
      language-agnostic system block + per-pair user turn, `SENTENCE_MODEL`, `extractJsonText` →
      `{ translation, note? }`; reuses
      [anthropicClientForUser.ts](server/modules/apiKey/application/anthropicClientForUser.ts)) and
      `controllers/translatorController.ts` (`POST /api/translate`, zod-validated via the
      [shared/languages.ts](shared/languages.ts) helpers, mirroring
      [sentenceController.ts](server/modules/sentence/controllers/sentenceController.ts)). Mounted in
      [server/main.ts](server/main.ts).
- [ ] **Frontend** — [src/api/translatorApi.ts](src/api/translatorApi.ts) (`translateText`, POST
      `/api/translate`); `src/hooks/useTranslation.ts` (mirrors
      [useCorrectionSubmission.ts](src/hooks/useCorrectionSubmission.ts)); `src/components/Translator/`
      `TranslatorWidget.tsx` (MD3 styled, wraps
      [SectionCard](src/components/shared/SectionCard.tsx), Cmd/Ctrl+Enter to submit, shows the
      direction + translation + optional note); `src/pages/TranslatorPage.tsx` (thin, same `hasApiKey`
      gate as [HomePage.tsx](src/pages/HomePage.tsx)).
- [ ] **Nav/routing** — `/translator` route in [routes.tsx](src/routes.tsx) (inside the authed
      `AppShell` block) + a "Translate" item (`TranslateIcon`) in
      [Sidebar.tsx](src/components/Sidebar/Sidebar.tsx)'s `NAV_ITEMS`, right after Practice.

---

## Verification

Per epic, run `npm run typecheck` (both tsconfigs) + `npm run lint`, then:

- **Epic 2** — click words; confirm the popover shows root/meaning/POS in the guess language;
  punctuation isn't clickable.
- **Epic 3** — play a sentence; confirm correct-language voice and that the rate slider changes
  speed and persists across reload.
- **Epic 4** — visually QA every screen in light/dark/system and at mobile width (drawer);
  confirm centered home; grep for stray hardcoded colors.
- **Epic 10** — from the Translate page, translate your own text into two locales of the same
  language (e.g. es-MX then es-ES) and confirm the dialect/vocabulary shifts and an optional note
  appears when relevant; the empty-input button is disabled, Cmd/Ctrl+Enter submits, errors surface
  as an Alert, and the no-API-key state shows `ApiKeySetup`; QA light/dark/system + mobile.

Use the `/verify` skill for end-to-end confirmation and `/code-review` before declaring an epic
done. Each epic is a natural PR/commit boundary.
