import Anthropic from '@anthropic-ai/sdk'
import { env } from '../config/env.js'
import { getLatestDecryptedSecret } from '../services/integrations.js'

function buildFallback(topic: string, durationSeconds: number) {
  const sceneCount = Math.max(4, Math.min(8, Math.round(durationSeconds / 10)))
  return {
    hook: `Voici pourquoi ${topic} peut exploser sur YouTube Shorts.`,
    body: Array.from({ length: sceneCount }, (_, index) => `Scene ${index + 1}: un angle fort et memorisable sur ${topic}.`),
    cta: 'Abonne-toi pour la suite des faits viraux.',
    seo: {
      title: `${topic} : 5 faits viraux a connaitre`,
      description: `Video automatique ViraxStudio sur ${topic}.`,
      tags: ['youtube shorts', 'viral', topic],
    },
    scenes: Array.from({ length: sceneCount }, (_, index) => ({
      prompt: `Illustration verticale cinematographique sur ${topic}, scene ${index + 1}`,
      narrationText: `Point ${index + 1} sur ${topic}.`,
      durationSeconds: Math.max(4, Math.round(durationSeconds / sceneCount)),
    })),
  }
}

export async function generateScriptBundle(topic: string, durationSeconds: number) {
  const apiKey = await getLatestDecryptedSecret('anthropic')
  if (!apiKey) {
    return buildFallback(topic, durationSeconds)
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1800,
      messages: [{
        role: 'user',
        content: `Tu es le moteur editoral de ViraxStudio. Sujet: ${topic}. Duree: ${durationSeconds}s. Retourne uniquement un JSON valide de cette forme: {"hook":"...","body":["..."],"cta":"...","seo":{"title":"...","description":"...","tags":["...","..."]},"scenes":[{"prompt":"...","narrationText":"...","durationSeconds":6}]}`,
      }],
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const normalized = text.replace(/```json|```/g, '').trim()
    return JSON.parse(normalized)
  } catch {
    return buildFallback(topic, durationSeconds)
  }
}
