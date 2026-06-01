import { describe, it, expect } from 'vitest'
import { toUserView, toAdminUserView } from './User'
import type { UserRow } from '../../../infrastructure/db/schema'

function fakeRow(): UserRow {
  return {
    id: 'user-1',
    email: 'a@b.com',
    name: 'A',
    googleSub: 'sub-1',
    role: 'user',
    access: 'approved',
    level: null,
    themeId: null,
    themeMode: null,
    learnLanguage: null,
    guessLanguage: null,
    locale: null,
    autoSpeak: null,
    autoSpeakDelayMs: null,
    capExemptUntil: null,
    dailyCapOverride: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }
}

describe('user view projections', () => {
  it('toUserView maps the core fields', () => {
    const view = toUserView(fakeRow())
    expect(view.id).toBe('user-1')
    expect(view.email).toBe('a@b.com')
    expect(view.role).toBe('user')
    expect(view.access).toBe('approved')
  })

  it('toAdminUserView maps the core fields and resolves the effective cap', () => {
    const view = toAdminUserView(fakeRow(), { usedToday: 3, globalCap: 100, totalCostUsd: 1.25 })
    expect(view.id).toBe('user-1')
    expect(view.email).toBe('a@b.com')
    expect(view.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(view.usedToday).toBe(3)
    expect(view.effectiveCap).toBe(100)
    expect(view.dailyCapOverride).toBeNull()
    expect(view.capExemptUntil).toBeNull()
    expect(view.totalCostUsd).toBe(1.25)
  })

  it('toAdminUserView lets a per-user override win over the global cap', () => {
    const view = toAdminUserView(
      { ...fakeRow(), dailyCapOverride: 250 },
      {
        usedToday: 0,
        globalCap: 100,
        totalCostUsd: 0,
      }
    )
    expect(view.effectiveCap).toBe(250)
    expect(view.dailyCapOverride).toBe(250)
  })
})
