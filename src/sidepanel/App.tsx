import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { ScannedField, ScanResult } from '../shared/types'
import { sendExtensionMessage } from '../shared/extensionMessaging'

type Filter = 'all' | 'matched' | 'unmatched' | 'filled' | 'skipped'

export function App(): React.ReactElement {
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [includeLower, setIncludeLower] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [lastDry, setLastDry] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const r = await sendExtensionMessage({ type: 'GET_LAST_SCAN' })
    if (!r.ok) {
      setNote(r.error)
      return
    }
    if (!('lastScan' in r)) return
    setScan(r.lastScan)
    setNote('')
  }, [])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 1200)
    return () => window.clearInterval(id)
  }, [refresh])

  const settingsSync = useCallback(async () => {
    const r = await sendExtensionMessage({ type: 'GET_STATE' })
    if (r.ok && 'state' in r) setIncludeLower(r.state.settings.includeLowerConfidence)
  }, [])

  const persistIncludeLower = async (checked: boolean) => {
    setIncludeLower(checked)
    const r = await sendExtensionMessage({ type: 'GET_STATE' })
    if (r.ok && 'state' in r) {
      await sendExtensionMessage({
        type: 'SAVE_SETTINGS',
        settings: { ...r.state.settings, includeLowerConfidence: checked },
      })
    }
  }

  useEffect(() => {
    void settingsSync()
  }, [settingsSync])

  const filtered = useMemo(() => {
    if (!scan) return []
    return scan.fields.filter((f) => {
      if (filter === 'all') return true
      if (filter === 'matched') return f.classification.profileKey !== null
      if (filter === 'unmatched') return f.classification.profileKey === null
      if (filter === 'filled') return f.fillStatus === 'filled'
      if (filter === 'skipped')
        return (
          f.fillStatus === 'skipped' ||
          f.fillStatus === 'manual' ||
          f.fillStatus === 'error'
        )
      return true
    })
  }, [scan, filter])

  const runScan = async () => {
    setBusy(true)
    try {
      const r = await sendExtensionMessage({ type: 'SCAN_TAB' })
      if (!r.ok || !('scan' in r)) setNote(r.ok ? 'Scan failed' : r.error)
      else setScan(r.scan)
    } finally {
      setBusy(false)
    }
  }

  const runDry = async () => {
    setBusy(true)
    setLastDry(null)
    try {
      const r = await sendExtensionMessage({
        type: 'FILL_TAB',
        dryRun: true,
        includeLowerConfidence: includeLower,
      })
      if (!r.ok) {
        setNote(r.error)
        return
      }
      if (!('fill' in r)) {
        setNote('Dry run failed')
        return
      }
      const lines = r.fill.fields.map(
        (x) => `${x.fieldId.slice(0, 8)}… ${x.status}: ${x.reason}`,
      )
      setLastDry(lines.join('\n'))
    } finally {
      setBusy(false)
    }
  }

  const runFill = async () => {
    setBusy(true)
    try {
      const r = await sendExtensionMessage({
        type: 'FILL_TAB',
        dryRun: false,
        includeLowerConfidence: includeLower,
      })
      if (!r.ok) setNote(r.error)
      else if ('fill' in r)
        setNote(`Filled run: ${r.fill.fields.filter((x) => x.status === 'filled').length} ok`)
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  const clearHi = async () => {
    const r = await sendExtensionMessage({ type: 'CLEAR_HIGHLIGHTS' })
    if (!r.ok) setNote(r.error)
    else setNote('Highlights cleared')
  }

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <header style={{ fontWeight: 700 }}>Field review</header>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" disabled={busy} onClick={() => void runScan()}>
          Rescan
        </button>
        <button type="button" disabled={busy} onClick={() => void runDry()}>
          Dry run
        </button>
        <button type="button" disabled={busy} onClick={() => void runFill()}>
          Fill
        </button>
        <button type="button" onClick={() => void clearHi()}>
          Clear highlights
        </button>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={includeLower}
          onChange={(e) => void persistIncludeLower(e.target.checked)}
        />
        Include lower-confidence matches when filling
      </label>
      <div style={{ fontSize: 12, color: '#444' }}>
        {scan ? (
          <>
            <div>URL: {scan.url}</div>
            <div>
              Form-like: {scan.hasFormLike ? 'yes' : 'no'} · Fields: {scan.fields.length}
            </div>
          </>
        ) : (
          <div>No scan yet — use Scan in popup or Rescan here.</div>
        )}
      </div>
      {note ? <div style={{ fontSize: 12, color: '#b00020' }}>{note}</div> : null}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['all', 'matched', 'unmatched', 'filled', 'skipped'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              fontSize: 12,
              border: filter === f ? '2px solid #1565c0' : '1px solid #ccc',
              borderRadius: 4,
              padding: '4px 8px',
              background: filter === f ? '#e3f2fd' : '#fff',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
        {filtered.map((f) => (
          <FieldRow key={f.descriptor.id} f={f} />
        ))}
      </div>

      {lastDry ? (
        <details>
          <summary>Dry run log</summary>
          <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{lastDry}</pre>
        </details>
      ) : null}
    </div>
  )
}

function FieldRow({ f }: { f: ScannedField }): React.ReactElement {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        borderBottom: '1px solid #eee',
        padding: '8px 0',
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600 }}>{f.descriptor.labelText || '(no label)'}</div>
      <div style={{ color: '#555' }}>
        Key: {f.classification.profileKey ?? '—'} · confidence:{' '}
        {f.classification.confidence.toFixed(2)} · status: {f.fillStatus}
        {f.skipReason ? ` · ${f.skipReason}` : ''}
      </div>
      <div style={{ color: '#333', marginTop: 4 }}>
        Value preview: <code>{f.valuePreview.slice(0, 120)}</code>
      </div>
      <button
        type="button"
        style={{ marginTop: 4, fontSize: 11, border: 'none', background: 'none', color: '#1565c0' }}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Hide' : 'Show'} reasons
      </button>
      {open ? (
        <ul style={{ margin: '4px 0 0 16px', color: '#444' }}>
          {f.classification.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
