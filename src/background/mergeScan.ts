import type { ScannedField, FieldFillResult, FillStatus } from '../shared/types'

function fillStatusFromResult(r: FieldFillResult): FillStatus {
  if (r.status === 'filled') return 'filled'
  if (r.status === 'manual') return 'manual'
  if (r.status === 'error') return 'error'
  return 'skipped'
}

export function mergeScanWithFillResults(
  fields: ScannedField[],
  fill: FieldFillResult[],
): ScannedField[] {
  const byId = new Map(fill.map((f) => [f.fieldId, f]))
  return fields.map((sf) => {
    const r = byId.get(sf.descriptor.id)
    if (!r) return sf
    return {
      ...sf,
      fillStatus: fillStatusFromResult(r),
      skipReason: r.status === 'skipped' || r.status === 'manual' ? r.reason : undefined,
    }
  })
}
