import type { ProfileKey } from './profileKeys'
import type { UserProfile } from '../storage/schema'

/** String value used for previews and text-like fills. */
export function resolveProfileString(
  profile: UserProfile,
  key: ProfileKey,
): string | null {
  switch (key) {
    case 'firstName':
      return profile.firstName || null
    case 'middleName':
      return profile.middleName || null
    case 'lastName':
      return profile.lastName || null
    case 'fullName':
      return (
        profile.fullName ||
        [profile.firstName, profile.middleName, profile.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        null
      )
    case 'email':
      return profile.email || null
    case 'phone':
      return profile.phone || null
    case 'address1':
      return profile.address1 || null
    case 'address2':
      return profile.address2 || null
    case 'city':
      return profile.city || null
    case 'state':
      return profile.state || null
    case 'postalCode':
      return profile.postalCode || null
    case 'country':
      return profile.country || null
    case 'linkedin':
      return profile.linkedin || null
    case 'github':
      return profile.github || null
    case 'portfolio':
      return profile.portfolio || profile.website || null
    case 'website':
      return profile.website || profile.portfolio || null
    case 'currentCompany':
      return profile.currentCompany || null
    case 'currentTitle':
      return profile.currentTitle || null
    case 'workAuthorization':
      return profile.workAuthorization || null
    case 'requireSponsorship':
      return String(profile.requireSponsorship)
    case 'authorizedCountries':
      return profile.authorizedCountries.length
        ? profile.authorizedCountries.join(', ')
        : null
    case 'resumeFileName':
      return profile.resumeFileName || null
    case 'coverLetterFileName':
      return profile.coverLetterFileName || null
    case 'headline':
      return profile.headline || null
    case 'summary':
      return profile.summary || null
    case 'education':
      return profile.education.length ? JSON.stringify(profile.education, null, 2) : null
    case 'workHistory':
      return profile.workHistory.length
        ? JSON.stringify(profile.workHistory, null, 2)
        : null
    case 'customFields':
      return Object.keys(profile.customFields).length
        ? JSON.stringify(profile.customFields, null, 2)
        : null
    default:
      return null
  }
}
