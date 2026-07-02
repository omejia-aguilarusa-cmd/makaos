import { filterEntries, employeeById, jobSites, money, fmtDate, META } from './macPayroll.js'
import { needsReview, changeOrders, expenses, allSiteSchedules, editsVersion } from './edits.js'

// Real, actionable notifications for the topbar bell — computed from the live
// dataset + edit overlay, never invented. Each alert routes to the screen where
// it can be acted on. Version-cached like the other derived aggregates.

let _cache = null

export function buildAlerts() {
  const v = editsVersion()
  if (_cache && _cache.v === v) return _cache.alerts
  const alerts = []

  // 1. Time-log entries flagged for review (odd hours, negatives, missing data).
  let review = 0
  for (const e of filterEntries('both', META.dateMin, META.dateMax)) {
    if (needsReview(e, (employeeById(e.empId) || {}).payType)) review++
  }
  if (review > 0) alerts.push({ id: 'review', tone: 'amber', view: 'time-logs', text: review + ' time log' + (review === 1 ? '' : 's') + ' need review', sub: 'Odd hours, negative amounts or missing data' })

  // 2. Pending change orders (unapproved revenue sitting idle).
  const pend = changeOrders().filter((c) => c.status === 'pending')
  if (pend.length > 0) {
    const amt = pend.reduce((s, c) => s + c.amount, 0)
    alerts.push({ id: 'cos', tone: 'blue', view: 'change-orders', text: pend.length + ' change order' + (pend.length === 1 ? '' : 's') + ' awaiting approval', sub: money(amt) + ' in pending revenue' })
  }

  // 3. Unpaid expenses.
  const unpaid = expenses().filter((e) => e.status !== 'paid')
  if (unpaid.length > 0) {
    const amt = unpaid.reduce((s, e) => s + e.amount, 0)
    alerts.push({ id: 'exp', tone: 'amber', view: 'expenses', text: unpaid.length + ' unpaid expense' + (unpaid.length === 1 ? '' : 's'), sub: money(amt) + ' outstanding' })
  }

  // 4. Deadlines: planned deadlines that are overdue or due within 7 days.
  const today = new Date().toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const sched = allSiteSchedules()
  const dueKeys = Object.entries(sched).filter(([, sc]) => sc && sc.deadline && sc.deadline <= in7)
  if (dueKeys.length > 0) {
    const names = new Map(jobSites('both', META.dateMin, META.dateMax, {}).rows.map((r) => [r.key, r.name]))
    for (const [key, sc] of dueKeys.slice(0, 5)) {
      const name = names.get(key) || key
      const overdue = sc.deadline < today
      alerts.push({
        id: 'dl-' + key, tone: overdue ? 'red' : 'amber', view: 'schedule',
        text: (overdue ? 'Overdue: ' : 'Deadline soon: ') + name,
        sub: 'Deadline ' + fmtDate(sc.deadline) + (overdue ? ' — passed' : ''),
      })
    }
  }

  _cache = { v, alerts }
  return alerts
}
