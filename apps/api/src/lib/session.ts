import type { FastifyReply, FastifyRequest } from 'fastify'
import { addHours } from './time.js'

export const SESSION_COOKIE_NAME = 'virax_owner_session'
export const OAUTH_STATE_COOKIE = 'virax_google_oauth_state'

function isSecureCookie() {
  return process.env.NODE_ENV === 'production'
}

export function createSessionToken() {
  return crypto.randomUUID() + crypto.randomUUID()
}

export function setSessionCookie(reply: FastifyReply, token: string, ttlHours: number) {
  reply.setCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie(),
    path: '/',
    expires: addHours(new Date(), ttlHours),
  })
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
}

export function setOauthStateCookie(reply: FastifyReply, state: string) {
  reply.setCookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie(),
    path: '/',
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
