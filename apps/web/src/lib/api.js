import {
  integrationsResponseSchema,
  loginRedirectSchema,
  ownerSessionSchema,
  pipelineProfileSchema,
  reviewItemSchema,
  reviewsResponseSchema,
  runDetailSchema,
  runsResponseSchema,
} from '@viraxstudio/shared/contracts'

function normalizeBaseUrl(value) {
  return typeof value === 'string' ? value.trim().replace(/\/$/, '') : ''
}

function readRuntimeApiBaseUrl() {
  if (typeof window === 'undefined') return ''
  if (typeof window.__VIRAX_API_BASE_URL__ === 'string') {
    return window.__VIRAX_API_BASE_URL__
  }
  const meta = document.querySelector('meta[name="virax-api-base-url"]')
  return meta?.getAttribute('content') || ''
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || readRuntimeApiBaseUrl())

export function getApiBaseUrl() {
  return API_BASE_URL
}

export function buildApiUrl(path) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

export function buildGoogleAuthStartUrl() {
  return buildApiUrl('/api/v1/auth/google/start?mode=redirect')
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const hasBody = options.body !== undefined
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildApiUrl(path), {
    method: options.method || 'GET',
    credentials: 'include',
    headers,
    body: hasBody && headers.get('Content-Type') === 'application/json' ? JSON.stringify(options.body) : options.body,
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.message || payload?.error || payload?.statusCode || 'Une erreur backend est survenue.'
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export function openRunEvents(runId, onMessage) {
  const source = new EventSource(buildApiUrl(`/api/v1/runs/${runId}/events`), { withCredentials: true })
  source.onmessage = event => {
    try {
      onMessage(runDetailSchema.parse(JSON.parse(event.data)))
    } catch {
      // ignore malformed heartbeat payloads
    }
  }
  return source
}

export async function getHealth() {
  return request('/api/v1/health')
}

export async function getSession() {
  return ownerSessionSchema.parse(await request('/api/v1/auth/session'))
}

export async function getGoogleAuthRedirect() {
  return loginRedirectSchema.parse(await request('/api/v1/auth/google/start'))
}

export async function logout() {
  return request('/api/v1/auth/logout', { method: 'POST' })
}

export async function listIntegrations() {
  return integrationsResponseSchema.parse(await request('/api/v1/integrations'))
}

export async function saveIntegration(provider, payload) {
  return integrationsResponseSchema.parse(await request(`/api/v1/integrations/${provider}`, {
    method: 'POST',
    body: payload,
  }))
}

export async function migrateLocalSecrets(payload) {
  return integrationsResponseSchema.parse(await request('/api/v1/integrations/migrate-local', {
    method: 'POST',
    body: payload,
  }))
}

export async function listPipelineProfiles() {
  const result = await request('/api/v1/pipeline-profiles')
  return {
    items: Array.isArray(result.items) ? result.items.map(item => pipelineProfileSchema.parse(item)) : [],
  }
}

export async function updateDefaultProfile(payload) {
  return pipelineProfileSchema.parse(await request('/api/v1/pipeline-profiles/default', {
    method: 'PUT',
    body: payload,
  }))
}

export async function listRuns() {
  return runsResponseSchema.parse(await request('/api/v1/runs'))
}

export async function getRunDetail(runId) {
  return runDetailSchema.parse(await request(`/api/v1/runs/${runId}`))
}

export async function createRun(payload) {
  return request('/api/v1/runs', {
    method: 'POST',
    body: payload,
  })
}

export async function listReviews() {
  const response = reviewsResponseSchema.parse(await request('/api/v1/reviews'))
  return {
    items: response.items.map(item => reviewItemSchema.parse(item)),
  }
}

export async function updateReview(runId, payload) {
  const response = reviewsResponseSchema.parse(await request(`/api/v1/reviews/${runId}`, {
    method: 'POST',
    body: payload,
  }))
  return {
    items: response.items.map(item => reviewItemSchema.parse(item)),
  }
}

export async function requestPublication(runId, payload) {
  return request(`/api/v1/publications/${runId}`, {
    method: 'POST',
    body: payload,
  })
}