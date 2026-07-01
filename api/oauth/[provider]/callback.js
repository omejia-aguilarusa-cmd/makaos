import { isProvider, exchangeCode, redirectUri, baseUrl } from '../../_lib/providers.js'
import { readSession, sessionCookie, cookie } from '../../_lib/session.js'
import { json, redirect, getCookie } from '../../_lib/http.js'

// OAuth redirect target: verify the CSRF state, exchange the code for tokens,
// store them in the encrypted session cookie, and bounce back to the app with a
// status the UI turns into a toast + a status refresh.
export default async function handler(req, res) {
  const provider = req.query.provider
  if (!isProvider(provider)) return json(res, 400, { error: 'unknown_provider' })
  const back = (status) => redirect(res, `${baseUrl(req)}/?view=integrations&connect=${provider}&status=${status}`)

  try {
    if (req.query.error) return back('denied')
    const { code, state } = req.query
    const saved = getCookie(req, 'maka_oauth_state')
    if (!code || !state || saved !== `${provider}.${state}`) return back('badstate')

    const tokens = await exchangeCode(provider, { code, redirect_uri: redirectUri(req, provider), req })
    const sess = readSession(req)
    sess[provider] = {
      connected: true,
      account: tokens.account || '',
      scope: tokens.scope || '',
      at: Date.now(),
      access_token: tokens.access_token || null,
      refresh_token: tokens.refresh_token || null,
      expires_at: tokens.expires_at || null,
    }
    if (tokens.realmId) sess[provider].realmId = tokens.realmId
    // Persist the session, clear the one-time state cookie.
    res.setHeader('Set-Cookie', [sessionCookie(sess), cookie('maka_oauth_state', '', 0)])
    return back('connected')
  } catch (e) {
    return back('error')
  }
}
