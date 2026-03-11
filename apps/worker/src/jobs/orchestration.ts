import type { Job } from 'bullmq'
import { processRunPipeline } from '../services/pipeline.js'

export async function processRunJob(job: Job<{ runId: string }>) {
  await processRunPipeline(job.data.runId)
}
