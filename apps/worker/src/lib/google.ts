import { OAuth2Client } from 'google-auth-library'
import { env } from '../config/env.js'

function createGoogleClient() {
  return new OAuth2Client(env.GOOGLE_OAUTH_CLIENT_ID, env.GOOGLE_OAUTH_CLIENT_SECRET, env.GOOGLE_OAUTH_REDIRECT_URI)
}

export async function getAccessTokenFromRefreshToken(refreshToken: string) {
  const client = createGoogleClient()
  client.setCredentials({ refresh_token: refreshToken })
  const accessToken = await client.getAccessToken()
  if (!accessToken.token) {
    throw new Error('Unable to refresh Google access token')
  }
  return accessToken.token
}
