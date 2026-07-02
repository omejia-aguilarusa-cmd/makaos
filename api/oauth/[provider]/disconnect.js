import { isProvider } from '../../_lib/providers.js'
import { readSession, sessionCookie } from '../../_lib/session.js'
import { json } from '../../_lib/http.js'

// Drop a provider's tokens from the session (idempotent).
export default function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
  const provider = req.query.provider
  if (!isProvider(provider)) return json(res, 400, { error: 'unknown_provider' })
  const sess = readSession(req)
  delete sess[provider]
  res.setHeader('Set-Cookie', sessionCookie(sess))
  return json(res, 200, { ok: true, provider, connected: false })
}
