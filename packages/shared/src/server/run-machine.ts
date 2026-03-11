import { runStepNames } from '../contracts/constants.js'

const orderedSteps = [...runStepNames]

export function createInitialStepStates() {
  return orderedSteps.map(step => ({ step, status: step === 'ideation' ? 'queued' : 'pending' }))
}

export function getNextStep(currentStep: typeof orderedSteps[number]) {
  const index = orderedSteps.indexOf(currentStep)
  return index >= 0 && index + 1 < orderedSteps.length ? orderedSteps[index + 1] : null
}

export function deriveRunStatus(stepStatus: string, currentStep: string | null, reviewStatus: string | null) {
  if (stepStatus === 'failed') return 'failed'
  if (!currentStep && reviewStatus === 'published') return 'published'
  if (reviewStatus === 'approved') return 'approved'
  if (reviewStatus === 'pending') return 'needs-review'
  if (stepStatus === 'completed' && currentStep === 'publish') return 'published'
  return 'running'
}
