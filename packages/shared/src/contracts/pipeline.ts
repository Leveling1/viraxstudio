import { z } from 'zod'
import { reviewStatuses, runStatuses, runStepNames, runStepStatuses, publicationStatuses, runTriggers } from './constants.js'

export const runStatusSchema = z.enum(runStatuses)
export const runTriggerSchema = z.enum(runTriggers)
export const runStepNameSchema = z.enum(runStepNames)
export const runStepStatusSchema = z.enum(runStepStatuses)
export const reviewStatusSchema = z.enum(reviewStatuses)
export const publicationStatusSchema = z.enum(publicationStatuses)

export const pipelineProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isDefault: z.boolean(),
  scheduleCron: z.string().nullable(),
  defaults: z.object({
    niche: z.string().nullable(),
    durationSeconds: z.number().int().positive().default(60),
    autopublish: z.boolean().default(false),
    autoAssets: z.boolean().default(true),
  }),
  updatedAt: z.string().datetime(),
})

export const upsertPipelineProfileInputSchema = z.object({
  name: z.string().min(2).max(120),
  scheduleCron: z.string().max(120).nullable().optional(),
  defaults: z.object({
    niche: z.string().max(120).nullable().optional(),
    durationSeconds: z.number().int().min(15).max(600).optional(),
    autopublish: z.boolean().optional(),
    autoAssets: z.boolean().optional(),
  }).optional(),
})

export const createRunInputSchema = z.object({
  topic: z.string().min(3).max(240),
  niche: z.string().max(120).optional(),
  durationSeconds: z.number().int().min(15).max(600).default(60),
  profileId: z.string().uuid().optional(),
  source: z.enum(['manual', 'scheduled']).default('manual'),
})

export const runStepSchema = z.object({
  id: z.string().uuid(),
  step: runStepNameSchema,
  status: runStepStatusSchema,
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  errorMessage: z.string().nullable(),
})

export const runSummarySchema = z.object({
  id: z.string().uuid(),
  topic: z.string(),
  niche: z.string().nullable(),
  status: runStatusSchema,
  trigger: runTriggerSchema,
  currentStep: runStepNameSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  reviewStatus: reviewStatusSchema.nullable(),
  publicationStatus: publicationStatusSchema.nullable(),
})

export const runDetailSchema = runSummarySchema.extend({
  script: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  seoTags: z.array(z.string()).default([]),
  renderUrl: z.string().url().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  youtubeUrl: z.string().url().nullable(),
  steps: z.array(runStepSchema),
  scenes: z.array(z.object({
    id: z.string().uuid(),
    order: z.number().int().nonnegative(),
    prompt: z.string(),
    narrationText: z.string(),
    durationSeconds: z.number().int().positive(),
    assetUrl: z.string().url().nullable(),
  })).default([]),
})

export const runsResponseSchema = z.object({
  items: z.array(runSummarySchema),
})

export const reviewItemSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  topic: z.string(),
  status: reviewStatusSchema,
  seoTitle: z.string().nullable(),
  renderUrl: z.string().url().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  youtubeUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const reviewsResponseSchema = z.object({
  items: z.array(reviewItemSchema),
})

export const publicationRequestSchema = z.object({
  mode: z.enum(['publish-now', 'schedule']),
  publishAt: z.string().datetime().nullable().optional(),
  privacyStatus: z.enum(['private', 'unlisted', 'public']).default('private'),
})

export const reviewDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  notes: z.string().max(1000).optional(),
})
