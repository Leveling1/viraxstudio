import type { FastifyPluginAsync } from 'fastify'
import { createRunInputSchema, runDetailSchema, runsResponseSchema } from '@viraxstudio/shared/contracts'
import { queueNames } from '@viraxstudio/shared/server/queues'
import { runOrchestrationQueue } from '../queues/index.js'
import { createRun, getRunDetail, listRuns } from '../services/runs.js'
import { requireOwnerSession } from '../services/owner-guard.js'
import { parseWithSchema } from '../lib/validation.js'
import { db } from '../db/client.js'
import { contentRuns } from '@viraxstudio/shared/db/schema'
import { eq } from 'drizzle-orm'

export const runRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/api/v1/runs', async request => {
    await requireOwnerSession(request)
    return runsResponseSchema.parse(await listRuns())
  })

  fastify.post('/api/v1/runs', async request => {
    await requireOwnerSession(request)
    const payload = parseWithSchema(createRunInputSchema, request.body)
    const run = await createRun(payload)
    const job = await runOrchestrationQueue.add('process-run', { runId: run.id }, {
      jobId: run.id,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    })
    return { runId: run.id, queue: queueNames.runOrchestration, jobId: job.id }
  })

  fastify.get('/api/v1/runs/:runId', async request => {
    await requireOwnerSession(request)
    const params = request.params as { runId: string }
    const run = await getRunDetail(params.runId)
    if (!run) {
      throw fastify.httpErrors.notFound('Run not found')
    }
    return runDetailSchema.parse(run)
  })

  fastify.get('/api/v1/runs/:runId/events', async (request, reply) => {
    await requireOwnerSession(request)
    const params = request.params as { runId: string }
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    })

    const send = async () => {
      const run = await getRunDetail(params.runId)
      if (run) {
        reply.raw.write(`data: ${JSON.stringify(run)}\n\n`)
      }
    }

    await send()
    const interval = setInterval(send, 2000)
    request.raw.on('close', () => {
      clearInterval(interval)
      reply.raw.end()
    })
  })
}
