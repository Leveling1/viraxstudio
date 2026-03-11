import { z } from 'zod'
import { integrationProviders, integrationStatuses } from './constants.js'

export const integrationProviderSchema = z.enum(integrationProviders)
export const integrationStatusSchema = z.enum(integrationStatuses)

export const integrationSchema = z.object({
  provider: integrationProviderSchema,
  status: integrationStatusSchema,
  configured: z.boolean(),
  label: z.string(),
  maskedSecret: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  lastValidatedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
})

export const integrationsResponseSchema = z.object({
  items: z.array(integrationSchema),
})

export const upsertIntegrationInputSchema = z.object({
  apiKey: z.string().min(1).optional(),
  label: z.string().min(1).max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const migrateLocalSecretsInputSchema = z.object({
  anthropicKey: z.string().min(1).optional(),
  elevenlabsKey: z.string().min(1).optional(),
  pexelsApiKey: z.string().min(1).optional(),
  legacyGoogleClientId: z.string().min(1).optional(),
})
