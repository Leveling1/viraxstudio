import { getOwnerSessionFromRequest } from './auth.js'
import type { FastifyRequest } from 'fastify'

export async function requireOwnerSession(request: FastifyRequest) {
  const session = await getOwnerSessionFromRequest(request)
  if (!session) {
    throw request.server.httpErrors.unauthorized('Owner authentication required')
  }
  return session
}
