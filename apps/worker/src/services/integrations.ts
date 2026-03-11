import { eq, desc } from 'drizzle-orm'
import { integrations, integrationSecrets } from '@viraxstudio/shared/db/schema'
import { decryptValue } from '@viraxstudio/shared/server/encryption'
import { db } from '../db/client.js'
import { env } from '../config/env.js'

export async function getIntegration(provider: 'anthropic' | 'elevenlabs' | 'youtube' | 'pexels') {
  return db.query.integrations.findFirst({ where: (table, { eq }) => eq(table.provider, provider) })
}

export async function getLatestDecryptedSecret(provider: 'anthropic' | 'elevenlabs' | 'youtube' | 'pexels') {
  const integration = await getIntegration(provider)
  if (!integration) return null
  const secret = await db.query.integrationSecrets.findFirst({
    where: (table, { eq }) => eq(table.integrationId, integration.id),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  })
  if (!secret) return null
  return decryptValue({
    cipherText: secret.cipherText,
    iv: secret.iv,
    authTag: secret.authTag,
    keyVersion: secret.keyVersion,
  }, env.APP_ENCRYPTION_KEY)
}
