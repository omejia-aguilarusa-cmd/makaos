import { json, readBody } from './_lib/http.js'

// Real Claude assistant proxy. The browser builds the grounded system prompt +
// conversation from the local dataset and posts it here; this function forwards
// to the Anthropic Messages API using the server-side ANTHROPIC_API_KEY so the
// key never reaches the client. Falls back gracefully (503) when unconfigured,
// so the app's built-in responder can take over.
//
// NOTE: this is a public endpoint. Put the deployment behind Vercel Deployment
// Protection (see docs/integrations-setup.md) so the key can't be abused.

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return json(res, 503, { error: 'assistant_not_configured', hint: 'Set ANTHROPIC_API_KEY in Vercel to enable the Claude assistant.' })

  const body = readBody(req)
  const system = String(body.system || '').slice(0, 24000)
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-12)
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content || m.text || '').slice(0, 8000) }))
    .filter((m) => m.content)
  if (!messages.length) return json(res, 400, { error: 'no_messages' })

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      // No temperature/top_p — removed on Opus 4.8 (would 400). Short cap keeps
      // the copilot replies tight and the request well under HTTP timeouts.
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8', max_tokens: 1024, system, messages }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) return json(res, r.status, { error: 'anthropic_error', detail: (data && data.error && data.error.message) || '' })
    const text = Array.isArray(data.content) ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim() : ''
    return json(res, 200, { ok: true, text })
  } catch (e) {
    return json(res, 502, { error: 'assistant_request_failed' })
  }
}
