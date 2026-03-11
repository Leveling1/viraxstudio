import type { FastifyPluginAsync } from 'fastify'

export const healthRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/api/v1/health', async () => ({
    ok: true,
    service: 'viraxstudio-api',
    timestamp: new Date().toISOString(),
  }))
}
