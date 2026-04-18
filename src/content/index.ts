import type { ContentInboundMessage, ContentOutboundMessage } from '../shared/contentMessages'
import { scanPage } from './scanPage'
import {
  runFillOperation,
  applyHighlights,
  clearHighlights,
} from '../fill/fillEngine'
import { ensureHighlightStyles } from './highlightStyles'
import { createLogger } from '../debug/logger'
import { verboseFromSettings } from '../debug/logger'

chrome.runtime.onMessage.addListener(
  (message: ContentInboundMessage, sender, sendResponse: (r: ContentOutboundMessage) => void) => {
    ;(async () => {
      try {
        if (message.type === 'JAA_SCAN_PAGE') {
          // Background uses tabs.sendMessage — Chrome often omits sender.tab here.
          const tabId = message.tabId ?? sender.tab?.id
          if (tabId === undefined) {
            sendResponse({ ok: false, error: 'No tab id (content script context)' })
            return
          }
          const url = location.href
          const scan = scanPage(tabId, url, message.settings, message.profile)
          sendResponse({ ok: true, scan })
          return
        }
        if (message.type === 'JAA_FILL_PAGE') {
          ensureHighlightStyles(document)
          const tabId = message.tabId ?? sender.tab?.id
          if (tabId === undefined) {
            sendResponse({ ok: false, error: 'No tab id' })
            return
          }
          const verbose = verboseFromSettings(message.settings)
          const logger = createLogger('content-fill', () => verbose)
          logger.debug('fill start', {
            dryRun: message.dryRun,
            targets: message.targets.length,
          })
          const results = runFillOperation(document, {
            profile: message.profile,
            settings: message.settings,
            dryRun: message.dryRun,
            includeLowerConfidence: message.includeLowerConfidence,
            targets: message.targets,
          })
          if (message.settings.highlightFilled && !message.dryRun) {
            applyHighlights(document, message.targets, results, true)
          }
          sendResponse({
            ok: true,
            fill: { tabId, dryRun: message.dryRun, fields: results },
          })
          return
        }
        if (message.type === 'JAA_CLEAR_HIGHLIGHTS') {
          clearHighlights(document)
          sendResponse({ ok: true, cleared: true })
          return
        }
        sendResponse({ ok: false, error: 'unknown message' })
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        })
      }
    })()
    return true
  },
)
