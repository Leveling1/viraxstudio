import type { FastifyRequest } from 'fastify'

export type OwnerSessionContext = {
  id: string
  ownerEmail: string
  googleSubject: string
  expiresAt: Date
}

export type AuthedRequest = FastifyRequest & {
  ownerSession: OwnerSessionContext
}
