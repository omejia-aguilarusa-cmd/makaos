// Tiny response helpers for the Vercel Node serverless functions.

export function json(res, status, obj) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(obj))
}

export function redirect(res, url) {
  res.statusCode = 302
  res.setHeader('Location', url)
  res.end()
}

// Read a named cookie from the request (Vercel populates req.cookies; fall back
// to parsing the header for other runtimes / local dev).
export function getCookie(req, name) {
  if (req.cookies && req.cookies[name] != null) return req.cookies[name]
  const header = req.headers && req.headers.cookie
  if (!header) return ''
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1))
  }
  return ''
}

export function readBody(req) {
  let b = req.body
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch (e) { b = {} } }
  return b || {}
}
