export const queueNames = {
  runOrchestration: 'run-orchestration',
  runPublication: 'run-publication',
  housekeeping: 'housekeeping',
} as const

export type QueueName = (typeof queueNames)[keyof typeof queueNames]
