import { describe, it, expect } from 'vitest'
import { localDay, previousDay, computeStatus } from './streak'

describe('localDay', () => {
  it('buckets an instant into the local calendar day for the given zone', () => {
    // 2026-06-06T03:30Z is still 2026-06-05 in Los Angeles (UTC-7) but already 2026-06-06 in UTC.
    const instant = new Date('2026-06-06T03:30:00.000Z')
    expect(localDay(instant, 'UTC')).toBe('2026-06-06')
    expect(localDay(instant, 'America/Los_Angeles')).toBe('2026-06-05')
    expect(localDay(instant, 'Asia/Tokyo')).toBe('2026-06-06')
  })

  it('falls back to UTC for an unknown timezone instead of throwing', () => {
    const instant = new Date('2026-06-06T12:00:00.000Z')
    expect(localDay(instant, 'Not/AZone')).toBe('2026-06-06')
  })
})

describe('previousDay', () => {
  it('returns the calendar day before, across month and year boundaries', () => {
    expect(previousDay('2026-06-06')).toBe('2026-06-05')
    expect(previousDay('2026-07-01')).toBe('2026-06-30')
    expect(previousDay('2026-01-01')).toBe('2025-12-31')
    // Day after a DST spring-forward in LA — pure date math, no off-by-one.
    expect(previousDay('2026-03-09')).toBe('2026-03-08')
  })
})

describe('computeStatus', () => {
  const today = '2026-06-06'

  it('shows the stored count when last active today (active today)', () => {
    expect(computeStatus(today, 5, today)).toEqual({ current: 5, activeToday: true, alive: true })
  })

  it('stays alive (not active today) when last active yesterday', () => {
    expect(computeStatus('2026-06-05', 5, today)).toEqual({
      current: 5,
      activeToday: false,
      alive: true,
    })
  })

  it('reads as broken once a full day lapses', () => {
    expect(computeStatus('2026-06-04', 5, today)).toEqual({
      current: 0,
      activeToday: false,
      alive: false,
    })
  })

  it('is empty with no recorded day', () => {
    expect(computeStatus(null, 0, today)).toEqual({
      current: 0,
      activeToday: false,
      alive: false,
    })
  })
})
