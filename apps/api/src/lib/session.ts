import type { FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../config/env.js'
import { addHours } from './time.js'

export const SESSION_COOKIE_NAME = 'virax_owner_session'
export const OAUTH_STATE_COOKIE = 'virax_google_oauth_state'

function isIpAddress(hostname: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)
}

function getSiteKey(urlValue: string) {
  const url = new URL(urlValue)
  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || isIpAddress(hostname)) {
    return `${url.protocol}//${hostname}`
  }
  const parts = hostname.split('.')
  const site = parts.length >= 2 ? parts.slice(-2).join('.') : hostname
  return `${url.protocol}//${site}`
}

function shouldUseCrossSiteCookies() {
  try {
    return getSiteKey(env.WEB_APP_URL) !== getSiteKey(env.API_PUBLIC_URL)
  } catch {
    return false
  }
}

function getCookieOptions(ttlHours?: number) {
  const crossSite = shouldUseCrossSiteCookies()
  const secure = crossSite || process.env.NODE_ENV === 'production'
  const sameSite: 'lax' | 'none' = crossSite ? 'none' : 'lax'
  return {
    httpOnly: true as const,
    sameSite,
    secure,
    path: '/',
    expires: typeof ttlHours === 'number' ? addHours(new Date(), ttlHours) : undefined,
  }
}

export function createSessionToken() {
  return crypto.randomUUID() + crypto.randomUUID()
}

export function setSessionCookie(reply: FastifyReply, token: string, ttlHours: number) {
  reply.setCookie(SESSION_COOKIE_NAME, token, getCookieOptions(ttlHours))
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
}

export function setOauthStateCookie(reply: FastifyReply, state: string) {
  reply.setCookie(OAUTH_STATE_COOKIE, state, {
    ...getCookieOptions(),
    maxAge: 60 * 10,
  })
}

export function clearOauthStateCookie(reply: FastifyReply) {
  reply.clearCookie(OAUTH_STATE_COOKIE, { path: '/' })
}

export function readSessionToken(request: FastifyRequest) {
  return request.cookies[SESSION_COOKIE_NAME] ?? null
}

export function readOauthState(request: FastifyRequest) {
  return request.cookies[OAUTH_STATE_COOKIE] ?? null
}