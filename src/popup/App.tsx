import React, { useCallback, useEffect, useState } from 'react'
import type { AppSettings, UserProfile } from '../storage/schema'
import { sendExtensionMessage } from '../shared/extensionMessaging'

const scalarFields: (keyof UserProfile)[] = [
  'firstName',
  'middleName',
  'lastName',
  'fullName',
  'email',
  'phone',
  'address1',
  'address2',
  'city',
  'state',
  'postalCode',
  'country',
  'linkedin',
  'github',
  'portfolio',
  'website',
  'currentCompany',
  'currentTitle',
  'workAuthorization',
  'resumeFileName',
  'coverLetterFileName',
  'headline',
  'summary',
]

export function App(): React.ReactElement {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [status, setStatus] = useState('')
  const [educationJson, setEducationJson] = useState('[]')
  const [workJson, setWorkJson] = useState('[]')
  const [customJson, setCustomJson] = useState('{}')

  const refresh = useCallback(async () => {
    const r = await sendExtensionMessage({ type: 'GET_STATE' })
    if (!r.ok || !('state' in r)) {
      setStatus(r.ok ? 'Bad state response' : r.error)
      return
    }
    setProfile(r.state.profile)
    setSettings(r.state.settings)
    setEducationJson(JSON.stringify(r.state.profile.education, null, 2))
    setWorkJson(JSON.stringify(r.state.profile.workHistory, null, 2))
    setCustomJson(JSON.stringify(r.state.profile.customFields, null, 2))
    setStatus('')
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveArrays = async (p: UserProfile, s: AppSettings) => {
    try {
      p.education = JSON.parse(educationJson) as UserProfile['education']
      p.workHistory = JSON.parse(workJson) as UserProfile['workHistory']
      p.customFields = JSON.parse(customJson) as UserProfile['customFields']
    } catch {
      setStatus('Invalid JSON in education/work/custom')
      return false
    }
    await sendExtensionMessage({ type: 'SAVE_PROFILE', profile: p })
    await sendExtensionMessage({ type: 'SAVE_SETTINGS', settings: s })
    setStatus('Saved')
    return true
  }

  const scan = async () => {
    setStatus('Scanning…')
    const r = await sendExtensionMessage({ type: 'SCAN_TAB' })
    if (!r.ok || !('scan' in r)) {
      setStatus(r.ok ? 'Scan failed' : r.error)
      return
    }
    setStatus(`Scan: ${r.scan.fields.length} field(s). Open side panel to review.`)
  }

  const openSide = async () => {
    const r = await sendExtensionMessage({ type: 'OPEN_SIDE_PANEL' })
    if (!r.ok) setStatus(r.error)
  }

  if (!profile || !settings) {
    return <div style={{ padding: 12 }}>Loading…</div>
  }

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <header style={{ fontWeight: 700 }}>Autofill Assistant</header>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => void scan()}>
          Scan current tab
        </button>
        <button type="button" onClick={() => void openSide()}>
          Open side panel
        </button>
      </div>
      {status ? (
        <div style={{ fontSize: 12, color: '#444' }} role="status">
          {status}
        </div>
      ) : null}

      <section>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Settings</div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          Confidence threshold: {settings.confidenceThreshold.toFixed(2)}
          <input
            type="range"
            min={0.25}
            max={0.95}
            step={0.01}
            value={settings.confidenceThreshold}
            onChange={(e) =>
              setSettings({ ...settings, confidenceThreshold: Number(e.target.value) })
            }
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <input
            type="checkbox"
            checked={settings.overwriteExisting}
            onChange={(e) =>
              setSettings({ ...settings, overwriteExisting: e.target.checked })
            }
          />
          Overwrite non-empty fields
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={settings.highlightFilled}
            onChange={(e) =>
              setSettings({ ...settings, highlightFilled: e.target.checked })
            }
          />
          Highlight filled / skipped
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={settings.verboseDebug}
            onChange={(e) => setSettings({ ...settings, verboseDebug: e.target.checked })}
          />
          Verbose debug logging
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={settings.includeLowerConfidence}
            onChange={(e) =>
              setSettings({ ...settings, includeLowerConfidence: e.target.checked })
            }
          />
          Include lower-confidence matches (default for fill)
        </label>
      </section>

      <section>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Profile</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            maxHeight: 220,
            overflow: 'auto',
          }}
        >
          {scalarFields.map((k) => (
            <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, color: '#555' }}>{k}</span>
              <input
                value={String(profile[k] ?? '')}
                onChange={(e) => setProfile({ ...profile, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          <span style={{ fontSize: 11 }}>requireSponsorship</span>
          <input
            type="checkbox"
            checked={profile.requireSponsorship}
            onChange={(e) =>
              setProfile({ ...profile, requireSponsorship: e.target.checked })
            }
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11 }}>authorizedCountries (comma)</span>
          <input
            value={profile.authorizedCountries.join(', ')}
            onChange={(e) =>
              setProfile({
                ...profile,
                authorizedCountries: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11 }}>education (JSON)</span>
          <textarea rows={4} value={educationJson} onChange={(e) => setEducationJson(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11 }}>workHistory (JSON)</span>
          <textarea rows={4} value={workJson} onChange={(e) => setWorkJson(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11 }}>customFields (JSON object)</span>
          <textarea rows={3} value={customJson} onChange={(e) => setCustomJson(e.target.value)} />
        </label>
      </section>

      <button
        type="button"
        onClick={() =>
          void saveArrays(profile, settings).then((ok) => {
            if (ok) void refresh()
          })
        }
      >
        Save profile &amp; settings
      </button>
    </div>
  )
}
