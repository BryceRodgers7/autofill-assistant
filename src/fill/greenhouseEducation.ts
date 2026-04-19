import type { UserProfile } from '../storage/schema'
import type { AppSettings } from '../storage/schema'
import type { FieldDescriptor, FieldFillResult } from '../shared/types'

function dispatchSelectChange(sel: HTMLSelectElement): void {
  sel.dispatchEvent(new Event('input', { bubbles: true }))
  sel.dispatchEvent(new Event('change', { bubbles: true }))
}

function dispatchInputEvents(el: HTMLElement): void {
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function setNativeInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const desc = Object.getOwnPropertyDescriptor(proto, 'value')
  if (desc?.set) desc.set.call(el, value)
  else el.value = value
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Prior generic `education` fill often pastes JSON into these comboboxes — still refill when overwrite is off. */
function looksLikePastedProfileJson(s: string): boolean {
  const t = s.trimStart()
  return t.startsWith('[') || t.startsWith('{')
}

/** Greenhouse embedded job board + boards hostnames */
export function isGreenhouseJobBoardHost(hostname: string): boolean {
  return /(^|\.)greenhouse\.io$/i.test(hostname)
}

function findEducationHeading(doc: Document): Element | null {
  const candidates = doc.querySelectorAll('h2, h3, h4, legend, p, div, span')
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

/**
 * Modern Greenhouse boards (React Select): combobox inputs and year number fields.
 * Generic `education` JSON must not be pasted here.
 */
export function isGreenhouseReactBoardEducationDescriptor(d: FieldDescriptor): boolean {
  const id = d.idAttr
  if (/^(school|degree|discipline)--\d+$/.test(id)) return true
  if (/^(start-year|end-year)--\d+$/.test(id)) return true
  return false
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

/** Profile string vs option label (native `<option>` or React Select listbox row). */
function scoreDesiredAgainstLabel(desired: string, optionLabel: string): number {
  const d = desired.trim().toLowerCase()
  const t = optionLabel.trim().toLowerCase()
  if (!d || !t) return 0
  if (t === d) return 100
  if (t.startsWith(d) || d.startsWith(t)) return 80
  if (t.includes(d) || d.includes(t)) return 60
  const dw = new Set(d.split(/\W+/).filter((w) => w.length > 2))
  const tw = new Set(t.split(/\W+/).filter((w) => w.length > 2))
  let overlap = 0
  for (const w of dw) if (tw.has(w)) overlap += 1
  if (overlap > 0) return 30 + overlap * 5
  return 0
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
    let score = scoreDesiredAgainstLabel(desired, label)
    if (val === desired) score = Math.max(score, 100)
    if (!best || score > best.score) best = { value: val, label, score }
  }
  return best && best.score >= 30 ? { value: best.value, label: best.label } : null
}

function reactSelectListboxId(inputId: string): string {
  return `react-select-${inputId}-listbox`
}

/**
 * Filter strings to try in react-select (longest first elsewhere).
 * Avoid strict prefixes of the full phrase (e.g. "University of") — they made the
 * input visibly "strip" word-by-word during discovery while adding little value over the full string.
 */
function buildFilterQueries(desired: string): string[] {
  const d = desired.trim()
  const out: string[] = []
  if (d) out.push(d.slice(0, 120))
  const words = d.split(/\s+/).filter((w) => w.length > 1)
  if (words.length >= 1) out.push(words[0]!)
  if (words.length >= 2) {
    const longest = [...words].sort((a, b) => b.length - a.length)[0]
    if (longest && !out.includes(longest)) out.push(longest)
  }
  return [...new Set(out.filter(Boolean))]
}

/** Best option in an open listbox vs full profile string (no score floor). */
function scanListboxForBest(
  listbox: Element,
  desired: string,
): { el: HTMLElement; label: string; score: number } | null {
  const opts = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'))
  if (opts.length === 0) return null
  let best: { el: HTMLElement; label: string; score: number } | null = null
  for (const opt of opts) {
    const lab = (opt.textContent ?? '').trim()
    if (!lab) continue
    const score = scoreDesiredAgainstLabel(desired, lab)
    if (!best || score > best.score) best = { el: opt, label: lab, score }
  }
  return best
}

function waitAfterFilterMs(query: string, isLongestQuery: boolean): number {
  const base = Math.min(1000, 400 + query.length * 16)
  return isLongestQuery ? Math.max(base, 720) : base
}

async function fillReactSelectCombobox(
  doc: Document,
  input: HTMLInputElement,
  desiredRaw: string,
  fieldId: string,
  label: string,
  settings: Pick<AppSettings, 'overwriteExisting'>,
  dryRun: boolean,
): Promise<FieldFillResult> {
  const desired = desiredRaw.trim()
  if (!desired) {
    return { fieldId, status: 'skipped', reason: `empty profile value (${label})` }
  }
  const existing = input.value.trim()
  if (
    !settings.overwriteExisting &&
    existing.length > 0 &&
    !looksLikePastedProfileJson(existing) &&
    !/^select\.{3}/i.test(existing)
  ) {
    return { fieldId, status: 'skipped', reason: 'field already has value (overwrite disabled)' }
  }
  if (dryRun) {
    return {
      fieldId,
      status: 'filled',
      reason: `[dry-run] would set ${label} via react-select from "${desired.slice(0, 60)}"`,
    }
  }

  const queries = buildFilterQueries(desired)
  input.focus()
  input.click()
  await sleep(80)
  if (looksLikePastedProfileJson(input.value)) {
    setNativeInputValue(input, '')
    dispatchInputEvents(input)
    await sleep(60)
  }

  /** Longest queries first + early exit on exact match → avoids typing shorter prefixes after the full phrase (visible "word stripping"). */
  const queriesSorted = [...queries].sort((a, b) => b.length - a.length)
  const longestLen = queriesSorted[0]?.length ?? 0

  let best: { score: number; chosenLabel: string; query: string } | null = null
  for (const q of queriesSorted) {
    setNativeInputValue(input, q)
    dispatchInputEvents(input)
    await sleep(waitAfterFilterMs(q, q.length === longestLen))
    const lb = doc.getElementById(reactSelectListboxId(input.id))
    if (!lb) continue
    const row = scanListboxForBest(lb, desired)
    if (!row) continue
    if (
      !best ||
      row.score > best.score ||
      (row.score === best.score && q.length > best.query.length)
    ) {
      best = { score: row.score, chosenLabel: row.label, query: q }
    }
    const exact =
      row.label.trim().toLowerCase() === desired.toLowerCase() || row.score >= 99
    if (exact) break
  }

  if (!best || best.score < 30) {
    return {
      fieldId,
      status: 'skipped',
      reason: `no matching react-select option for "${desired.slice(0, 60)}" (${label})`,
    }
  }

  setNativeInputValue(input, best.query)
  dispatchInputEvents(input)
  await sleep(waitAfterFilterMs(best.query, best.query.length === longestLen))
  const lbFinal = doc.getElementById(reactSelectListboxId(input.id))
  if (!lbFinal) {
    return {
      fieldId,
      status: 'error',
      reason: `react-select menu missing for ${label} after filter`,
    }
  }

  let toClick: HTMLElement | null = null
  for (const opt of Array.from(lbFinal.querySelectorAll<HTMLElement>('[role="option"]'))) {
    const lab = (opt.textContent ?? '').trim()
    if (lab === best.chosenLabel) {
      toClick = opt
      break
    }
  }
  if (!toClick) {
    const again = scanListboxForBest(lbFinal, desired)
    if (again && again.score >= 30) toClick = again.el
  }
  if (!toClick) {
    return {
      fieldId,
      status: 'error',
      reason: `could not re-select "${best.chosenLabel}" for ${label}`,
    }
  }

  toClick.click()
  await sleep(150)
  return {
    fieldId,
    status: 'filled',
    reason: `Greenhouse ${label} (react-select): ${best.chosenLabel}`,
  }
}

function fillYearNumberInput(
  el: HTMLInputElement,
  year: string,
  fieldId: string,
  label: string,
  settings: Pick<AppSettings, 'overwriteExisting'>,
  dryRun: boolean,
): FieldFillResult {
  const y = year.trim()
  if (!y) {
    return { fieldId, status: 'skipped', reason: `empty profile value (${label})` }
  }
  const yv = el.value.trim()
  if (!settings.overwriteExisting && yv.length > 0 && !looksLikePastedProfileJson(yv)) {
    return { fieldId, status: 'skipped', reason: 'year already set (overwrite disabled)' }
  }
  if (dryRun) {
    return {
      fieldId,
      status: 'filled',
      reason: `[dry-run] would set ${label} → ${y}`,
    }
  }
  el.focus()
  setNativeInputValue(el, y)
  dispatchInputEvents(el)
  if (el.value.trim() !== y) {
    return { fieldId, status: 'error', reason: `could not apply ${label}` }
  }
  return { fieldId, status: 'filled', reason: `Greenhouse ${label}: ${y}` }
}

interface ReactEducationRow {
  row: number
  school: HTMLInputElement
  degree: HTMLInputElement
  discipline: HTMLInputElement
  startYear: HTMLInputElement
  endYear: HTMLInputElement
}

function parseSchoolRowIndex(input: HTMLInputElement): number | null {
  const m = /^school--(\d+)$/.exec(input.id)
  return m ? Number(m[1]) : null
}

function collectReactEducationRows(doc: Document): ReactEducationRow[] {
  const schools = Array.from(doc.querySelectorAll<HTMLInputElement>('input[id^="school--"]')).filter(
    (el) => /^school--\d+$/.test(el.id),
  )
  schools.sort((a, b) => (parseSchoolRowIndex(a) ?? 0) - (parseSchoolRowIndex(b) ?? 0))
  const rows: ReactEducationRow[] = []
  for (const school of schools) {
    const row = parseSchoolRowIndex(school)
    if (row === null) continue
    const degree = doc.querySelector<HTMLInputElement>(`#degree--${row}`)
    const discipline = doc.querySelector<HTMLInputElement>(`#discipline--${row}`)
    const startYear = doc.querySelector<HTMLInputElement>(`#start-year--${row}`)
    const endYear = doc.querySelector<HTMLInputElement>(`#end-year--${row}`)
    if (degree && discipline && startYear && endYear) {
      rows.push({ row, school, degree, discipline, startYear, endYear })
    }
  }
  return rows
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
    await sleep(160)
  }
}

async function runLegacySelectEducationFill(options: {
  doc: Document
  profile: UserProfile
  settings: Pick<AppSettings, 'overwriteExisting'>
  dryRun: boolean
}): Promise<FieldFillResult[]> {
  const { doc, profile, settings, dryRun } = options
  const results: FieldFillResult[] = []
  const entries = profile.education

  const eduHead = findEducationHeading(doc)
  let selects = selectsInEducationRegion(doc)
  if (selects.length < 5) return results

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

async function runReactSelectEducationFill(options: {
  doc: Document
  profile: UserProfile
  settings: Pick<AppSettings, 'overwriteExisting'>
  dryRun: boolean
}): Promise<FieldFillResult[]> {
  const { doc, profile, settings, dryRun } = options
  const results: FieldFillResult[] = []
  const entries = profile.education

  const eduHead = findEducationHeading(doc)
  let rows = collectReactEducationRows(doc)
  if (rows.length === 0) return results

  await ensureRowCount(doc, eduHead, rows.length, entries.length, dryRun)
  rows = collectReactEducationRows(doc)

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

    results.push(
      await fillReactSelectCombobox(
        doc,
        row.school,
        e.school,
        `gh-education-${i}-school`,
        'school',
        settings,
        dryRun,
      ),
    )
    results.push(
      await fillReactSelectCombobox(
        doc,
        row.degree,
        e.degree ?? '',
        `gh-education-${i}-degree`,
        'degree',
        settings,
        dryRun,
      ),
    )
    results.push(
      await fillReactSelectCombobox(
        doc,
        row.discipline,
        e.fieldOfStudy ?? '',
        `gh-education-${i}-discipline`,
        'discipline',
        settings,
        dryRun,
      ),
    )

    const startY = extractYear(e.startDate)
    const endY = extractYear(e.endDate)
    results.push(
      fillYearNumberInput(
        row.startYear,
        startY,
        `gh-education-${i}-startYear`,
        'startYear',
        settings,
        dryRun,
      ),
    )
    results.push(
      fillYearNumberInput(row.endYear, endY, `gh-education-${i}-endYear`, 'endYear', settings, dryRun),
    )
  }

  return results
}

/**
 * Fills Greenhouse structured education from `profile.education[]`:
 * legacy native `<select>` rows, or modern React Select comboboxes + year inputs.
 */
export async function runGreenhouseEducationFill(options: {
  doc: Document
  profile: UserProfile
  settings: Pick<AppSettings, 'overwriteExisting'>
  dryRun: boolean
}): Promise<FieldFillResult[]> {
  const { doc, profile } = options
  if (profile.education.length === 0) return []

  const legacySelects = selectsInEducationRegion(doc)
  if (legacySelects.length >= 5) {
    return runLegacySelectEducationFill(options)
  }

  const reactRows = collectReactEducationRows(doc)
  if (reactRows.length > 0) {
    return runReactSelectEducationFill(options)
  }

  return []
}
