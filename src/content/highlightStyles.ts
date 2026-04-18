import { JAA_DATA_ATTR } from '../shared/constants'

const STYLE_ID = 'jaa-highlight-style'

/** Injects once so filled/skipped outlines are visible on host pages. */
export function ensureHighlightStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return
  const el = doc.createElement('style')
  el.id = STYLE_ID
  const a = JAA_DATA_ATTR
  el.textContent = `
    [${a}="filled"] {
      outline: 2px solid #1b5e20 !important;
      outline-offset: 2px !important;
    }
    [${a}="skipped"] {
      outline: 2px dashed #b71c1c !important;
      outline-offset: 2px !important;
    }
  `
  doc.documentElement.appendChild(el)
}
