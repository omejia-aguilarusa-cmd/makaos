import { readSession, sessionCookie } from '../_lib/session.js'
import { json, readBody } from '../_lib/http.js'
import { creds } from '../_lib/providers.js'

// Two-way Google Sheets sync for the Time Logs dataset.
//   push — write the portal's current entries into the "TimeLogs" tab
//          (creates the spreadsheet on first push)
//   pull — read the tab back so the client can merge sheet-side edits
// Auth: the operator's Google OAuth tokens from the encrypted session cookie.
// Access tokens are refreshed here transparently when close to expiry.

const SHEET_TITLE = 'Maka OS — Time Logs'
const TAB = 'TimeLogs'
const MAX_ROWS = 20000

async function refreshGoogle(g) {
  const { id, secret } = creds('google')
  if (!g.refresh_token || !id || !secret) throw new Error('no_refresh')
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: g.refresh_token, client_id: id, client_secret: secret })
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
  const d = await r.json().catch(() => ({}))
  if (!r.ok || !d.access_token) throw new Error('refresh_failed')
  return { access_token: d.access_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000 }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
  const sess = readSession(req)
  const g = sess.google
  if (!g || !g.connected || !g.access_token) return json(res, 401, { error: 'google_not_connected', hint: 'Connect Google in Integrations first.' })

  // Refresh the access token when it's expired or about to (60s slack).
  let cookieOut = null
  if (g.expires_at && Date.now() > g.expires_at - 60000) {
    try {
      const t = await refreshGoogle(g)
      sess.google = { ...g, ...t }
      cookieOut = sessionCookie(sess)
    } catch (e) {
      return json(res, 401, { error: 'google_reconnect', hint: 'Google session expired — reconnect in Integrations.' })
    }
  }
  const token = sess.google.access_token
  const gfetch = async (url, opts = {}) => {
    const r = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(opts.headers || {}) } })
    const data = await r.json().catch(() => ({}))
    return { ok: r.ok, status: r.status, data }
  }
  const send = (status, obj) => { if (cookieOut) res.setHeader('Set-Cookie', cookieOut); return json(res, status, obj) }

  const body = readBody(req)
  const action = body.action
  let spreadsheetId = typeof body.spreadsheetId === 'string' ? body.spreadsheetId.slice(0, 128) : ''

  try {
    if (action === 'push') {
      const rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS) : null
      if (!rows || !rows.length) return send(400, { error: 'no_rows' })

      // Verify the known spreadsheet still exists. Recreate ONLY on a real 404
      // (deleted) — a transient 429/5xx must not orphan the operator's sheet.
      if (spreadsheetId) {
        const v = await gfetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,sheets(properties(title))`)
        if (v.ok) {
          // Re-add the TimeLogs tab if it was renamed/deleted in the sheet UI.
          const titles = ((v.data.sheets || []).map((sh) => sh.properties && sh.properties.title)).filter(Boolean)
          if (!titles.includes(TAB)) {
            const add = await gfetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
              method: 'POST',
              body: JSON.stringify({ requests: [{ addSheet: { properties: { title: TAB, gridProperties: { frozenRowCount: 1 } } } }] }),
            })
            if (!add.ok) return send(502, { error: 'tab_create_failed', detail: (add.data.error && add.data.error.message) || '' })
          }
        } else if (v.status === 404) {
          spreadsheetId = ''
        } else {
          return send(502, { error: 'verify_failed', detail: (v.data.error && v.data.error.message) || String(v.status) })
        }
      }
      if (!spreadsheetId) {
        const c = await gfetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          body: JSON.stringify({ properties: { title: SHEET_TITLE, locale: 'en_US' }, sheets: [{ properties: { title: TAB, gridProperties: { frozenRowCount: 1 } } }] }),
        })
        if (!c.ok) return send(502, { error: 'create_failed', detail: (c.data.error && c.data.error.message) || '' })
        spreadsheetId = c.data.spreadsheetId
      }
      const clear = await gfetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${TAB}!A:Z:clear`, { method: 'POST', body: '{}' })
      if (!clear.ok) return send(502, { error: 'clear_failed', detail: (clear.data.error && clear.data.error.message) || '' })
      const up = await gfetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${TAB}!A1?valueInputOption=RAW`, {
        method: 'PUT',
        body: JSON.stringify({ values: rows }),
      })
      if (!up.ok) return send(502, { error: 'write_failed', detail: (up.data.error && up.data.error.message) || '' })
      return send(200, { ok: true, spreadsheetId, url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`, count: rows.length - 1 })
    }

    if (action === 'pull') {
      if (!spreadsheetId) return send(400, { error: 'no_spreadsheet' })
      const r = await gfetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${TAB}!A1:N${MAX_ROWS}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`)
      if (!r.ok) return send(r.status === 404 ? 404 : 502, { error: 'read_failed', detail: (r.data.error && r.data.error.message) || '' })
      return send(200, { ok: true, spreadsheetId, values: r.data.values || [] })
    }

    return send(400, { error: 'unknown_action' })
  } catch (e) {
    return send(502, { error: 'sheets_request_failed' })
  }
}
