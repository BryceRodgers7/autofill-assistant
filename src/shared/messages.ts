import type { ScanResult, FillOperationResult } from './types'
import type { AppSettings, UserProfile } from '../storage/schema'

export type MessageFromExtension =
  | { type: 'GET_STATE' }
  | { type: 'SAVE_PROFILE'; profile: UserProfile }
  | { type: 'SAVE_SETTINGS'; settings: AppSettings }
  | { type: 'SCAN_TAB'; tabId?: number }
  | { type: 'RESCAN_TAB'; tabId?: number }
  | {
      type: 'FILL_TAB'
      tabId?: number
      dryRun: boolean
      /** When true, allow fills below threshold (still never unsafe types) */
      includeLowerConfidence: boolean
    }
  | { type: 'CLEAR_HIGHLIGHTS'; tabId?: number }
  | { type: 'GET_LAST_SCAN'; tabId?: number }

export type MessageResponse =
  | { ok: true; state: { profile: UserProfile; settings: AppSettings } }
  | { ok: true; saved: true }
  | { ok: true; scan: ScanResult }
  | { ok: true; fill: FillOperationResult }
  | { ok: true; cleared: true }
  | { ok: true; lastScan: ScanResult | null }
  | { ok: false; error: string }

export function isMessageResponse(x: unknown): x is MessageResponse {
  return typeof x === 'object' && x !== null && 'ok' in x
}
