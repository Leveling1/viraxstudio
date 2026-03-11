import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { runStepNames } from '@viraxstudio/shared/contracts'
import { getNextStep } from '@viraxstudio/shared/server/run-machine'
import { assets, auditLogs, contentRuns, renders, reviewQueue, runSteps, scenes, scripts, thumbnails, youtubePublications } from '@viraxstudio/shared/db/schema'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { withTempDir, runFfmpeg } from '../lib/ffmpeg.js'
import { uploadBuffer, uploadText } from '../lib/storage.js'
import { resolveSceneAsset } from '../providers/assets.js'
import { generateScriptBundle } from '../providers/anthropic.js'
import { createVoiceTrack } from '../providers/voice.js'
import { publishExistingVideo, uploadPrivateVideo } from '../providers/youtube.js'

const THUMBNAIL_WIDTH = 1280
const THUMBNAIL_HEIGHT = 720

type RunStepName = (typeof runStepNames)[number]

type SceneDraft = {
  prompt: string
  narrationText: string
  durationSeconds: number
  visualQuery?: string | null
  subtitleText?: string | null
}

type ScriptBundle = {
  hook: string
  body: string[]
  cta: string
  seo: {
    title: string
    description: string
    tags: string[]
  }
  scenes: SceneDraft[]
}

function normalizeScene(scene: unknown, topic: string, fallbackDuration: number, index: number): SceneDraft {
  if (!scene || typeof scene !== 'object') {
    return {
      prompt: `Illustration verticale cinematographique sur ${topic}, scene ${index + 1}`,
      narrationText: `Point ${index + 1} sur ${topic}.`,
      durationSeconds: fallbackDuration,
    }
  }

  const record = scene as Record<string, unknown>
  return {
    prompt: typeof record.prompt === 'string' && record.prompt.trim() ? record.prompt : `Illustration verticale cinematographique sur ${topic}, scene ${index + 1}`,
    narrationText: typeof record.narrationText === 'string' && record.narrationText.trim() ? record.narrationText : `Point ${index + 1} sur ${topic}.`,
    durationSeconds: typeof record.durationSeconds === 'number' && record.durationSeconds > 0 ? Math.round(record.durationSeconds) : fallbackDuration,
    visualQuery: typeof record.visualQuery === 'string' ? record.visualQuery : null,
    subtitleText: typeof record.subtitleText === 'string' ? record.subtitleText : null,
  }
}

function normalizeBundle(raw: unknown, topic: string, durationSeconds: number): ScriptBundle {
  const fallbackSceneDuration = Math.max(4, Math.round(durationSeconds / 6))
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const seo = record.seo && typeof record.seo === 'object' ? record.seo as Record<string, unknown> : {}
  const rawScenes = Array.isArray(record.scenes) ? record.scenes : []
  const normalizedScenes = (rawScenes.length ? rawScenes : Array.from({ length: 6 }, () => ({}))).map((scene, index) => normalizeScene(scene, topic, fallbackSceneDuration, index))
  const body = Array.isArray(record.body)
    ? record.body.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean)
    : normalizedScenes.map(scene => scene.narrationText)

  return {
    hook: typeof record.hook === 'string' && record.hook.trim() ? record.hook.trim() : `Voici pourquoi ${topic} peut exploser sur YouTube Shorts.`,
    body: body.length ? body : normalizedScenes.map(scene => scene.narrationText),
    cta: typeof record.cta === 'string' && record.cta.trim() ? record.cta.trim() : 'Abonne-toi pour la suite des faits viraux.',
    seo: {
      title: typeof seo.title === 'string' ? seo.title : `${topic} : format viral automatise`,
      description: typeof seo.description === 'string' ? seo.description : `Video automatisee par ViraxStudio sur ${topic}.`,
      tags: Array.isArray(seo.tags) ? seo.tags.filter(item => typeof item === 'string').map(item => String(item)) : ['youtube shorts', 'viral', topic],
    },
    scenes: normalizedScenes,
  }
}

function buildFullScript(bundle: ScriptBundle) {
  return [bundle.hook, ...bundle.body, bundle.cta].filter(Boolean).join('\n\n')
}

function formatSrtTimestamp(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = Math.floor(safeSeconds % 60)
  const milliseconds = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 1000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`
}

function buildSrt(sceneRows: Array<{ narrationText: string; subtitleText: string | null; durationSeconds: number }>) {
  let cursor = 0
  return sceneRows.map((scene, index) => {
    const start = formatSrtTimestamp(cursor)
    cursor += scene.durationSeconds
    const end = formatSrtTimestamp(cursor)
    const text = (scene.subtitleText ?? scene.narrationText).trim()
    return `${index + 1}\n${start} --> ${end}\n${text}\n`
  }).join('\n')
}

async function getRunOrThrow(runId: string) {
  const run = await db.query.contentRuns.findFirst({ where: (table, { eq }) => eq(table.id, runId) })
  if (!run) {
    throw new Error(`Run ${runId} not found`)
  }
  return run
}

async function getStepOrThrow(runId: string, step: RunStepName) {
  const record = await db.query.runSteps.findFirst({
    where: (table, { eq, and }) => and(eq(table.runId, runId), eq(table.step, step)),
  })
  if (!record) {
    throw new Error(`Step ${step} not found for run ${runId}`)
  }
  return record
}

async function resetRunArtifacts(runId: string) {
  await db.delete(assets).where(eq(assets.runId, runId))
  await db.delete(scenes).where(eq(scenes.runId, runId))
  await db.delete(scripts).where(eq(scripts.runId, runId))
  await db.delete(renders).where(eq(renders.runId, runId))
  await db.delete(thumbnails).where(eq(thumbnails.runId, runId))

  const existingPublication = await db.query.youtubePublications.findFirst({ where: (table, { eq }) => eq(table.runId, runId) })
  if (existingPublication) {
    await db.update(youtubePublications).set({
      status: 'draft',
      videoId: null,
      url: null,
      uploadedAt: null,
      publishedAt: null,
      metadata: {},
      updatedAt: new Date(),
    }).where(eq(youtubePublications.id, existingPublication.id))
  }

  const review = await db.query.reviewQueue.findFirst({ where: (table, { eq }) => eq(table.runId, runId) })
  if (review) {
    await db.update(reviewQueue).set({
      status: 'pending',
      notes: null,
      reviewedAt: null,
      updatedAt: new Date(),
    }).where(eq(reviewQueue.id, review.id))
  }

  await db.update(runSteps).set({
    status: 'pending',
    input: null,
    output: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    updatedAt: new Date(),
  }).where(eq(runSteps.runId, runId))

  const ideationStep = await getStepOrThrow(runId, 'ideation')
  await db.update(runSteps).set({ status: 'queued', updatedAt: new Date() }).where(eq(runSteps.id, ideationStep.id))
  await db.update(contentRuns).set({
    status: 'queued',
    currentStep: 'ideation',
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    updatedAt: new Date(),
  }).where(eq(contentRuns.id, runId))
}

async function startStep(runId: string, step: RunStepName, input?: Record<string, unknown>) {
  const run = await getRunOrThrow(runId)
  const record = await getStepOrThrow(runId, step)
  const now = new Date()

  await db.update(runSteps).set({
    status: 'running',
    input: input ?? record.input ?? null,
    errorMessage: null,
    startedAt: record.startedAt ?? now,
    completedAt: null,
    updatedAt: now,
  }).where(eq(runSteps.id, record.id))

  await db.update(contentRuns).set({
    status: 'running',
    currentStep: step,
    errorMessage: null,
    startedAt: run.startedAt ?? now,
    updatedAt: now,
  }).where(eq(contentRuns.id, runId))
}

async function completeStep(runId: string, step: RunStepName, output?: Record<string, unknown>) {
  const record = await getStepOrThrow(runId, step)
  const now = new Date()
  await db.update(runSteps).set({
    status: 'completed',
    output: output ?? record.output ?? null,
    errorMessage: null,
    completedAt: now,
    updatedAt: now,
  }).where(eq(runSteps.id, record.id))

  const nextStep = getNextStep(step)
  if (!nextStep) {
    await db.update(contentRuns).set({
      status: 'published',
      currentStep: null,
      completedAt: now,
      updatedAt: now,
    }).where(eq(contentRuns.id, runId))
    return
  }

  const nextRecord = await getStepOrThrow(runId, nextStep)
  await db.update(runSteps).set({ status: 'queued', updatedAt: now }).where(eq(runSteps.id, nextRecord.id))
  await db.update(contentRuns).set({
    status: nextStep === 'review' ? 'needs-review' : 'running',
    currentStep: nextStep,
    updatedAt: now,
  }).where(eq(contentRuns.id, runId))
}

async function failStep(runId: string, step: RunStepName, error: unknown) {
  const record = await getStepOrThrow(runId, step)
  const message = error instanceof Error ? error.message : String(error)
  const now = new Date()

  await db.update(runSteps).set({
    status: 'failed',
    errorMessage: message,
    completedAt: now,
    updatedAt: now,
  }).where(eq(runSteps.id, record.id))

  await db.update(contentRuns).set({
    status: 'failed',
    currentStep: step,
    errorMessage: message,
    completedAt: now,
    updatedAt: now,
  }).where(eq(contentRuns.id, runId))

  await db.insert(auditLogs).values({
    actor: 'worker',
    action: 'run.failed',
    entityType: 'content_run',
    entityId: runId,
    metadata: { step, message },
  })
}

async function upsertScript(runId: string, bundle: ScriptBundle) {
  const existing = await db.query.scripts.findFirst({ where: (table, { eq }) => eq(table.runId, runId) })
  const payload = {
    runId,
    hook: bundle.hook,
    body: bundle.body.join('\n'),
    cta: bundle.cta,
    fullText: buildFullScript(bundle),
    seoTitle: bundle.seo.title,
    seoDescription: bundle.seo.description,
    seoTags: bundle.seo.tags,
  }

  if (existing) {
    await db.update(scripts).set({ ...payload, updatedAt: new Date() }).where(eq(scripts.id, existing.id))
  } else {
    await db.insert(scripts).values(payload)
  }
}

async function upsertRender(runId: string, storageKey: string, durationSeconds: number) {
  const existing = await db.query.renders.findFirst({ where: (table, { eq }) => eq(table.runId, runId) })
  const payload = {
    runId,
    status: 'ready',
    storageKey,
    durationSeconds,
    width: env.DEFAULT_VIDEO_WIDTH,
    height: env.DEFAULT_VIDEO_HEIGHT,
  }

  if (existing) {
    await db.update(renders).set({ ...payload, updatedAt: new Date() }).where(eq(renders.id, existing.id))
  } else {
    await db.insert(renders).values(payload)
  }
}

async function upsertThumbnail(runId: string, storageKey: string) {
  const existing = await db.query.thumbnails.findFirst({ where: (table, { eq }) => eq(table.runId, runId) })
  if (existing) {
    await db.update(thumbnails).set({ storageKey, updatedAt: new Date() }).where(eq(thumbnails.id, existing.id))
  } else {
    await db.insert(thumbnails).values({ runId, storageKey })
  }
}

function buildTopicIdea(topic: string, niche: string | null) {
  return niche ? `${topic} (${niche})` : topic
}

export async function processRunPipeline(runId: string) {
  await resetRunArtifacts(runId)
  const run = await getRunOrThrow(runId)

  let bundle: ScriptBundle | null = null
  let sceneRecords: Array<{ id: string; prompt: string; narrationText: string; durationSeconds: number; visualQuery: string | null; subtitleText: string | null }> = []

  try {
    await startStep(runId, 'ideation', { topic: run.topic, niche: run.niche ?? null })
    await completeStep(runId, 'ideation', { resolvedTopic: buildTopicIdea(run.topic, run.niche) })

    await startStep(runId, 'script', { topic: run.topic, durationSeconds: run.durationSeconds })
    bundle = normalizeBundle(await generateScriptBundle(run.topic, run.durationSeconds), run.topic, run.durationSeconds)
    await upsertScript(runId, bundle)
    await completeStep(runId, 'script', {
      seoTitle: bundle.seo.title,
      sceneCount: bundle.scenes.length,
      tagCount: bundle.seo.tags.length,
    })

    await startStep(runId, 'scenes', { sceneCount: bundle.scenes.length })
    const insertedScenes = await db.insert(scenes).values(bundle.scenes.map((scene, index) => ({
      runId,
      order: index,
      prompt: scene.prompt,
      narrationText: scene.narrationText,
      visualQuery: scene.visualQuery ?? run.topic,
      subtitleText: scene.subtitleText ?? scene.narrationText,
      durationSeconds: scene.durationSeconds,
    }))).returning()
    sceneRecords = insertedScenes.map(scene => ({
      id: scene.id,
      prompt: scene.prompt,
      narrationText: scene.narrationText,
      durationSeconds: scene.durationSeconds,
      visualQuery: scene.visualQuery,
      subtitleText: scene.subtitleText,
    }))
    await completeStep(runId, 'scenes', { createdScenes: sceneRecords.length })

    await startStep(runId, 'assets', { sceneCount: sceneRecords.length })
    for (const scene of sceneRecords) {
      const asset = await resolveSceneAsset(runId, scene.id, scene.prompt, scene.visualQuery ?? run.topic)
      await db.insert(assets).values({
        runId,
        sceneId: scene.id,
        kind: 'image',
        provider: asset.provider,
        sourceUrl: asset.sourceUrl,
        storageKey: asset.storageKey,
        metadata: { publicUrl: asset.publicUrl },
      })
    }
    await completeStep(runId, 'assets', { generatedAssets: sceneRecords.length })

    await withTempDir(async tempDir => {
      const activeBundle = bundle as ScriptBundle

      await startStep(runId, 'voice', { durationSeconds: run.durationSeconds })
      const voiceTrack = await createVoiceTrack(buildFullScript(activeBundle), run.durationSeconds, tempDir)
      const voiceKey = `runs/${runId}/audio/voice.mp3`
      await uploadBuffer(voiceKey, voiceTrack, 'audio/mpeg')
      await db.insert(assets).values({
        runId,
        sceneId: null,
        kind: 'audio',
        provider: 'elevenlabs',
        sourceUrl: null,
        storageKey: voiceKey,
        metadata: { durationSeconds: run.durationSeconds },
      })
      await completeStep(runId, 'voice', { storageKey: voiceKey })

      await startStep(runId, 'captions', { sceneCount: sceneRecords.length })
      const captionsText = buildSrt(sceneRecords)
      const captionsKey = `runs/${runId}/captions/subtitles.srt`
      await uploadText(captionsKey, captionsText, 'application/x-subrip')
      await db.insert(assets).values({
        runId,
        sceneId: null,
        kind: 'subtitle',
        provider: 'viraxstudio-srt',
        sourceUrl: null,
        storageKey: captionsKey,
        metadata: { format: 'srt' },
      })
      await completeStep(runId, 'captions', { storageKey: captionsKey })

      await startStep(runId, 'render', { width: env.DEFAULT_VIDEO_WIDTH, height: env.DEFAULT_VIDEO_HEIGHT })
      const audioPath = join(tempDir, 'voice.mp3')
      const renderPath = join(tempDir, 'render.mp4')
      await writeFile(audioPath, voiceTrack)
      await runFfmpeg([
        '-f', 'lavfi',
        '-i', `color=c=0x111111:s=${env.DEFAULT_VIDEO_WIDTH}x${env.DEFAULT_VIDEO_HEIGHT}:d=${run.durationSeconds}`,
        '-i', audioPath,
        '-shortest',
        '-r', String(env.DEFAULT_VIDEO_FPS),
        '-pix_fmt', 'yuv420p',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        renderPath,
        '-y',
      ])
      const renderOutput = await readFile(renderPath)
      const renderKey = `runs/${runId}/renders/master.mp4`
      await uploadBuffer(renderKey, renderOutput, 'video/mp4')
      await upsertRender(runId, renderKey, run.durationSeconds)
      await completeStep(runId, 'render', { storageKey: renderKey })

      await startStep(runId, 'thumbnail', { width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT })
      const thumbnailPath = join(tempDir, 'thumbnail.png')
      await runFfmpeg([
        '-f', 'lavfi',
        '-i', `color=c=0x111111:s=${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}:d=1`,
        '-frames:v', '1',
        thumbnailPath,
        '-y',
      ])
      const thumbnailOutput = await readFile(thumbnailPath)
      const thumbnailKey = `runs/${runId}/thumbnails/default.png`
      await uploadBuffer(thumbnailKey, thumbnailOutput, 'image/png')
      await upsertThumbnail(runId, thumbnailKey)
      await completeStep(runId, 'thumbnail', { storageKey: thumbnailKey })

      await startStep(runId, 'upload', { privacyStatus: 'private' })
      const uploadResult = await uploadPrivateVideo(
        renderOutput,
        activeBundle.seo.title,
        activeBundle.seo.description,
        activeBundle.seo.tags,
        'private',
        thumbnailOutput,
      )

      const existingPublication = await db.query.youtubePublications.findFirst({ where: (table, { eq }) => eq(table.runId, runId) })
      if (existingPublication) {
        await db.update(youtubePublications).set({
          videoId: uploadResult.videoId,
          url: uploadResult.url,
          status: 'uploaded-private',
          privacyStatus: 'private',
          uploadedAt: new Date(),
          metadata: { title: activeBundle.seo.title },
          updatedAt: new Date(),
        }).where(eq(youtubePublications.id, existingPublication.id))
      } else {
        await db.insert(youtubePublications).values({
          runId,
          videoId: uploadResult.videoId,
          url: uploadResult.url,
          status: 'uploaded-private',
          privacyStatus: 'private',
          uploadedAt: new Date(),
          metadata: { title: activeBundle.seo.title },
        })
      }

      await completeStep(runId, 'upload', { videoId: uploadResult.videoId, url: uploadResult.url })
    })

    await db.insert(auditLogs).values({
      actor: 'worker',
      action: 'run.ready-for-review',
      entityType: 'content_run',
      entityId: runId,
      metadata: { topic: run.topic },
    })
  } catch (error) {
    const currentRun = await getRunOrThrow(runId)
    await failStep(runId, currentRun.currentStep ?? 'ideation', error)
    throw error
  }
}

export async function processPublication(runId: string, mode: 'publish-now' | 'schedule', privacyStatus: 'private' | 'unlisted' | 'public', publishAt?: string | null) {
  const publication = await db.query.youtubePublications.findFirst({ where: (table, { eq }) => eq(table.runId, runId) })
  if (!publication?.videoId) {
    throw new Error('No uploaded YouTube video is available for publication')
  }

  await startStep(runId, 'publish', { mode, privacyStatus, publishAt: publishAt ?? null })

  try {
    await publishExistingVideo(publication.videoId, privacyStatus, publishAt ?? null)
    const now = new Date()
    await db.update(youtubePublications).set({
      status: publishAt ? 'scheduled' : 'published',
      privacyStatus,
      scheduledFor: publishAt ? new Date(publishAt) : null,
      publishedAt: publishAt ? null : now,
      updatedAt: now,
    }).where(eq(youtubePublications.id, publication.id))

    const review = await db.query.reviewQueue.findFirst({ where: (table, { eq }) => eq(table.runId, runId) })
    if (review) {
      await db.update(reviewQueue).set({ status: publishAt ? 'approved' : 'published', updatedAt: now }).where(eq(reviewQueue.id, review.id))
    }

    await completeStep(runId, 'publish', { videoId: publication.videoId, privacyStatus, publishAt: publishAt ?? null })

    if (publishAt) {
      await db.update(contentRuns).set({
        status: 'publishing',
        currentStep: 'publish',
        completedAt: null,
        updatedAt: now,
      }).where(eq(contentRuns.id, runId))
    }

    await db.insert(auditLogs).values({
      actor: 'worker',
      action: publishAt ? 'publication.scheduled' : 'publication.completed',
      entityType: 'content_run',
      entityId: runId,
      metadata: { mode, privacyStatus, publishAt: publishAt ?? null },
    })
  } catch (error) {
    await failStep(runId, 'publish', error)
    throw error
  }
}

function matchesCronField(field: string, value: number, min: number, max: number) {
  if (field === '*') return true
  for (const part of field.split(',')) {
    if (part.includes('/')) {
      const [base, stepValue] = part.split('/')
      const step = Number(stepValue)
      if (!step || Number.isNaN(step)) continue
      if (base === '*') {
        if ((value - min) % step === 0) return true
        continue
      }
      const [rangeStart, rangeEnd] = base.split('-').map(Number)
      if (!Number.isNaN(rangeStart) && !Number.isNaN(rangeEnd) && value >= rangeStart && value <= rangeEnd && (value - rangeStart) % step === 0) {
        return true
      }
      continue
    }

    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      if (!Number.isNaN(start) && !Number.isNaN(end) && value >= start && value <= end) {
        return true
      }
      continue
    }

    const numeric = Number(part)
    if (!Number.isNaN(numeric) && numeric >= min && numeric <= max && numeric === value) {
      return true
    }
  }
  return false
}

function matchesCronExpression(expression: string, date: Date) {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) return false
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
  return matchesCronField(minute, date.getMinutes(), 0, 59)
    && matchesCronField(hour, date.getHours(), 0, 23)
    && matchesCronField(dayOfMonth, date.getDate(), 1, 31)
    && matchesCronField(month, date.getMonth() + 1, 1, 12)
    && matchesCronField(dayOfWeek, date.getDay(), 0, 6)
}

export async function findProfilesReadyForSchedule(date: Date) {
  const profiles = await db.query.pipelineProfiles.findMany({ orderBy: (table, { asc }) => [asc(table.createdAt)] })
  return profiles.filter(profile => profile.scheduleCron && matchesCronExpression(profile.scheduleCron, date))
}

export async function createScheduledRun(profileId: string, date: Date) {
  const existing = await db.query.contentRuns.findFirst({
    where: (table, { and, eq, gt }) => and(eq(table.profileId, profileId), gt(table.createdAt, new Date(date.getTime() - 55_000))),
  })
  if (existing) {
    return existing
  }

  const profile = await db.query.pipelineProfiles.findFirst({ where: (table, { eq }) => eq(table.id, profileId) })
  if (!profile) {
    throw new Error(`Profile ${profileId} not found`)
  }

  const defaults = profile.defaults as Record<string, unknown>
  const niche = typeof defaults.niche === 'string' ? defaults.niche : 'Virax Shorts'
  const durationSeconds = Number(defaults.durationSeconds ?? 60)
  const topic = `${niche} ${date.toISOString().slice(0, 16)}`

  const [run] = await db.insert(contentRuns).values({
    profileId,
    topic,
    niche,
    trigger: 'scheduled',
    status: 'queued',
    sourcePrompt: topic,
    durationSeconds,
    currentStep: 'ideation',
  }).returning()

  await db.insert(runSteps).values(runStepNames.map((step, index) => ({
    runId: run.id,
    step,
    status: (index === 0 ? 'queued' : 'pending') as 'queued' | 'pending',
  })))

  await db.insert(reviewQueue).values({ runId: run.id, status: 'pending' })
  await db.insert(auditLogs).values({
    actor: 'scheduler',
    action: 'run.scheduled',
    entityType: 'pipeline_profile',
    entityId: profileId,
    metadata: { runId: run.id, topic },
  })

  return run
}

