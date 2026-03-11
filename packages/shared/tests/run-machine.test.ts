import { describe, expect, it } from 'vitest'
import { createInitialStepStates, getNextStep } from '../src/server/run-machine.js'

describe('run machine', () => {
  it('starts with ideation queued and the rest pending', () => {
    const steps = createInitialStepStates()
    expect(steps[0]).toEqual({ step: 'ideation', status: 'queued' })
    expect(steps[1]).toEqual({ step: 'script', status: 'pending' })
  })

  it('returns the next step when available', () => {
    expect(getNextStep('script')).toBe('scenes')
    expect(getNextStep('publish')).toBeNull()
  })
})
