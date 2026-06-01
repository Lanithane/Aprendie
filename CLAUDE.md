# Project Rules (read me first)

This file is auto-loaded by Claude Code when working in this repo. Treat it as authoritative when editing code.
Contextual memory, decision logs, and session state are also maintained in the `.claude/` directory. See BLUEPRINT.md for the wider product/architecture context.

## Architecture: DDD per bounded context (backend)

The backend (`server/`) is organized by bounded context, each with the same four layers. Never bypass a layer.

```
server/
├── main.ts                           # bootstrap only
├── env.ts                            # zod-validated env
├── types/express.d.ts                # ambient types
├── infrastructure/                   # cross-cutting, no domain logic
│   ├── db/{client,schema,migrate}.ts
│   ├── crypto/encryption.ts          # generic AES-256-GCM
│   ├── claude/{anthropicClient,responseParser}.ts
│   ├── session/sessionMiddleware.ts
│   └── http/{requireAuth,errorHandler}.ts
└── modules/<context>/                # bounded contexts
    ├── domain/                       # pure types, value objects, domain errors. NO I/O.
    ├── application/                  # use cases: orchestrate domain + persistence + infrastructure
    ├── persistence/                  # repository functions; only place Drizzle is touched per module
    └── controllers/                  # Express routers; validate input, call application, shape responses
```

Current contexts: `auth`, `user`, `apiKey`, `sentence`, `correction`, `language` (stateless — `application/` + `controllers/` only, no persistence/domain).

**Layer rules — do not break:**

- **controllers/** import only from `application/`, `domain/`, and `infrastructure/http/`. They translate HTTP ↔ application calls, validate inputs (zod), and shape JSON responses. No business logic, no DB access.
- **application/** imports from `domain/`, `persistence/` (own module), other modules' `application/` (cross-module orchestration), and `infrastructure/`. This is the only place use-case logic lives.
- **persistence/** imports only Drizzle + `infrastructure/db/`. Exposes plain async functions returning rows or `null`. No HTTP concerns, no Anthropic calls.
- **domain/** has no imports beyond shared types and Drizzle row types. Pure.
- **infrastructure/** never imports from `modules/`. (Exception: `errorHandler` imports module-level error classes so it can map them to status codes — that's the one allowed inversion.)

When adding a new feature, ask: which bounded context owns this? If none, create a new `modules/<name>/` with the four subfolders. If a use case spans two contexts, the orchestrating call lives in one module's `application/` and calls into the other module's `application/` (never directly into another module's persistence).

## Frontend conventions

```
src/
├── api/                              # per-domain fetch wrappers (sentenceApi, correctionApi, ...). Components NEVER call fetch directly.
├── auth/                             # AuthContext + provider
├── components/
│   ├── shared/                       # reusable across pages (LoadingSpinner, SectionCard)
│   └── <Feature>/<Feature>.tsx       # feature components
├── hooks/                            # ALL custom hooks live here, one per file
├── pages/                            # route-level components; thin compositions of hooks + components
├── history/                          # localStorage history (will move server-side eventually)
└── ThemeModeProvider.tsx, routes.tsx, main.tsx, App.tsx
```

### Component rules

- **Pages are thin.** A page composes hooks + components. If a page is >80 lines, you've absorbed logic that belongs in a hook or sub-component.
- **Reach for `components/shared/` first.** Loading states, section cards, etc. — extend the shared component or add a new one rather than inlining MUI again.
- **Styling:** prefer `@emotion/styled` template literals (`styled.div`...`) over `sx` for non-trivial styles. See [feedback in memory] / BLUEPRINT.md.

### Material Design 3 (the design system — authoritative)

The UI follows **Material Design 3** (https://m3.material.io). The MD3 system was established in Epic 9
and every new screen/component must be built in it — do **not** restyle later. Rules:

- **Color comes only from theme tokens — never hardcode a hex.** `src/theme/tokens.ts` is the single
  source of color truth and is **generated** — do not hand-edit it. It holds **8 selectable themes**
  (`THEMES` registry; Spanish names: `abra`, `costa`, `vinedo`, `duna`, `mango`, `cerezo`, `lavanda`,
  `tinta`),
  each with a full light + dark MD3 scheme. Each theme spec uses **all five colours of its source
  palette**: three accent seeds (primary/secondary/tertiary) plus the palette's light member as the
  **light-mode surface seed** and its dark member as the **dark-mode surface seed** (so light surfaces
  are the cream, dark surfaces are the dark colour, and on-surface text carries that hue). To add/change
  a theme, edit its seed spec in [scripts/gen-md3-tokens.ts](scripts/gen-md3-tokens.ts) and run
  `npm run gen:tokens` (build-time only; `@material/material-color-utilities` is a devDependency, never
  imported at runtime — the script also prettier-formats the output). The generator stays because it
  derives the ~37 contrast-correct roles per mode (on-\* pairs, container tones, the surface-elevation
  ladder, state layers) that 5 raw colours can't safely cover.
- **Theme + mode are both user prefs.** [ThemeModeProvider.tsx](src/ThemeModeProvider.tsx) owns the
  selected `themeId` (`aprendie:themeId`) and light/dark/system `mode` (`aprendie:themeMode`) and builds the MUI
  theme via `createAprendieTheme(themeId, resolvedMode)`. The picker lives in Settings
  ([ThemePicker.tsx](src/components/ThemePicker/ThemePicker.tsx)); every theme adapts to light & dark.
  Components must stay theme-agnostic — read roles off `theme.palette.*`, never assume a specific hue.
- **Read roles off the theme** in styled components: `theme.palette.primary/secondary/error` plus the
  MD3 roles added in [src/theme/theme.d.ts](src/theme/theme.d.ts) —
  `tertiary`, `surfaceContainer{Lowest…Highest}`, `surfaceVariant`, `outline`, `outlineVariant`,
  `secondaryContainer`/`onSecondaryContainer`, `tertiaryContainer`, `errorContainer`, `inverse*`, etc.
  MUI's `success`/`warning`/`error` carry **fixed semantic ramps** (green/amber/red) generated from
  standard seeds in [scripts/gen-md3-tokens.ts](scripts/gen-md3-tokens.ts), theme-independent like
  `error` — so `color='success'`/`'warning'` always read as a traffic-light no matter the selected
  palette (a 99 score is always green, a 20 always red). `info` follows the theme's secondary. Use
  [src/theme/scoreColor.ts](src/theme/scoreColor.ts) for the 0–100 score→color mapping.
- **Elevation = surface-container tone, not a shadow overlay.** Fills/cards use `surfaceContainer*`
  tokens; the dark-mode `MuiPaper` white overlay is disabled in the theme. Don't reintroduce it.
- **Type:** use MUI typography variants — they're mapped to the MD3 type scale in
  [src/theme/index.ts](src/theme/index.ts) (`h3`=display-small … `h6`=title-large, `body1/2`=body,
  `button`/`overline`/`caption`=label/body roles, no all-caps). Don't set ad-hoc font sizes.
- **Shape:** route corners through the theme (cards 16, buttons pill, chips 8, menus/popovers 8–12);
  avoid bespoke `border-radius` values.
- **Centered layout:** [AppShell.tsx](src/components/AppShell/AppShell.tsx) centers content in a
  max-width column; pages that should float vertically (HomePage) use auto block margins.
- All theme work routes through [ThemeModeProvider.tsx](src/ThemeModeProvider.tsx) (light/dark/system).
  Before declaring UI work done, QA in **all three modes** and at mobile width, and confirm
  `grep -rE '#[0-9a-f]{3,6}' src` only matches `src/theme/tokens.ts`.

### `useEffect` rules

- **Don't reach for `useEffect` first.** Prefer derived state, event handlers, and `useMemo`.
- **When `useEffect` is genuinely required** (data fetching on mount, subscribing to external state like `storage` events / `matchMedia`, focusing a DOM node on prop change), extract it into a custom hook in `src/hooks/`. Pages and components should not own `useEffect` calls directly.
- Naming: `use<Noun>` for data hooks (`useCurrentSentence`, `useHistory`), `use<NounPref>` for persisted preferences (`useLanguagePair`, `useLevelPreference`).
- Provider components (`AuthProvider`, `ThemeModeProvider`) are the one exception — they may hold an effect for the global subscription they own.

### API layer

- Components and hooks call functions from `src/api/<domain>Api.ts`, never `fetch` directly.
- `src/api/client.ts` owns the single `fetch` wrapper and the `ApiError` type. Domain modules build on top of it.

## Shared types

`shared/` holds types imported by both `src/` and `server/`. Keep it small — only what genuinely crosses the wire or is a shared registry: `shared/languages.ts` (the language/locale registry, `LanguagePair`, `WordToken`) and `shared/levels.ts` (the CEFR-aligned `LEVELS` ladder). Don't put domain logic here.

## Database migrations (Drizzle)

Schema lives in [server/infrastructure/db/schema.ts](server/infrastructure/db/schema.ts). Migrations live in `drizzle/` as numbered `NNNN_name.sql` files, with a parallel **snapshot** per migration in `drizzle/meta/NNNN_snapshot.json` and an entry in `drizzle/meta/_journal.json`. The snapshot chain is the baseline `db:generate` diffs against — and it is easy to silently break.

**The rule: never hand-author a migration `.sql` without its matching snapshot.** Always go through `npm run db:generate` after editing `schema.ts` — it writes the `.sql`, the `meta/NNNN_snapshot.json`, and the journal entry together, keeping the chain continuous. Then apply with `npm run db:migrate` (local) — prod migrates automatically on deploy.

- If you must hand-edit the generated SQL (custom data backfill, a seed `INSERT`, `IF NOT EXISTS` guards), still run `db:generate` first so the snapshot + journal are produced, then edit only the `.sql` body. Do not write a `.sql` + journal entry by hand and skip the snapshot.
- A **missing snapshot poisons `db:generate` for everyone after it**: with the latest snapshot stale, the next diff bundles unrelated drops+adds and trips drizzle-kit's interactive rename prompt, which dies without a TTY (`promptColumnsConflicts`). This happened to `0011`/`0012` and had to be repaired by regenerating the missing snapshots. Don't reintroduce it.
- The journal's `when` timestamps **must increase monotonically** — the migrator applies an entry only when its `when` exceeds the highest `created_at` already recorded in `__drizzle_migrations`, so a non-increasing `when` is silently skipped, applying nothing (see the roadmap memory's "migration gotcha"). This is a live hazard here because several early migrations (≈`0013`–`0017`) were hand-authored with round, **future-dated** `when` values; until the real clock passes them, `drizzle-kit generate`'s real-time stamp lands *below* that ceiling and the new migration would be skipped. **This is now handled automatically:** `npm run db:generate` runs [scripts/normalize-migration-journal.ts](scripts/normalize-migration-journal.ts) right after drizzle-kit, which raises any non-increasing newest `when` to `prev + 1`. Don't hand-set `when` yourself; if you do, keep it strictly larger than the previous entry's (the script will otherwise fix it). It self-heals once wall-clock time passes the inflated baseline.
- Verify after generating: `git status drizzle/` should show the new `.sql`, the new `meta/NNNN_snapshot.json`, and the `_journal.json` change — three artifacts, never just the `.sql`. A clean re-run of `db:generate` should then report "No schema changes".

## Lint / format

Code style is enforced by ESLint + Prettier (config in `eslint.config.js`, `prettier.config.cjs`): single quotes, no semicolons, 2-space indent, 100-col width. Run `npm run typecheck` and `npm run lint` before declaring work done.

## When in doubt

If a refactor would break one of the layer rules above, stop and either re-shape the change so it doesn't, or surface the conflict to the user — don't quietly route around the architecture.
