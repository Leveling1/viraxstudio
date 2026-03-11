import type { FastifyPluginAsync } from 'fastify'
import { integrationsResponseSchema, migrateLocalSecretsInputSchema, upsertIntegrationInputSchema } from '@viraxstudio/shared/contracts'
import { listIntegrations, migrateLocalSecrets, upsertSecretIntegration } from '../services/integrations.js'
import { requireOwnerSession } from '../services/owner-guard.js'
import { parseWithSchema } from '../lib/validation.js'

export const integrationRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/api/v1/integrations', async request => {
    await requireOwnerSession(request)
    return integrationsResponseSchema.parse(await listIntegrations())
  })

  fastify.post('/api/v1/integrations/migrate-local', async request => {
    await requireOwnerSession(request)
    const payload = parseWithSchema(migrateLocalSecretsInputSchema, request.body)
    return integrationsResponseSchema.parse(await migrateLocalSecrets(payload))
  })

  fastify.post('/api/v1/integrations/:provider', async request => {
    await requireOwnerSession(request)
    const params = request.params as { provider: string }
    if (!['anthropic', 'elevenlabs', 'pexels'].includes(params.provider)) {
      throw fastify.httpErrors.badRequest('Only API-key integrations can be configured directly')
    }
    const payload = parseWithSchema(upsertIntegrationInputSchema, request.body)
    if (!payload.apiKey) {
      throw fastify.httpErrors.badRequest('apiKey is required')
    }
    await upsertSecretIntegration(params.provider as 'anthropic' | 'elevenlabs' | 'pexels', payload.apiKey, payload.label, payload.metadata)
    return integrationsResponseSchema.parse(await listIntegrations())
  })
}
