import { eq } from 'drizzle-orm'
import { createInitialStepStates } from '@viraxstudio/shared/server/run-machine'
import { assets, auditLogs, contentRuns, pipelineProfiles, renders, reviewQueue, runSteps, scenes, scripts, thumbnails, youtubePublications } from '@viraxstudio/shared/db/schema'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { toIso } from '../lib/time.js'

const defaultProfileDefaults = {
  niche: 'Facts Science',
  durationSeconds: 60,
  autopublish: false,
  autoAssets: true,
}

function readProfileDefaults(defaults: Record<string, unknown>) {
  return {
    niche: typeof defaults.niche === 'string' ? defaults.niche : null,
    durationSeconds: Number(defaults.durationSeconds ?? 60),
    autopublish: Boolean(defaults.autopublish ?? false),
    autoAssets: Boolean(defaults.autoAssets ?? true),
  }
}

function toAssetUrl(key: string | null | undefined) {
  if (!key || !env.S3_PUBLIC_BASE_URL) return null
  return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`
}

export async function ensureDefaultProfile() {
  const existing = await db.query.pipelineProfiles.findFirst({ where: (table, { eq }) => eq(table.isDefault, true) })
  if (existing) return existing
  const [profile] = await db.insert(pipelineProfiles).values({
    name: 'Virax Auto Pipeline',
    isDefault: true,
    scheduleCron: null,
    defaults: defaultProfileDefaults,
  }).returning()
  return profile
}

export async function listPipelineProfiles() {
  await ensureDefaultProfile()
  const items = await db.query.pipelineProfiles.findMany({ orderBy: (table, { desc }) => [desc(table.updatedAt)] })
  return {
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      isDefault: item.isDefault,
      scheduleCron: item.scheduleCron,
      defaults: readProfileDefaults(item.defaults as Record<string, unknown>),
      updatedAt: toIso(item.updatedAt)!,
    })),
  }
}

export async function upsertDefaultProfile(input: { name: string; scheduleCron?: string | null; defaults?: Record<string, unknown> }) {
  const profile = await ensureDefaultProfile()
  const defaults = {
    ...(profile.defaults as Record<string, unknown>),
    ...(input.defaults ?? {}),
  }
  const [updated] = await db.update(pipelineProfiles).set({
    name: input.name,
    scheduleCron: input.scheduleCron ?? null,
    defaults,
    updatedAt: new Date(),
  }).where(eq(pipelineProfiles.id, profile.id)).returning()
  return updated
}

export async function createRun(input: { topic: string; niche?: string | null; durationSeconds: number; profileId?: string | null; source: 'manual' | 'scheduled' }) {
  const profile = input.profileId
    ? await db.query.pipelineProfiles.findFirst({ where: (table, { eq }) => eq(table.id, input.profileId!) })
    : await ensureDefaultProfile()

  const [run] = await db.insert(contentRuns).values({
    profileId: profile?.id ?? null,
    topic: input.topic,
    niche: input.niche ?? null,
    trigger: input.source,
    status: 'queued',
    sourcePrompt: input.topic,
    durationSeconds: input.durationSeconds,
    currentStep: 'ideation',
  }).returning()

  await db.insert(runSteps).values(createInitialStepStates().map(step => ({
    runId: run.id,
    step: step.step,
    status: step.status as 'queued' | 'pending',
  })))

  await db.insert(reviewQueue).values({
    runId: run.id,
    status: 'pending',
  })

  await db.insert(auditLogs).values({
    actor: 'owner',
    action: 'run.created',
    entityType: 'content_run',
    entityId: run.id,
    metadata: { topic: input.topic, source: input.source },
  })

  return run
}

function serializeRunSummary(run: any, review: any, publication: any) {
  return {
    id: run.id,
    topic: run.topic,
    niche: run.niche,
    status: run.status,
    trigger: run.trigger,
    currentStep: run.currentStep,
    createdAt: toIso(run.createdAt)!,
    updatedAt: toIso(run.updatedAt)!,
    reviewStatus: review?.status ?? null,
    publicationStatus: publication?.status ?? null,
  }
}

export async function listRuns() {
  const rows = await db.query.contentRuns.findMany({ orderBy: (table, { desc }) => [desc(table.createdAt)] })
  const items = []
  for (const run of rows) {
    const review = await db.query.reviewQueue.findFirst({ where: (table, { eq }) => eq(table.runId, run.id) })
    const publication = await db.query.youtubePublications.findFirst({ where: (table, { eq }) => eq(table.runId, run.id) })
    items.push(serializeRunSummary(run, review, publication))
  }
  return { items }
}

export async function getRunDetail(runId: string) {
  const run = await db.query.contentRuns.findFirst({ where: (table, { eq }) => eq(table.id, runId) })
  if (!run) return null

  const review = await db.query.reviewQueue.findFirst({ where: (table, { eq }) => eq(table.runId, run.id) })
  const publication = await db.query.youtubePublications.findFirst({ where: (table, { eq }) => eq(table.runId, run.id) })
  const script = await db.query.scripts.findFirst({ where: (table, { eq }) => eq(table.runId, run.id) })
  const steps = await db.query.runSteps.findMany({ where: (table, { eq }) => eq(table.runId, run.id), orderBy: (table, { asc }) => [asc(table.createdAt)] })
  const sceneRows = await db.query.scenes.findMany({ where: (table, { eq }) => eq(table.runId, run.id), orderBy: (table, { asc }) => [asc(table.order)] })
  const assetRows = await db.query.assets.findMany({ where: (table, { eq }) => eq(table.runId, run.id), orderBy: (table, { asc }) => [asc(table.createdAt)] })
  const render = await db.query.renders.findFirst({ where: (table, { eq }) => eq(table.runId, run.id) })
  const thumbnail = await db.query.thumbnails.findFirst({ where: (table, { eq }) => eq(table.runId, run.id) })

  const sceneAssets = new Map<string, string | null>()
  for (const asset of assetRows) {
    if (asset.sceneId && asset.kind === 'image' && !sceneAssets.has(asset.sceneId)) {
      sceneAssets.set(asset.sceneId, asset.sourceUrl ?? toAssetUrl(asset.storageKey))
    }
  }

  return {
    ...serializeRunSummary(run, review, publication),
    script: script?.fullText ?? null,
    seoTitle: script?.seoTitle ?? null,
    seoDescription: script?.seoDescription ?? null,
    seoTags: script?.seoTags ?? [],
    renderUrl: render?.storageKey ? toAssetUrl(render.storageKey) : null,
    thumbnailUrl: thumbnail?.storageKey ? toAssetUrl(thumbnail.storageKey) : null,
    youtubeUrl: publication?.url ?? null,
    steps: steps.map(step => ({
      id: step.id,
      step: step.step,
      status: step.status as 'queued' | 'pending',
      startedAt: toIso(step.startedAt),
      completedAt: toIso(step.completedAt),
      errorMessage: step.errorMessage ?? null,
    })),
    scenes: sceneRows.map(scene => ({
      id: scene.id,
      order: scene.order,
      prompt: scene.prompt,
      narrationText: scene.narrationText,
      durationSeconds: scene.durationSeconds,
      assetUrl: sceneAssets.get(scene.id) ?? null,
    })),
  }
}

export async function listReviewItems() {
  const rows = await db.query.reviewQueue.findMany({ orderBy: (table, { desc }) => [desc(table.createdAt)] })
  const items = []
  for (const review of rows) {
    const run = await db.query.contentRuns.findFirst({ where: (table, { eq }) => eq(table.id, review.runId) })
    if (!run) continue
    const script = await db.query.scripts.findFirst({ where: (table, { eq }) => eq(table.runId, run.id) })
    const render = await db.query.renders.findFirst({ where: (table, { eq }) => eq(table.runId, run.id) })
    const thumbnail = await db.query.thumbnails.findFirst({ where: (table, { eq }) => eq(table.runId, run.id) })
    const publication = await db.query.youtubePublications.findFirst({ where: (table, { eq }) => eq(table.runId, run.id) })
    items.push({
      id: review.id,
      runId: run.id,
      topic: run.topic,
      status: review.status,
      seoTitle: script?.seoTitle ?? null,
      renderUrl: render?.storageKey ? toAssetUrl(render.storageKey) : null,
      thumbnailUrl: thumbnail?.storageKey ? toAssetUrl(thumbnail.storageKey) : null,
      youtubeUrl: publication?.url ?? null,
      createdAt: toIso(review.createdAt)!,
      updatedAt: toIso(review.updatedAt)!,
    })
  }
  return { items }
}

export async function updateReviewDecision(runId: string, decision: 'approve' | 'reject', notes?: string) {
  const review = await db.query.reviewQueue.findFirst({ where: (table, { eq }) => eq(table.runId, runId) })
  if (!review) throw new Error('Review item not found')
  const reviewStep = await db.query.runSteps.findFirst({ where: (table, { eq, and }) => and(eq(table.runId, runId), eq(table.step, 'review')) })
  const publishStep = await db.query.runSteps.findFirst({ where: (table, { eq, and }) => and(eq(table.runId, runId), eq(table.step, 'publish')) })
  const nextStatus = decision === 'approve' ? 'approved' : 'rejected'

  await db.update(reviewQueue).set({
    status: nextStatus,
    notes: notes ?? null,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(reviewQueue.id, review.id))

  if (reviewStep) {
    await db.update(runSteps).set({
      status: decision === 'approve' ? 'completed' : 'failed',
      errorMessage: decision === 'reject' ? notes ?? 'Rejected during owner review' : null,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(runSteps.id, reviewStep.id))
  }

  if (decision === 'approve' && publishStep) {
    await db.update(runSteps).set({
      status: 'queued',
      errorMessage: null,
      updatedAt: new Date(),
    }).where(eq(runSteps.id, publishStep.id))
  }

  await db.update(contentRuns).set({
    status: decision === 'approve' ? 'approved' : 'needs-review',
    currentStep: decision === 'approve' ? 'publish' : 'review',
    updatedAt: new Date(),
  }).where(eq(contentRuns.id, runId))

  await db.insert(auditLogs).values({
    actor: 'owner',
    action: decision === 'approve' ? 'review.approved' : 'review.rejected',
    entityType: 'content_run',
    entityId: runId,
    metadata: { notes: notes ?? null },
  })
}

export async function markPublicationRequested(runId: string, input: { mode: 'publish-now' | 'schedule'; publishAt?: string | null; privacyStatus: 'private' | 'unlisted' | 'public' }) {
  const existing = await db.query.youtubePublications.findFirst({ where: (table, { eq }) => eq(table.runId, runId) })
  if (existing) {
    await db.update(youtubePublications).set({
      status: input.mode === 'schedule' ? 'scheduled' : 'uploaded-private',
      scheduledFor: input.publishAt ? new Date(input.publishAt) : null,
      privacyStatus: input.privacyStatus,
      updatedAt: new Date(),
    }).where(eq(youtubePublications.id, existing.id))
  } else {
    await db.insert(youtubePublications).values({
      runId,
      status: input.mode === 'schedule' ? 'scheduled' : 'draft',
      scheduledFor: input.publishAt ? new Date(input.publishAt) : null,
      privacyStatus: input.privacyStatus,
    })
  }

  const publishStep = await db.query.runSteps.findFirst({ where: (table, { eq, and }) => and(eq(table.runId, runId), eq(table.step, 'publish')) })
  if (publishStep) {
    await db.update(runSteps).set({
      status: 'queued',
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      updatedAt: new Date(),
    }).where(eq(runSteps.id, publishStep.id))
  }

  await db.update(contentRuns).set({
    status: 'publishing',
    currentStep: 'publish',
    updatedAt: new Date(),
  }).where(eq(contentRuns.id, runId))

  await db.insert(auditLogs).values({
    actor: 'owner',
    action: 'publication.requested',
    entityType: 'content_run',
    entityId: runId,
    metadata: input,
  })
}

