import { describe, expect, it } from 'vitest'
import { effectiveFillThreshold } from './fillEngine'
import type { AppSettings } from '../storage/schema'

function s(partial: Partial<AppSettings>): AppSettings {
  return {
    confidenceThreshold: 0.72,
    overwriteExisting: false,
    highlightFilled: true,
    verboseDebug: false,
    includeLowerConfidence: false,
    ...partial,
  }
}

describe('effectiveFillThreshold', () => {
  it('uses stored bar when include-lower is off', () => {
    expect(effectiveFillThreshold(s({ confidenceThreshold: 0.4 }), false)).toBe(0.4)
  })

  it('lowers floor when include-lower is on', () => {
    expect(effectiveFillThreshold(s({ confidenceThreshold: 0.72 }), true)).toBeCloseTo(0.37, 5)
    expect(0.48).toBeGreaterThanOrEqual(effectiveFillThreshold(s({ confidenceThreshold: 0.72 }), true))
  })

  it('floors at 0.2', () => {
    expect(effectiveFillThreshold(s({ confidenceThreshold: 0.25 }), true)).toBe(0.2)
  })
})
