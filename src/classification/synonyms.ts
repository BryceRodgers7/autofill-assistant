import type { ProfileKey } from '../shared/profileKeys'

/** Weighted phrases per canonical key — extend by appending strings. */
export const SYNONYMS: Record<
  ProfileKey,
  { phrases: string[]; tier: 'primary' | 'secondary' }
> = {
  firstName: {
    phrases: [
      'first name',
      'given name',
      'legal first name',
      'fname',
      'forename',
    ],
    tier: 'primary',
  },
  middleName: {
    phrases: ['middle name', 'middle initial', 'm.i.'],
    tier: 'secondary',
  },
  lastName: {
    phrases: ['last name', 'family name', 'surname', 'lname', 'legal last name'],
    tier: 'primary',
  },
  fullName: {
    phrases: ['full name', 'name', 'legal name', 'applicant name'],
    tier: 'secondary',
  },
  email: {
    phrases: ['email', 'e-mail', 'email address', 'contact email'],
    tier: 'primary',
  },
  phone: {
    phrases: [
      'phone',
      'mobile phone',
      'mobile',
      'cell',
      'telephone',
      'contact number',
      'phone number',
    ],
    tier: 'primary',
  },
  address1: {
    phrases: ['address line 1', 'street address', 'address 1', 'mailing address'],
    tier: 'secondary',
  },
  address2: {
    phrases: ['address line 2', 'address 2', 'apt', 'suite', 'unit'],
    tier: 'secondary',
  },
  city: {
    phrases: ['city', 'town'],
    tier: 'primary',
  },
  state: {
    phrases: ['state', 'province', 'region'],
    tier: 'primary',
  },
  postalCode: {
    phrases: ['zip', 'zip code', 'postal code', 'postcode'],
    tier: 'primary',
  },
  country: {
    phrases: ['country', 'nation'],
    tier: 'primary',
  },
  linkedin: {
    phrases: ['linkedin', 'linkedin profile', 'linkedin url', 'linkedin link'],
    tier: 'primary',
  },
  github: {
    phrases: ['github', 'github profile', 'github url'],
    tier: 'primary',
  },
  portfolio: {
    phrases: ['portfolio', 'personal website', 'homepage', 'personal site'],
    tier: 'secondary',
  },
  website: {
    phrases: ['website', 'url', 'web site', 'site'],
    tier: 'secondary',
  },
  currentCompany: {
    phrases: [
      'current company',
      'current employer',
      'employer',
      'company name',
      'organization',
    ],
    tier: 'secondary',
  },
  currentTitle: {
    phrases: ['job title', 'current title', 'position title', 'role'],
    tier: 'secondary',
  },
  workAuthorization: {
    phrases: [
      'authorized to work',
      'work authorization',
      'legally authorized',
      'eligible to work',
      'work eligibility',
      'authorized to work in',
    ],
    tier: 'primary',
  },
  requireSponsorship: {
    phrases: [
      'require sponsorship',
      'need sponsorship',
      'visa sponsorship',
      'sponsorship now',
      'will you require',
      'h-1b',
      'h1b',
    ],
    tier: 'primary',
  },
  authorizedCountries: {
    phrases: ['authorized countries', 'countries authorized', 'eligible countries'],
    tier: 'secondary',
  },
  resumeFileName: {
    phrases: ['resume', 'cv', 'curriculum vitae'],
    tier: 'secondary',
  },
  coverLetterFileName: {
    phrases: ['cover letter', 'letter of interest'],
    tier: 'secondary',
  },
  headline: {
    phrases: ['headline', 'professional headline', 'tagline'],
    tier: 'secondary',
  },
  summary: {
    phrases: ['summary', 'bio', 'about me', 'professional summary'],
    tier: 'secondary',
  },
  education: {
    phrases: ['education', 'academic', 'university', 'degree', 'school'],
    tier: 'secondary',
  },
  workHistory: {
    phrases: ['work history', 'employment history', 'experience', 'positions'],
    tier: 'secondary',
  },
  customFields: {
    phrases: [],
    tier: 'secondary',
  },
}
