import crypto from 'node:crypto'

// Encrypted, signed, httpOnly session cookie holding per-provider OAuth tokens.
// Keyed by SESSION_SECRET (set in Vercel). Tokens live only in the operator's
// browser cookie — there is no shared token store.

const NAME = 'maka_sess'
const keyBuf = () => crypto.createHash('sha256').update(process.env.SESSION_SECRET || 'maka-os-insecure-dev-secret').digest()

export function readSession(req) {
  try {
    const raw = (req.cookies && req.cookies[NAME]) || ''
    if (!raw) return {}
    const [iv, tag, data] = raw.split('.').map((x) => Buffer.from(x, 'base64url'))
    const d = crypto.createDecipheriv('aes-256-gcm', keyBuf(), iv)
    d.setAuthTag(tag)
    return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString('utf8'))
  } catch (e) {
    return {}
  }
}

export function sessionCookie(obj) {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', keyBuf(), iv)
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()])
  const val = [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
  return cookie(NAME, val, 60 * 60 * 24 * 30)
}

export function cookie(name, val, maxAge) {
  return `${name}=${val}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}
