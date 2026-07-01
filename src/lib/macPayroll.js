// Shared aggregation for the imported Mac Painters payroll. Both the Mac
// Painters roster screen and the Payroll screen compute from this, so a team +
// date-range selection produces the same accurate numbers everywhere.
import { MAC_PAINTERS } from './macPainters.js'
import { applyEntryEdit, editsVersion, addedEntries } from './edits.js'

export const META = MAC_PAINTERS.meta
export const TEAMS = ['both', 'darwin', 'mauricio']
export const TEAM_LABEL = { both: 'Both teams', darwin: 'Darwin', mauricio: 'Mauricio' }
export const TEAM_COLOR = { darwin: 'blue', mauricio: 'cyan' }

const EMP_BY_ID = Object.fromEntries(MAC_PAINTERS.employees.map((e) => [e.id, e]))
export const employeeById = (id) => EMP_BY_ID[id]

// Employees for the "add time log" picker (keeps manual entries tied to the
// real roster so they aggregate everywhere).
export function employeeOptions() {
  return MAC_PAINTERS.employees
    .map((e) => ({ id: e.id, name: e.name, team: (e.teams || [])[0] || 'darwin' }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Base entries tagged with a CONTENT-derived stable id (not the array index),
// so a saved edit stays attached to the same real row even if the dataset is
// regenerated/reordered. Exact duplicates get an occurrence suffix.
const _idSeen = {}
const _c = (n) => Math.round((n || 0) * 100)
const BASE_ENTRIES = MAC_PAINTERS.entries.map((e) => {
  // Include every content field (financials + notes) so genuinely-distinct rows
  // that share date/person/hours/site get distinct, deterministic keys — only
  // truly identical rows fall back to an occurrence suffix.
  const base = `${e.date}#${e.empId}#${e.team}#${e.hours}#${_c(e.subtotal)}#${_c(e.addition)}#${_c(e.deduction)}#${_c(e.total)}#${e.location || ''}#${e.notes || ''}`
  _idSeen[base] = (_idSeen[base] || 0) + 1
  return { ...e, _id: _idSeen[base] > 1 ? `${base}#${_idSeen[base]}` : base }
})
let _entriesCache = null
// Base entries with the local edit overlay applied — recomputed only when an
// edit is saved. Every filter/aggregation reads this, so edits propagate to
// Payroll, Projects, Schedule and Time Logs from one place.
function allEntries() {
  const v = editsVersion()
  if (!_entriesCache || _entriesCache.v !== v) _entriesCache = { v, entries: BASE_ENTRIES.concat(addedEntries()).map(applyEntryEdit) }
  return _entriesCache.entries
}

export function filterEntries(team, from, to) {
  return allEntries().filter((e) => (team === 'both' || e.team === team) && e.date >= from && e.date <= to)
}

// Estimated gross wages for a selection window.
//  Hourly  -> hours × rate
//  Per Day -> days worked × day rate
//  Fixed / Contract -> the amount actually recorded (rate is per-period, can't
//                      be prorated to an arbitrary window)
export function estWages(emp, agg) {
  if (emp.payType === 'Hourly' && emp.rate) return agg.hours * emp.rate
  if (emp.payType === 'Per Day' && emp.rate) return agg.days * emp.rate
  return agg.total
}

// Wage crew (paid by labor) vs contract/subcontractor billing (whole-job
// values logged under a person). Keeps job billing from inflating wage totals.
export const isContract = (emp) => emp.payType === 'Contract'
export const CATEGORIES = ['all', 'wage', 'contract']
export const CATEGORY_LABEL = { all: 'All', wage: 'Wages', contract: 'Contract billing' }

// Aggregate per employee for (team, from, to). Returns { rows, totals }.
export function payroll(team, from, to, { q = '', activeOnly = false, category = 'all' } = {}) {
  const byEmp = {}
  for (const e of filterEntries(team, from, to)) {
    const a = byEmp[e.empId] || (byEmp[e.empId] = { hours: 0, subtotal: 0, addition: 0, deduction: 0, total: 0, n: 0, teams: new Set(), days: new Set(), last: '' })
    a.hours += e.hours; a.subtotal += e.subtotal; a.addition += e.addition; a.deduction += e.deduction; a.total += e.total; a.n += 1
    a.teams.add(e.team); if (e.hours > 0) a.days.add(e.date); if (e.date > a.last) a.last = e.date
  }
  const ql = q.trim().toLowerCase()
  let rows = Object.entries(byEmp).map(([id, a]) => {
    const emp = EMP_BY_ID[id] || { id, name: id, payType: '?', rate: null, role: '', status: 'Active', variants: [], teams: [] }
    const agg = { ...a, days: a.days.size, teams: [...a.teams].sort() }
    const est = estWages(emp, agg)
    const net = agg.total // recorded/edited net, so it matches the entries and receipts
    const contract = isContract(emp)
    return { ...emp, teamsIn: agg.teams, hours: agg.hours, days: agg.days, subtotal: agg.subtotal, addition: agg.addition, deduction: agg.deduction, total: agg.total, est, net, n: agg.n, last: agg.last, category: contract ? 'contract' : 'wage', value: contract ? agg.total : est }
  })
  if (ql) rows = rows.filter((r) => r.name.toLowerCase().includes(ql) || (r.variants || []).some((v) => v.toLowerCase().includes(ql)))
  if (activeOnly) rows = rows.filter((r) => r.status !== 'Inactive')
  if (category !== 'all') rows = rows.filter((r) => r.category === category)
  const totals = rows.reduce((t, r) => { for (const k of ['hours', 'subtotal', 'addition', 'deduction', 'total', 'est', 'net', 'n']) t[k] += r[k]; return t }, { hours: 0, subtotal: 0, addition: 0, deduction: 0, total: 0, est: 0, net: 0, n: 0 })
  totals.shared = rows.filter((r) => r.teamsIn.length > 1).length
  totals.wages = rows.filter((r) => r.category === 'wage').reduce((s, r) => s + r.est, 0)
  totals.billing = rows.filter((r) => r.category === 'contract').reduce((s, r) => s + r.total, 0)
  return { rows, totals }
}

export function employeeEntries(empId, team, from, to) {
  return filterEntries(team, from, to).filter((e) => e.empId === empId).sort((a, b) => (a.date < b.date ? 1 : -1))
}

export const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US')
export const fmtH = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US') + 'h'
export const fmtDate = (s) => { const [y, m, d] = (s || '').split('-'); return s ? `${m}/${d}/${y.slice(2)}` : '—' }

// ---------------------------------------------------------------------------
// Job sites ("Projects") — derived from the real `location` on each payroll
// entry. There is no separate project dataset (no contracts, budgets, or
// margins exist in the books), so a "project" here is a job site with the work
// actually logged against it: hours, recorded wages/contract $, the crew, the
// teams, and the date span. Nothing is invented.
// ---------------------------------------------------------------------------

// The location field is hand-entered. `normalizeSite` is the light display
// form: drop a trailing parenthetical note, unify bullet separators and comma
// spacing, collapse whitespace, and trim.
export function normalizeSite(loc) {
  return (loc || '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[•·]/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/[\s,]+$/, '')
    .trim()
}

const STREET_TYPE = {
  st: 'st', street: 'st', dr: 'dr', drive: 'dr', rd: 'rd', road: 'rd',
  ave: 'ave', av: 'ave', avenue: 'ave', ln: 'ln', lane: 'ln',
  blvd: 'blvd', boulevard: 'blvd', ct: 'ct', court: 'ct',
  cir: 'cir', circle: 'cir', pkwy: 'pkwy', parkway: 'pkwy',
  pl: 'pl', place: 'pl', ter: 'ter', terrace: 'ter',
  hwy: 'hwy', highway: 'hwy', way: 'way', cv: 'cv', cove: 'cv', round: 'round',
}

// Hand-confirmed merges for obvious typo/spelling clusters of a single job site
// that the deterministic key can't safely catch — the job-site analogue of the
// painter name-variant merge. Each maps a canonical key to its canonical site.
const SITE_ALIASES = {
  // Cabanas Orangeburg — spelling/typo variants of one site.
  'cabanas orangeburge': 'cabanas orangeburg',
  'cabanas orangburg': 'cabanas orangeburg',
  'cabanas orangebur': 'cabanas orangeburg',
  'cabanas de orangeburg': 'cabanas orangeburg',
  // 432 Delmont Dr — Rd/Dr and city-suffixed variants.
  '432 delmont rd': '432 delmont dr',
  '432 delmont dr goose creek': '432 delmont dr',
  // 713 Leafwood Rd, Charleston — with/without city, abbreviations, "II".
  '713 leafwood rd': '713 leafwood rd charleston',
  '713 leafwood ii': '713 leafwood rd charleston',
  '713 leafwood': '713 leafwood rd charleston',
  // 3527 Stockton Dr, Mount Pleasant — city present/absent/misspelled.
  '3527 stockton dr mt pleasent': '3527 stockton dr',
  '3527 stockton dr mountpleasent': '3527 stockton dr',
  // 220 Fountain Lake Dr, Eutawville.
  '220 fountain lake dr eutawville': '220 fountain lake dr',
  // 403 W Ashley Ave, Folly Beach — "West Ashley" / abbreviations.
  '403 w ashley ave folly beach': '403 w ashley ave',
  '403 west ashley folly beach': '403 w ashley ave',
  // 1681 Garden St — with/without "St".
  '1681 garden': '1681 garden st',
  // 520 E Hudson Ave, Folly Beach — abbreviations / missing city.
  '520 e hudson ave': '520 e hudson ave folly beach',
  '520 e hudson': '520 e hudson ave folly beach',
  '520 hudson ave': '520 e hudson ave folly beach',
}

// Canonical grouping key. Lowercase + strip diacritics, collapse "Dr/Rd"-style
// alternate street suffixes, strip a trailing ZIP / state / country, normalize
// street-type abbreviations (Dr/Drive, Rd/Road, …), and collapse repeated
// tokens. The house number, street name AND city stay in the key, so it merges
// casing/spacing/abbreviation/ZIP variants of one address without ever merging
// genuinely different addresses. It does NOT merge a site that is sometimes
// written with a city and sometimes without (or with a misspelled city) — those
// residual cases are handled explicitly by SITE_ALIASES, never guessed.
function siteKeyOf(loc) {
  let s = normalizeSite(loc).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  // "432 Delmont Dr/Rd" → drop the alternate suffix; other slashes → spaces.
  s = s.replace(/\b([a-z]+)\/([a-z]+)\b/g, (m, a, b) => (STREET_TYPE[a] && STREET_TYPE[b] ? a : m)).replace(/\//g, ' ')
  for (let i = 0; i < 5; i++) {
    const before = s
    s = s.replace(/[\s,]+\d{4,5}\s*$/, '')                                           // trailing ZIP
    s = s.replace(/[\s,]+(south carolina|north carolina|georgia|sc|nc|ga)\s*$/, '')  // trailing state
    s = s.replace(/[\s,]+(usa|united states)\s*$/, '')                               // trailing country
    if (s === before) break
  }
  const out = []
  for (const raw of s.split(/[^a-z0-9]+/)) {
    if (!raw) continue
    const t = STREET_TYPE[raw] || raw
    if (out[out.length - 1] === t) continue   // collapse a repeated token ("charleston charleston")
    out.push(t)
  }
  const key = out.join(' ').trim()
  return SITE_ALIASES[key] || key
}

// Aggregate entries into job sites for (team, from, to). `category` ('all' |
// 'wage' | 'contract') filters which entries are counted. Returns { rows,
// totals }. "Wages" = recorded $ on wage-crew entries; "contract" = recorded $
// on subcontractor entries — the same split used across the app.
export function jobSites(team, from, to, { q = '', category = 'all' } = {}) {
  const by = {}
  for (const e of filterEntries(team, from, to)) {
    if (!e.location) continue
    const key = siteKeyOf(e.location)
    if (!key) continue
    const emp = EMP_BY_ID[e.empId]
    const cat = emp && isContract(emp) ? 'contract' : 'wage'
    if (category !== 'all' && cat !== category) continue
    const a = by[key] || (by[key] = { key, hours: 0, total: 0, wages: 0, billing: 0, n: 0, emps: new Set(), teams: new Set(), first: '', last: '', names: {} })
    a.hours += e.hours; a.total += e.total; a.n += 1
    if (cat === 'contract') a.billing += e.total; else a.wages += e.total
    a.emps.add(e.empId); a.teams.add(e.team)
    if (!a.first || e.date < a.first) a.first = e.date
    if (e.date > a.last) a.last = e.date
    a.names[e.location] = (a.names[e.location] || 0) + 1
  }
  const ql = q.trim().toLowerCase()
  let rows = Object.values(by).map((a) => {
    // Display the most-logged original spelling (ties → the longest, usually
    // the most complete address).
    const name = Object.entries(a.names).sort((x, y) => y[1] - x[1] || y[0].length - x[0].length)[0][0]
    return { key: a.key, name, hours: a.hours, total: a.total, wages: a.wages, billing: a.billing, n: a.n, painters: a.emps.size, teamsIn: [...a.teams].sort(), first: a.first, last: a.last }
  })
  if (ql) rows = rows.filter((r) => r.name.toLowerCase().includes(ql))
  const totals = rows.reduce((t, r) => { t.hours += r.hours; t.total += r.total; t.wages += r.wages; t.billing += r.billing; t.n += r.n; return t }, { hours: 0, total: 0, wages: 0, billing: 0, n: 0 })
  totals.sites = rows.length
  const allEmps = new Set()
  for (const r of rows) for (const id of by[r.key].emps) allEmps.add(id)
  totals.painters = allEmps.size
  return { rows, totals }
}

// Every entry logged against one job site (by normalized key), newest first,
// each carrying the painter's display name. `category` ('all' | 'wage' |
// 'contract') matches jobSites so the drawer's entries agree with its tiles.
export function siteEntries(siteKey, team, from, to, category = 'all') {
  return filterEntries(team, from, to)
    .filter((e) => {
      if (!e.location || siteKeyOf(e.location) !== siteKey) return false
      if (category === 'all') return true
      const emp = EMP_BY_ID[e.empId]
      return (emp && isContract(emp) ? 'contract' : 'wage') === category
    })
    .map((e) => ({ ...e, name: (EMP_BY_ID[e.empId] || {}).name || e.empId }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.name.localeCompare(b.name)))
}

// Distinct job-site count over the full window (for the sidebar badge), and how
// many entries carry no site at all (surfaced so the count is honest).
// Live (edit-aware, version-cached) counts, so the sidebar badge and the
// Projects note stay accurate after location edits change the site set.
let _siteCountCache = null
export function siteCount() {
  const v = editsVersion()
  if (!_siteCountCache || _siteCountCache.v !== v) _siteCountCache = { v, n: jobSites('both', META.dateMin, META.dateMax, {}).rows.length }
  return _siteCountCache.n
}
let _noSiteCache = null
export function entriesWithoutSite() {
  const v = editsVersion()
  if (!_noSiteCache || _noSiteCache.v !== v) _noSiteCache = { v, n: allEntries().filter((e) => !e.location).length }
  return _noSiteCache.n
}

// Distinct job-site display names for the Payroll location dropdown, so an
// edited location snaps onto an existing Project site (keeps the two in sync).
export function siteOptions() {
  return jobSites('both', META.dateMin, META.dateMax, {}).rows.map((r) => r.name).sort((a, b) => a.localeCompare(b))
}
