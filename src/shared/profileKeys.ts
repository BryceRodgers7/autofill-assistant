/**
 * Canonical keys mapped from detected form fields to profile data.
 * Extend synonyms in classification/synonyms.ts when adding keys.
 */
export const PROFILE_KEYS = [
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
  'requireSponsorship',
  'authorizedCountries',
  'resumeFileName',
  'coverLetterFileName',
  'headline',
  'summary',
  'education',
  'workHistory',
  'customFields',
] as const

export type ProfileKey = (typeof PROFILE_KEYS)[number]
