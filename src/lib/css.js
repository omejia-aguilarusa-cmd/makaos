// css() — parse an inline CSS string into a React style object.
//
// The Maka OS screens are ported close to 1:1 from the source design, which
// uses inline `style="..."` strings everywhere. Rather than hand-convert every
// declaration to camelCase (and risk drift), we keep the original CSS strings
// verbatim and parse them at render time. Mirrors the dc-runtime's cssToObj so
// behaviour matches the original exactly.

const kebabToCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

const cache = new Map()

export function css(str) {
  if (str == null) return undefined
  if (typeof str !== 'string') return str // already an object
  const hit = cache.get(str)
  if (hit) return hit
  const o = {}
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':')
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    if (!prop) continue
    const val = decl.slice(i + 1).trim()
    // Custom properties (CSS variables) must keep their literal name.
    o[prop.startsWith('--') ? prop : kebabToCamel(prop)] = val
  }
  cache.set(str, o)
  return o
}
