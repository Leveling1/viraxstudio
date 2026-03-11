import { z } from 'zod'

export const ownerSessionSchema = z.object({
  authenticated: z.boolean(),
  ownerEmail: z.string().email().nullable(),
  youtubeConnected: z.boolean(),
  channelTitle: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
})

export const loginRedirectSchema = z.object({
  url: z.string().url(),
})
