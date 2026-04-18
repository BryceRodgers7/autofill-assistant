import type { MessageFromExtension, MessageResponse } from '../shared/messages'
import type { ContentInboundMessage, ContentOutboundMessage } from '../shared/contentMessages'
import { isContentOk } from '../shared/contentMessages'
import { loadState, saveProfile, saveSettings } from '../storage/store'
import { saveLastScanForTab, getLastScanForTab } from '../storage/sessionScan'
import { mergeScanWithFillResults } from './mergeScan'
import { createLogger } from '../debug/logger'
import { verboseFromSettings } from '../debug/logger'

const log = createLogger('background', () => false)

function isInjectableUrl(url?: string | null): boolean {
  return !!url && (url.startsWith('http://') || url.startsWith('https://'))
}

async function resolveTabId(requested: number | undefined, senderTabId?: number): Promise<number> {
  if (requested !== undefined) return requested
  if (senderTabId !== undefined) return senderTabId
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!t?.id) throw new Error('No active tab')
  return t.id
}

async function sendToTab<T extends ContentOutboundMessage>(
  tabId: number,
  msg: ContentInboundMessage,
): Promise<T> {
  try {
    const raw = await chrome.tabs.sendMessage(tabId, msg)
    return raw as T
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? `Could not reach page (${e.message}). Reload the tab or ensure it is a normal web page.`
        : String(e),
    )
  }
}

chrome.runtime.onMessage.addListener(
  (request: MessageFromExtension, sender, sendResponse: (r: MessageResponse) => void) => {
    ;(async () => {
      try {
        if (request.type === 'GET_STATE') {
          const state = await loadState()
          sendResponse({ ok: true, state })
          return
        }
        if (request.type === 'SAVE_PROFILE') {
          await saveProfile(request.profile)
          sendResponse({ ok: true, saved: true })
          return
        }
        if (request.type === 'SAVE_SETTINGS') {
          await saveSettings(request.settings)
          sendResponse({ ok: true, saved: true })
          return
        }

        if (request.type === 'GET_LAST_SCAN') {
          const tabId = await resolveTabId(request.tabId, sender.tab?.id)
          const lastScan = await getLastScanForTab(tabId)
          sendResponse({ ok: true, lastScan })
          return
        }

        if (
          request.type === 'SCAN_TAB' ||
          request.type === 'RESCAN_TAB' ||
          request.type === 'CLEAR_HIGHLIGHTS'
        ) {
          const tabId = await resolveTabId(request.tabId, sender.tab?.id)
          const tab = await chrome.tabs.get(tabId)
          if (!isInjectableUrl(tab.url)) {
            sendResponse({
              ok: false,
              error: 'This page cannot be scanned (restricted URL).',
            })
            return
          }

          if (request.type === 'CLEAR_HIGHLIGHTS') {
            const res = await sendToTab<ContentOutboundMessage>(tabId, {
              type: 'JAA_CLEAR_HIGHLIGHTS',
            })
            if (!isContentOk(res)) {
              sendResponse({ ok: false, error: res.error })
              return
            }
            sendResponse({ ok: true, cleared: true })
            return
          }

          const { profile, settings } = await loadState()
          const verbose = verboseFromSettings(settings)
          const logger = createLogger('scan', () => verbose)
          const out = await sendToTab<ContentOutboundMessage>(tabId, {
            type: 'JAA_SCAN_PAGE',
            tabId,
            settings,
            profile,
          })
          if (!isContentOk(out) || !('scan' in out)) {
            sendResponse({
              ok: false,
              error: !isContentOk(out) ? out.error : 'Scan failed',
            })
            return
          }
          logger.debug('scan complete', { fields: out.scan.fields.length })
          await saveLastScanForTab(tabId, out.scan)
          sendResponse({ ok: true, scan: out.scan })
          return
        }

        if (request.type === 'FILL_TAB') {
          const tabId = await resolveTabId(request.tabId, sender.tab?.id)
          const tab = await chrome.tabs.get(tabId)
          if (!isInjectableUrl(tab.url)) {
            sendResponse({ ok: false, error: 'Restricted URL' })
            return
          }
          const last = await getLastScanForTab(tabId)
          if (!last) {
            sendResponse({ ok: false, error: 'No scan for this tab. Run Scan first.' })
            return
          }
          const { profile, settings } = await loadState()
          const out = await sendToTab<ContentOutboundMessage>(tabId, {
            type: 'JAA_FILL_PAGE',
            tabId,
            profile,
            settings,
            dryRun: request.dryRun,
            includeLowerConfidence: request.includeLowerConfidence,
            targets: last.fields,
          })
          if (!isContentOk(out) || !('fill' in out)) {
            sendResponse({
              ok: false,
              error: !isContentOk(out) ? out.error : 'Fill failed',
            })
            return
          }
          if (!request.dryRun) {
            const updatedFields = mergeScanWithFillResults(last.fields, out.fill.fields)
            await saveLastScanForTab(tabId, { ...last, fields: updatedFields })
          }
          sendResponse({ ok: true, fill: out.fill })
          return
        }

        sendResponse({ ok: false, error: 'Unknown message' })
      } catch (e) {
        log.error('handler', e)
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        })
      }
    })()
    return true
  },
)

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {
    /* ignore */
  })
})
