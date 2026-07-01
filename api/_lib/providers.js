// Per-provider OAuth configuration + token exchange for the Maka OS
// integrations backend. All client credentials come from environment variables
// (set in Vercel) — nothing is hard-coded. Providers with no env credentials
// are simply reported as "not configured" so the app degrades gracefully.
//
//   google      — one OAuth app covering Sheets, Drive, Calendar, Gmail
//   slack       — bot token via OAuth v2
//   quickbooks  — QuickBooks Online accounting
//   (claude is API-key based, handled in api/assistant.js — not OAuth)

export const PROVIDERS = {
  google: {
    label: 'Google Workspace',
    services: ['sheets', 'drive', 'calendar', 'gmail'],
    authURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    scope: [
      'openid', 'email', 'profile',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/gmail.send',
    ].join(' '),
    authExtra: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
    env: { id: 'GOOGLE_CLIENT_ID', secret: 'GOOGLE_CLIENT_SECRET' },
  },
  slack: {
    label: 'Slack',
    services: ['slack'],
    authURL: 'https://slack.com/oauth/v2/authorize',
    tokenURL: 'https://slack.com/api/oauth.v2.access',
    scope: 'chat:write,chat:write.public,channels:read',
    authExtra: {},
    env: { id: 'SLACK_CLIENT_ID', secret: 'SLACK_CLIENT_SECRET' },
  },
  quickbooks: {
    label: 'QuickBooks Online',
    services: ['quickbooks'],
    authURL: 'https://appcenter.intuit.com/connect/oauth2',
    tokenURL: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    scope: 'com.intuit.quickbooks.accounting openid email',
    authExtra: {},
    env: { id: 'QBO_CLIENT_ID', secret: 'QBO_CLIENT_SECRET' },
  },
}

export function isProvider(p) { return Object.prototype.hasOwnProperty.call(PROVIDERS, p) }
export function providerConfigured(p) {
  const c = PROVIDERS[p]
  return !!(c && process.env[c.env.id] && process.env[c.env.secret])
}
export function creds(p) {
  const c = PROVIDERS[p]
  return { id: process.env[c.env.id] || '', secret: process.env[c.env.secret] || '' }
}

// The public base URL for building the OAuth redirect_uri. Prefer an explicit
// OAUTH_REDIRECT_BASE (so it's stable across preview/prod); else derive from the
// request. redirect_uri must match what's registered with the provider.
export function baseUrl(req) {
  if (process.env.OAUTH_REDIRECT_BASE) return process.env.OAUTH_REDIRECT_BASE.replace(/\/+$/, '')
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}
export function redirectUri(req, provider) { return `${baseUrl(req)}/api/oauth/${provider}/callback` }

export function buildAuthUrl(provider, { clientId, redirect_uri, state }) {
  const c = PROVIDERS[provider]
  const p = new URLSearchParams({ client_id: clientId, redirect_uri, response_type: 'code', scope: c.scope, state, ...c.authExtra })
  return `${c.authURL}?${p.toString()}`
}

// Exchange an authorization code for tokens. Handles each provider's quirks
// (Slack returns { ok, access_token, team }; QuickBooks needs HTTP Basic auth).
export async function exchangeCode(provider, { code, redirect_uri, req }) {
  const c = PROVIDERS[provider]
  const { id, secret } = creds(provider)
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }
  let body

  if (provider === 'quickbooks') {
    headers.Authorization = 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64')
    body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri })
  } else if (provider === 'slack') {
    body = new URLSearchParams({ client_id: id, client_secret: secret, code, redirect_uri })
  } else {
    // Google (standard OAuth2 with client_secret in the body).
    body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri, client_id: id, client_secret: secret })
  }

  const r = await fetch(c.tokenURL, { method: 'POST', headers, body: body.toString() })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`token exchange failed (${r.status}): ${JSON.stringify(data).slice(0, 300)}`)

  if (provider === 'slack') {
    if (!data.ok) throw new Error(`slack oauth error: ${data.error || 'unknown'}`)
    return {
      access_token: data.access_token, refresh_token: data.refresh_token || null,
      expires_at: null, scope: data.scope || c.scope, account: (data.team && data.team.name) || 'Slack workspace',
    }
  }

  const now = Date.now()
  const tokens = {
    access_token: data.access_token, refresh_token: data.refresh_token || null,
    expires_at: data.expires_in ? now + data.expires_in * 1000 : null, scope: data.scope || c.scope, account: '',
  }
  if (provider === 'quickbooks') tokens.realmId = (req && req.query && req.query.realmId) || null
  tokens.account = await fetchAccount(provider, tokens).catch(() => '')
  return tokens
}

// A human-readable account label for the connected identity (best-effort).
export async function fetchAccount(provider, tokens) {
  if (provider === 'google') {
    const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + tokens.access_token } })
    if (!r.ok) return ''
    const u = await r.json().catch(() => ({}))
    return u.email || u.name || ''
  }
  if (provider === 'quickbooks') return tokens.realmId ? 'Company ' + tokens.realmId : 'QuickBooks'
  return ''
}
