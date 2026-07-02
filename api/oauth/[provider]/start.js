import crypto from 'node:crypto'
import { PROVIDERS, isProvider, providerConfigured, creds, redirectUri, buildAuthUrl } from '../../_lib/providers.js'
import { cookie, sessionSecretConfigured } from '../../_lib/session.js'
import { json, redirect } from '../../_lib/http.js'

// Kick off an OAuth flow: mint a CSRF `state`, stash it in a short-lived cookie,
// and redirect the operator to the provider's consent screen.
export default function handler(req, res) {
  const provider = req.query.provider
  if (!isProvider(provider)) return json(res, 400, { error: 'unknown_provider' })
  if (!sessionSecretConfigured()) return json(res, 503, { error: 'no_session_secret', hint: 'Set SESSION_SECRET in Vercel before connecting providers — tokens must not be encrypted with the built-in dev key.' })
  if (!providerConfigured(provider)) {
    const env = PROVIDERS[provider].env
    return json(res, 503, { error: 'not_configured', hint: `Set ${env.id} and ${env.secret} in Vercel to connect ${PROVIDERS[provider].label}.` })
  }
  const state = crypto.randomBytes(16).toString('base64url')
  const url = buildAuthUrl(provider, { clientId: creds(provider).id, redirect_uri: redirectUri(req, provider), state })
  // 10-minute state cookie, provider-scoped so a stale flow can't cross providers.
  res.setHeader('Set-Cookie', cookie('maka_oauth_state', `${provider}.${state}`, 600))
  return redirect(res, url)
}
