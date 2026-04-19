import type { UserProfile } from '../storage/schema'
import type { AppSettings } from '../storage/schema'
import type { FieldDescriptor, FieldFillResult } from '../shared/types'

function dispatchSelectChange(sel: HTMLSelectElement): void {
  sel.dispatchEvent(new Event('input', { bubbles: true }))
  sel.dispatchEvent(new Event('change', { bubbles: true }))
}

/** Greenhouse embedded job board + boards hostnames */
export function isGreenhouseJobBoardHost(hostname: string): boolean {
  return /(^|\.)greenhouse\.io$/i.test(hostname)
}

function findEducationHeading(doc: Document): Element | null {
  const candidates = doc.querySelectorAll('h2, h3, h4, legend, [class*="education"]')
  for (const el of Array.from(candidates)) {
    const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (/^education\b/i.test(t)) return el
  }
  return null
}

function findLinkedInHeading(doc: Document): Element | null {
  const candidates = doc.querySelectorAll('h2, h3, h4, label, legend')
  for (const el of Array.from(candidates)) {
    const t = (el.textContent ?? '').toLowerCase()
    if (t.includes('linkedin')) return el
  }
  return null
}

/**
 * Greenhouse structured education row controls (API-style `name` / `id` on job boards).
 * Excludes month-only parts when year selects exist separately.
 */
export function isGreenhouseStructuredEducationSelectKey(name: string, id: string): boolean {
  const key = `${name} ${id}`.toLowerCase()
  if (/school_name_id|degree_id|discipline_id/.test(key)) return true
  if (/start_date|end_date/.test(key)) {
    if (/month/.test(key)) return false
    return true
  }
  return false
}

/** True for `<select>` rows filled by `runGreenhouseEducationFill` (not the generic `education` JSON string). */
export function isGreenhouseStructuredEducationDescriptor(d: FieldDescriptor): boolean {
  return d.controlKind === 'select' && isGreenhouseStructuredEducationSelectKey(d.name, d.idAttr)
}

function isStructuredEducationSelect(sel: HTMLSelectElement): boolean {
  return isGreenhouseStructuredEducationSelectKey(sel.name, sel.id)
}

function selectsInEducationRegion(doc: Document): HTMLSelectElement[] {
  const edu = findEducationHeading(doc)
  if (!edu) return []
  const linkedin = findLinkedInHeading(doc)
  const pool = Array.from(doc.querySelectorAll<HTMLSelectElement>('select')).filter((s) => {
    if (!isStructuredEducationSelect(s)) return false
    const afterEdu = Boolean(
      edu.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING,
    )
    if (!afterEdu) return false
    if (!linkedin) return true
    const beforeIn = Boolean(
      linkedin.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING,
    )
    return beforeIn
  })
  if (pool.length > 0) return pool

  // Fallback: all selects between Education and LinkedIn (avoid grabbing unrelated dropdowns)
  const linkedin2 = findLinkedInHeading(doc)
  const fallback = Array.from(doc.querySelectorAll<HTMLSelectElement>('select')).filter((s) => {
    const afterEdu = Boolean(
      edu.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING,
    )
    if (!afterEdu) return false
    if (!linkedin2) return isStructuredEducationSelect(s)
    return Boolean(linkedin2.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING)
  })
  return fallback
}

function extractYear(raw: string | undefined): string {
  if (!raw) return ''
  const m = raw.match(/\b(19|20)\d{2}\b/)
  return m ? m[0] : raw.trim()
}

/**
 * Pick option value whose visible text best matches `desired` (Greenhouse lists are long).
 */
export function bestSelectOptionValue(
  sel: HTMLSelectElement,
  desired: string,
): { value: string; label: string } | null {
  const d = desired.trim().toLowerCase()
  if (!d) return null
  let best: { value: string; label: string; score: number } | null = null
  for (const opt of Array.from(sel.options)) {
    const label = (opt.textContent ?? '').trim()
    const val = opt.value
    if (!val && !label) continue
    const t = label.toLowerCase()
    let score = 0
    if (t === d || val === desired) score = 100
    else if (t.startsWith(d) || d.startsWith(t)) score = 80
    else if (t.includes(d) || d.includes(t)) score = 60
    else {
      const dw = new Set(d.split(/\W+/).filter((w) => w.length > 2))
      const tw = new Set(t.split(/\W+/).filter((w) => w.length > 2))
      let overlap = 0
      for (const w of dw) if (tw.has(w)) overlap += 1
      if (overlap > 0) score = 30 + overlap * 5
    }
    if (!best || score > best.score) best = { value: val, label, score }
  }
  return best && best.score >= 30 ? { value: best.value, label: best.label } : null
}

function chunkRows(selects: HTMLSelectElement[], perRow: 5): HTMLSelectElement[][] {
  const rows: HTMLSelectElement[][] = []
  for (let i = 0; i + perRow <= selects.length; i += perRow) {
    rows.push(selects.slice(i, i + perRow))
  }
  return rows
}

function findAddAnotherControl(doc: Document, educationHeading: Element | null): HTMLElement | null {
  const scope =
    educationHeading?.closest('form') ??
    educationHeading?.parentElement?.parentElement ??
    doc.body
  const buttons = scope.querySelectorAll('button, [role="button"], a')
  for (const el of Array.from(buttons)) {
    const t = (el.textContent ?? '').toLowerCase().trim()
    if (/^add another|^add education|^add row|^\+ add/.test(t)) return el as HTMLElement
  }
  return null
}

/**
 * Clicks "Add another" so enough education rows exist for `targetRows` entries.
 */
async function ensureRowCount(
  doc: Document,
  educationHeading: Element | null,
  currentRows: number,
  targetRows: number,
  dryRun: boolean,
): Promise<void> {
  if (dryRun || targetRows <= currentRows) return
  const need = targetRows - currentRows
  for (let i = 0; i < need; i++) {
    const btn = findAddAnotherControl(doc, educationHeading)
    if (!btn) break
    btn.click()
    await new Promise((r) => setTimeout(r, 120))
  }
}

/**
 * Fills Greenhouse structured education (School, Degree, Discipline, start/end year selects)
 * from `profile.education[]` (school, degree, fieldOfStudy, startDate, endDate).
 *
 * Generic `education` classification still dumps JSON into a single control — that does **not**
 * populate these rows; this pass runs in addition on Greenhouse hosts.
 */
export async function runGreenhouseEducationFill(options: {
  doc: Document
  profile: UserProfile
  settings: Pick<AppSettings, 'overwriteExisting'>
  dryRun: boolean
}): Promise<FieldFillResult[]> {
  const { doc, profile, settings, dryRun } = options
  const results: FieldFillResult[] = []
  const entries = profile.education
  if (entries.length === 0) return results

  const eduHead = findEducationHeading(doc)
  let selects = selectsInEducationRegion(doc)
  if (selects.length < 5) return results

  // Assume 5 controls per degree row in document order (Greenhouse standard layout)
  const perRow = 5
  let rows = chunkRows(selects, perRow)
  await ensureRowCount(doc, eduHead, rows.length, entries.length, dryRun)
  selects = selectsInEducationRegion(doc)
  rows = chunkRows(selects, perRow)

  for (let i = 0; i < entries.length; i++) {
    const row = rows[i]
    if (!row) {
      results.push({
        fieldId: `gh-education-row-${i}`,
        status: 'skipped',
        reason: `No education row ${i + 1} in DOM (add ${entries.length} rows manually or use "Add another")`,
      })
      continue
    }
    const e = entries[i]
    const cells: { label: string; sel: HTMLSelectElement; desired: string }[] = [
      { label: 'school', sel: row[0]!, desired: e.school },
      { label: 'degree', sel: row[1]!, desired: e.degree ?? '' },
      { label: 'discipline', sel: row[2]!, desired: e.fieldOfStudy ?? '' },
      { label: 'startYear', sel: row[3]!, desired: extractYear(e.startDate) },
      { label: 'endYear', sel: row[4]!, desired: extractYear(e.endDate) },
    ]

    for (const { label, sel, desired } of cells) {
      const fieldId = `gh-education-${i}-${label}`
      if (!desired.trim()) {
        results.push({
          fieldId,
          status: 'skipped',
          reason: `empty profile value (${label})`,
        })
        continue
      }
      if (!settings.overwriteExisting && sel.value && sel.selectedIndex > 0) {
        results.push({
          fieldId,
          status: 'skipped',
          reason: 'select already has value (overwrite disabled)',
        })
        continue
      }
      const pick = bestSelectOptionValue(sel, desired)
      if (!pick) {
        results.push({
          fieldId,
          status: 'skipped',
          reason: `no matching option for "${desired.slice(0, 60)}" (${label})`,
        })
        continue
      }
      if (dryRun) {
        results.push({
          fieldId,
          status: 'filled',
          reason: `[dry-run] would set ${label} → "${pick.label}"`,
        })
        continue
      }
      sel.focus()
      sel.value = pick.value
      dispatchSelectChange(sel)
      if (sel.value !== pick.value) {
        results.push({
          fieldId,
          status: 'error',
          reason: `could not apply value for ${label}`,
        })
        continue
      }
      results.push({
        fieldId,
        status: 'filled',
        reason: `Greenhouse ${label}: ${pick.label}`,
      })
    }
  }

  return results
}
