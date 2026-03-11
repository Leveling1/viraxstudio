import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getLatestDecryptedSecret } from '../services/integrations.js'
import { env } from '../config/env.js'
import { runFfmpeg } from '../lib/ffmpeg.js'

export async function createVoiceTrack(fullText: string, totalDurationSeconds: number, tempDir: string) {
  const elevenKey = await getLatestDecryptedSecret('elevenlabs')
  const audioPath = join(tempDir, 'voice.mp3')
  if (!elevenKey) {
    await runFfmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(totalDurationSeconds), '-q:a', '9', '-acodec', 'libmp3lame', audioPath, '-y'])
    return readFile(audioPath)
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${env.DEFAULT_ELEVENLABS_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': elevenKey,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: fullText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.45, similarity_boost: 0.75 },
    }),
  })

  if (!response.ok) {
    await runFfmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(totalDurationSeconds), '-q:a', '9', '-acodec', 'libmp3lame', audioPath, '-y'])
    return readFile(audioPath)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await writeFile(audioPath, buffer)
  return buffer
}
