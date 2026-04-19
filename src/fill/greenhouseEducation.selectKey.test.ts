import { describe, expect, it } from 'vitest'
import {
  isGreenhouseReactBoardEducationDescriptor,
  isGreenhouseStructuredEducationDescriptor,
  isGreenhouseStructuredEducationSelectKey,
} from './greenhouseEducation'
import type { FieldDescriptor } from '../shared/types'

function selectDesc(name: string, idAttr: string): FieldDescriptor {
  return {
    id: 'x',
    fingerprint: 'x',
    controlKind: 'select',
    tagName: 'SELECT',
    name,
    idAttr,
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
  }
}

describe('isGreenhouseStructuredEducationSelectKey', () => {
  it('matches school, degree, discipline ids', () => {
    expect(isGreenhouseStructuredEducationSelectKey('candidate[education][][school_name_id]', '')).toBe(
      true,
    )
    expect(isGreenhouseStructuredEducationSelectKey('', 'job_application_degree_id')).toBe(true)
    expect(isGreenhouseStructuredEducationSelectKey('discipline_id', '')).toBe(true)
  })

  it('matches year selects but not month-only', () => {
    expect(isGreenhouseStructuredEducationSelectKey('candidate[education][][start_date][year]', '')).toBe(
      true,
    )
    expect(isGreenhouseStructuredEducationSelectKey('candidate[education][][start_date][month]', '')).toBe(
      false,
    )
  })

  it('does not match arbitrary selects', () => {
    expect(isGreenhouseStructuredEducationSelectKey('country', '')).toBe(false)
  })
})

describe('isGreenhouseStructuredEducationDescriptor', () => {
  it('is false for non-select controls', () => {
    const d = selectDesc('school_name_id', '')
    expect(isGreenhouseStructuredEducationDescriptor({ ...d, controlKind: 'textarea' })).toBe(false)
  })

  it('is true for structured education selects', () => {
    expect(isGreenhouseStructuredEducationDescriptor(selectDesc('candidate[education][][school_name_id]', ''))).toBe(
      true,
    )
  })
})

function inputDesc(idAttr: string, controlKind: FieldDescriptor['controlKind']): FieldDescriptor {
  return {
    id: 'x',
    fingerprint: 'x',
    controlKind,
    tagName: 'INPUT',
    name: '',
    idAttr,
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
    inputType: controlKind === 'number' ? 'number' : 'text',
  }
}

describe('isGreenhouseReactBoardEducationDescriptor', () => {
  it('matches react-select school/degree/discipline ids', () => {
    expect(isGreenhouseReactBoardEducationDescriptor(inputDesc('school--0', 'text'))).toBe(true)
    expect(isGreenhouseReactBoardEducationDescriptor(inputDesc('degree--2', 'text'))).toBe(true)
    expect(isGreenhouseReactBoardEducationDescriptor(inputDesc('discipline--1', 'text'))).toBe(true)
  })

  it('matches year spinbutton ids', () => {
    expect(isGreenhouseReactBoardEducationDescriptor(inputDesc('start-year--0', 'number'))).toBe(true)
    expect(isGreenhouseReactBoardEducationDescriptor(inputDesc('end-year--0', 'number'))).toBe(true)
  })

  it('does not match label ids or unrelated fields', () => {
    expect(isGreenhouseReactBoardEducationDescriptor(inputDesc('school--0-label', 'text'))).toBe(false)
    expect(isGreenhouseReactBoardEducationDescriptor(inputDesc('country', 'text'))).toBe(false)
  })
})
