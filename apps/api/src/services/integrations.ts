import { desc, eq } from 'drizzle-orm'
import { integrations, integrationSecrets, youtubeChannels, auditLogs } from '@viraxstudio/shared/db/schema'
import { integrationProviders } from '@viraxstudio/shared/contracts'
import { encryptValue, maskSecret } from '@viraxstudio/shared/server/encryption'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { toIso } from '../lib/time.js'

const providerLabels: Record<string, string> = {
  anthropic: 'Anthropic Claude',
  elevenlabs: 'ElevenLabs',
  youtube: 'YouTube Channel',
  pexels: 'Pexels',
}

function getAuditActor() {
  return env.OWNER_GOOGLE_EMAIL ?? 'owner'
}

export async function ensureDefaultRecords() {
  for (const provider of integrationProviders) {
    const existing = await db.query.integrations.findFirst({ where: (table, { eq }) => eq(table.provider, provider) })
    if (!existing) {
      await db.insert(integrations).values({
        provider,
        status: 'missing',
        label: providerLabels[provider],
        metadata: {},
      })
    }
  }
}

async function getLatestSecret(integrationId: string) {
  return db.query.integrationSecrets.findFirst({
    where: (table, { eq }) => eq(table.integrationId, integrationId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  })
}

export async function getYoutubeIntegration() {
  await ensureDefaultRecords()
  return db.query.integrations.findFirst({ where: (table, { eq }) => eq(table.provider, 'youtube') })
}

export async function getAuthorizedOwnerEmail() {
  if (env.OWNER_GOOGLE_EMAIL) {
    return env.OWNER_GOOGLE_EMAIL.toLowerCase()
  }
  const youtube = await getYoutubeIntegration()
  const storedOwner = youtube?.metadata && typeof (youtube.metadata as Record<string, unknown>).ownerEmail === 'string'
    ? String((youtube.metadata as Record<string, unknown>).ownerEmail)
    : null
  return storedOwner ? storedOwner.toLowerCase() : null
}

export async function listIntegrations() {
  await ensureDefaultRecords()
  const rows = await db.query.integrations.findMany({ orderBy: (table, { asc }) => [asc(table.provider)] })
  const results = []
  for (const row of rows) {
    const latestSecret = await getLatestSecret(row.id)
    const channel = row.provider === 'youtube'
      ? await db.query.youtubeChannels.findFirst({ where: (table, { eq }) => eq(table.integrationId, row.id) })
      : null

    results.push({
      provider: row.provider,
      status: channel ? 'connected' : row.status,
      configured: !!latestSecret || !!channel,
      label: row.label,
      maskedSecret: latestSecret ? maskSecret('configured-secret') : null,
      metadata: {
        ...row.metadata,
        channelId: channel?.channelId ?? null,
        channelTitle: channel?.title ?? null,
        thumbnailUrl: channel?.thumbnailUrl ?? null,
      },
      lastValidatedAt: toIso(row.lastValidatedAt),
      updatedAt: toIso(row.updatedAt),
    })
  }
  return { items: results }
}

export async function upsertSecretIntegration(provider: 'anthropic' | 'elevenlabs' | 'pexels', apiKey: string, label?: string, metadata?: Record<string, unknown>) {
  const integration = await db.query.integrations.findFirst({ where: (table, { eq }) => eq(table.provider, provider) })
  if (!integration) throw new Error('Integration not found')

  await db.update(integrations).set({
    status: 'configured',
    label: label || integration.label,
    metadata: { ...integration.metadata, ...(metadata ?? {}) },
    updatedAt: new Date(),
    lastValidatedAt: new Date(),
  }).where(eq(integrations.id, integration.id))

  const encrypted = encryptValue(apiKey, env.APP_ENCRYPTION_KEY)
  await db.insert(integrationSecrets).values({
    integrationId: integration.id,
    secretType: 'api-key',
    cipherText: encrypted.cipherText,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    keyVersion: encrypted.keyVersion,
  })

  await db.insert(auditLogs).values({
    actor: getAuditActor(),
    action: 'integration.secret.updated',
    entityType: 'integration',
    entityId: integration.id,
    metadata: { provider },
  })

  return integration.id
}

export async function migrateLocalSecrets(input: { anthropicKey?: string; elevenlabsKey?: string; pexelsApiKey?: string; legacyGoogleClientId?: string }) {
  if (input.anthropicKey) {
    await upsertSecretIntegration('anthropic', input.anthropicKey)
  }
  if (input.elevenlabsKey) {
    await upsertSecretIntegration('elevenlabs', input.elevenlabsKey)
  }
  if (input.pexelsApiKey) {
    await upsertSecretIntegration('pexels', input.pexelsApiKey)
  }

  if (input.legacyGoogleClientId) {
    const youtube = await db.query.integrations.findFirst({ where: (table, { eq }) => eq(table.provider, 'youtube') })
    if (youtube) {
      await db.update(integrations).set({
        metadata: { ...youtube.metadata, legacyGoogleClientId: input.legacyGoogleClientId },
        updatedAt: new Date(),
      }).where(eq(integrations.id, youtube.id))
    }
  }

  return listIntegrations()
}

export async function upsertYoutubeConnection(args: {
  refreshToken: string
  channelId: string
  channelTitle: string
  channelDescription?: string | null
  channelThumbnailUrl?: string | null
  ownerEmail: string
  ownerSubject: string
}) {
  const integration = await db.query.integrations.findFirst({ where: (table, { eq }) => eq(table.provider, 'youtube') })
  if (!integration) throw new Error('YouTube integration not found')

  await db.update(integrations).set({
    status: 'connected',
    accountLabel: args.ownerEmail,
    metadata: {
      ...integration.metadata,
      ownerEmail: args.ownerEmail,
      ownerSubject: args.ownerSubject,
    },
    lastValidatedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(integrations.id, integration.id))

  const encrypted = encryptValue(args.refreshToken, env.APP_ENCRYPTION_KEY)
  await db.insert(integrationSecrets).values({
    integrationId: integration.id,
    secretType: 'refresh-token',
    cipherText: encrypted.cipherText,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    keyVersion: encrypted.keyVersion,
  })

  const existingChannel = await db.query.youtubeChannels.findFirst({ where: (table, { eq }) => eq(table.integrationId, integration.id) })
  if (existingChannel) {
    await db.update(youtubeChannels).set({
      channelId: args.channelId,
      title: args.channelTitle,
      description: args.channelDescription ?? null,
      thumbnailUrl: args.channelThumbnailUrl ?? null,
      connectedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(youtubeChannels.id, existingChannel.id))
  } else {
    await db.insert(youtubeChannels).values({
      integrationId: integration.id,
      channelId: args.channelId,
      title: args.channelTitle,
      description: args.channelDescription ?? null,
      thumbnailUrl: args.channelThumbnailUrl ?? null,
      connectedAt: new Date(),
    })
  }

  await db.insert(auditLogs).values({
    actor: args.ownerEmail,
    action: 'integration.youtube.connected',
    entityType: 'integration',
    entityId: integration.id,
    metadata: { channelId: args.channelId, channelTitle: args.channelTitle },
  })
}