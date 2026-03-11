import { createScheduledRun, findProfilesReadyForSchedule } from './pipeline.js'
import { runOrchestrationQueue } from '../queues/index.js'

export function startProfileScheduler(intervalMs: number) {
  let inFlight = false

  const tick = async () => {
    if (inFlight) return
    inFlight = true
    try {
      const now = new Date()
      const profiles = await findProfilesReadyForSchedule(now)
      for (const profile of profiles) {
        const run = await createScheduledRun(profile.id, now)
        await runOrchestrationQueue.add('process-run', { runId: run.id }, {
          jobId: run.id,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        })
      }
    } finally {
      inFlight = false
    }
  }

  const timer = setInterval(() => {
    void tick()
  }, intervalMs)

  void tick()

  return () => {
    clearInterval(timer)
  }
}
