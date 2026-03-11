import { getAccessTokenFromRefreshToken } from '../lib/google.js'
import { getLatestDecryptedSecret } from '../services/integrations.js'

export async function uploadPrivateVideo(videoBuffer: Buffer, title: string, description: string, tags: string[], privacyStatus: 'private' | 'unlisted' | 'public', thumbnailBuffer?: Buffer | null) {
  const refreshToken = await getLatestDecryptedSecret('youtube')
  if (!refreshToken) {
    throw new Error('YouTube refresh token is not configured')
  }

  const accessToken = await getAccessTokenFromRefreshToken(refreshToken)
  const body = {
    snippet: {
      title,
      description,
      tags,
      categoryId: '28',
      defaultLanguage: 'fr',
    },
    status: {
      privacyStatus,
    },
  }

  const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(videoBuffer.length),
    },
    body: JSON.stringify(body),
  })

  if (!initRes.ok) {
    const text = await initRes.text()
    throw new Error(`YouTube resumable init failed: ${text}`)
  }

  const uploadUrl = initRes.headers.get('Location')
  if (!uploadUrl) {
    throw new Error('YouTube upload URL is missing')
  }

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: new Uint8Array(videoBuffer),
  })
  if (!uploadRes.ok) {
    const text = await uploadRes.text()
    throw new Error(`YouTube video upload failed: ${text}`)
  }
  const payload = await uploadRes.json() as { id: string }

  if (thumbnailBuffer) {
    const thumbnailRes = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${payload.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'image/png',
      },
      body: new Uint8Array(thumbnailBuffer),
    })
    if (!thumbnailRes.ok) {
      const text = await thumbnailRes.text()
      throw new Error(`YouTube thumbnail upload failed: ${text}`)
    }
  }

  return {
    videoId: payload.id,
    url: `https://youtu.be/${payload.id}`,
  }
}

export async function publishExistingVideo(videoId: string, privacyStatus: 'private' | 'unlisted' | 'public', publishAt?: string | null) {
  const refreshToken = await getLatestDecryptedSecret('youtube')
  if (!refreshToken) {
    throw new Error('YouTube refresh token is not configured')
  }
  const accessToken = await getAccessTokenFromRefreshToken(refreshToken)

  const currentRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${videoId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!currentRes.ok) {
    throw new Error('Unable to fetch current YouTube video state')
  }
  const current = await currentRes.json() as { items?: Array<{ snippet: Record<string, unknown>; status: Record<string, unknown> }> }
  const item = current.items?.[0]
  if (!item) {
    throw new Error('YouTube video not found')
  }

  const body = {
    id: videoId,
    snippet: item.snippet,
    status: {
      ...item.status,
      privacyStatus,
      publishAt: publishAt ?? undefined,
    },
  }

  const updateRes = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,status', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!updateRes.ok) {
    const text = await updateRes.text()
    throw new Error(`YouTube publish update failed: ${text}`)
  }
}

