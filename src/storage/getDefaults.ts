import type { AppSettings, UserProfile } from './schema'

export function defaultProfile(): UserProfile {
  return {
    firstName: '',
    middleName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    linkedin: '',
    github: '',
    portfolio: '',
    website: '',
    currentCompany: '',
    currentTitle: '',
    workAuthorization: '',
    requireSponsorship: false,
    authorizedCountries: [],
    resumeFileName: '',
    coverLetterFileName: '',
    headline: '',
    summary: '',
    education: [],
    workHistory: [],
    customFields: {},
  }
}

export function defaultSettings(): AppSettings {
  return {
    confidenceThreshold: 0.72,
    overwriteExisting: false,
    highlightFilled: true,
    verboseDebug: false,
    includeLowerConfidence: false,
  }
}
