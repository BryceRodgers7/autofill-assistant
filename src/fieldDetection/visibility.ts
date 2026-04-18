/**
 * Visibility checks: only fields the user can reasonably see/interact with.
 * Viewport gating is intentionally loose — many forms live in scrollable areas.
 */
export function isProbablyVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  const opacity = Number.parseFloat(style.opacity)
  if (!Number.isNaN(opacity) && opacity === 0) return false

  const rect = el.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return false

  let p: HTMLElement | null = el
  for (let i = 0; i < 12 && p; i += 1) {
    if (p.getAttribute('aria-hidden') === 'true') return false
    const st = window.getComputedStyle(p)
    if (st.display === 'none' || st.visibility === 'hidden') return false
    p = p.parentElement
  }
  return true
}
