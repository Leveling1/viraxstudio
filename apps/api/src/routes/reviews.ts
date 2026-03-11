import type { FastifyPluginAsync } from 'fastify'
import { reviewDecisionSchema, reviewsResponseSchema } from '@viraxstudio/shared/contracts'
import { listReviewItems, updateReviewDecision } from '../services/runs.js'
import { requireOwnerSession } from '../services/owner-guard.js'
import { parseWithSchema } from '../lib/validation.js'

export const reviewRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/api/v1/reviews', async request => {
    await requireOwnerSession(request)
    return reviewsResponseSchema.parse(await listReviewItems())
  })

  fastify.post('/api/v1/reviews/:runId', async request => {
    await requireOwnerSession(request)
    const params = request.params as { runId: string }
    const payload = parseWithSchema(reviewDecisionSchema, request.body)
    await updateReviewDecision(params.runId, payload.decision, payload.notes)
    return reviewsResponseSchema.parse(await listReviewItems())
  })
}
