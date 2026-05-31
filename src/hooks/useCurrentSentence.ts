import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSentence, type SentenceDto } from '../api/sentenceApi'
import type { LanguagePair } from '../../shared/languages'
import type { LevelPref } from './useLevelPreference'

interface UseCurrentSentenceArgs {
  enabled: boolean
  pair: LanguagePair
  level: LevelPref
  // First sentence supplied by the /api/me bootstrap (perf #5); used in place of the
  // opening fetch when it matches the active pool. `onConsumeInitial` clears it from its
  // source so it isn't re-seeded on a later remount.
  initialSentence?: SentenceDto | null
  onConsumeInitial?: () => void
}

function matchesPool(s: SentenceDto, pair: LanguagePair, level: LevelPref): boolean {
  return (
    s.learnLanguage === pair.learnLanguage &&
    s.guessLanguage === pair.guessLanguage &&
    s.locale === pair.locale &&
    (s.level ?? null) === (level ?? null)
  )
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
  initialSentence,
  onConsumeInitial,
}: UseCurrentSentenceArgs): UseCurrentSentenceResult {
  const [sentence, setSentence] = useState<SentenceDto | null>(null)
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
    () => fetchSentence({ learnLanguage, guessLanguage, locale, level }),
    [learnLanguage, guessLanguage, locale, level]
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
    if (!seedConsumedRef.current && initialSentence && matchesPool(initialSentence, pair, level)) {
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

  // Drop everything (current + prefetched) when the pair/level changes so the new
  // selection is fetched fresh — the prefetched sentence is for the old pool.
  const depsKey = `${learnLanguage}|${guessLanguage}|${locale}|${level ?? ''}`
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
