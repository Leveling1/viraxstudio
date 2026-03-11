import { createQueueWorker, queueNames, runOrchestrationQueue, runPublicationQueue } from './queues/index.js'
import { processRunJob } from './jobs/orchestration.js'
import { processPublicationJob } from './jobs/publication.js'
import { startProfileScheduler } from './services/scheduler.js'
import { env } from './config/env.js'
import { sql } from './db/client.js'

const runWorker = createQueueWorker(queueNames.runOrchestration, processRunJob)
const publicationWorker = createQueueWorker(queueNames.runPublication, processPublicationJob)
const stopScheduler = startProfileScheduler(env.SCHEDULER_POLL_INTERVAL_MS)

async function shutdown() {
  stopScheduler()
  await Promise.allSettled([
    runWorker.close(),
    publicationWorker.close(),
    runOrchestrationQueue.close(),
    runPublicationQueue.close(),
    sql.end(),
  ])
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown()
})

process.on('SIGTERM', () => {
  void shutdown()
})
