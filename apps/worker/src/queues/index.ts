import { Queue, Worker } from 'bullmq'
import { queueNames } from '@viraxstudio/shared/server/queues'
import { env } from '../config/env.js'

const redisUrl = new URL(env.REDIS_URL)

export const redisConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  db: redisUrl.pathname && redisUrl.pathname !== '/' ? Number(redisUrl.pathname.slice(1)) : 0,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
}

export const runOrchestrationQueue = new Queue(queueNames.runOrchestration, {
  connection: redisConnectionOptions,
})

export const runPublicationQueue = new Queue(queueNames.runPublication, {
  connection: redisConnectionOptions,
})

export function createQueueWorker(name: string, processor: any) {
  return new Worker(name, processor, {
    connection: redisConnectionOptions,
    concurrency: 1,
  })
}

export { queueNames }

