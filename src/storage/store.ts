import {
  STORAGE_PROFILE_KEY,
  STORAGE_SETTINGS_KEY,
} from '../shared/constants'
import {
  appSettingsSchema,
  userProfileSchema,
  type AppSettings,
  type UserProfile,
} from './schema'
import { defaultProfile, defaultSettings } from './getDefaults'

export async function loadProfile(): Promise<UserProfile> {
  const raw = await chrome.storage.local.get(STORAGE_PROFILE_KEY)
  const v = raw[STORAGE_PROFILE_KEY]
  const parsed = userProfileSchema.safeParse(v)
  if (!parsed.success) return defaultProfile()
  return parsed.data
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const parsed = userProfileSchema.parse(profile)
  await chrome.storage.local.set({ [STORAGE_PROFILE_KEY]: parsed })
}

export async function loadSettings(): Promise<AppSettings> {
  const raw = await chrome.storage.local.get(STORAGE_SETTINGS_KEY)
  const v = raw[STORAGE_SETTINGS_KEY]
  const parsed = appSettingsSchema.safeParse(v)
  if (!parsed.success) return defaultSettings()
  return parsed.data
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const parsed = appSettingsSchema.parse(settings)
  await chrome.storage.local.set({ [STORAGE_SETTINGS_KEY]: parsed })
}

export async function loadState(): Promise<{
  profile: UserProfile
  settings: AppSettings
}> {
  const [profile, settings] = await Promise.all([loadProfile(), loadSettings()])
  return { profile, settings }
}
