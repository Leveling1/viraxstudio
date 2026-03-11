import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
import { spawn } from 'node:child_process'
import { env } from '../config/env.js'

export async function withTempDir<T>(runner: (dir: string) => Promise<T>) {
  const dir = await mkdtemp(join(tmpdir(), 'viraxstudio-'))
  try {
    return await runner(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function runFfmpeg(args: string[]) {
  const child = spawn(env.FFMPEG_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let stderr = ''
  child.stderr.on('data', chunk => {
    stderr += chunk.toString()
  })
  const [code] = await once(child, 'close')
  if (code !== 0) {
    throw new Error(`FFmpeg failed: ${stderr}`)
  }
}
