/**
 * Future: site-specific tweaks (selectors, ATS quirks).
 * Keep a narrow interface so adapters stay small and optional.
 */
export interface SiteAdapterContext {
  hostname: string
  pathname: string
}

export interface SiteAdapter {
  id: string
  /** Return true if this adapter wants to handle the page */
  matches(ctx: SiteAdapterContext): boolean
}

/** Registry placeholder — wire adapters here later */
export const siteAdapters: SiteAdapter[] = []
