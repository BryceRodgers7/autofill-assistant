import type { AppSettings } from '../storage/schema'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface Logger {
  debug: (msg: string, data?: unknown) => void
  info: (msg: string, data?: unknown) => void
  warn: (msg: string, data?: unknown) => void
  error: (msg: string, data?: unknown) => void
}

/** Structured logger; respects verboseDebug in settings when passed per-call. */
export function createLogger(scope: string, verbose?: () => boolean): Logger {
  const p = (level: LogLevel, msg: string, data?: unknown) => {
    const line = `[jaa:${scope}] ${msg}`
    if (data !== undefined) {
      // eslint-disable-next-line no-console
      console[level === 'debug' ? 'log' : level](line, data)
    } else {
      // eslint-disable-next-line no-console
      console[level === 'debug' ? 'log' : level](line)
    }
  }

  return {
    debug: (msg, data) => {
      if (verbose?.()) p('debug', msg, data)
    },
    info: (msg, data) => p('info', msg, data),
    warn: (msg, data) => p('warn', msg, data),
    error: (msg, data) => p('error', msg, data),
  }
}

export function verboseFromSettings(settings: Pick<AppSettings, 'verboseDebug'>): boolean {
  return settings.verboseDebug
}
