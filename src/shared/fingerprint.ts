import type { FieldDescriptor } from './types'

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Stable fingerprint for re-matching DOM after navigation within same page
 * or before fill. Not cryptographically stable — good enough for MVP.
 */
export function fingerprintForDescriptor(
  d: Pick<
    FieldDescriptor,
    | 'controlKind'
    | 'tagName'
    | 'inputType'
    | 'name'
    | 'idAttr'
    | 'placeholder'
    | 'labelText'
    | 'autocomplete'
  >,
  ordinal: number,
): string {
  const parts = [
    d.controlKind,
    d.tagName,
    d.inputType ?? '',
    norm(d.name),
    norm(d.idAttr),
    norm(d.placeholder),
    norm(d.labelText).slice(0, 80),
    norm(d.autocomplete),
    String(ordinal),
  ]
  return parts.join('|')
}
