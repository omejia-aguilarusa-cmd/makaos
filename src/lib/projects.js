// Project model for Maka OS — the finance-aware "Projects" layer the operator
// sees in the card grid, project drawer, Reports, Change orders and Expenses.
//
// A project is a REAL job site (derived from payroll `location`, via macPayroll)
// enriched with operator-entered data from the edit overlay:
//   • recorded LABOR cost + hours + crew + dates  → real, from payroll
//   • contract value, client, status, % complete   → operator meta (edits.js)
//   • change orders (added revenue + cost)          → operator records
//   • expenses (materials/other cost)               → operator records
// Nothing is fabricated: a fresh install shows real hours/labor and empty
// revenue until the operator fills in a contract, change orders and expenses.
// Revenue / Profit / Margin are then derived from those inputs.

import { jobSites, siteEntries, employeeById, siteKeyOf, META } from './macPayroll.js'
import { allProjectMeta, changeOrders, expenses, crewOf } from './edits.js'

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const dayDiff = (a, b) => (Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00')) / 86400000

// ---------------------------------------------------------------------------
// Crews (Crew A / B / C in the sidebar). Default is derived from the painter's
// team; the operator can reassign via the overlay.
//   A = Darwin's crew · B = Mauricio's crew · C = shared / floaters (both)
// ---------------------------------------------------------------------------
export const CREWS = [
  { id: 'A', name: 'Crew A', sub: 'Darwin', color: '#2f82ff' },
  { id: 'B', name: 'Crew B', sub: 'Mauricio', color: '#18d6e8' },
  { id: 'C', name: 'Crew C', sub: 'Shared / floaters', color: '#a855f7' },
]
const CREW_BY_ID = Object.fromEntries(CREWS.map((c) => [c.id, c]))
export function defaultCrew(emp) {
  const teams = (emp && emp.teams) || []
  if (teams.length > 1) return 'C'
  if (teams[0] === 'mauricio') return 'B'
  return 'A'
}
export function crewFor(empId) {
  const emp = employeeById(empId)
  return crewOf(empId) || defaultCrew(emp || {})
}
export const crewName = (id) => (CREW_BY_ID[id] || { name: id }).name
export const crewColor = (id) => (CREW_BY_ID[id] || { color: 'var(--faint)' }).color

// ---------------------------------------------------------------------------
// Status vocabulary. Default status is derived from recency of logged work;
// the operator can override to any value (incl. Lead / On hold).
// ---------------------------------------------------------------------------
export const PROJECT_STATUS = {
  active: { label: 'In progress', color: 'blue' },
  hold: { label: 'On hold', color: 'amber' },
  done: { label: 'Completed', color: 'green' },
  lead: { label: 'Lead', color: 'purple' },
}
export const STATUS_TABS = ['all', 'active', 'hold', 'done', 'lead']
export const STATUS_TAB_LABEL = { all: 'All', active: 'In progress', hold: 'On hold', done: 'Completed', lead: 'Leads' }
export const statusLabel = (s) => (PROJECT_STATUS[s] || PROJECT_STATUS.active).label
export const statusColor = (s) => (PROJECT_STATUS[s] || PROJECT_STATUS.active).color

// A site is "in progress" if it logged work within ~3 weeks of the dataset's
// most recent date; otherwise it reads as completed. Purely date-derived.
function deriveStatus(last) {
  if (!last) return 'lead'
  return dayDiff(last, META.dateMax) <= 21 ? 'active' : 'done'
}

// Stable accent color per project (visual variety on the cards / swatches).
const PALETTE = ['#2f82ff', '#18d6e8', '#a855f7', '#20e070', '#ffac18', '#ff6b6b', '#65a8ff', '#f59e0b']
export function colorForKey(key) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function splitAddress(name) {
  const parts = (name || '').split(',')
  return { address: (parts[0] || name || '').trim(), city: parts.slice(1).join(',').trim() }
}

// Aggregate the operator's change orders / expenses by project key.
function coByKey() {
  const by = {}
  for (const c of changeOrders()) {
    const a = by[c.projectKey] || (by[c.projectKey] = { approvedAmt: 0, approvedCost: 0, pendingAmt: 0, count: 0, list: [] })
    a.count += 1; a.list.push(c)
    if (c.status === 'approved') { a.approvedAmt += c.amount; a.approvedCost += c.cost }
    else if (c.status === 'pending') a.pendingAmt += c.amount
  }
  return by
}
function expByKey() {
  const by = {}
  for (const e of expenses()) {
    const a = by[e.projectKey] || (by[e.projectKey] = { total: 0, unpaid: 0, count: 0, list: [] })
    a.count += 1; a.total += e.amount; a.list.push(e)
    if (e.status !== 'paid') a.unpaid += e.amount
  }
  return by
}

// Derive % complete: operator override → status floor/ceiling → time progress
// across the planned/logged span (real dates, clearly an estimate).
function derivePercent(meta, status, first, last) {
  if (meta && meta.percent != null) return clamp(Math.round(meta.percent), 0, 100)
  if (status === 'done') return 100
  if (status === 'lead') return 0
  if (!first || !last) return 0
  const span = dayDiff(first, last)
  const elapsed = dayDiff(first, META.dateMax)
  if (span <= 0) return 60
  return clamp(Math.round((elapsed / (span + 7)) * 100), 8, 96)
}

// Build one project object from a real site row (or an overlay-only lead).
function buildProject(row, meta, co, exp) {
  const key = row.key
  const { address, city } = splitAddress(row.name)
  const status = (meta && meta.status) || deriveStatus(row.last)
  const laborCost = round2(row.total)                 // recorded wages + subcontractor billing
  const materials = round2(exp ? exp.total : 0)
  const coAmt = round2(co ? co.approvedAmt : 0)
  const coCost = round2(co ? co.approvedCost : 0)
  const contract = round2((meta && meta.contract) || 0)
  const revenue = round2(contract + coAmt)
  const cost = round2(laborCost + materials + coCost)
  const profit = round2(revenue - cost)
  const margin = revenue > 0 ? profit / revenue : null
  const percent = derivePercent(meta, status, row.first, row.last)
  return {
    key, name: row.name, address, city, color: colorForKey(key),
    status, statusLabel: statusLabel(status), statusColor: statusColor(status),
    hours: row.hours, painters: row.painters, n: row.n, teamsIn: row.teamsIn || [],
    first: row.first, last: row.last,
    laborCost, materials, coApprovedAmt: coAmt, coApprovedCost: coCost,
    coPendingAmt: round2(co ? co.pendingAmt : 0), coCount: co ? co.count : 0, expCount: exp ? exp.count : 0,
    contract, revenue, cost, profit, margin, percent,
    hasFinance: revenue > 0,
    clientName: (meta && meta.clientName) || '', clientEmail: (meta && meta.clientEmail) || '',
    overlayOnly: !!(meta && meta.overlayOnly),
  }
}

// The project list for (team, from, to). Real sites first, then any overlay-only
// projects (leads created before any hours are logged). Filter by status/search.
export function projectList(team, from, to, { q = '', status = 'all' } = {}) {
  const { rows } = jobSites(team, from, to, { q })
  const metas = allProjectMeta()
  const co = coByKey()
  const exp = expByKey()
  const seen = new Set()
  let out = rows.map((r) => { seen.add(r.key); return buildProject(r, metas[r.key], co[r.key], exp[r.key]) })

  // Overlay-only projects: meta rows with a name that don't correspond to a real
  // logged site (only when the team filter would include them).
  for (const [key, m] of Object.entries(metas)) {
    if (seen.has(key) || !m || !m.name) continue
    if (team !== 'both' && m.team && m.team !== team) continue
    const ql = q.trim().toLowerCase()
    if (ql && !m.name.toLowerCase().includes(ql)) continue
    const row = { key, name: m.name, hours: 0, total: 0, wages: 0, billing: 0, n: 0, painters: 0, teamsIn: m.team ? [m.team] : [], first: '', last: '' }
    out.push(buildProject(row, { ...m, overlayOnly: true }, co[key], exp[key]))
  }

  if (status !== 'all') out = out.filter((p) => p.status === status)

  const totals = out.reduce((t, p) => {
    t.revenue += p.revenue; t.cost += p.cost; t.profit += p.profit
    t.laborCost += p.laborCost; t.materials += p.materials; t.hours += p.hours
    return t
  }, { revenue: 0, cost: 0, profit: 0, laborCost: 0, materials: 0, hours: 0 })
  totals.count = out.length
  totals.margin = totals.revenue > 0 ? totals.profit / totals.revenue : null
  totals.active = out.filter((p) => p.status === 'active').length
  return { rows: out, totals }
}

// Full detail for one project (drawer). Combines the project summary with a
// per-painter labor breakdown, the change-order + expense lists, a synthesized
// activity feed, a P&L breakdown, health bars and a completion forecast.
export function projectDetail(key, team, from, to) {
  const list = projectList(team, from, to, {})
  const p = list.rows.find((r) => r.key === key)
  if (!p) return null

  // Per-painter labor breakdown from the real entries logged against this site.
  const byEmp = {}
  for (const e of siteEntries(key, team, from, to)) {
    const a = byEmp[e.empId] || (byEmp[e.empId] = { empId: e.empId, name: e.name, hours: 0, cost: 0, first: '', last: '' })
    a.hours += e.hours; a.cost += e.total
    if (!a.first || e.date < a.first) a.first = e.date
    if (e.date > a.last) a.last = e.date
  }
  const painters = Object.values(byEmp)
    .map((a) => ({ ...a, hours: round2(a.hours), cost: round2(a.cost), crew: crewName(crewFor(a.empId)) }))
    .sort((x, y) => y.hours - x.hours)

  const cos = changeOrders().filter((c) => c.projectKey === key).sort((a, b) => (a.date < b.date ? 1 : -1))
  const exps = expenses().filter((e) => e.projectKey === key).sort((a, b) => (a.date < b.date ? 1 : -1))

  // P&L breakdown (real labor + operator materials/CO).
  const otherCost = round2(p.coApprovedCost)
  const pnl = {
    revenue: p.revenue, contract: p.contract, coApproved: p.coApprovedAmt, coPending: p.coPendingAmt,
    labor: p.laborCost, materials: p.materials, other: otherCost, cost: p.cost, profit: p.profit, margin: p.margin,
  }

  // Completion forecast: extrapolate current cost to 100% by % complete.
  let forecastProfit = p.profit
  if (p.percent > 0 && p.percent < 100 && p.revenue > 0) {
    const forecastCost = round2(p.cost / (p.percent / 100))
    forecastProfit = round2(p.revenue - forecastCost)
  }

  // Health bars (0..1 fill + label). Real where possible.
  const budgetUsed = p.revenue > 0 ? p.cost / p.revenue : null
  const health = [
    {
      label: 'Budget used',
      valText: budgetUsed == null ? '—' : Math.round(budgetUsed * 100) + '%',
      fill: budgetUsed == null ? 0 : clamp(budgetUsed, 0, 1),
      tone: budgetUsed == null ? 'muted' : budgetUsed >= 1 ? 'red' : budgetUsed >= 0.85 ? 'amber' : 'green',
    },
    {
      label: 'Timeline', valText: p.percent + '%', fill: clamp(p.percent / 100, 0, 1),
      tone: p.percent >= 100 ? 'green' : 'blue',
    },
    {
      label: 'Margin',
      valText: p.margin == null ? '—' : (p.margin >= 0 ? '+' : '') + Math.round(p.margin * 100) + '%',
      fill: p.margin == null ? 0 : clamp((p.margin + 0.2) / 0.6, 0, 1),
      tone: p.margin == null ? 'muted' : p.margin < 0 ? 'red' : p.margin < 0.1 ? 'amber' : 'green',
    },
    {
      label: 'Change orders', valText: String(p.coCount), fill: clamp(p.coCount / 5, 0, 1), tone: 'blue',
    },
  ]

  // Activity feed: real events, newest first.
  const activity = []
  for (const c of cos.slice(0, 4)) activity.push({ time: c.date, text: `Change order ${c.status}: ${c.title} (${c.amount >= 0 ? '$' + Math.round(c.amount) : ''})` })
  for (const e of exps.slice(0, 4)) activity.push({ time: e.date, text: `Expense — ${e.title} · ${e.vendor || e.category} ($${Math.round(e.amount)})` })
  for (const e of siteEntries(key, team, from, to).slice(0, 6)) activity.push({ time: e.date, text: `${e.name} logged ${e.hours ? e.hours + 'h' : (e.total ? '$' + Math.round(e.total) : 'work')}` })
  activity.sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0))

  return { p, painters, cos, exps, pnl, health, forecastProfit, activity: activity.slice(0, 12) }
}

// Options for project pickers (name + key), across the full window.
export function projectOptions() {
  return projectList('both', META.dateMin, META.dateMax, {}).rows
    .map((p) => ({ key: p.key, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Make a canonical key from a typed project name (for operator-created leads).
export const keyFromName = (name) => siteKeyOf(name) || (name || '').trim().toLowerCase()
