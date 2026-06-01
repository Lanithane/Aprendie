# Aprendie — Feature Roadmap

Living roadmap for the post-MVP feature work. Build order was chosen deliberately: the
**language generalization refactor first** (it touches the most files), then the small
contained features, then the **backend-heavy epics** (RBAC + admin, server-side history,
usage-cost showback, API-key hardening, the Palabradex). See [BLUEPRINT.md](BLUEPRINT.md) for
product/architecture context and [CLAUDE.md](CLAUDE.md) for the layer rules that govern every
change here.

**Reprioritized (2026-05-29):** an **accessibility pass** (Epic A, done) lands first, then the
**MD3 overhaul (Epic 9) moves next** — we'd rather settle the final visual language before
building the remaining feature UI (TTS, showback, Palabradex), so those screens are styled in MD3
from the start instead of being restyled afterward. The backend-heavy epics (3, 6, 7, 8) follow.
Epic numbers are stable identifiers, not build order — see the status table.

## Status at a glance

Epics are listed by number (a stable identifier); see the intro for the current build order.

| Epic | Scope                                                                         | Status                              |
| ---- | ----------------------------------------------------------------------------- | ----------------------------------- |
| 0    | Tab title → "Aprendie"                                                        | ✅ Done (merged)                    |
| 1    | Language generalization + CEFR levels + word-breakdown data + location→locale | ✅ Done (merged + deployed)         |
| 2    | Word-root-on-click UI                                                         | ✅ Done                             |
| A    | Accessibility pass (focus flow, skip link, labels)                            | ✅ Done                             |
| 3    | Text-to-speech + rate slider                                                  | ✅ Done                             |
| 4    | RBAC + admin console (roles, users CRUD, key support)                         | ✅ Done (migration on prod)         |
| 5    | History → Postgres, per user account                                          | ✅ Done (local migrated)            |
| 6    | Usage-cost showback + contribute CTAs                                         | ⬜ Not started                      |
| 7    | API-key security hardening                                                    | ✅ Done (AAD+HKDF+vitest)           |
| 8    | Word "Palabradex" (seen roots + variants)                                        | ✅ Done (lexeme_stats + backfill)   |
| 9    | Full MD3 overhaul + centered "Google homepage" layout                         | ✅ Done (merged to main + deployed) |
| 10   | Built-in translator (known → learning+locale, + usage note)                   | ✅ Done (local; QA pending)         |
| 11   | First-run onboarding + always-warm preload (kill cold-start latency)          | ✅ Done (local; QA pending)         |
| 12   | Operator key + access gate + daily cap                                        | ✅ Done (shipped to main)           |
| 13   | Branding & identity (logo, favicon, PWA icons)                                | ⬜ Not started                      |
| 14   | Forgiving scoring & letter grades (A+…F)                                      | ✅ Done (shipped to main)           |
| 15   | Auto-speak on load + smart voice defaults (extends Epic 3)                    | ✅ Done                             |
| 16   | Feedback & analytics (self-hosted, in admin)                                  | ⬜ Not started                      |
| 17   | Single Starter level (drop Foundation) + Starter word-meaning hints           | ✅ Done                             |
| 18   | Same-language practice mode (paraphrase / tense-shift, by difficulty)          | ⬜ Not started                      |
| 19   | Grammar building blocks reference (POS overview + drill-down, per learn language) | ⬜ Not started                      |

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
- **Palabradex counts (Epic 8):** correct/incorrect are **derived from correction
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
- **Epic 11:** ~~keep a localStorage **mirror** of the now-server-side language pair (instant first
  paint, but two sources can diverge) or read it from `/api/me` only (one source of truth, at the cost
  of a brief flash before it loads)?~~ — **resolved: keep the mirror.**
  [useLanguagePair.ts](src/hooks/useLanguagePair.ts) paints from the localStorage cache on a cold
  load and lets the server value win once `/api/me` resolves (`override ?? serverPair ?? cache ??
DEFAULT_PAIR`); the onboarding flow primes the cache via the exported `writeLanguagePairCache`.

---

## ✅ Epic 0 — Tab title

- [x] [index.html](index.html) `<title>` → `Aprendie`.

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

## ✅ Epic 3 — Text-to-speech + rate slider

Pure frontend (Web Speech API `SpeechSynthesis`); uses the learn-language locale for voice
selection. No backend.

- [x] **src/hooks/useSpeech.ts** (new) — wrap `speechSynthesis` + `SpeechSynthesisUtterance`;
      pick a voice for the sentence's `locale` (fall back to base language; honour the user's
      saved preferred voice when it matches the language); expose `speak(text, locale, rate)`,
      `cancel()`, `speaking`, `supported`, `voices`. Subscribe to `voiceschanged` (voices load
      async — the external-subscription case the hooks rule allows).
- [x] **src/hooks/useSpeechRate.ts** (new) — persisted pref (`aprendie:speechRate`, default 1.0),
      same pattern as `useLevelPreference`.
- [x] **src/hooks/useSpeechVoice.ts** (new) — persisted preferred-voice pref
      (`aprendie:speechVoiceURI`, stores the voice's `voiceURI`; `null` = automatic).
- [x] **PracticeCard** — speaker/play `IconButton` in the card's top-right + a "1.0×" affordance
      that opens an on-demand rate `Popover` (slider ~0.5–1.5×). Gracefully hidden if `!supported`.
- [x] **Settings → Pronunciation** — `VoicePicker` lists the device voices for the active learn
      language (with a preview play button); selection persists via `useSpeechVoice`.

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
**single aggregation source for the Epic 8 Palabradex.**

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
- [x] **HKDF per-record subkey** — the AES key is `HKDF(master, salt=userId, info='aprendie/apiKey')`,
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

## ✅ Epic 8 — Word "Palabradex"

A per-user "seen root words" page with correct/incorrect counts; drilling into a root reveals its
variants with their own seen counts.

**Hard dependency (user-confirmed): build only after Epic 5.** The Palabradex's sole data source is
the **Postgres-persisted history** (`attempts`) from Epic 5 — its `wordBreakdown` and `mistakes`.
It never reads localStorage or any client source; both live aggregation and backfill read that
table.

**Decided:** correct/incorrect derive from `mistakes[].sourceText` — a lemma is "incorrect" for an
attempt when it appears in that attempt's mistakes, else "correct"; every appearance counts "seen".

- [x] **DB migration `0017`** ([drizzle/0017_wakeful_argent.sql](drizzle/0017_wakeful_argent.sql)) —
      two grains, both per user + learnLanguage. `lexeme_stats` (root): id, userId FK cascade,
      learnLanguage, lemma, partOfSpeech, seenCount, correctCount, incorrectCount, firstSeenAt,
      lastSeenAt, unique `(userId, learnLanguage, lemma)` + index `(userId, learnLanguage)`.
      `lexeme_variant_stats` (variant): id, userId FK cascade, learnLanguage, lemma, surface,
      seenCount, lastSeenAt, unique `(userId, learnLanguage, lemma, surface)`. Applied to **local +
      Railway prod**. (Numbered 0017, not the roadmap's stale "0005" — that was the migration count
      when this epic was scoped.)
- [x] **New `modules/palabradex/`** (full DDD) — pure heuristic in
      [domain/seenWords.ts](server/modules/palabradex/domain/seenWords.ts) (`computeSeenDeltas`):
      tokenizes every `mistakes[].sourceText` into a normalized word-set (NFC + lowercase,
      word-boundary via the same `WORD_RE` idea as
      [tokenize.ts](src/components/SentenceTokens/tokenize.ts), reimplemented server-side), then per
      `WordToken` counts one "seen" and routes it to incorrect when the edge-stripped surface is in
      that set, else correct; grouped per lemma + per (lemma, surface). Views in
      [domain/Lexeme.ts](server/modules/palabradex/domain/Lexeme.ts). Persistence
      [palabradexRepository.ts](server/modules/palabradex/persistence/palabradexRepository.ts) — batched
      additive `onConflictDoUpdate` upserts (`least`/`greatest` for the first/last-seen window,
      partOfSpeech kept on first sight), `listLexemes(sort)`, `getLexeme`, `listVariants`,
      `distinctLanguages`, `clearAll`. Read application `listPalabradex` / `getRootDetail` /
      `listLanguages`; write application `recordSeenWords` called from history's `recordAttempt`
      (cross-module history→palabradex, wrapped try/catch so a derived-store failure never loses the
      graded attempt). Controllers `/api/palabradex` (`GET /languages`, `GET /?learnLanguage&sort`,
      `GET /:lemma?learnLanguage`), requireAuth. Unit-tested
      ([seenWords.test.ts](server/modules/palabradex/domain/seenWords.test.ts)).
- [x] **Backfill** ([scripts/backfill-palabradex.ts](scripts/backfill-palabradex.ts), `npm run
      db:backfill:palabradex`) — clears both tables then replays every `attempt` in
      `(userId, createdAt asc)` order through `recordSeenWords`; re-runnable (idempotent). Seeded
      **local + prod**.
- [x] **Frontend** — [src/api/palabradexApi.ts](src/api/palabradexApi.ts);
      [usePalabradex.ts](src/hooks/usePalabradex.ts) + [usePalabradexEntry.ts](src/hooks/usePalabradexEntry.ts)
      (lazy variant fetch on drill-in) + [usePalabradexLanguages.ts](src/hooks/usePalabradexLanguages.ts);
      thin [PalabradexPage.tsx](src/pages/PalabradexPage.tsx) (language tabs + seen/mistakes/A–Z sort) +
      `src/components/Palabradex/` (RootList / RootCard / VariantList) reusing `components/shared/`;
      `/palabradex` route in [routes.tsx](src/routes.tsx) + "Words" nav item in
      [navigation.ts](src/components/AppShell/navigation.ts). MD3 throughout (theme tokens, fixed
      success/warning/error ramp for the accuracy dot).

## ✅ Epic 9 — Full MD3 overhaul + centered layout (merged to main + deployed)

Styles the final component set (including Epics 2–8 UI) once. The "Google homepage" centering
folds in here. **MD3 is now the binding design standard** — see the
[Material Design 3 section in CLAUDE.md](CLAUDE.md) for the rules every future screen must follow.

- [x] **MD3 token system** — palettes generated at **build time** via
      [scripts/gen-md3-tokens.ts](scripts/gen-md3-tokens.ts) (`npm run gen:tokens`,
      `@material/material-color-utilities` as **devDependency only** — zero runtime dep) into the
      committed [src/theme/tokens.ts](src/theme/tokens.ts). Now an **8-theme registry** (`abra`,
      `cerezo`, `costa`, `duna`, `lavanda`, `mango`, `tinta`, `vinedo`; default `abra`), each a full
      light+dark scheme with the surface-container ladder, user-selectable in Settings. `success`/
      `warning`/`error` carry **fixed semantic ramps** (green/amber/red) seeded independently of the
      theme, so they always read as a traffic-light (a 99 score is always green, a 20 always red);
      `src/theme/scoreColor.ts` maps 0–100 → color. [src/theme/index.ts](src/theme/index.ts) maps
      roles → MUI palette, adds the MD3 type scale, shape, and component overrides
      (elevation-as-surface-tone: the dark `MuiPaper` overlay is off; pill nav active-indicator);
      MD3 roles augmented onto the palette in [src/theme/theme.d.ts](src/theme/theme.d.ts). Replaced
      the old `src/theme.ts`. Light/dark/system mechanism in
      [ThemeModeProvider.tsx](src/ThemeModeProvider.tsx).
- [x] **Centered home** — [AppShell.tsx](src/components/AppShell/AppShell.tsx) centers content in a
      760px max-width column; [HomePage.tsx](src/pages/HomePage.tsx) floats the practice flow vertically
      via auto block margins. Branding fixed to **Aprendie** (AppShell app bar + LoginPage).
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

## ✅ Epic 10 — Built-in translator widget

Lets a learner translate **their own** free text (not just prompted sentences) from the language
they know into the one they're studying. The user types in their **known** language (`guessLanguage`)
and gets a natural translation into their **learning** language honoring the selected regional
**locale** (`learnLanguage` + `locale`), plus one optional short usage note. **Stateless** — a new
`application/` + `controllers/` module mirroring `language`, no DB/history.

**Decided:** Claude **Haiku** on the user's own key (free third-party APIs rejected — see Decisions
locked); output = translation + one optional usage note (no `WordToken` breakdown); dedicated
`/translator` page; direction fixed known→learning.

- [x] **New stateless `server/modules/translator/`** — `application/translateText.ts` (cached
      language-agnostic system block + per-pair user turn, `SENTENCE_MODEL`, `extractJsonText` →
      `{ translation, note? }`; reuses
      [anthropicClientForUser.ts](server/modules/apiKey/application/anthropicClientForUser.ts)) and
      `controllers/translatorController.ts` (`POST /api/translate`, zod-validated via the
      [shared/languages.ts](shared/languages.ts) helpers, mirroring
      [sentenceController.ts](server/modules/sentence/controllers/sentenceController.ts)). Mounted in
      [server/main.ts](server/main.ts).
- [x] **Frontend** — [src/api/translatorApi.ts](src/api/translatorApi.ts) (`translateText`, POST
      `/api/translate`); `src/hooks/useTranslation.ts` (mirrors
      [useCorrectionSubmission.ts](src/hooks/useCorrectionSubmission.ts)); `src/components/Translator/`
      `TranslatorWidget.tsx` (MD3 styled, wraps
      [SectionCard](src/components/shared/SectionCard.tsx), Cmd/Ctrl+Enter to submit, shows the
      direction + translation + optional note); `src/pages/TranslatorPage.tsx` (thin, same `hasApiKey`
      gate as [HomePage.tsx](src/pages/HomePage.tsx)).
- [x] **Nav/routing** — `/translator` route in [routes.tsx](src/routes.tsx) (inside the authed
      `AppShell` block) + a "Translate" item (`TranslateIcon`) in
      [Sidebar.tsx](src/components/Sidebar/Sidebar.tsx)'s `NAV_ITEMS`, right after Practice.

**Built (2026-05-31):** as specced, adapted to the Epic 12 operator-key reality (the old `apiKey`
module is gone). Backend [translateText.ts](server/modules/translator/application/translateText.ts)
uses **Haiku (`SENTENCE_MODEL`) via `getOperatorAnthropicClient()`** — the same client the sentence/
correction paths use — gated by `assertCanSpend` + `assertSpendEnabled` (no daily cap; that counts
graded sentences). It sends a **byte-static cached system block** + per-pair user turn and parses
`extractJsonText` → `{ translation, note? }`.
[translatorController.ts](server/modules/translator/controllers/translatorController.ts) mounts
`POST /api/translate` (`requireAuth` + `asyncHandler`, zod + the `isSupportedLanguage` /
`isValidLocaleFor` shared helpers, distinct-languages check, `text` 1–1000 chars). Frontend
[translatorApi.ts](src/api/translatorApi.ts) + [useTranslation.ts](src/hooks/useTranslation.ts)
mirror `useCorrectionSubmission`; [TranslatorWidget.tsx](src/components/Translator/TranslatorWidget.tsx)
wraps `SectionCard`, shows the direction (known → target + locale label), supports ⌘/Ctrl+Enter,
disables on empty input, and surfaces errors via `Alert`;
[TranslatorPage.tsx](src/pages/TranslatorPage.tsx) reuses HomePage's `AccessGate` for pending/blocked
accounts. Nav entry added in [navigation.ts](src/components/AppShell/navigation.ts) (right after
Practice; the `Sidebar` renders `NAV_ITEMS`). **Usage note kept** (the user flagged it as possibly
redundant with Epic 6, but Epic 6 is usage-cost showback, not word lookup — and the locked roadmap
decision keeps it): the model returns **one optional** short note (register/gender/false-friend/
locale word-choice), omitted when nothing is notable, so it never duplicates a dictionary entry.
**It is purely a convenience tool** — a learner curious about a phrase stays in-app instead of reaching
for a separate translator — and it deliberately feeds **nothing** into the Palabradex/lexeme stats (no
`recordSeenWords`, no persistence). typecheck + lint + build all green; **QA'd on local (2026-05-31) —
looks good.**

---

## ✅ Epic 11 — First-run onboarding + always-warm preload

Goal: **every flow feels instant** — new login, a language/locale/level switch, and "Next" alike.
The steady-state half already shipped (2026-05-30):
[getNextSentence.ts](server/modules/sentence/application/getNextSentence.ts) now serves from a buffer
and refills the pool in the **background** (off the request's critical path), only blocking on
generation when the pool is genuinely empty. What remains is the **cold start** — a brand-new account,
or any never-seen `(learn, guess, locale, level)` combo, still has an empty pool and must wait for the
first batch. This epic removes that wait by (a) guiding the first choice and (b) warming the pool
_while the user is still choosing_, so they never land on a spinner. This is **not** static seeding
(rejected as unmaintainable across dynamic languages/locales) — the pool still fills itself
on-demand; we just start filling it a few seconds earlier.

**Decided (revised 2026-05-30 — operator-key pivot):** non-techy users won't create an Anthropic
account, so the app is moving to an **operator-supplied key** for everyone (one key, server-side) —
see **Epic 12** for the key model + access gate that makes this safe. That removes the API-key step
from onboarding. The first-run flow becomes a **short wizard with a single meaningful step:** pick
learn → guess → locale → level (the four inputs), then land on Practice. (If the hybrid path in
Epic 12 is chosen, an _optional_ "use my own key" lives in Settings, never in the new-user flow.)

**Warm timing (revised):** warm the pool **once all four inputs (learn, guess, locale, level) are
satisfied** — i.e. when the wizard completes / the pair+level are persisted — **not** while a key is
being supplied (there is no key step anymore, and warming mid-typing was always fragile). Warm with a
**small first batch (2–3 sentences)** during a brief "preparing…" transition, with the full
10-sentence top-up continuing in the background, so the user lands on Practice already warm. The same
trigger fires on app boot for a returning user's saved pair.

_Cost/scale note (10 sporadic users, one operator key):_ correction (Sonnet 4.6, cached system block)
is **< $0.01/graded sentence**; batched Haiku sentence-gen is negligible per sentence → **single-digit
$/month** at this scale. Rate limits (shared RPM/TPM on the one key) are the real risk, but only under
**open/uncapped access** — hence Epic 12's gate. The existing pool buffer + background refill already
batches generation; a simple per-user/day cap is a cheap backstop even before the full gate lands.

**Decided — no Claude OAuth; the key step stays a polished paste (investigated 2026-05-30).** There is
no "Sign in with Claude → app gets API access" OAuth for third-party apps, and Anthropic actively
banned the workaround of reusing Claude Code subscription OAuth tokens (`sk-ant-oat01-…`): enforced
from 2026-01-09, declared a ToS violation 2026-02-19, and those tokens API-rejected since 2026-02-20.
The mandated path for any third-party app is a Console API key (`sk-ant-api03-…`) on the user's own
usage billing — exactly our model. So step 2 keeps the paste, made frictionless: a "Get a key →" deep
link to the Console + a 3-step guide; **format-aware validation** (accept `sk-ant-api03-…`; if an
`sk-ant-oat01-…` token is pasted, say so specifically rather than a generic "invalid key"); and
encryption/trust copy. Keep it a self-contained component so a real OAuth flow could slot in later, but
don't architect around one.

**Prereq — persist the language pair server-side.** Today the pair + locale live in localStorage only
(`aprendie:languagePair`, [useLanguagePair.ts](src/hooks/useLanguagePair.ts)); `level` and theme already
moved onto the `users` row. The server can't prewarm a pool it doesn't know about, so the pair must
follow the account. (This supersedes the old "prefs stay client-side" decision — already half-reversed
by `level`/theme.)

- [ ] **Schema + persistence** — add `learn_language`, `guess_language`, `locale` to `users`
      ([schema.ts](server/infrastructure/db/schema.ts), loose-typed text like `level`), a migration,
      and an update use case + route mirroring `updateUserLevel`
      ([userApi.ts](src/api/userApi.ts)). Rework [useLanguagePair.ts](src/hooks/useLanguagePair.ts) to
      read/write the account value (see the open question on whether to keep a localStorage mirror),
      mirroring [useLevelPreference.ts](src/hooks/useLevelPreference.ts)'s optimistic-override pattern.
- [ ] **Onboarding wizard** — replaces the current bare `!user.hasApiKey` gate on
      [HomePage.tsx](src/pages/HomePage.tsx#L43-L48). Shown on first run when the account is missing
      the language pair **or** the API key. **Step 1:** the learn → guess → locale → level picker
      (reusing the Settings controls), persisted server-side. **Step 2:** absorb the existing
      [ApiKeySetup.tsx](src/components/ApiKeySetup/ApiKeySetup.tsx) /
      [useApiKey.ts](src/hooks/useApiKey.ts) as the key-entry step (it stays usable standalone for
      Settings' "replace key"). A thin `useOnboarding` gate drives the step sequence.
- [ ] **Optimistic warm** — a small-batch warm path (give `generateSentenceBatch` a size arg, or a
      dedicated `prewarmPool` use case) + `POST /api/sentence/prewarm` that fires a background refill
      for the chosen pool. Fire it the instant the key validates at the end of step 2 (overlapping the
      transition to Practice), and on app boot for the returning user's saved pair — so Practice is
      never cold.

## ✅ Epic 12 — Operator key + access gate + daily cap

Goal: make the **operator-supplied key** model (Epic 11 pivot) safe. Non-techy users won't create
Anthropic accounts, so every approved user spends a single server-side operator key. That can't be
open: an uncapped key behind public Google sign-in invites runaway spend and shared rate-limit
exhaustion. This epic adds the key plumbing, an **approval gate**, and a **per-user daily cap**.

**Decided (2026-05-30):** new accounts default to **`pending`** and can't spend until the operator
(`ADMIN_EMAIL`) approves them; **operator-only** key resolution this epic (the per-user
`encryptedAnthropicKey` / `ApiKeySetup` stay in place but dormant — a hybrid "use my own key"
override is a later pass); daily cap of **100 graded sentences / user / day** (admins exempt).

- [x] **Operator-key resolution** — `OPERATOR_ANTHROPIC_KEY` in [env.ts](server/env.ts);
      `anthropicClientForUser` → [resolveAnthropicClient.ts](server/modules/apiKey/application/resolveAnthropicClient.ts)
      prefers the operator key when configured, falls back to the user's own encrypted key (so local
      dev keeps working), else `MissingApiKeyError`. All three spend paths
      ([getNextSentence](server/modules/sentence/application/getNextSentence.ts),
      [correctTranslation](server/modules/correction/application/correctTranslation.ts),
      [resolveLocale](server/modules/language/application/resolveLocale.ts)) route through it.
- [x] **Access gate** — `users.access` (`pending`/`approved`/`blocked`, loose text, default
      `pending`); `findOrCreateGoogleUser` creates the admin `approved`, everyone else `pending`.
      `canSpend`/`assertCanSpend` ([user/application/access.ts](server/modules/user/application/access.ts))
      gate the spend use cases (correction throws `AccessDeniedError` → 403 `access_*`; getNext throws;
      bootstrap + resolveLocale degrade silently so /api/me and onboarding don't break). `/api/me`
      exposes `access`; [AuthContext](src/auth/AuthContext.tsx) derives `isApproved`;
      [HomePage](src/pages/HomePage.tsx) shows [AccessGate](src/components/AccessGate/AccessGate.tsx)
      (pending/blocked) instead of Practice when not approved.
- [x] **Admin approve/deny** — `setUserAccess` + `PATCH /api/admin/users/:id/access`; an Access
      `Select` on the user detail page and an access-status chip on the admin list.
- [x] **Daily cap** — `usage` module (`usage_daily` table, one row per user+UTC-day) with
      `assertWithinDailyCap`/`recordGradedSentence` ([usage/application/dailyCap.ts](server/modules/usage/application/dailyCap.ts));
      `correctTranslation` asserts before and records after grading (admins exempt).
      `DailyCapExceededError` → 429 `daily_cap`; [client.ts](src/api/client.ts) now parses the JSON
      error body (`{ error, code }`) so the message surfaces cleanly.
- [x] **Migration `0010`** — adds `users.access` + `usage_daily`; backfills existing rows to
      `approved` (they predate the gate). Applied LOCAL; **prod runs automatically on deploy** —
      [railway.json](railway.json)'s start command is `db:migrate:deploy && npm start`, so the prod
      migrate (which also catches the still-pending `0009`) runs before the server boots.

**Go-live config (do in Railway after the deploy):**

- [ ] Set **`OPERATOR_ANTHROPIC_KEY`** in the Railway service env. Until it's set, `resolveAnthropicClient`
      falls back to each user's own key — and since Epic 7 wiped stored keys, **approved users with no own
      key will hit `MissingApiKeyError` (412)** when they try to practice. Setting it switches everyone to
      the operator key.
- [ ] Confirm **`ADMIN_EMAIL`** is set so your account auto-approves on login and you can approve others
      from `/admin` (new accounts land `pending`).
- [ ] **Runtime QA** (not yet done): sign in fresh → pending screen; approve from `/admin` → practice
      works on the operator key; exercise the 100/day cap → 429 surfaces cleanly.

---

## ⬜ Epic 13 — Branding & identity

A real visual identity to replace the default Vite favicon. Pure frontend + static assets; no backend.

**Decided:** brand asset colours live in committed SVG/PNG files (not `src` hex), so the
`grep -rE '#[0-9a-f]{3,6}' src` rule in [CLAUDE.md](CLAUDE.md) keeps passing.

- [ ] **Icon/favicon set** — replace the default `vite.svg` referenced in [index.html](index.html):
      add `favicon.svg` + `favicon.ico` + `apple-touch-icon.png` in a new `public/` folder and link
      them; add `<meta name="description">` and retune the existing `theme-color` meta (currently
      `#1976d2`) to the brand.
- [ ] **PWA manifest** — `public/manifest.webmanifest` + maskable 192/512 icons so "add to home
      screen" shows the app icon; link it from [index.html](index.html).
- [ ] **Logo in the app bar** — a reusable `src/components/Logo/Logo.tsx`, rendered where the
      "Aprendie" wordmark sits today in [AppShell.tsx](src/components/AppShell/AppShell.tsx) (mobile
      header) and on [LoginPage.tsx](src/pages/LoginPage.tsx). Theme-agnostic chrome, MD3 rounded.
- [ ] _Note:_ the mark itself may want a designer / AI-generated asset; this epic covers the asset set + wiring, not the visual design exploration.

## ✅ Epic 14 — Forgiving scoring & letter grades (merged to main)

Grades read as **A+ / A / B / C / D / F**, stay lenient about punctuation and capitalization, and give
partial credit for accurate-but-stiff phrasing instead of zeroing it. The numeric 0–100 score remains
the **internal source of truth** (it already drives `attempts.score` and history); the letter is
**derived** for display.

**Decided:** keep numeric score in the DB; derive the letter via one shared util; punctuation/caps
never drop a fully-correct answer below A+; a model "naturalness" signal caps an accurate-but-stiff
answer (e.g. "I am enchanted by you", "How many years do you have") at the **A** band, not A+.

- [x] **`shared/grades.ts`** — pure `scoreToGrade(score) → 'A+'|'A'|'B'|'C'|'D'|'F'` with band thresholds.
- [x] **Lenient + naturalness-aware grading** — prompt strengthened in `scoreTranslation.ts`; `naturalness` signal (`natural`|`stiff`) surfaces through response parser + `CorrectionResult`; stiff-but-correct capped at A band.
- [x] **Display the letter** — `scoreColor.ts` thresholds re-aligned; `CorrectionDisplay`, `HistoryPage`, `HomePage` all show the letter grade.
- [x] **Migration `0013`** — nullable `grade text` column added to `attempts` via `drizzle/0013_pink_archangel.sql`.

## ✅ Epic 15 — Auto-speak on load + smart voice defaults

**Extends Epic 3** — TTS already shipped ([useSpeech.ts](src/hooks/useSpeech.ts),
[useSpeechRate.ts](src/hooks/useSpeechRate.ts), [useSpeechVoice.ts](src/hooks/useSpeechVoice.ts), the
[PracticeCard](src/components/PracticeCard/PracticeCard.tsx) speaker button, and
[VoicePicker](src/components/VoicePicker/VoicePicker.tsx)). This epic adds **automatic** playback and
better default voices; the manual speak button already exists. Mostly frontend (Web Speech API); prefs
persist server-side per account.

**Decided (diverged from the original spec):** the auto-speak prefs are stored **per account in
Postgres** (`users.auto_speak`, `users.auto_speak_delay_ms`), not localStorage — they follow the user
across devices like the other account prefs. Defaults are **auto-speak on at a 500 ms delay** (not off
at 1 s): the manual speaker button always works, so a short auto-play is the better first-run
experience. Delay bounds (0–3000 ms) and the defaults are shared client+server in
[shared/speech.ts](shared/speech.ts), validated on both ends.

- [x] **Auto-speak on new sentence** — when a new sentence renders in
      [PracticeCard.tsx](src/components/PracticeCard/PracticeCard.tsx) (over
      [SentenceTokens](src/components/SentenceTokens/SentenceTokens.tsx)), the existing
      `useSpeech().speak(...)` fires after the configured delay. The timer lives in
      [useAutoSpeak.ts](src/hooks/useAutoSpeak.ts) per the [CLAUDE.md](CLAUDE.md) useEffect rules; it
      re-arms only when the sentence text changes (so a rate tweak or async voice load doesn't restart
      playback) and is cleared on the next sentence / unmount.
- [x] **Persisted prefs** — [useAutoSpeakPreference.ts](src/hooks/useAutoSpeakPreference.ts) reads the
      account's `autoSpeak` + `autoSpeakDelayMs` and writes them via `PATCH /api/me/auto-speak`
      ([userController](server/modules/user/controllers/userController.ts) →
      [setUserAutoSpeak](server/modules/user/application/setUserAutoSpeak.ts)), mirroring
      `useLevelPreference`'s optimistic-override pattern. Backed by migration
      [0015](drizzle/0015_old_lionheart.sql) and the shared defaults/clamp in
      [shared/speech.ts](shared/speech.ts).
- [x] **Settings audio controls** — [AutoSpeakControls.tsx](src/components/AutoSpeakControls/AutoSpeakControls.tsx)
      (toggle + delay slider, slider dims when off) sits in the **Pronunciation** SectionCard in
      [SettingsPage.tsx](src/pages/SettingsPage.tsx) next to `VoicePicker`.
- [x] **Smart voice defaults** — [src/audio/voiceDefaults.ts](src/audio/voiceDefaults.ts) scores the
      language's voices (locale specificity → Google voices → per-language named preferences → generic
      quality markers, demoting Apple novelty voices) and seeds `pickVoice()` in
      [useSpeech.ts](src/hooks/useSpeech.ts), used only when the user hasn't pinned one in `VoicePicker`.
- [ ] _Backlog:_ cloud neural TTS for higher, consistent voice quality.

## ⬜ Epic 16 — Feedback & analytics

Users can send feedback and we record lightweight usage metrics — all **self-hosted** in our own
Postgres (no third-party SDK; fits the operator-key / minimal-deps philosophy), surfaced through the
existing admin console.

**Decided:** self-hosted tables; feedback is the visible MVP; the metrics view folds into the
[admin](src/pages/AdminPage.tsx) section (no separate analytics vendor).

- [ ] **`feedback` module** (full DDD, mirroring [history](server/modules/history/)) — a `feedback`
      table (id, `userId` FK→users cascade, message, category, page/userAgent context, createdAt) +
      `recordFeedback` / `listFeedback` use cases + controller (`POST /api/feedback` requireAuth; an
      admin `GET` behind `requireAdmin`).
- [ ] **`analytics` module** (full DDD) — an `events` table (id, nullable `userId`, name, `props`
      jsonb, createdAt) + an ingest use case + `POST /api/events`. Instrument key events (sentence
      shown, guess submitted, grade received).
- [ ] **Migration (next free number, e.g. `0013`)** — create both tables in
      [schema.ts](server/infrastructure/db/schema.ts) via the `drizzle/` workflow; applied local + (auto
      on deploy) prod, per [railway.json](railway.json).
- [ ] **Feedback button in the sidebar** — an action item (not a route) in the
      [Sidebar.tsx](src/components/Sidebar/Sidebar.tsx) bottom rail opening a `FeedbackDialog` that posts
      via a new `src/api/feedbackApi.ts` (built on [client.ts](src/api/client.ts), never raw `fetch`);
      add `src/api/analyticsApi.ts` for events.
- [ ] **Admin surfacing** — a feedback list + basic event counts on the admin pages
      ([AdminPage.tsx](src/pages/AdminPage.tsx) / [AdminUserDetailPage.tsx](src/pages/AdminUserDetailPage.tsx)).
- [ ] _Backlog:_ richer admin analytics dashboards.

## ✅ Epic 17 — Single Starter level + Starter word hints

Collapses the two invented pre-A1 levels (`starter` + `foundation`) into **one `starter` level** below
A1, and gives that level a **little help**: clicking a word at Starter reveals its meaning (a
guess-language gloss) in the existing word popover. Immersion is preserved everywhere else — A1 and up
still never translate the word.

**Decided:** keep the `starter` code, drop `foundation`; the gloss shows **on click, at Starter only**;
gloss is **generated only for Starter sentences**; existing `foundation` data is **remapped → `starter`**.

- [x] **Levels ladder** — in [shared/levels.ts](shared/levels.ts): remove the `foundation` entry, drop
      it from the `LevelCode` union, re-number `order`, and fold its calibration into the `starter`
      `blurb` (single high-frequency words + short set phrases — greetings, numbers, basic needs;
      present tense, concrete vocabulary, cognates where natural). Update the "two pre-A1 levels" header
      comment. Downstream auto-updates: the generation `LEVEL_RUBRIC` and the level chip/menu both
      derive from `LEVELS`.
- [x] **Migration `0014`** — rewrite stored `'foundation'` → `'starter'` across
      `users.level`, `sentence_cache.level`, and `attempts.level` (all loose text in
      [schema.ts](server/infrastructure/db/schema.ts)), so no row references the removed code; cached
      Foundation sentences are remapped in place. Applied local + (auto on deploy) prod.
- [x] **Optional gloss on `WordToken`** — add `gloss?: string` (the word's meaning in the guess
      language) to `WordToken` in [shared/languages.ts](shared/languages.ts), carried through
      `normalizeToken` in
      [generateSentenceBatch.ts](server/modules/sentence/application/generateSentenceBatch.ts). It rides
      in the existing `word_breakdown` JSON — no column change.
- [x] **Starter-only gloss generation** — when a **Starter** batch is requested, uses a separate
      `SYSTEM_PROMPT_STARTER` (cached) that requires a one-word `gloss` per token; for every
      other level — and mixed (Any level) batches — `SYSTEM_PROMPT_STANDARD` keeps the immersive rule
      and omits `gloss`.
- [x] **Show the gloss at Starter** — `sentenceLevel` threaded from
      [HomePage.tsx](src/pages/HomePage.tsx) → [PracticeCard.tsx](src/components/PracticeCard/PracticeCard.tsx) →
      [SentenceTokens.tsx](src/components/SentenceTokens/SentenceTokens.tsx) →
      [WordPopover.tsx](src/components/WordPopover/WordPopover.tsx); renders `token.gloss` in primary
      colour above the lemma row only when `sentenceLevel === 'starter'` and a gloss is present. A1+
      popovers stay exactly as they are.
- [x] _Note:_ the hint applies to explicit Starter selection only; mixed-level batches don't carry
      Starter glosses. Further assistance ideas (first-letter hint, word bank) are parked in the backlog.

**Follow-up (2026-05-31) — universal glosses + word breakdown on the results screen.** Practice
stays immersive, but once the challenge is over the learner should be able to study every word at
any level. Two changes, expanding off the work above:

- [x] **Glosses generated at every level** — the `SYSTEM_PROMPT_STANDARD` / `SYSTEM_PROMPT_STARTER`
      split in [generateSentenceBatch.ts](server/modules/sentence/application/generateSentenceBatch.ts)
      collapses to **one `SYSTEM_PROMPT`** that always requests a one-word `gloss` per token, for
      every level and mixed batches. The cached system block stays byte-identical across pairs _and_
      levels. Immersion is now purely a UI gate, not a generation one. (`WordToken.gloss` comment in
      [shared/languages.ts](shared/languages.ts) updated; old A1+ rows simply lack the gloss and
      degrade gracefully.)
- [x] **Word breakdown on the completed-sentence screen** — `wordBreakdown` threaded through
      [Correction.ts](server/modules/correction/domain/Correction.ts) →
      [correctTranslation.ts](server/modules/correction/application/correctTranslation.ts) →
      [correctionApi.ts](src/api/correctionApi.ts) →
      [HomePage.tsx](src/pages/HomePage.tsx) →
      [CorrectionDisplay.tsx](src/components/CorrectionDisplay/CorrectionDisplay.tsx), whose prompt
      headline now renders clickable [SentenceTokens.tsx](src/components/SentenceTokens/SentenceTokens.tsx).
- [x] **Reveal the gloss at all levels there** — new `alwaysShowGloss` prop on `SentenceTokens` /
      [WordPopover.tsx](src/components/WordPopover/WordPopover.tsx) (`showGloss = (alwaysShowGloss ||
    sentenceLevel === 'starter') && …`). The results screen passes it; `PracticeCard` does not, so
      practice keeps the Starter-only gate.

---

## ⬜ Epic 18 — Same-language practice mode (rewrite, by difficulty)

Today picking the **same language on both sides** is blocked everywhere
([shared/languages.ts](shared/languages.ts) `isValidLanguagePair`, the
[LanguagePairPicker.tsx](src/components/LanguagePairPicker/LanguagePairPicker.tsx) dropdown filter,
and the [useLanguagePair.ts](src/hooks/useLanguagePair.ts) guard). This epic instead treats
**same → same** as a deliberate choice that drops the learner into a **single-language practice
mode**: rather than translating, they **rewrite a prompted sentence within the same language**,
keeping it grammatically and structurally valid, graded by CEFR difficulty. Immersion is preserved —
the prompt and the answer are both in the studied language.

The learner picks the rewrite _task_ via a **button-group toggle** on the practice card:

- **Paraphrase / restructure** — say the same thing a different way (synonyms, reordered clauses,
  voice change) while preserving meaning and staying grammatical. Scored on meaning-preservation
  **+** grammatical correctness **+** how genuinely distinct it is from the original (an echo of the
  prompt shouldn't score well).
- **Tense / register shift** — keep the meaning but change the grammatical frame: shift
  tense/aspect, or move formal ↔ informal. Scored on hitting the requested target frame while
  staying correct and faithful.

**Still to brainstorm (not yet decided):**

- _Scoring._ The current pipeline grades a translation against a target sentence
  ([correctTranslation.ts](server/modules/correction/application/correctTranslation.ts), Epic 14's
  forgiving grade ladder). A same-language rewrite has **no single target** — the model must judge
  meaning-equivalence + correctness + distinctness/target-frame openly. Decide whether this reuses
  the `correction` context with a new prompt/mode flag or warrants a new `practice`/`rewrite`
  bounded context.
- _Generation._ Whether the prompt sentence comes from the existing
  [generateSentenceBatch.ts](server/modules/sentence/application/generateSentenceBatch.ts) flow
  (which currently assumes a learn/guess split + glosses) or a same-language variant of it.
- _Pair model._ `LanguagePair` requires `learnLanguage !== guessLanguage`. Decide how to represent a
  same-language session — an `isValidLanguagePair` carve-out, a `mode` field, or a separate
  selection path — without regressing the normal bilingual flow.
- _UX._ Where the mode toggle lives, how the picker surfaces "same language → practice mode" instead
  of silently filtering it out, and how the results screen explains the score (no canonical answer).
- _Other mechanics parked for later:_ expand/compress to a CEFR target, and fix-the-grammar
  (correct a deliberately broken native sentence).

- [ ] Brainstorm + scope the above before breaking into work items.

---

## ⬜ Epic 19 — Grammar building blocks reference

A reference **info page** that explains the grammatical building blocks of the learner's currently
selected language — **verbs, nouns, adjectives, articles, pronouns, prepositions, conjunctions**,
etc. — reached from a dedicated **main-sidebar icon**. Content is keyed to the active
`learnLanguage` (+ `locale`) from Settings, so a learner studying Spanish sees Spanish grammar and a
learner studying French sees French. Complements immersion practice with an on-demand "how the
language is built" view.

**Decided:**

- **Claude-generated content** — a new bounded context (provisional `grammar`) generates the
  per-language grammar overview + detail via `anthropicClientForUser`
  ([resolveAnthropicClient.ts](server/modules/apiKey/application/resolveAnthropicClient.ts)), reusing
  the Epic 12 access-gate + daily-cap spend path. **Cache per (learnLanguage, locale)** so a visit
  doesn't regenerate (persist generated grammar like `word_breakdown`/`lexeme_stats` are cached) —
  generation should be rare, not per page view.
- **Overview + detail drill-down** — a part-of-speech overview (one section per POS: short
  explanation + example words in the learn language), each expandable into detail: verb
  conjugation patterns, article gender/number, adjective agreement, pronoun sets, etc.
- **Stateless from the UI's perspective** — no user-specific history; the page just reads the active
  pair and requests (or pulls cached) grammar for that language.

- [ ] **`grammar` bounded context** — `server/modules/grammar/` with the four layers
      (`domain`/`application`/`persistence`/`controllers`); `application` orchestrates the Claude
      call through `anthropicClientForUser` and asserts access + daily cap; response parsed via
      [responseParser](server/infrastructure/claude/responseParser.ts) into a typed grammar model
      (POS sections + drill-down blocks).
- [ ] **Caching + schema** — persist generated grammar keyed by `(learnLanguage, locale)` (new
      table via `npm run db:generate`, snapshot + journal per the migration rules in
      [CLAUDE.md](CLAUDE.md)); `application` returns the cached row when present, else generates +
      stores.
- [ ] **`GET /api/grammar`** controller — resolves the requesting user's pair, returns cached-or-
      generated grammar JSON for the active language; 403/429 surface the existing access/cap codes.
- [ ] **API wrapper** — `src/api/grammarApi.ts` on top of
      [client.ts](src/api/client.ts) (no direct `fetch`); a `useGrammar` data hook in
      [src/hooks/](src/hooks/) that reads `useLanguagePair().pair` and fetches on mount / pair
      change.
- [ ] **Page + components** — thin `src/pages/GrammarPage.tsx` composing the hook + a
      `src/components/Grammar/` POS-overview + expandable-detail UI, MD3-styled (theme tokens,
      `@emotion/styled`, [components/shared/](src/components/shared/) loading/section cards) per
      [CLAUDE.md](CLAUDE.md).
- [ ] **Sidebar + route** — add a `Grammar` item with an icon (e.g. an MUI grammar/`Spellcheck`/
      `MenuBook`-family icon, or a custom one like [BangIcon.tsx](src/components/AppShell/BangIcon.tsx))
      to `NAV_ITEMS` in [navigation.ts](src/components/AppShell/navigation.ts); wire `/grammar` in
      [routes.tsx](src/routes.tsx) inside the authed `AppShell` block.
- [ ] **Language-change behaviour** — switching the learn language in Settings re-fetches (or pulls
      the cached) grammar for the new language so the page always matches the active pair.

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
- **Epic 11** — sign in on a fresh account; step through onboarding (pick learn/guess/locale/level —
  **no key step**) and confirm a sentence is already present (no spinner) on landing; switch to a
  brand-new locale/level and confirm the warm hides the wait; reload and confirm the pair persists from
  the account (not just localStorage). Also confirm the steady-state refill: page through a full batch
  and verify no "Next" press stalls on generation.
- **Epic 12** — with the operator key configured and no own key on the account, confirm practice works
  (sentences + corrections run on the operator key); confirm the access gate blocks a non-approved /
  over-cap account with a clear screen and never silently spends; if hybrid, confirm an own key in
  Settings overrides the operator key.
- **Epic 13** — favicon shows in the browser tab + bookmarks; "add to home screen" shows the app icon;
  the logo renders in the app bar/login in light/dark; `grep -rE '#[0-9a-f]{3,6}' src` still only
  matches `src/theme/tokens.ts`.
- **Epic 14** — a perfect answer → A+; the same answer with missing punctuation/lowercase → still A+;
  an accurate-but-stiff phrasing ("I am enchanted by you") → lands at A, not A+; a half-wrong answer →
  B/C/D/F by word %. Reload history and confirm stored grades are stable.
- **Epic 15** — enable auto-speak; load a new sentence and confirm it speaks after the configured delay
  (~1 s default), uses the learn-language voice, and cancels cleanly on "Next"; the manual speaker
  button still works; the toggle/delay persist across reload.
- **Epic 16** — click the sidebar Feedback button, submit, and confirm the row persists and appears in
  the admin view; confirm key events are recorded; QA the dialog in light/dark/system + mobile.
- **Epic 17** — the level menu shows a single **Starter** below A1 (no Foundation); a pre-existing
  Foundation account/sentence now reads Starter; at Starter, clicking a word shows its meaning in the
  popover; switch to A1+ and confirm the popover never shows a meaning _while practicing_ (immersion
  intact). Then submit an A1+ answer and on the results screen confirm the prompt's words are
  clickable and **do** show their meaning (new sentence needed for a gloss to exist above Starter).
- **Epic 19** — open the Grammar page from the sidebar icon; confirm it shows the POS overview for
  your current learn language with example words in that language, and that each section expands into
  detail (conjugation/agreement tables). Change the learn language in Settings and confirm the page
  re-renders with the new language's grammar (served from cache on the second visit, not
  regenerated). Confirm access-gate/daily-cap behaviour matches other spend paths, and QA the page in
  light/dark/system + mobile with no hardcoded colors.

Use the `/verify` skill for end-to-end confirmation and `/code-review` before declaring an epic
done. Each epic is a natural PR/commit boundary.

---

## Backlog / parking lot

Ideas captured but not yet scoped into a numbered epic:

- **Cloud neural TTS** — higher-quality, consistent voices via a paid TTS service; adds a server
  dependency, another key, and per-play cost/caps. The upgrade path beyond Epic 15's browser Web Speech.
- **Admin feedback inbox + analytics dashboards** — richer aggregation/visualization over Epic 16's
  `feedback` + `events` tables.
- **More Starter assistance** — beyond Epic 17's click-to-reveal gloss: a first-letter hint, a
  word bank / pickable tiles, or a "reveal answer" affordance for the Starter level.
