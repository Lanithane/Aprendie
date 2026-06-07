import { describe, it, expect } from 'vitest'
import { advanceStreak } from './streak'

describe('advanceStreak', () => {
  it('starts a fresh streak at 1 for a first-ever activity', () => {
    expect(advanceStreak({ current: 0, longest: 0, lastDay: null }, '2026-06-06')).toEqual({
      current: 1,
      longest: 1,
      lastDay: '2026-06-06',
      advanced: true,
    })
  })

  it('no-ops a second activity on the same day', () => {
    expect(advanceStreak({ current: 3, longest: 5, lastDay: '2026-06-06' }, '2026-06-06')).toEqual({
      current: 3,
      longest: 5,
      lastDay: '2026-06-06',
      advanced: false,
    })
  })

  it('continues the run when the activity is the next day', () => {
    expect(advanceStreak({ current: 3, longest: 3, lastDay: '2026-06-05' }, '2026-06-06')).toEqual({
      current: 4,
      longest: 4,
      lastDay: '2026-06-06',
      advanced: true,
    })
  })

  it('resets to 1 after a gap of more than one day', () => {
    expect(advanceStreak({ current: 9, longest: 9, lastDay: '2026-06-03' }, '2026-06-06')).toEqual({
      current: 1,
      longest: 9,
      lastDay: '2026-06-06',
      advanced: true,
    })
  })

  it('keeps the longest as the high-water mark, not the current run', () => {
    // A reset drops current to 1 but longest is untouched...
    const afterReset = advanceStreak(
      { current: 12, longest: 12, lastDay: '2026-06-01' },
      '2026-06-06'
    )
    expect(afterReset.current).toBe(1)
    expect(afterReset.longest).toBe(12)
    // ...and only ratchets up once the rebuilt run passes it.
    const grown = advanceStreak({ current: 12, longest: 12, lastDay: '2026-06-05' }, '2026-06-06')
    expect(grown).toMatchObject({ current: 13, longest: 13 })
  })

  it('continues correctly across a month boundary', () => {
    expect(advanceStreak({ current: 4, longest: 4, lastDay: '2026-06-30' }, '2026-07-01')).toEqual({
      current: 5,
      longest: 5,
      lastDay: '2026-07-01',
      advanced: true,
    })
  })
})
