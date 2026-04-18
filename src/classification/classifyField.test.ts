import { describe, expect, it } from 'vitest'
import type { FieldDescriptor } from '../shared/types'
import { classifyField } from './classifyField'

function base(over: Partial<FieldDescriptor>): FieldDescriptor {
  return {
    id: 'test-id',
    fingerprint: 'fp',
    controlKind: 'text',
    tagName: 'INPUT',
    inputType: 'text',
    name: '',
    idAttr: '',
    placeholder: '',
    value: '',
    required: false,
    readOnly: false,
    disabled: false,
    autocomplete: '',
    labelText: '',
    ariaLabel: '',
    ariaLabelledByText: '',
    sectionContext: '',
    nearbyText: '',
    options: [],
    likelyConsent: false,
    likelyJunk: false,
    isFile: false,
    domPathHint: '',
    ...over,
  }
}

describe('classifyField', () => {
  it('classifies First Name', () => {
    const d = base({ labelText: 'First Name' })
    const r = classifyField(d, { corpus: '' })
    expect(r.profileKey).toBe('firstName')
    expect(r.confidence).toBeGreaterThan(0.4)
    expect(r.reasons.some((x) => x.includes('label'))).toBe(true)
  })

  it('classifies Email', () => {
    const d = base({ labelText: 'Email Address', inputType: 'email' })
    const r = classifyField(d, { corpus: '' })
    expect(r.profileKey).toBe('email')
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  it('classifies Mobile Phone', () => {
    const d = base({ labelText: 'Mobile Phone', inputType: 'tel' })
    const r = classifyField(d, { corpus: '' })
    expect(r.profileKey).toBe('phone')
    expect(r.confidence).toBeGreaterThan(0.35)
  })

  it('classifies LinkedIn Profile', () => {
    const d = base({ labelText: 'LinkedIn Profile' })
    const r = classifyField(d, { corpus: '' })
    expect(r.profileKey).toBe('linkedin')
    expect(r.confidence).toBeGreaterThan(0.35)
  })

  it('classifies Portfolio Website', () => {
    const d = base({ labelText: 'Portfolio Website' })
    const r = classifyField(d, { corpus: '' })
    expect(r.profileKey === 'portfolio' || r.profileKey === 'website').toBe(true)
    expect(r.confidence).toBeGreaterThan(0.2)
  })

  it('classifies Work Authorization', () => {
    const d = base({ labelText: 'Are you legally authorized to work in the US?' })
    const r = classifyField(d, { corpus: '' })
    expect(r.profileKey).toBe('workAuthorization')
    expect(r.confidence).toBeGreaterThan(0.2)
  })

  it('classifies Require Sponsorship', () => {
    const d = base({ labelText: 'Will you require visa sponsorship?' })
    const r = classifyField(d, { corpus: '' })
    expect(r.profileKey).toBe('requireSponsorship')
    expect(r.confidence).toBeGreaterThan(0.2)
  })
})
