import type { FastifyPluginAsync } from 'fastify'
import { pipelineProfileSchema, upsertPipelineProfileInputSchema } from '@viraxstudio/shared/contracts'
import { ensureDefaultProfile, listPipelineProfiles, upsertDefaultProfile } from '../services/runs.js'
import { requireOwnerSession } from '../services/owner-guard.js'
import { parseWithSchema } from '../lib/validation.js'

export const pipelineProfileRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/api/v1/pipeline-profiles', async request => {
    await requireOwnerSession(request)
    return await listPipelineProfiles()
  })

  fastify.put('/api/v1/pipeline-profiles/default', async request => {
    await requireOwnerSession(request)
    const payload = parseWithSchema(upsertPipelineProfileInputSchema, request.body)
    await ensureDefaultProfile()
    const profile = await upsertDefaultProfile(payload)
    return pipelineProfileSchema.parse({
      id: profile.id,
      name: profile.name,
      isDefault: profile.isDefault,
      scheduleCron: profile.scheduleCron,
      defaults: {
        niche: (profile.defaults as Record<string, unknown>).niche ?? null,
        durationSeconds: Number((profile.defaults as Record<string, unknown>).durationSeconds ?? 60),
        autopublish: Boolean((profile.defaults as Record<string, unknown>).autopublish ?? false),
        autoAssets: Boolean((profile.defaults as Record<string, unknown>).autoAssets ?? true),
      },
      updatedAt: profile.updatedAt.toISOString(),
    })
  })
}
