export const integrationProviders = ['anthropic', 'elevenlabs', 'youtube', 'pexels'] as const
export const integrationStatuses = ['missing', 'configured', 'connected', 'error'] as const
export const runTriggers = ['manual', 'scheduled', 'review-retry'] as const
export const runStatuses = ['draft', 'queued', 'running', 'needs-review', 'approved', 'publishing', 'published', 'failed', 'cancelled'] as const
export const runStepNames = ['ideation', 'script', 'scenes', 'assets', 'voice', 'captions', 'render', 'thumbnail', 'upload', 'review', 'publish'] as const
export const runStepStatuses = ['pending', 'queued', 'running', 'completed', 'failed', 'skipped'] as const
export const assetKinds = ['image', 'audio', 'video', 'subtitle', 'thumbnail', 'project'] as const
export const reviewStatuses = ['pending', 'approved', 'rejected', 'published'] as const
export const publicationStatuses = ['draft', 'uploaded-private', 'scheduled', 'published', 'failed'] as const
export const queueNames = {
  runOrchestration: 'run-orchestration',
  runPublication: 'run-publication',
  housekeeping: 'housekeeping',
} as const
