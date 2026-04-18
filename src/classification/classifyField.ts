import type { FieldDescriptor } from '../shared/types'
import type { ProfileKey } from '../shared/profileKeys'
import { PROFILE_KEYS } from '../shared/profileKeys'
import { SYNONYMS } from './synonyms'

export interface ClassifyOptions {
  /** Extra corpus text (already lowercased) joined for matching */
  corpus: string
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function containsHay(haystack: string, needle: string): boolean {
  return haystack.includes(needle)
}

/**
 * Score field text sources against synonym phrases.
 * Higher tiers: label exact > label contains > aria > placeholder/name/id/autocomplete > section/nearby.
 */
export function classifyField(
  d: FieldDescriptor,
  options: ClassifyOptions,
): { profileKey: ProfileKey | null; confidence: number; reasons: string[] } {
  const reasons: string[] = []
  const label = normalize(d.labelText)
  const aria = normalize(d.ariaLabel + ' ' + d.ariaLabelledByText)
  const ph = normalize(d.placeholder)
  const nm = normalize(d.name.replace(/[_\[\]]+/g, ' '))
  const id = normalize(d.idAttr.replace(/[_\-]+/g, ' '))
  const ac = normalize(d.autocomplete)
  const ctx = normalize(d.sectionContext + ' ' + d.nearbyText)
  const corpus = options.corpus

  let bestKey: ProfileKey | null = null
  let best = 0

  for (const key of PROFILE_KEYS) {
    if (key === 'customFields') continue
    const { phrases, tier } = SYNONYMS[key]
    if (!phrases.length) continue

    let score = 0
    const keyReasons: string[] = []

    for (const phrase of phrases) {
      const p = normalize(phrase)
      if (!p) continue

      // Exact / strong label match
      if (label === p) {
        score += tier === 'primary' ? 0.42 : 0.32
        keyReasons.push(`label exact: "${phrase}"`)
      } else if (label.includes(p) || p.includes(label)) {
        if (label.length > 0) {
          score += tier === 'primary' ? 0.28 : 0.2
          keyReasons.push(`label contains: "${phrase}"`)
        }
      }

      if (aria.includes(p)) {
        score += tier === 'primary' ? 0.22 : 0.16
        keyReasons.push(`aria contains: "${phrase}"`)
      }

      if (ph.includes(p)) {
        score += 0.12
        keyReasons.push(`placeholder contains: "${phrase}"`)
      }
      if (nm.includes(p) || p.split(' ').every((w) => w && nm.includes(w))) {
        score += 0.1
        keyReasons.push(`name/id token: "${phrase}"`)
      }
      if (id.includes(p)) {
        score += 0.08
        keyReasons.push(`id contains: "${phrase}"`)
      }
      if (ac.includes(p)) {
        score += 0.18
        keyReasons.push(`autocomplete contains: "${phrase}"`)
      }
      if (ctx.includes(p)) {
        score += 0.06
        keyReasons.push(`context contains: "${phrase}"`)
      }
      if (containsHay(corpus, p)) {
        score += 0.04
        keyReasons.push(`corpus contains: "${phrase}"`)
      }
    }

    // De-prioritize likely consent / junk heuristics
    if (d.likelyConsent && key !== 'requireSponsorship') {
      score *= 0.35
      keyReasons.push('penalized: likely consent/policy control')
    }
    if (d.likelyJunk) {
      score *= 0.25
      keyReasons.push('penalized: likely non-application control')
    }

    // Input-type hints
    if (key === 'email' && d.inputType === 'email') score += 0.12
    if (key === 'phone' && (d.inputType === 'tel' || ph.includes('tel'))) score += 0.1

    if (score > best) {
      best = score
      bestKey = key
      reasons.length = 0
      reasons.push(...keyReasons.slice(0, 6))
    }
  }

  const confidence = Math.min(1, best)
  if (!bestKey) {
    return { profileKey: null, confidence: 0, reasons: ['no confident synonym match'] }
  }
  return { profileKey: bestKey, confidence, reasons }
}
