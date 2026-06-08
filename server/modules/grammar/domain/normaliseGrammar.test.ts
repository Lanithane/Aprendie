import { describe, it, expect } from 'vitest'
import { normaliseGrammarSections, normaliseSection } from './GrammarReference'

const fullSection = {
  pos: 'Preposition',
  title: 'Prepositions',
  explanation: 'Prepositions connect words and show relationships of place, time, or direction.',
  members: ['de', 'a', 'en', '  con  ', ''],
  example: { text: 'Voy a la escuela.', translation: 'I go to school.' },
  detail: [
    {
      heading: 'Common contractions',
      note: 'Two prepositions contract with the article "el".',
      rows: [
        { label: 'a + el', value: 'al' },
        { label: 'de + el', value: 'del' },
        { label: '', value: 'dropped' },
      ],
    },
  ],
}

describe('normaliseSection', () => {
  it('lowercases the pos key, trims and drops empty members, and keeps complete detail rows', () => {
    const s = normaliseSection(fullSection)
    expect(s).not.toBeNull()
    expect(s!.pos).toBe('preposition')
    expect(s!.members).toEqual(['de', 'a', 'en', 'con'])
    expect(s!.example).toEqual({ text: 'Voy a la escuela.', translation: 'I go to school.' })
    expect(s!.detail).toHaveLength(1)
    // The row missing a label was dropped.
    expect(s!.detail[0].rows).toEqual([
      { label: 'a + el', value: 'al' },
      { label: 'de + el', value: 'del' },
    ])
    expect(s!.detail[0].note).toBe('Two prepositions contract with the article "el".')
  })

  it('returns null when a required field is missing', () => {
    expect(normaliseSection({ ...fullSection, title: '   ' })).toBeNull()
    expect(normaliseSection({ ...fullSection, members: [] })).toBeNull()
    expect(normaliseSection({ ...fullSection, example: { text: '', translation: 'x' } })).toBeNull()
  })

  it('keeps a section with no usable detail blocks (drill-down is optional)', () => {
    const s = normaliseSection({ ...fullSection, detail: [{ heading: 'x', rows: [] }] })
    expect(s).not.toBeNull()
    expect(s!.detail).toEqual([])
  })
})

describe('normaliseGrammarSections', () => {
  it('drops unusable sections and returns only the clean ones', () => {
    const out = normaliseGrammarSections([fullSection, { pos: 'verb' }, null, 'nope'])
    expect(out).toHaveLength(1)
    expect(out[0].pos).toBe('preposition')
  })

  it('returns an empty array for a non-array payload', () => {
    expect(normaliseGrammarSections(undefined)).toEqual([])
    expect(normaliseGrammarSections({})).toEqual([])
  })
})
