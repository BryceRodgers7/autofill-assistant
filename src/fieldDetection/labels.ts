function text(el: Element | null | undefined): string {
  if (!el) return ''
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function resolveAriaRefList(root: Document, ids: string): string {
  const parts: string[] = []
  for (const raw of ids.split(/\s+/)) {
    const id = raw.trim()
    if (!id) continue
    const node = root.getElementById(id)
    if (node) parts.push(text(node))
  }
  return parts.join(' ')
}

export function labelsForControl(root: Document, control: HTMLElement): string[] {
  const out: string[] = []
  if (
    control instanceof HTMLInputElement ||
    control instanceof HTMLTextAreaElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLButtonElement
  ) {
    const ls = control.labels
    if (ls) {
      for (const l of Array.from(ls)) {
        out.push(text(l))
      }
    }
  }
  if (control.id) {
    const lab = root.querySelector(`label[for="${CSS.escape(control.id)}"]`)
    if (lab) out.push(text(lab))
  }
  let parent: HTMLElement | null = control.parentElement
  while (parent) {
    if (parent.tagName === 'LABEL') {
      out.push(text(parent))
      break
    }
    parent = parent.parentElement
  }
  return [...new Set(out.filter(Boolean))]
}

export function sectionContextFor(el: HTMLElement, maxDepth = 8): string {
  const chunks: string[] = []
  let node: HTMLElement | null = el
  let depth = 0
  while (node && depth < maxDepth) {
    if (node.tagName === 'FIELDSET') {
      const leg = node.querySelector('legend')
      if (leg) chunks.push(text(leg))
    }
    const role = node.getAttribute('role')
    if (role === 'group' || role === 'region') {
      const al = node.getAttribute('aria-label')
      if (al) chunks.push(al)
      const lby = node.getAttribute('aria-labelledby')
      if (lby && node.ownerDocument)
        chunks.push(resolveAriaRefList(node.ownerDocument, lby))
    }
    if (/^H[1-4]$/i.test(node.tagName)) {
      chunks.push(text(node))
    }
    node = node.parentElement
    depth += 1
  }
  return [...new Set(chunks.filter(Boolean))].join(' · ').slice(0, 600)
}

export function nearbyTextFor(el: HTMLElement): string {
  let sib: Element | null = el.previousElementSibling
  let hops = 0
  const parts: string[] = []
  while (sib && hops < 4) {
    const t = text(sib)
    if (t) parts.push(t.slice(0, 200))
    sib = sib.previousElementSibling
    hops += 1
  }
  return parts.join(' ').slice(0, 400)
}
