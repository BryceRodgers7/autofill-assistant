import type { ControlKind, FieldDescriptor, SelectOptionMeta } from '../shared/types'
import { fingerprintForDescriptor } from '../shared/fingerprint'
import { isProbablyVisible } from './visibility'
import {
  labelsForControl,
  nearbyTextFor,
  resolveAriaRefList,
  sectionContextFor,
} from './labels'

const JUNK_ID_CLASS = /newsletter|subscribe|signup|search|cookie|gdpr|promo/i

function isLikelyJunk(el: HTMLElement): boolean {
  if (el.closest('[role="search"]')) return true
  const cls = `${el.className}`.toLowerCase()
  const id = (el.id || '').toLowerCase()
  if (JUNK_ID_CLASS.test(cls) || JUNK_ID_CLASS.test(id)) return true
  return false
}

function isLikelyConsent(label: string, placeholder: string): boolean {
  const t = `${label} ${placeholder}`.toLowerCase()
  return /terms|privacy policy|i agree|agree to|subscribe|marketing|promotional emails/.test(
    t,
  )
}

function inputControlKind(type: string): ControlKind | null {
  switch (type) {
    case 'text':
    case 'email':
    case 'tel':
    case 'number':
    case 'date':
    case 'url':
      return type
    case 'checkbox':
      return 'checkbox'
    case 'radio':
      return 'radio-group'
    case 'file':
      return 'file'
    default:
      return null
  }
}

function plainText(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function gatherTextCorpus(d: FieldDescriptor): string {
  return [
    d.labelText,
    d.ariaLabel,
    d.ariaLabelledByText,
    d.placeholder,
    d.name,
    d.idAttr,
    d.autocomplete,
    d.sectionContext,
    d.nearbyText,
  ]
    .join(' ')
    .toLowerCase()
}

function describeSelect(sel: HTMLSelectElement, root: Document, ordinal: number): FieldDescriptor {
  const opts: SelectOptionMeta[] = []
  for (const o of Array.from(sel.options)) {
    opts.push({ value: o.value, label: (o.textContent ?? '').trim() || o.value })
  }
  const labelBits = labelsForControl(root, sel)
  const lby = sel.getAttribute('aria-labelledby')
  const ariaLby = lby ? resolveAriaRefList(root, lby) : ''
  const base: Omit<FieldDescriptor, 'id' | 'fingerprint'> = {
    controlKind: 'select',
    tagName: 'SELECT',
    name: sel.name,
    idAttr: sel.id,
    placeholder: '',
    value: sel.value,
    required: sel.required,
    readOnly: false,
    disabled: sel.disabled,
    autocomplete: sel.getAttribute('autocomplete') ?? '',
    labelText: labelBits.join(' '),
    ariaLabel: sel.getAttribute('aria-label') ?? '',
    ariaLabelledByText: ariaLby,
    sectionContext: sectionContextFor(sel),
    nearbyText: nearbyTextFor(sel),
    options: opts,
    likelyConsent: isLikelyConsent(labelBits.join(' '), ''),
    likelyJunk: isLikelyJunk(sel),
    isFile: false,
    domPathHint: `select[name="${sel.name}"]`,
    inputType: undefined,
  }
  const fingerprint = fingerprintForDescriptor(base, ordinal)
  return { id: crypto.randomUUID(), fingerprint, ...base }
}

function describeTextarea(el: HTMLTextAreaElement, root: Document, ordinal: number): FieldDescriptor {
  const labelBits = labelsForControl(root, el)
  const lby = el.getAttribute('aria-labelledby')
  const ariaLby = lby ? resolveAriaRefList(root, lby) : ''
  const base: Omit<FieldDescriptor, 'id' | 'fingerprint'> = {
    controlKind: 'textarea',
    tagName: 'TEXTAREA',
    name: el.name,
    idAttr: el.id,
    placeholder: el.placeholder,
    value: el.value,
    required: el.required,
    readOnly: el.readOnly,
    disabled: el.disabled,
    autocomplete: el.getAttribute('autocomplete') ?? '',
    labelText: labelBits.join(' '),
    ariaLabel: el.getAttribute('aria-label') ?? '',
    ariaLabelledByText: ariaLby,
    sectionContext: sectionContextFor(el),
    nearbyText: nearbyTextFor(el),
    options: [],
    likelyConsent: isLikelyConsent(labelBits.join(' '), el.placeholder),
    likelyJunk: isLikelyJunk(el),
    isFile: false,
    domPathHint: `textarea[name="${el.name}"]`,
    inputType: undefined,
  }
  return {
    id: crypto.randomUUID(),
    fingerprint: fingerprintForDescriptor(base, ordinal),
    ...base,
  }
}

function describeInput(
  el: HTMLInputElement,
  root: Document,
  ordinal: number,
): FieldDescriptor | null {
  const type = (el.type || 'text').toLowerCase()
  if (
    type === 'hidden' ||
    type === 'submit' ||
    type === 'reset' ||
    type === 'button' ||
    type === 'image' ||
    type === 'password'
  ) {
    return null
  }
  const ck = inputControlKind(type)
  if (!ck) return null
  if (type === 'file') {
    const labelBits = labelsForControl(root, el)
    const lby = el.getAttribute('aria-labelledby')
    const ariaLby = lby ? resolveAriaRefList(root, lby) : ''
    const base: Omit<FieldDescriptor, 'id' | 'fingerprint'> = {
      controlKind: 'file',
      tagName: 'INPUT',
      inputType: type,
      name: el.name,
      idAttr: el.id,
      placeholder: el.placeholder,
      value: el.value,
      required: el.required,
      readOnly: el.readOnly,
      disabled: el.disabled,
      autocomplete: el.getAttribute('autocomplete') ?? '',
      labelText: labelBits.join(' '),
      ariaLabel: el.getAttribute('aria-label') ?? '',
      ariaLabelledByText: ariaLby,
      sectionContext: sectionContextFor(el),
      nearbyText: nearbyTextFor(el),
      options: [],
      likelyConsent: false,
      likelyJunk: isLikelyJunk(el),
      isFile: true,
      domPathHint: `input[type=file][name="${el.name}"]`,
    }
    return {
      id: crypto.randomUUID(),
      fingerprint: fingerprintForDescriptor(base, ordinal),
      ...base,
    }
  }
  if (type === 'radio') return null // handled by groups

  const labelBits = labelsForControl(root, el)
  const lby = el.getAttribute('aria-labelledby')
  const ariaLby = lby ? resolveAriaRefList(root, lby) : ''
  const base: Omit<FieldDescriptor, 'id' | 'fingerprint'> = {
    controlKind: ck,
    tagName: 'INPUT',
    inputType: type,
    name: el.name,
    idAttr: el.id,
    placeholder: el.placeholder,
    value: el.value,
    required: el.required,
    readOnly: el.readOnly,
    disabled: el.disabled,
    autocomplete: el.getAttribute('autocomplete') ?? '',
    labelText: labelBits.join(' '),
    ariaLabel: el.getAttribute('aria-label') ?? '',
    ariaLabelledByText: ariaLby,
    sectionContext: sectionContextFor(el),
    nearbyText: nearbyTextFor(el),
    options: [],
    likelyConsent: isLikelyConsent(labelBits.join(' '), el.placeholder),
    likelyJunk: isLikelyJunk(el),
    isFile: false,
    domPathHint: `input[type=${type}][name="${el.name}"]`,
  }
  return {
    id: crypto.randomUUID(),
    fingerprint: fingerprintForDescriptor(base, ordinal),
    ...base,
  }
}

function radioGroups(root: Document): FieldDescriptor[] {
  const radios = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
  const visible = radios.filter((r) => isProbablyVisible(r) && !r.disabled && !r.readOnly)
  const byName = new Map<string, HTMLInputElement[]>()
  for (const r of visible) {
    const n = r.name || `__noname_${byName.size}`
    const arr = byName.get(n) ?? []
    arr.push(r)
    byName.set(n, arr)
  }
  const out: FieldDescriptor[] = []
  let ordinal = 0
  for (const [, group] of byName) {
    const first = group[0]
    if (!first) continue
    if (isLikelyJunk(first)) continue
    const opts: SelectOptionMeta[] = group.map((r) => ({
      value: r.value,
      label:
        labelsForControl(root, r).join(' ') ||
        (r.id ? plainText(root.getElementById(r.id)) : '') ||
        r.value,
    }))
    const labelBits = labelsForControl(root, first)
    const lby = first.getAttribute('aria-labelledby')
    const ariaLby = lby ? resolveAriaRefList(root, lby) : ''
    const base: Omit<FieldDescriptor, 'id' | 'fingerprint'> = {
      controlKind: 'radio-group',
      tagName: 'INPUT',
      inputType: 'radio',
      name: first.name,
      idAttr: first.id,
      placeholder: '',
      value: group.find((r) => r.checked)?.value ?? '',
      required: group.some((r) => r.required),
      readOnly: group.every((r) => r.readOnly),
      disabled: group.every((r) => r.disabled),
      autocomplete: '',
      labelText: labelBits.join(' '),
      ariaLabel: first.getAttribute('aria-label') ?? '',
      ariaLabelledByText: ariaLby,
      sectionContext: sectionContextFor(first),
      nearbyText: nearbyTextFor(first),
      options: opts,
      likelyConsent: isLikelyConsent(labelBits.join(' '), ''),
      likelyJunk: isLikelyJunk(first),
      isFile: false,
      domPathHint: `input[type=radio][name="${first.name}"]`,
    }
    out.push({
      id: crypto.randomUUID(),
      fingerprint: fingerprintForDescriptor(base, ordinal),
      ...base,
    })
    ordinal += 1
  }
  return out
}

/** Heuristic: enough controls to look like an application form */
export function pageLooksFormLike(fields: FieldDescriptor[]): boolean {
  if (fields.length >= 3) return true
  const forms = document.querySelectorAll('form')
  if (forms.length === 0) return fields.length > 0
  for (const f of Array.from(forms)) {
    const t = (f.textContent ?? '').toLowerCase()
    if (/apply|application|resume|position|job|career/.test(t) && fields.length > 0)
      return true
  }
  return fields.length >= 2
}

export function detectFields(root: Document = document): FieldDescriptor[] {
  const out: FieldDescriptor[] = []
  let ordinal = 0

  const inputs = Array.from(root.querySelectorAll<HTMLInputElement>('input'))
  for (const el of inputs) {
    if (!isProbablyVisible(el)) continue
    if (el.disabled || el.readOnly) continue
    if ((el.type || '').toLowerCase() === 'radio') continue
    const d = describeInput(el, root, ordinal)
    if (!d) continue
    out.push(d)
    ordinal += 1
  }

  const tas = Array.from(root.querySelectorAll<HTMLTextAreaElement>('textarea'))
  for (const el of tas) {
    if (!isProbablyVisible(el) || el.disabled || el.readOnly) continue
    out.push(describeTextarea(el, root, ordinal))
    ordinal += 1
  }

  const sels = Array.from(root.querySelectorAll<HTMLSelectElement>('select'))
  for (const el of sels) {
    if (!isProbablyVisible(el) || el.disabled) continue
    out.push(describeSelect(el, root, ordinal))
    ordinal += 1
  }

  out.push(...radioGroups(root))

  // Recompute fingerprints with final ordinals for stability within this scan order
  return out.map((d, i) => ({
    ...d,
    fingerprint: fingerprintForDescriptor(d, i),
  }))
}

export { gatherTextCorpus }
