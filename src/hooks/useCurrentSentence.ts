import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSentence, type SentenceDto } from '../api/sentenceApi'
import { categoryByDomain } from '../../shared/categories'
import type { LanguagePair } from '../../shared/languages'
import type { LevelPref } from './useLevelPreference'
import type { CategoryPref } from './useCategoryPreference'

interface UseCurrentSentenceArgs {
  enabled: boolean
  pair: LanguagePair
  level: LevelPref
  // The pinned practice topic (null = shuffle all). Gates the parked/seed sentence and is sent on
  // every fetch so the server filters/generates to it.
  category: CategoryPref
  // First sentence supplied by the /api/me bootstrap (perf #5); used in place of the
  // opening fetch when it matches the active pool. `onConsumeInitial` clears it from its
  // source so it isn't re-seeded on a later remount.
  initialSentence?: SentenceDto | null
  onConsumeInitial?: () => void
}

function matchesPool(
  s: SentenceDto,
  pair: LanguagePair,
  level: LevelPref,
  category: CategoryPref
): boolean {
  return (
    s.learnLanguage === pair.learnLanguage &&
    s.guessLanguage === pair.guessLanguage &&
    s.locale === pair.locale &&
    (s.level ?? null) === (level ?? null) &&
    // With a topic pinned, a parked/seed sentence only matches if it's actually that topic — so a
    // stale or off-topic seed (e.g. the category-agnostic /api/me bootstrap) falls through to a fresh
    // fetch that honors the pin.
    (category === null || categoryByDomain(s.theme ?? '')?.id === category)
  )
}

// The unguessed sentence is parked in localStorage so a refresh restores the exact prompt the
// learner is mid-answer on, rather than burning a fresh generation. It's cleared the moment they
// advance (see `clear`), so only one in-flight sentence is ever persisted.
const STORAGE_KEY = 'aprendie:currentSentence'

function readStored(
  pair: LanguagePair,
  level: LevelPref,
  category: CategoryPref
): SentenceDto | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SentenceDto
    // Only restore if it's a well-formed sentence for the pool we're about to show — a stored
    // sentence from a different pair/level/topic is stale and should fall through to a fresh fetch.
    if (parsed && typeof parsed.id === 'string' && matchesPool(parsed, pair, level, category)) {
      return parsed
    }
  } catch {
    // ignore malformed/unavailable storage
  }
  return null
}

function writeStored(sentence: SentenceDto | null): void {
  try {
    if (sentence) localStorage.setItem(STORAGE_KEY, JSON.stringify(sentence))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore unavailable storage
  }
}

interface UseCurrentSentenceResult {
  sentence: SentenceDto | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  clear: () => void
}

export function useCurrentSentence({
  enabled,
  pair,
  level,
  category,
  initialSentence,
  onConsumeInitial,
}: UseCurrentSentenceArgs): UseCurrentSentenceResult {
  // Lazy-init from the parked sentence so a refresh shows the same prompt with no fetch flash.
  const [sentence, setSentence] = useState<SentenceDto | null>(() =>
    readStored(pair, level, category)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { learnLanguage, guessLanguage, locale } = pair

  // One-shot guard for the bootstrap seed. The seed (from /api/me) is null at mount and
  // arrives a render later, so we read the live prop in the load effect rather than
  // capturing at mount; this ensures we only ever consume it once.
  const seedConsumedRef = useRef(false)

  // One prefetched "next" sentence, kept off-render so pressing Next can swap to
  // it with zero network wait. It lives in a ref because it isn't displayed until
  // promoted. `prefetching` guards against overlapping prefetches.
  const nextRef = useRef<SentenceDto | null>(null)
  const prefetchingRef = useRef(false)

  // Generation counter, bumped whenever the selection changes. An async fetch (a
  // blocking load or a prefetch) only commits its result if its generation is
  // still current — so a sentence from the previous pool never lands or gets
  // promoted after a language/level switch.
  const genRef = useRef(0)

  const fetchOne = useCallback(
    () => fetchSentence({ learnLanguage, guessLanguage, locale, level, category }),
    [learnLanguage, guessLanguage, locale, level, category]
  )

  // Blocking load (drives the spinner), used when there's nothing to show yet.
  const load = useCallback(async () => {
    if (!enabled) return
    const gen = genRef.current
    setLoading(true)
    setError(null)
    try {
      const next = await fetchOne()
      if (gen !== genRef.current) return
      setSentence(next)
    } catch (err) {
      if (gen !== genRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load sentence')
    } finally {
      if (gen === genRef.current) setLoading(false)
    }
  }, [enabled, fetchOne])

  // Silent prefetch of the next sentence once the current one is on screen.
  const prefetchNext = useCallback(async () => {
    if (!enabled || nextRef.current || prefetchingRef.current) return
    prefetchingRef.current = true
    const gen = genRef.current
    try {
      const next = await fetchOne()
      if (gen === genRef.current) nextRef.current = next
    } catch {
      // Swallow — a failed prefetch just means Next falls back to a blocking load.
    } finally {
      prefetchingRef.current = false
    }
  }, [enabled, fetchOne])

  // Advance: promote the prefetched sentence instantly if ready, else drop to a
  // blocking load (setting sentence to null re-triggers the load effect below).
  const clear = useCallback(() => {
    const prefetched = nextRef.current
    nextRef.current = null
    setSentence(prefetched)
  }, [])

  // Load on mount and whenever there's nothing to show (mount, fallback clear).
  useEffect(() => {
    if (!enabled || sentence) return
    // Consume the bootstrap seed once, if it's arrived and matches the active pool —
    // skipping the opening fetch. Otherwise fall through to a normal blocking load.
    if (
      !seedConsumedRef.current &&
      initialSentence &&
      matchesPool(initialSentence, pair, level, category)
    ) {
      seedConsumedRef.current = true
      onConsumeInitial?.()
      setSentence(initialSentence)
      return
    }
    // load() owns its own loading state; this is a deliberate data fetch.
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sentence, load, initialSentence])

  // Once a sentence is showing, warm the next one in the background.
  useEffect(() => {
    if (enabled && sentence) void prefetchNext()
  }, [enabled, sentence, prefetchNext])

  // Mirror the active sentence into localStorage so a refresh restores it; clearing it (advancing
  // to the next, or a pool switch that nulls it) wipes the parked copy.
  useEffect(() => {
    writeStored(sentence)
  }, [sentence])

  // Drop everything (current + prefetched) when the pair/level changes so the new
  // selection is fetched fresh — the prefetched sentence is for the old pool.
  const depsKey = `${learnLanguage}|${guessLanguage}|${locale}|${level ?? ''}|${category ?? ''}`
  const prevKey = useRef(depsKey)
  useEffect(() => {
    if (prevKey.current !== depsKey) {
      prevKey.current = depsKey
      genRef.current += 1
      nextRef.current = null
      setSentence(null)
    }
  }, [depsKey])

  return { sentence, loading, error, reload: load, clear }
}
