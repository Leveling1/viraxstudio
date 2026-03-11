import type { FastifyPluginAsync } from 'fastify'
import { publicationRequestSchema } from '@viraxstudio/shared/contracts'
import { runPublicationQueue } from '../queues/index.js'
import { markPublicationRequested } from '../services/runs.js'
import { requireOwnerSession } from '../services/owner-guard.js'
import { parseWithSchema } from '../lib/validation.js'

export const publicationRoutes: FastifyPluginAsync = async fastify => {
  fastify.post('/api/v1/publications/:runId', async request => {
    await requireOwnerSession(request)
    const params = request.params as { runId: string }
    const payload = parseWithSchema(publicationRequestSchema, request.body)
    await markPublicationRequested(params.runId, payload)
    const delay = payload.mode === 'schedule' && payload.publishAt ? Math.max(new Date(payload.publishAt).getTime() - Date.now(), 0) : 0
    const job = await runPublicationQueue.add('publish-run', {
      runId: params.runId,
      mode: payload.mode,
      publishAt: payload.publishAt ?? null,
      privacyStatus: payload.privacyStatus,
    }, {
      jobId: `${params.runId}:publish`,
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    })
    return { ok: true, jobId: job.id }
  })
}
