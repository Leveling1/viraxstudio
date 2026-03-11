import type { Job } from 'bullmq'
import { processPublication } from '../services/pipeline.js'

export async function processPublicationJob(job: Job<{ runId: string; mode: 'publish-now' | 'schedule'; publishAt?: string | null; privacyStatus: 'private' | 'unlisted' | 'public' }>) {
  await processPublication(job.data.runId, job.data.mode, job.data.privacyStatus, job.data.publishAt ?? null)
}
