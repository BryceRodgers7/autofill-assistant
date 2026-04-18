import { STORAGE_SESSION_SCAN_KEY } from '../shared/constants'
import type { ScanResult } from '../shared/types'

type ScanSessionMap = Record<string, ScanResult>

function trimScanForStorage(scan: ScanResult): ScanResult {
  return {
    ...scan,
    fields: scan.fields.map((f) => ({
      ...f,
      descriptor: {
        ...f.descriptor,
        nearbyText: f.descriptor.nearbyText.slice(0, 400),
        sectionContext: f.descriptor.sectionContext.slice(0, 400),
      },
    })),
  }
}

export async function saveLastScanForTab(tabId: number, scan: ScanResult): Promise<void> {
  const raw = await chrome.storage.session.get(STORAGE_SESSION_SCAN_KEY)
  const map: ScanSessionMap = {
    ...(typeof raw[STORAGE_SESSION_SCAN_KEY] === 'object' &&
    raw[STORAGE_SESSION_SCAN_KEY] !== null
      ? (raw[STORAGE_SESSION_SCAN_KEY] as ScanSessionMap)
      : {}),
  }
  map[String(tabId)] = trimScanForStorage(scan)
  await chrome.storage.session.set({ [STORAGE_SESSION_SCAN_KEY]: map })
}

export async function getLastScanForTab(
  tabId: number,
): Promise<ScanResult | null> {
  const raw = await chrome.storage.session.get(STORAGE_SESSION_SCAN_KEY)
  const map = raw[STORAGE_SESSION_SCAN_KEY] as ScanSessionMap | undefined
  if (!map) return null
  return map[String(tabId)] ?? null
}
