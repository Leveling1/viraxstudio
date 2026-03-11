import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core'
import { integrationProviders, integrationStatuses, runTriggers, runStatuses, runStepNames, runStepStatuses, assetKinds, reviewStatuses, publicationStatuses } from '../contracts/constants.js'

export const integrationProviderEnum = pgEnum('integration_provider', integrationProviders)
export const integrationStatusEnum = pgEnum('integration_status', integrationStatuses)
export const runTriggerEnum = pgEnum('run_trigger', runTriggers)
export const runStatusEnum = pgEnum('run_status', runStatuses)
export const runStepNameEnum = pgEnum('run_step_name', runStepNames)
export const runStepStatusEnum = pgEnum('run_step_status', runStepStatuses)
export const assetKindEnum = pgEnum('asset_kind', assetKinds)
export const reviewStatusEnum = pgEnum('review_status', reviewStatuses)
export const publicationStatusEnum = pgEnum('publication_status', publicationStatuses)

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}

export const ownerSessions = pgTable('owner_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerEmail: text('owner_email').notNull(),
  googleSubject: text('google_subject').notNull(),
  sessionTokenHash: text('session_token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ...timestamps,
}, table => ({
  sessionTokenHashIdx: uniqueIndex('owner_sessions_token_hash_idx').on(table.sessionTokenHash),
}))

export const integrations = pgTable('integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider: integrationProviderEnum('provider').notNull(),
  status: integrationStatusEnum('status').default('missing').notNull(),
  label: text('label').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  accountLabel: text('account_label'),
  lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
  ...timestamps,
}, table => ({
  providerIdx: uniqueIndex('integrations_provider_idx').on(table.provider),
}))

export const integrationSecrets = pgTable('integration_secrets', {
  id: uuid('id').defaultRandom().primaryKey(),
  integrationId: uuid('integration_id').notNull().references(() => integrations.id, { onDelete: 'cascade' }),
  secretType: text('secret_type').notNull(),
  cipherText: text('cipher_text').notNull(),
  iv: text('iv').notNull(),
  authTag: text('auth_tag').notNull(),
  keyVersion: integer('key_version').notNull().default(1),
  ...timestamps,
})

export const youtubeChannels = pgTable('youtube_channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  integrationId: uuid('integration_id').notNull().references(() => integrations.id, { onDelete: 'cascade' }),
  channelId: text('channel_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  connectedAt: timestamp('connected_at', { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
}, table => ({
  channelIdx: uniqueIndex('youtube_channels_channel_id_idx').on(table.channelId),
}))

export const pipelineProfiles = pgTable('pipeline_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  scheduleCron: text('schedule_cron'),
  defaults: jsonb('defaults').$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
})

export const contentRuns = pgTable('content_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => pipelineProfiles.id, { onDelete: 'set null' }),
  topic: text('topic').notNull(),
  niche: text('niche'),
  trigger: runTriggerEnum('trigger').default('manual').notNull(),
  status: runStatusEnum('status').default('draft').notNull(),
  sourcePrompt: text('source_prompt'),
  durationSeconds: integer('duration_seconds').default(60).notNull(),
  currentStep: runStepNameEnum('current_step'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  ...timestamps,
})

export const runSteps = pgTable('run_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => contentRuns.id, { onDelete: 'cascade' }),
  step: runStepNameEnum('step').notNull(),
  status: runStepStatusEnum('status').default('pending').notNull(),
  input: jsonb('input').$type<Record<string, unknown> | null>(),
  output: jsonb('output').$type<Record<string, unknown> | null>(),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  ...timestamps,
})

export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  queueName: text('queue_name').notNull(),
  bullJobId: text('bull_job_id').notNull(),
  runId: uuid('run_id').references(() => contentRuns.id, { onDelete: 'set null' }),
  status: text('status').default('queued').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  lastError: text('last_error'),
  ...timestamps,
})

export const scripts = pgTable('scripts', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => contentRuns.id, { onDelete: 'cascade' }),
  hook: text('hook'),
  body: text('body'),
  cta: text('cta'),
  fullText: text('full_text'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  seoTags: jsonb('seo_tags').$type<string[]>().default([]).notNull(),
  ...timestamps,
}, table => ({
  runIdx: uniqueIndex('scripts_run_id_idx').on(table.runId),
}))

export const scenes = pgTable('scenes', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => contentRuns.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  prompt: text('prompt').notNull(),
  narrationText: text('narration_text').notNull(),
  visualQuery: text('visual_query'),
  subtitleText: text('subtitle_text'),
  durationSeconds: integer('duration_seconds').default(6).notNull(),
  ...timestamps,
})

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => contentRuns.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id').references(() => scenes.id, { onDelete: 'set null' }),
  kind: assetKindEnum('kind').notNull(),
  provider: text('provider').notNull(),
  sourceUrl: text('source_url'),
  storageKey: text('storage_key'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
})

export const renders = pgTable('renders', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => contentRuns.id, { onDelete: 'cascade' }),
  status: text('status').default('pending').notNull(),
  storageKey: text('storage_key'),
  durationSeconds: integer('duration_seconds'),
  width: integer('width'),
  height: integer('height'),
  ...timestamps,
}, table => ({
  runIdx: uniqueIndex('renders_run_id_idx').on(table.runId),
}))

export const thumbnails = pgTable('thumbnails', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => contentRuns.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key'),
  sourceAssetId: uuid('source_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  ...timestamps,
}, table => ({
  runIdx: uniqueIndex('thumbnails_run_id_idx').on(table.runId),
}))

export const youtubePublications = pgTable('youtube_publications', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => contentRuns.id, { onDelete: 'cascade' }),
  videoId: text('video_id'),
  status: publicationStatusEnum('status').default('draft').notNull(),
  privacyStatus: text('privacy_status').default('private').notNull(),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  url: text('url'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, table => ({
  runIdx: uniqueIndex('youtube_publications_run_id_idx').on(table.runId),
}))

export const reviewQueue = pgTable('review_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => contentRuns.id, { onDelete: 'cascade' }),
  status: reviewStatusEnum('status').default('pending').notNull(),
  notes: text('notes'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  ...timestamps,
}, table => ({
  runIdx: uniqueIndex('review_queue_run_id_idx').on(table.runId),
}))

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
