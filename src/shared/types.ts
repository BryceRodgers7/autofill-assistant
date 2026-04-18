import type { ProfileKey } from './profileKeys'

export type ControlKind =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'url'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio-group'
  | 'file'

export type FillStatus = 'pending' | 'filled' | 'skipped' | 'manual' | 'error'

export interface SelectOptionMeta {
  value: string
  label: string
}

/** Serializable metadata gathered from the DOM (no element references). */
export interface FieldDescriptor {
  id: string
  fingerprint: string
  controlKind: ControlKind
  tagName: string
  inputType?: string
  name: string
  idAttr: string
  placeholder: string
  value: string
  required: boolean
  readOnly: boolean
  disabled: boolean
  autocomplete: string
  /** Best-effort primary label text */
  labelText: string
  ariaLabel: string
  /** Resolved aria-labelledby text */
  ariaLabelledByText: string
  /** Compact section / heading context */
  sectionContext: string
  /** Nearby static text (e.g. previous sibling) */
  nearbyText: string
  options: SelectOptionMeta[]
  /** Heuristic: newsletter / search / consent patterns */
  likelyConsent: boolean
  likelyJunk: boolean
  isFile: boolean
  /** Debug: simplified selector hint */
  domPathHint: string
}

export interface ClassificationResult {
  profileKey: ProfileKey | null
  confidence: number
  reasons: string[]
}

export interface ScannedField {
  descriptor: FieldDescriptor
  classification: ClassificationResult
  /** Resolved preview from profile (stringified for complex types) */
  valuePreview: string
  /** Whether fill engine would attempt this field at current threshold (computed client-side) */
  eligibleAtScan: boolean
  fillStatus: FillStatus
  skipReason?: string
}

export interface ScanResult {
  tabId: number
  url: string
  scannedAt: number
  hasFormLike: boolean
  fields: ScannedField[]
}

export type FieldResultStatus = 'filled' | 'skipped' | 'manual' | 'error'

export interface FieldFillResult {
  fieldId: string
  status: FieldResultStatus
  reason: string
  error?: string
}

export interface FillOperationResult {
  tabId: number
  dryRun: boolean
  fields: FieldFillResult[]
}
