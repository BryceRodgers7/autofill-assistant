import { z } from 'zod'

export const educationEntrySchema = z.object({
  school: z.string(),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional(),
})

export const workHistoryEntrySchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  highlights: z.array(z.string()).default([]),
})

export const userProfileSchema = z.object({
  firstName: z.string().default(''),
  middleName: z.string().default(''),
  lastName: z.string().default(''),
  fullName: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  address1: z.string().default(''),
  address2: z.string().default(''),
  city: z.string().default(''),
  state: z.string().default(''),
  postalCode: z.string().default(''),
  country: z.string().default(''),
  linkedin: z.string().default(''),
  github: z.string().default(''),
  portfolio: z.string().default(''),
  website: z.string().default(''),
  currentCompany: z.string().default(''),
  currentTitle: z.string().default(''),
  workAuthorization: z.string().default(''),
  requireSponsorship: z.boolean().default(false),
  authorizedCountries: z.array(z.string()).default([]),
  resumeFileName: z.string().default(''),
  coverLetterFileName: z.string().default(''),
  headline: z.string().default(''),
  summary: z.string().default(''),
  education: z.array(educationEntrySchema).default([]),
  workHistory: z.array(workHistoryEntrySchema).default([]),
  customFields: z.record(z.string()).default({}),
})

export type UserProfile = z.infer<typeof userProfileSchema>

export const appSettingsSchema = z.object({
  confidenceThreshold: z.number().min(0).max(1).default(0.72),
  overwriteExisting: z.boolean().default(false),
  highlightFilled: z.boolean().default(true),
  verboseDebug: z.boolean().default(false),
  includeLowerConfidence: z.boolean().default(false),
})

export type AppSettings = z.infer<typeof appSettingsSchema>
