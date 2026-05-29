# Conjecter — Feature Roadmap

Living roadmap for the post-MVP feature work. Build order was chosen deliberately: the
**language generalization refactor first** (it touches the most files), then the small
contained features, then a **full Material Design 3 overhaul last** (so it styles the final
component set once). See [BLUEPRINT.md](BLUEPRINT.md) for product/architecture context and
[CLAUDE.md](CLAUDE.md) for the layer rules that govern every change here.

## Status at a glance

| Epic | Scope | Status |
| ---- | ----- | ------ |
| 0 | Tab title → "Conjecter" | ✅ Done (merged) |
| 1 | Language generalization + CEFR levels + word-breakdown data + location→locale | ✅ Done (merged + deployed) |
| 2 | Word-root-on-click UI | ✅ Done |
| 3 | Text-to-speech + rate slider | ⬜ Not started |
| 4 | Full MD3 overhaul + centered "Google homepage" layout | ⬜ Not started (last) |

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

## ⬜ Epic 4 — Full MD3 overhaul + centered layout (last)

Done last so it styles the final component set (including Epics 2–3 UI) once. The "Google
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
