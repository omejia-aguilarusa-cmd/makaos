import { PROVIDERS, providerConfigured } from '../_lib/providers.js'
import { readSession } from '../_lib/session.js'
import { json } from '../_lib/http.js'

// Report, per provider: whether the server has credentials configured
// (`configured`) and whether this browser's session holds a live connection
// (`connected`) plus the connected account label. The UI renders Connect vs
// Disconnect vs "Set up" from this.
export default function handler(req, res) {
  const sess = readSession(req)
  const providers = {}
  for (const p of Object.keys(PROVIDERS)) {
    const s = sess[p]
    providers[p] = {
      configured: providerConfigured(p),
      connected: !!(s && s.connected),
      account: (s && s.account) || '',
      services: PROVIDERS[p].services,
    }
  }
  // Claude is API-key based (no OAuth): configured == connected.
  const claude = !!process.env.ANTHROPIC_API_KEY
  providers.claude = { configured: claude, connected: claude, account: claude ? 'API key' : '', services: ['claude'] }

  return json(res, 200, { ok: true, providers })
}
