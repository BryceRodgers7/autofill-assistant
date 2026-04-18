import type { ScanResult, FillOperationResult, ScannedField } from './types'
import type { UserProfile } from '../storage/schema'
import type { AppSettings } from '../storage/schema'

export type ContentInboundMessage =
  | {
      type: 'JAA_SCAN_PAGE'
      settings: AppSettings
      profile: UserProfile
    }
  | {
      type: 'JAA_FILL_PAGE'
      profile: UserProfile
      settings: AppSettings
      dryRun: boolean
      includeLowerConfidence: boolean
      targets: ScannedField[]
    }
  | { type: 'JAA_CLEAR_HIGHLIGHTS' }

export type ContentOutboundMessage =
  | { ok: true; scan: ScanResult }
  | { ok: true; fill: FillOperationResult }
  | { ok: true; cleared: true }
  | { ok: false; error: string }

export function isContentOk(
  m: ContentOutboundMessage,
): m is Extract<ContentOutboundMessage, { ok: true }> {
  return m.ok === true
}
