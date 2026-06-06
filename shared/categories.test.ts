import { describe, it, expect } from 'vitest'
import {
  CATEGORIES,
  CATEGORY_DOMAINS,
  categoryById,
  categoryByDomain,
  isCategoryId,
} from './categories'

describe('categories registry', () => {
  it('has unique ids and domains', () => {
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length)
    expect(new Set(CATEGORIES.map((c) => c.domain)).size).toBe(CATEGORIES.length)
  })

  it('CATEGORY_DOMAINS mirrors the registry domains in order', () => {
    expect(CATEGORY_DOMAINS).toEqual(CATEGORIES.map((c) => c.domain))
  })

  it('round-trips every entry through id and domain lookups', () => {
    for (const c of CATEGORIES) {
      expect(categoryById(c.id)).toBe(c)
      // categoryByDomain is the bridge the practice card uses to turn a stored sentence.theme back
      // into a pickable category — it must resolve every domain to its own entry.
      expect(categoryByDomain(c.domain)?.id).toBe(c.id)
    }
  })

  it('returns undefined for unknown ids/domains and validates ids', () => {
    expect(categoryById('not-a-topic')).toBeUndefined()
    expect(categoryByDomain('some legacy theme')).toBeUndefined()
    expect(isCategoryId('food')).toBe(true)
    expect(isCategoryId('not-a-topic')).toBe(false)
  })
})
