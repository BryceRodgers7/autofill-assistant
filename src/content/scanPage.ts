import { detectFields, pageLooksFormLike, gatherTextCorpus } from '../fieldDetection/detectFields'
import { classifyField } from '../classification/classifyField'
import type { AppSettings, UserProfile } from '../storage/schema'
import type { ScanResult, ScannedField } from '../shared/types'
import { resolveProfileString } from '../shared/profileValue'

export function scanPage(
  tabId: number,
  url: string,
  settings: AppSettings,
  profile: UserProfile,
): ScanResult {
  const descriptors = detectFields(document)
  const hasFormLike = pageLooksFormLike(descriptors)
  const fields: ScannedField[] = []

  for (const d of descriptors) {
    const corpus = gatherTextCorpus(d)
    const classification = classifyField(d, { corpus })
    const valuePreview =
      classification.profileKey !== null
        ? resolveProfileString(profile, classification.profileKey) ?? ''
        : ''
    const eligibleAtScan =
      classification.profileKey !== null &&
      classification.confidence >= settings.confidenceThreshold &&
      valuePreview.trim().length > 0

    fields.push({
      descriptor: d,
      classification,
      valuePreview,
      eligibleAtScan,
      fillStatus: 'pending',
    })
  }

  return {
    tabId,
    url,
    scannedAt: Date.now(),
    hasFormLike,
    fields,
  }
}
