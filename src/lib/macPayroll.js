// Shared aggregation for the imported Mac Painters payroll. Both the Mac
// Painters roster screen and the Payroll screen compute from this, so a team +
// date-range selection produces the same accurate numbers everywhere.
import { MAC_PAINTERS } from './macPainters.js'

export const META = MAC_PAINTERS.meta
export const TEAMS = ['both', 'darwin', 'mauricio']
export const TEAM_LABEL = { both: 'Both teams', darwin: 'Darwin', mauricio: 'Mauricio' }
export const TEAM_COLOR = { darwin: 'blue', mauricio: 'cyan' }

const EMP_BY_ID = Object.fromEntries(MAC_PAINTERS.employees.map((e) => [e.id, e]))
export const employeeById = (id) => EMP_BY_ID[id]

export function filterEntries(team, from, to) {
  return MAC_PAINTERS.entries.filter((e) => (team === 'both' || e.team === team) && e.date >= from && e.date <= to)
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
    const net = agg.subtotal + agg.addition - agg.deduction
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
