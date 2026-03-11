import { z } from 'zod'

export function parseWithSchema<T>(schema: z.ZodType<T>, input: unknown) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    const message = parsed.error.issues.map(issue => issue.message).join(', ')
    throw new Error(message || 'Invalid payload')
  }
  return parsed.data
}
