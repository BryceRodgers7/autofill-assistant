import { JAA_DATA_ATTR } from '../shared/constants'
import type { ProfileKey } from '../shared/profileKeys'
import type { UserProfile } from '../storage/schema'
import type { AppSettings } from '../storage/schema'
import type { ScannedField, FieldDescriptor, FieldFillResult } from '../shared/types'
import { resolveProfileString } from '../shared/profileValue'
import { detectFields } from '../fieldDetection/detectFields'
import { fingerprintForDescriptor } from '../shared/fingerprint'

function dispatchInputEvents(el: HTMLElement): void {
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const desc = Object.getOwnPropertyDescriptor(proto, 'value')
  if (desc?.set) desc.set.call(el, value)
  else el.value = value
}

export interface FillEngineOptions {
  profile: UserProfile
  settings: AppSettings
  dryRun: boolean
  includeLowerConfidence: boolean
  targets: ScannedField[]
}

function effectiveThreshold(settings: AppSettings, includeLower: boolean): number {
  if (includeLower) return Math.max(0.35, settings.confidenceThreshold - 0.22)
  return settings.confidenceThreshold
}

function findDomForDescriptor(root: Document, d: FieldDescriptor): HTMLElement | null {
  if (d.controlKind === 'textarea') {
    if (d.idAttr) return root.querySelector(`textarea#${CSS.escape(d.idAttr)}`)
    if (d.name) return root.querySelector(`textarea[name="${CSS.escape(d.name)}"]`)
    return null
  }
  if (d.controlKind === 'select') {
    if (d.idAttr) return root.querySelector(`select#${CSS.escape(d.idAttr)}`)
    if (d.name) return root.querySelector(`select[name="${CSS.escape(d.name)}"]`)
    return null
  }
  if (d.controlKind === 'radio-group' && d.name) {
    return root.querySelector(`input[type="radio"][name="${CSS.escape(d.name)}"]`)
  }
  if (d.tagName === 'INPUT' && d.inputType) {
    if (d.idAttr) return root.querySelector(`input#${CSS.escape(d.idAttr)}`)
    if (d.name)
      return root.querySelector(
        `input[type="${CSS.escape(d.inputType)}"][name="${CSS.escape(d.name)}"]`,
      )
  }
  return null
}

function buildElementMap(root: Document, targets: ScannedField[]): Map<string, HTMLElement> {
  const live = detectFields(root)
  const map = new Map<string, HTMLElement>()
  for (const t of targets) {
    const hit = live.find(
      (d, i) => fingerprintForDescriptor(d, i) === t.descriptor.fingerprint,
    )
    if (!hit) continue
    const el = findDomForDescriptor(root, hit)
    if (el) map.set(t.descriptor.id, el)
  }
  return map
}

function shouldFillCheckbox(
  d: FieldDescriptor,
  key: ProfileKey,
  confidence: number,
): boolean {
  if (d.likelyConsent) return false
  if (key !== 'requireSponsorship') return false
  return confidence >= 0.55
}

function matchRadioOption(
  d: FieldDescriptor,
  value: string,
): { value: string } | null {
  const v = value.toLowerCase()
  const yes = d.options.find((o) => /^(yes|y|true|1)$/i.test(o.value) || /yes/i.test(o.label))
  const no = d.options.find((o) => /^(no|n|false|0)$/i.test(o.value) || /no/i.test(o.label))
  if (/true|yes|1/.test(v)) return yes ? { value: yes.value } : null
  if (/false|no|0/.test(v)) return no ? { value: no.value } : null
  const exact = d.options.find(
    (o) => o.label.toLowerCase() === v || o.value.toLowerCase() === v,
  )
  return exact ? { value: exact.value } : null
}

export function runFillOperation(
  root: Document,
  opts: FillEngineOptions,
): FieldFillResult[] {
  const thr = effectiveThreshold(opts.settings, opts.includeLowerConfidence)
  const results: FieldFillResult[] = []
  const elementMap = buildElementMap(root, opts.targets)

  for (const sf of opts.targets) {
    const d = sf.descriptor
    const el = elementMap.get(d.id)
    const key = sf.classification.profileKey
    const conf = sf.classification.confidence

    if (!key) {
      results.push({ fieldId: d.id, status: 'skipped', reason: 'no profile key' })
      continue
    }

    if (d.isFile || d.controlKind === 'file') {
      results.push({
        fieldId: d.id,
        status: 'manual',
        reason: 'file upload requires manual action (MVP)',
      })
      continue
    }

    if (conf < thr) {
      results.push({
        fieldId: d.id,
        status: 'skipped',
        reason: `below confidence threshold (${conf.toFixed(2)} < ${thr.toFixed(2)})`,
      })
      continue
    }

    const strVal = resolveProfileString(opts.profile, key)
    if (strVal === null || strVal === '') {
      results.push({ fieldId: d.id, status: 'skipped', reason: 'empty profile value' })
      continue
    }

    if (!el) {
      results.push({
        fieldId: d.id,
        status: 'error',
        reason: 'element not found for fingerprint',
      })
      continue
    }

    if (!opts.settings.overwriteExisting) {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.value.trim().length > 0) {
          results.push({
            fieldId: d.id,
            status: 'skipped',
            reason: 'existing value (overwrite disabled)',
          })
          continue
        }
      }
      if (el instanceof HTMLSelectElement && el.value) {
        const opt = el.selectedOptions[0]
        const isPlaceholder =
          opt && (!opt.value || /select|choose|please/i.test(opt.text))
        if (!isPlaceholder && el.value.trim().length > 0) {
          results.push({
            fieldId: d.id,
            status: 'skipped',
            reason: 'select already has value',
          })
          continue
        }
      }
    }

    if (d.controlKind === 'checkbox') {
      if (!shouldFillCheckbox(d, key, conf)) {
        results.push({
          fieldId: d.id,
          status: 'skipped',
          reason: 'checkbox fill disabled except unambiguous sponsorship',
        })
        continue
      }
      const want = opts.profile.requireSponsorship === true
      if (opts.dryRun) {
        results.push({
          fieldId: d.id,
          status: 'filled',
          reason: `[dry-run] would set checkbox to ${want}`,
        })
        continue
      }
      const cb = el as HTMLInputElement
      cb.focus()
      cb.checked = want
      dispatchInputEvents(cb)
      results.push({ fieldId: d.id, status: 'filled', reason: 'checkbox set' })
      continue
    }

    if (d.controlKind === 'radio-group') {
      const picked = matchRadioOption(d, strVal)
      if (!picked) {
        results.push({
          fieldId: d.id,
          status: 'skipped',
          reason: 'could not map profile value to radio option',
        })
        continue
      }
      const input = root.querySelector<HTMLInputElement>(
        `input[type="radio"][name="${CSS.escape(d.name)}"][value="${CSS.escape(picked.value)}"]`,
      )
      if (!input) {
        results.push({
          fieldId: d.id,
          status: 'error',
          reason: 'radio option element missing',
        })
        continue
      }
      if (opts.dryRun) {
        results.push({
          fieldId: d.id,
          status: 'filled',
          reason: `[dry-run] would select radio value ${picked.value}`,
        })
        continue
      }
      input.focus()
      input.checked = true
      dispatchInputEvents(input)
      results.push({ fieldId: d.id, status: 'filled', reason: 'radio selected' })
      continue
    }

    if (el instanceof HTMLSelectElement) {
      if (opts.dryRun) {
        results.push({
          fieldId: d.id,
          status: 'filled',
          reason: `[dry-run] would set select to "${strVal.slice(0, 80)}"`,
        })
        continue
      }
      el.focus()
      el.value = strVal
      if (el.value !== strVal) {
        const opt = Array.from(el.options).find(
          (o) => o.text.toLowerCase().includes(strVal.toLowerCase()) || o.value === strVal,
        )
        if (opt) el.value = opt.value
      }
      dispatchInputEvents(el)
      results.push({ fieldId: d.id, status: 'filled', reason: 'select value set' })
      continue
    }

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (opts.dryRun) {
        results.push({
          fieldId: d.id,
          status: 'filled',
          reason: `[dry-run] would set text to "${strVal.slice(0, 80)}${strVal.length > 80 ? '…' : ''}"`,
        })
        continue
      }
      el.focus()
      setNativeValue(el, strVal)
      dispatchInputEvents(el)
      results.push({ fieldId: d.id, status: 'filled', reason: 'text value set' })
      continue
    }

    results.push({ fieldId: d.id, status: 'skipped', reason: 'unsupported element' })
  }

  return results
}

export function applyHighlights(
  root: Document,
  targets: ScannedField[],
  fillResults: FieldFillResult[],
  highlight: boolean,
): void {
  if (!highlight) return
  const map = buildElementMap(root, targets)
  const byId = new Map(fillResults.map((r) => [r.fieldId, r]))
  for (const t of targets) {
    const el = map.get(t.descriptor.id)
    if (!el) continue
    const r = byId.get(t.descriptor.id)
    if (!r) continue
    if (r.status === 'filled') el.setAttribute(JAA_DATA_ATTR, 'filled')
    else if (r.status === 'skipped' || r.status === 'manual')
      el.setAttribute(JAA_DATA_ATTR, 'skipped')
  }
}

export function clearHighlights(root: Document): void {
  root.querySelectorAll(`[${JAA_DATA_ATTR}]`).forEach((n) => {
    ;(n as HTMLElement).removeAttribute(JAA_DATA_ATTR)
  })
}
