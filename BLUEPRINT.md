# Guess-and-Correct — Spanish Learning Tool

## Context

Build a Spanish-language learning SPA from scratch. The user is shown a Spanish sentence in the center of the screen, types an English translation, submits, and the app reveals the correct answer plus a per-word breakdown of mistakes (including which Spanish source words they misunderstood). A "Next" button advances to a new sentence.

**Driving decisions from clarifying Qs:**

- Direction: Spanish → English
- Engine: full Claude API for both sentence generation and correction
- API key: each user supplies their own Anthropic key
- Storage: server-side encrypted (NOT localStorage — XSS on a paid key is unacceptable). This means a backend is required.
- Auth: "Sign in with Google" gates app access (Anthropic offers no OAuth for API access; this is OAuth into _our_ app)

This is more architecture than a pure-frontend MVP, but it's what the security posture demands once a real-spend API key is involved.

## High-level architecture

Single Railway deployment, one repo, monorepo-lite layout. One Node process:

- Serves the built React SPA as static files
- Exposes `/api/*` REST endpoints
- Talks to Postgres (Railway add-on) and Claude (Anthropic SDK)

| Concern                     | Choice                                                                                                                             | Why                                                                                                                                                                                                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend build              | Vite 7 + React 19 + TypeScript                                                                                                     | mirrors the `forfold` scaffold repo                                                                                                                                                                                                                                    |
| UI                          | MUI 9 (`@mui/material@9.0.1`) + emotion                                                                                            | latest per user; newer than forfold's MUI 7 — verify Drawer/Select API hasn't shifted vs that scaffold                                                                                                                                                                                                |
| Component styling           | `@emotion/styled` template literals — `const StyledCard = styled.div\`...\``— preferred over inline`sx` for non-trivial components | per user preference for styled-components pattern. Note: if you specifically want the standalone `styled-components` library (not emotion), swap MUI's engine to `@mui/styled-engine-sc` and add `styled-components` + `@types/styled-components` deps. The authoring syntax is identical either way. |
| Router                      | React Router 7                                                                                                                     | mirrors forfold                                                                                                                                                                                                                                                                                       |
| Backend                     | Express + TypeScript (tsx in dev)                                                                                                  | well-trodden, simple Railway story                                                                                                                                                                                                                                                                    |
| DB                          | Postgres (Railway add-on)                                                                                                          | matches user's other Drizzle work                                                                                                                                                                                                                                                                     |
| ORM                         | Drizzle                                                                                                                            | matches the `ehs-form-consumer` repo                                                                                                                                                                                                                |
| Auth                        | Passport.js + `passport-google-oauth20` + `express-session` + `connect-pg-simple`                                                  | most stable Express+Google story; avoids Next-coupled Auth.js                                                                                                                                                                                                                                         |
| Sessions                    | Postgres-backed (connect-pg-simple)                                                                                                | survives restarts; one storage layer                                                                                                                                                                                                                                                                  |
| Key encryption              | `node:crypto` AES-256-GCM                                                                                                          | no extra dep; standard                                                                                                                                                                                                                                                                                |
| Claude SDK                  | `@anthropic-ai/sdk`, server-side only                                                                                              | mirrors ehs-form-consumer pattern                                                                                                                                                                                                                                                                     |
| Model                       | `claude-sonnet-4-6` for corrections, `claude-haiku-4-5-20251001` for batch sentence gen                                            | Sonnet for explanatory quality; Haiku for cheap bulk generation. Prompt caching enabled on both.                                                                                                                                                                                                      |
| Lint/format                 | ESLint flat config + Prettier-as-rule (`semi: false`, `singleQuote`, `printWidth: 100`)                                            | direct copy from forfold                                                                                                                                                                                                                                                                              |
| Diff for correction display | `diff` package (~30kb)                                                                                                             | per "avoid bloat" guidance; lodash/moment explicitly out                                                                                                                                                                                                                                              |
| Dates                       | `date-fns@4` (import per-function, tree-shakeable)                                                                                 | per user preference; satisfies "no moment / no bloat" guidance                                                                                                                                                                                                                                        |

## Project layout

```
guess-and-correct/
├── package.json                  # single root package
├── tsconfig.json                 # base (paths, strict)
├── tsconfig.frontend.json        # extends base; browser libs, src/
├── tsconfig.backend.json         # extends base; node libs, server/
├── vite.config.ts                # plugins:[react()], proxy /api → :3000 in dev
├── eslint.config.js              # copy forfold's flat config
├── prettier.config.cjs           # copy forfold's
├── railway.json                  # build + start commands
├── drizzle.config.ts
├── docker-compose.yml            # local Postgres
├── .env.example
├── index.html                    # Vite entry
├── public/
├── src/                          # FRONTEND
│   ├── main.tsx, App.tsx, theme.ts, routes.tsx
│   ├── api/                      # fetch wrappers
│   ├── auth/                     # AuthContext, useUser, route guard
│   ├── components/
│   │   ├── AppShell/             # sidebar + main layout
│   │   ├── Sidebar/              # collapsible MUI Drawer (permanent ≥md, temporary <md)
│   │   ├── PracticeCard/         # Spanish sentence + English input + submit
│   │   ├── CorrectionDisplay/    # answer reveal + per-word diff + mistakes list + Next
│   │   └── ApiKeySetup/          # first-run key entry, validates before save
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── HistoryPage.tsx       # localStorage-backed list
│   │   ├── SettingsPage.tsx      # locale, replace key, sign out
│   │   └── LoginPage.tsx
│   ├── history/                  # localStorage helpers (per requirement)
│   └── locale/                   # es-MX, es-ES, es-AR constants
├── server/                       # BACKEND
│   ├── index.ts                  # bootstrap, static dist/, /api router
│   ├── env.ts                    # zod-validated env
│   ├── auth/{passport,session,routes}.ts
│   ├── crypto/apiKey.ts          # AES-256-GCM encrypt/decrypt
│   ├── claude/{client,sentences,correction}.ts
│   ├── db/{schema,client,migrate}.ts
│   ├── routes/{apiKey,sentences,correct,me}.ts
│   └── middleware/requireAuth.ts
└── shared/
    └── types.ts                  # API request/response types, imported by both sides
```

## Key implementation decisions

**Auth flow.** `/api/auth/google` redirects to Google; `/api/auth/google/callback` find-or-creates a row in `users` (keyed by Google `sub`), sets the session cookie, redirects to `/`. Frontend `AuthContext` calls `GET /api/me` on boot; if 401, render `LoginPage`.

**API key handling.** First-run flow: if `users.encrypted_anthropic_key IS NULL`, show `ApiKeySetup`. POST to `/api/key` → server makes a 1-token test call to Anthropic to validate, then encrypts with AES-256-GCM (key from `ENCRYPTION_KEY` env var, 32 random bytes base64). Stores ciphertext + IV + auth tag. Decrypted in-memory only per request; never logged. **Epic 7 hardened this** (see [encryption.ts](server/infrastructure/crypto/encryption.ts)): the AES key is now an HKDF subkey derived per-record from the master key + the owning `userId`, and `userId` is also the GCM AAD — so a ciphertext is cryptographically bound to its row and can't be transplanted. Blobs are versioned (`v3$iv$ct$tag`) under a single `ENCRYPTION_KEY`; with no real users yet, master-key rotation is a wipe-and-re-enter (null the column, users re-paste) rather than a multi-key migration — see [docs/key-rotation-runbook.md](docs/key-rotation-runbook.md).

**Security decisions.** _Master key storage:_ the `ENCRYPTION_KEY` lives in Railway's env vars, treated as a sufficiently-secret managed secret for the current threat model (single deployment, pre-scale). A KMS / managed-secret service is **deliberately deferred** — with no real users yet, rotating the key is a cheap wipe-and-re-enter, so moving later is low-cost. Revisit if the blast radius grows (multi-service, untrusted operators, or compliance needs).

**Sentence generation (batched).** When the user's `sentence_cache` for `(user_id, locale)` has < 3 unconsumed rows, call Haiku once with a prompt that returns 10 sentences as JSON: `[{ spanish, expectedEnglish, difficulty, grammarFocus }]`. Insert all 10 into `sentence_cache`. `GET /api/sentence` pops the next unconsumed one. ~10× fewer API calls than per-request generation.

**Correction prompt.** `POST /api/correct { sentenceId, userEnglish }` → Sonnet with structured JSON output:

```ts
{
  isCorrect: boolean,
  score: number,         // 0-100
  correctedEnglish: string,
  mistakes: Array<{
    userPhrase: string,        // what the user wrote that was wrong
    correctPhrase: string,     // what it should have been
    spanishSource: string,     // the Spanish word(s) they misunderstood
    explanation: string,       // brief, learner-friendly
  }>,
  notes?: string,        // optional grammar/cultural tip
}
```

Use prompt caching on the system prompt (locale, output schema, examples) so repeated corrections amortize.

**Correction display.** `CorrectionDisplay` shows: (1) user's answer with word-level diff highlight via `diff`; (2) the correct answer; (3) mistakes list — each mistake shows the Spanish source word in a Chip, the user's misinterpretation, and Claude's explanation; (4) "Next" button — clears state, requests next sentence, returns to initial UX.

**History.** Per original requirement: localStorage. Keyed by `gac:history:${userId}:${locale}`. Schema: `{ id, spanish, expectedEnglish, userEnglish, correctionJson, createdAt }`. Append on each completed attempt. `HistoryPage` renders a sortable list; clicking a row re-opens the full correction.

**Locale.** v1 supports Spanish variants: `es-MX` (default), `es-ES`, `es-AR`. Stored in localStorage. Passed into both sentence-generation and correction prompts as a regional vocabulary/idiom hint. Sidebar has a `Select` to change it.

**Sidebar.** MUI `Drawer` — `variant="permanent"` ≥md (collapses to icon rail via IconButton), `variant="temporary"` <md (slide-in). Items: Home, History, Settings, divider, Sign Out.

**Stretch — multi-language.** Add `targetLanguage` + `nativeLanguage` to settings (defaults `es-MX` / `en-US`). Plumb both into prompts. UI labels become language-agnostic. Defer past v1.

**Stretch — a11y.** `aria-live="polite"` on `CorrectionDisplay` to announce results; ensure all interactive elements keyboard-reachable; focus management on Next.

## Reused patterns

- **Vite/React/MUI scaffold + ESLint/Prettier** — copy from the `forfold` scaffold repo's `vite.config.ts`, `eslint.config.js`, `prettier.config.cjs`, and `tsconfig.json`. Same versions for the scaffold (React 19.2, Vite 7.1, TS 5.9), but **upgrade MUI to 9.0.1** (latest) — forfold is on 7.3, so import paths and a few prop shapes may differ; check Drawer, Select, and Chip when wiring up the sidebar and correction display.
- **Anthropic SDK server-side pattern** — mirror the `ehs-form-consumer` repo's `src/app/api/extract/route.ts` (per-request SDK instance, model `claude-sonnet-4-6`, structured JSON output, try/catch + log + 500). Modified here: API key is per-user decrypted, not from env.
- **Drizzle + Postgres** — see ehs-form-consumer's `drizzle-orm` + `drizzle-kit` usage; we use `pg` driver against Railway Postgres (not Neon).
- **Commit style** — lowercase, action-led (`init project`, `add google oauth`, `wire claude correction route`) — matches forfold's git log.

## Implementation steps (sequenced)

1. `git init`; add `.gitignore` (node_modules, dist, .env, .env.local); copy ESLint/Prettier/TS configs from forfold; install deps.
2. Frontend skeleton — App, theme, routes (`/`, `/history`, `/settings`, `/login`), AppShell + Sidebar, stubbed API client.
3. Backend skeleton — Express, env validation, static-serve `dist/`, `/api/health`.
4. DB — Drizzle schema (`users`, `sentence_cache`, `session` for connect-pg-simple); `docker-compose.yml` for local Postgres; first migration.
5. Auth — Passport + Google strategy + session middleware + Postgres session store; `/api/auth/*` and `/api/me`; frontend AuthContext + route guard + LoginPage.
6. API key — `crypto/apiKey.ts` (AES-256-GCM); `/api/key` POST/DELETE/status; `ApiKeySetup` first-run flow.
7. Claude — `claude/sentences.ts` (batch generator, Haiku); `claude/correction.ts` (Sonnet); `/api/sentence` + `/api/correct`.
8. Practice UX — `PracticeCard` + `CorrectionDisplay`; word-diff via `diff`; Next clears + fetches.
9. History page — localStorage list, click-to-expand.
10. Settings — locale picker, replace-key, sign-out.
11. Railway — `railway.json` (build: `npm ci && npm run build`, start: `npm start`); add Postgres add-on; configure env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY`, `BASE_URL`, `NODE_ENV`); register `https://<railway-domain>/api/auth/google/callback` in Google Cloud Console.
12. Stretch (deferred unless requested) — mobile drawer polish, a11y pass, multi-language settings.

## Execution checkpoints (where I'll pause for you)

Per your instruction, I'll pause and prompt at these gates (and auto-accept otherwise):

1. **After `git init` + scaffold deps installed** — quick status check before moving on.
2. **Railway project creation** — you log in to railway.app, create a new project, and link the repo (or share a `railway login` + `railway init` confirmation). I'll wait.
3. **Railway Postgres add-on** — I'll tell you exactly how (Railway dashboard → New → Database → PostgreSQL); you provision; then paste/confirm `DATABASE_URL` is available as a service variable.
4. **Google Cloud Console OAuth credentials** — I'll list the exact steps (create OAuth client, authorized origins, callback URL = `http://localhost:3000/api/auth/google/callback` for dev + the Railway URL for prod). You hand back `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.
5. **Anthropic key for your own first-run test** — once the app is up, you sign in and paste your own Anthropic API key into settings to validate the full loop.

## Verification

- **Local dev** — `npm run dev` runs Vite (`:5173`) + backend (`:3000`) concurrently (via `concurrently`); Vite dev-proxies `/api` → `:3000`. Local Postgres via `docker compose up`.
- **End-to-end smoke** — sign in with Google → enter API key (rejected if invalid) → see Spanish sentence → submit translation → see correction with diff + mistakes → click Next → check `/history` shows the attempt → change locale in sidebar → next sentence reflects new locale.
- **Auth boundary** — `curl /api/sentence` unauthenticated → expect 401.
- **Encryption** — inspect `users.encrypted_anthropic_key` in psql — must be opaque ciphertext, not the plaintext key. A row decrypted with the wrong `ENCRYPTION_KEY` must fail cleanly (not silently return garbage).
- **Railway prod smoke** — same flow on the deployed URL; sessions persist across reloads; OAuth callback resolves.
- **Stretch checks** — axe-core run; keyboard-only traversal of practice loop; iPhone-width viewport in DevTools.
