import { PROVIDERS, providerConfigured } from './_lib/providers.js'
import { json } from './_lib/http.js'

// Non-secret readiness probe: which capabilities are configured server-side.
// Never returns secret values — only booleans — so it's safe to hit publicly.
export default function handler(req, res) {
  const providers = {}
  for (const p of Object.keys(PROVIDERS)) providers[p] = providerConfigured(p)
  return json(res, 200, {
    ok: true,
    sessionSecret: !!process.env.SESSION_SECRET,
    assistant: !!process.env.ANTHROPIC_API_KEY,
    redirectBase: process.env.OAUTH_REDIRECT_BASE || null,
    providers,
  })
}
