import { Buffer } from 'node:buffer'
import { uploadBuffer } from '../lib/storage.js'
import { env } from '../config/env.js'
import { getLatestDecryptedSecret } from '../services/integrations.js'

function placeholderSvg(prompt: string) {
  const safe = prompt.replace(/[<>&]/g, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111111"/><stop offset="1" stop-color="#ff3b3b"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#g)"/><rect x="64" y="64" width="952" height="1792" rx="48" fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.12)"/><text x="120" y="240" fill="#ffffff" font-family="Syne, Arial" font-size="72" font-weight="700">ViraxStudio</text><foreignObject x="120" y="340" width="840" height="1200"><div xmlns="http://www.w3.org/1999/xhtml" style="color:#ffffff;font-size:54px;line-height:1.3;font-family:Arial, sans-serif;">${safe}</div></foreignObject></svg>`
}

export async function resolveSceneAsset(runId: string, sceneId: string, prompt: string, searchTerm: string | null) {
  const pexelsKey = (await getLatestDecryptedSecret('pexels')) ?? env.PEXELS_API_KEY
  if (pexelsKey && searchTerm) {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&orientation=portrait&per_page=1`, {
      headers: { Authorization: pexelsKey },
    })
    if (response.ok) {
      const payload = await response.json() as { photos?: Array<{ src?: { large2x?: string; original?: string } }> }
      const url = payload.photos?.[0]?.src?.large2x ?? payload.photos?.[0]?.src?.original
      if (url) {
        return { provider: 'pexels', sourceUrl: url, storageKey: null, publicUrl: url }
      }
    }
  }

  const key = `runs/${runId}/assets/${sceneId}.svg`
  const svg = placeholderSvg(prompt)
  const publicUrl = await uploadBuffer(key, Buffer.from(svg, 'utf8'), 'image/svg+xml')
  return { provider: 'placeholder-svg', sourceUrl: publicUrl, storageKey: key, publicUrl }
}
