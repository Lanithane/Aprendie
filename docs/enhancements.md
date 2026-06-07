# Enhancements

A running log of notable performance and UX enhancements, with the rationale and the key files
involved. Newest first.

---

## 2026-06-06 — Sliding scale leniency + sentence cooldown

Fixed two bugs that caused the same sentence to repeat over and over, especially on new accounts.

### 1. Score-based resurface threshold (not "imperfect")

The review signal previously re-drilled a sentence whenever its attempt was `isCorrect: false`,
meaning a good paraphrase of a long sentence scored B/A but still got treated as a miss. Now the
re-drill threshold is **score < 65** (D/F only — meaning largely lost).

- [`AttemptSignal`](../server/modules/sentence/domain/selectSentence.ts) carries `score: number`
  instead of `isCorrect`. `buildReviewSignal` uses the score threshold; A/B/C paraphrases never
  enter the mistake set.
- **Latest-attempt-per-sentence deduplication**: if the learner later aces a sentence (score ≥ 65),
  it exits the drill set immediately — the most-recent attempt per sentence id wins.
- [`listRecentAttemptSignals`](../server/modules/sentence/persistence/sentenceRepository.ts) now
  selects `attempts.score` instead of `attempts.isCorrect`.

### 2. Cooldown window — no sentence ever repeats immediately

`selectNext` now excludes the 3 most-recently-served sentences from consideration on every pick.
The cooldown auto-relaxes when the corpus is too small to honor it (always leaves at least one
servable candidate). A wrong answer returns no sooner than the 4th sentence.

- `cooldownWindow: 3` added to
  [`SelectionWeights`](../server/modules/sentence/domain/selectSentence.ts) (default 3, tunable).

### 3. Cold-start runway raised to 2 sentences

A brand-new account now generates **2 sentences inline** instead of 1, so the cooldown window
always has at least two distinct sentences to rotate through before the background batch lands.

- `COLD_START_SIZE = 2` in
  [`sentencePool`](../server/modules/sentence/application/sentencePool.ts).

### 4. Grading prompt — explicit long-sentence paraphrase leniency

Extended the existing meaning-preserving-variation rule in the grader system prompt to explicitly
cover **full-clause restructuring of longer sentences**: a faithful paraphrase (reordered clauses,
same meaning) scores A/B range, not a failure.

- [`SYSTEM_PROMPT_TEXT`](../server/modules/correction/application/scoreTranslation.ts)

---

## 2026-06-06 — Submission grading latency + cold-start first sentence

Two related pushes on perceived load time: how fast a graded result comes back after the learner
submits a translation, and how fast the very first sentence appears for a brand-new account.

### 1. Streaming grades (biggest win, scales with level)

Grading is one non-streamed Sonnet call ([`scoreTranslation`](../server/modules/correction/application/scoreTranslation.ts)),
and its latency is dominated by **output token generation**. Harder sentences (B1+) produce longer
corrected answers and more mistakes, so the wait grows with level. Previously the client showed a
bare spinner until the entire JSON was generated.

The grade now streams end-to-end over SSE so the corrected answer and mistakes reveal as they
generate — the benefit grows with output length, i.e. with level.

- **Server**: new `POST /api/correct/stream` (SSE) alongside the existing JSON `POST /api/correct`
  ([`correctionController`](../server/modules/correction/controllers/correctionController.ts)).
  Gate/lookup errors (cap, spend pause, not-found) still throw **before** the first delta, so they
  return conventional HTTP statuses; then `delta` events flow, ending in a single `done`
  (authoritative `CorrectionView`) or `error`. SSE is opted out of the global `compression()`
  middleware via `Cache-Control: no-transform`, and the model call aborts if the learner navigates
  away mid-grade.
- **Scoring refactor**: blocking and streaming paths share one gate → score → persist spine and
  **finalize identically** (same score floor, stiff cap, grade mapping), so a streamed grade is
  scored exactly like a blocking one
  ([`correctTranslation`](../server/modules/correction/application/correctTranslation.ts)).
- **Client**: `submitCorrectionStream` reads the SSE body with a small string-aware partial-JSON
  parser that reveals only *complete* fields ([`correctionApi`](../src/api/correctionApi.ts)).
  [`useCorrectionSubmission`](../src/hooks/useCorrectionSubmission.ts) exposes a `preview` and
  **falls back to the blocking endpoint** if a proxy buffers SSE or the stream drops mid-grade.
- **UI**: [`StreamingCorrection`](../src/components/CorrectionDisplay/StreamingCorrection.tsx) renders
  the live preview (shared styled atoms factored into
  [`correctionStyles`](../src/components/CorrectionDisplay/correctionStyles.ts), reused by the
  finished [`CorrectionDisplay`](../src/components/CorrectionDisplay/CorrectionDisplay.tsx)). The
  verdict + grade are held back until the authoritative result lands, so nothing snaps to a new value
  when grading finishes.

### 2. Server-side critical-path trimming (across the board)

Small, level-independent wins on every submission, wrapped around the model call:

- **`getSettings` memoized** ([`appSettings`](../server/modules/settings/application/appSettings.ts)):
  the settings singleton was read **3× per non-admin grade** (spend gate + two cap lookups), each an
  uncached `SELECT`. Now cached in-process for a short TTL, refreshed on update.
- **Pre-LLM reads parallelized**: the daily-cap count and the sentence lookup are independent, so they
  run concurrently (awaited in priority order to preserve error precedence).
- **Post-LLM writes parallelized + Palabradex deferred**: the attempt-history insert and the daily
  counter bump run via `Promise.all`, and the per-word Palabradex aggregation
  ([`recordAttempt`](../server/modules/history/application/recordAttempt.ts)) is now fire-and-forget
  off the response path (a best-effort derived aggregate).
- **Output trimming**: the grader returns an empty `correctedAnswer` when the learner's answer was
  already perfect (instead of re-emitting the whole sentence); the server falls back to the learner's
  own text. Saves output tokens on the happy path.

### 3. Cold-start first sentence (new accounts / cold slices)

A brand-new account at a level with no shared corpus hit an inline single-sentence generation behind
a bare spinner. Two problems surfaced:

- **Concurrent generation rate-limit (the "stuck for a minute")**: the inline cold-start had **no
  in-flight dedup**, and React StrictMode double-fires the fetch effect in dev — so the first sentence
  kicked off **two concurrent generations** for the same empty slice, which rate-limited each other
  into the SDK's retry backoff (~a minute). The same gap affects genuinely concurrent users in prod.
  Fixed by sharing **one in-flight generation per slice** in
  [`refillPool`](../server/modules/sentence/application/sentencePool.ts) (an in-process map, the inline
  analogue of the background batch's jobs-table guard). A one-line latency log surfaces cold-start
  time (and any retry backoff) in the server console.
- **Cold practice page**: onboarding previously fired a background batch on *every* dropdown change
  (minutes to land, never warm in time). Replaced with a single **blocking** warm on "Start":
  `POST /api/sentence/warm` → `ensureWarmFirstSentence`
  ([`getNextSentence`](../server/modules/sentence/application/getNextSentence.ts),
  [`sentenceController`](../server/modules/sentence/controllers/sentenceController.ts)), awaited by
  [`useOnboarding`](../src/hooks/useOnboarding.ts). The practice page then lands on a **warm** corpus
  (no inline gen there). Removed the now-dead `usePoolWarming` hook, `warmPool`, and the `/prewarm`
  route.
- **Friendlier loading**: a "Preparing your first few sentences…" state
  ([`PreparingSentences`](../src/components/shared/PreparingSentences.tsx)) shows in the wizard while
  warming and as the practice page's cold first-load state, replacing the bare spinner.

### Notes / things to verify in a real environment

- The SSE streaming benefit (progressive reveal vs. buffered) should be confirmed behind the prod
  proxy — `Cache-Control: no-transform` + `X-Accel-Buffering: no` are set for that, with the blocking
  endpoint as a fallback.
- The grader's ~840-token system prompt is **under Sonnet 4.6's 2048-token minimum cacheable prefix**,
  so its `cache_control` marker is likely a no-op (a cost/TTFT detail, not the latency driver).
