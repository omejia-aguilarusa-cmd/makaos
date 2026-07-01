import { useSyncExternalStore } from 'react'

// Local edit overlay for Maka OS (browser-persisted, no backend).
//
// The base dataset (macPainters.js) is generated and immutable. Everything the
// operator changes lives here in localStorage with an audit trail (who + when),
// layered onto the data at read time by macPayroll so a single edit flows to
// Payroll, Projects, Schedule and Time Logs. This module stores:
//   entries[id]  — field overrides on an existing/added entry
//   added[]      — manually added time-log entries
//   schedule[k]  — planned start/deadline/order per job site (for the Gantt)
// Nothing leaves the device.

const KEY = 'makaos.edits.v1'

// The operator making edits (shown as "saved by"). Matches the sidebar footer.
export const CURRENT_USER = { name: 'Oscar Mejia', role: 'Business Manager' }

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const nowISO = () => new Date().toISOString()

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY)) || {}
    return {
      entries: s.entries || {},
      added: Array.isArray(s.added) ? s.added : [],
      schedule: s.schedule || {},
      seq: s.seq || 0,
      // Project cards (Projects/Reports): operator-entered contract, client,
      // status and % complete layered onto a real job site (keyed by site key).
      projects: s.projects || {},
      // Standalone change-order and expense records the operator adds. These are
      // the ONLY source of revenue/materials beyond the recorded labor — nothing
      // is seeded, so a fresh install shows real hours/labor and empty finance
      // until the operator fills it in.
      cos: Array.isArray(s.cos) ? s.cos : [],
      exps: Array.isArray(s.exps) ? s.exps : [],
      coSeq: s.coSeq || 0,
      expSeq: s.expSeq || 0,
      // Painter → crew assignment (Crew A/B/C in the sidebar). Absent = derived.
      crews: s.crews || {},
    }
  } catch (e) {
    return { entries: {}, added: [], schedule: {}, seq: 0, projects: {}, cos: [], exps: [], coSeq: 0, expSeq: 0, crews: {} }
  }
}

let store = load()
let version = 0
const listeners = new Set()

function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)) } catch (e) {} }
function bump() { version += 1; listeners.forEach((l) => { try { l() } catch (e) {} }) }

export function subscribeEdits(fn) { listeners.add(fn); return () => listeners.delete(fn) }
export function editsVersion() { return version }
// React hook: re-render whenever anything in the overlay changes.
export function useEdits() { return useSyncExternalStore(subscribeEdits, editsVersion, editsVersion) }

// ---------------------------------------------------------------------------
// Per-entry field overrides (existing imported entries and manual entries).
// ---------------------------------------------------------------------------
export function entryEdit(id) { return store.entries[id] || null }

// Save an edit for entry `id`. `patch` may include hours, subtotal (base),
// addition, deduction, notes, location — only provided fields change. Stamps
// the author + time.
export function saveEntryEdit(id, patch) {
  const next = { ...(store.entries[id] || {}) }
  for (const k of ['hours', 'subtotal', 'addition', 'deduction']) if (patch[k] != null && patch[k] !== '') next[k] = round2(patch[k])
  if (patch.notes != null) next.notes = String(patch.notes)
  if (patch.location != null) next.location = String(patch.location)
  next.savedBy = CURRENT_USER.name
  next.savedAt = nowISO()
  store.entries[id] = next
  persist()
  bump()
  return next
}

// Remove an entry's overrides (revert to the original imported values).
export function clearEntryEdit(id) { if (store.entries[id]) { delete store.entries[id]; persist(); bump() } }

// Layer an entry's overrides onto it, recomputing net = base + additions −
// deductions. Adds `edited: { by, at }` when an override exists.
export function applyEntryEdit(e) {
  const ov = store.entries[e._id]
  if (!ov) return e
  const hours = ov.hours != null ? ov.hours : e.hours
  const subtotal = ov.subtotal != null ? ov.subtotal : e.subtotal
  const addition = ov.addition != null ? ov.addition : e.addition
  const deduction = ov.deduction != null ? ov.deduction : e.deduction
  const notes = ov.notes != null ? ov.notes : e.notes
  const location = ov.location != null ? ov.location : e.location
  // Apply the change as a DELTA off the recorded total, so an unchanged field is
  // a true no-op and we never overwrite a hand-recorded total that doesn't equal
  // base + additions − deductions (a real case in the imported data).
  const total = round2(e.total + (subtotal - e.subtotal) + (addition - e.addition) - (deduction - e.deduction))
  return { ...e, hours, subtotal, addition, deduction, notes, location, total, edited: { by: ov.savedBy, at: ov.savedAt } }
}

// ---------------------------------------------------------------------------
// Manually added time-log entries.
// ---------------------------------------------------------------------------
export function addedEntries() { return store.added }

export function addEntry(entry) {
  const id = 'm' + store.seq
  store.seq += 1
  const rec = {
    _id: id,
    manual: true,
    date: entry.date,
    team: entry.team || 'darwin',
    empId: entry.empId,
    hours: round2(entry.hours),
    subtotal: round2(entry.subtotal),
    addition: round2(entry.addition),
    deduction: round2(entry.deduction),
    total: round2((Number(entry.subtotal) || 0) + (Number(entry.addition) || 0) - (Number(entry.deduction) || 0)),
    location: entry.location || '',
    notes: entry.notes || '',
    addedBy: CURRENT_USER.name,
    addedAt: nowISO(),
  }
  store.added.push(rec)
  persist()
  bump()
  return rec
}

export function deleteEntry(id) {
  const i = store.added.findIndex((e) => e._id === id)
  if (i >= 0) { store.added.splice(i, 1); delete store.entries[id]; persist(); bump() }
}

// ---------------------------------------------------------------------------
// Per-job-site schedule overlay (planned start / deadline / order) for the
// Gantt. Keyed by the site's canonical key (from macPayroll.siteKeyOf).
// ---------------------------------------------------------------------------
export function siteSchedule(key) { return store.schedule[key] || null }
export function allSiteSchedules() { return store.schedule }

export function saveSiteSchedule(key, patch) {
  const next = { ...(store.schedule[key] || {}) }
  if (patch.start !== undefined) next.start = patch.start || null
  if (patch.deadline !== undefined) next.deadline = patch.deadline || null
  if (patch.order !== undefined) next.order = patch.order === '' || patch.order == null ? null : Number(patch.order)
  next.savedBy = CURRENT_USER.name
  next.savedAt = nowISO()
  store.schedule[key] = next
  persist()
  bump()
  return next
}

// ---------------------------------------------------------------------------
// Project metadata overlay — operator-entered fields on a real job site.
// Keyed by the site's canonical key. Fields: status, contract (whole-job
// revenue), clientName, clientEmail, percent (0-100 override), notes.
// ---------------------------------------------------------------------------
export function projectMeta(key) { return store.projects[key] || null }
export function allProjectMeta() { return store.projects }

export function saveProjectMeta(key, patch) {
  const next = { ...(store.projects[key] || {}) }
  if (patch.status !== undefined) next.status = patch.status || null
  if (patch.clientName !== undefined) next.clientName = String(patch.clientName || '')
  if (patch.clientEmail !== undefined) next.clientEmail = String(patch.clientEmail || '')
  if (patch.notes !== undefined) next.notes = String(patch.notes || '')
  // Present only for operator-created projects (no logged entries yet).
  if (patch.name !== undefined) next.name = String(patch.name || '')
  if (patch.address !== undefined) next.address = String(patch.address || '')
  if (patch.team !== undefined) next.team = patch.team || null
  for (const k of ['contract', 'percent']) {
    if (patch[k] !== undefined) next[k] = patch[k] === '' || patch[k] == null ? null : round2(patch[k])
  }
  next.savedBy = CURRENT_USER.name
  next.savedAt = nowISO()
  store.projects[key] = next
  persist()
  bump()
  return next
}

// ---------------------------------------------------------------------------
// Change orders — added revenue on a project, with a cost impact. Approved COs
// count toward project revenue/profit; pending ones don't (surfaced separately).
// ---------------------------------------------------------------------------
export function changeOrders() { return store.cos }

export function addChangeOrder(rec) {
  const id = 'co' + store.coSeq
  store.coSeq += 1
  const co = {
    _id: id,
    projectKey: rec.projectKey || '',
    projectName: rec.projectName || '',
    title: String(rec.title || 'Change order'),
    desc: String(rec.desc || ''),
    amount: round2(rec.amount),         // added contract value (revenue)
    cost: round2(rec.cost),             // added cost impact
    status: rec.status || 'pending',    // pending | approved | rejected
    requestedBy: String(rec.requestedBy || ''),
    date: rec.date || nowISO().slice(0, 10),
    addedBy: CURRENT_USER.name,
    addedAt: nowISO(),
  }
  store.cos.push(co)
  persist()
  bump()
  return co
}

export function updateChangeOrder(id, patch) {
  const co = store.cos.find((c) => c._id === id)
  if (!co) return null
  for (const k of ['title', 'desc', 'requestedBy', 'status', 'projectKey', 'projectName', 'date']) if (patch[k] !== undefined) co[k] = patch[k]
  for (const k of ['amount', 'cost']) if (patch[k] !== undefined) co[k] = round2(patch[k])
  co.savedBy = CURRENT_USER.name
  co.savedAt = nowISO()
  persist()
  bump()
  return co
}

export function deleteChangeOrder(id) {
  const i = store.cos.findIndex((c) => c._id === id)
  if (i >= 0) { store.cos.splice(i, 1); persist(); bump() }
}

// ---------------------------------------------------------------------------
// Expenses — material/equipment/etc. costs against a project. Count toward
// project cost (on top of recorded labor).
// ---------------------------------------------------------------------------
export function expenses() { return store.exps }

export function addExpense(rec) {
  const id = 'ex' + store.expSeq
  store.expSeq += 1
  const ex = {
    _id: id,
    projectKey: rec.projectKey || '',
    projectName: rec.projectName || '',
    title: String(rec.title || 'Expense'),
    category: rec.category || 'Materials',
    vendor: String(rec.vendor || ''),
    amount: round2(rec.amount),
    status: rec.status || 'unpaid',    // paid | unpaid
    date: rec.date || nowISO().slice(0, 10),
    addedBy: CURRENT_USER.name,
    addedAt: nowISO(),
  }
  store.exps.push(ex)
  persist()
  bump()
  return ex
}

export function updateExpense(id, patch) {
  const ex = store.exps.find((e) => e._id === id)
  if (!ex) return null
  for (const k of ['title', 'category', 'vendor', 'status', 'projectKey', 'projectName', 'date']) if (patch[k] !== undefined) ex[k] = patch[k]
  if (patch.amount !== undefined) ex.amount = round2(patch.amount)
  ex.savedBy = CURRENT_USER.name
  ex.savedAt = nowISO()
  persist()
  bump()
  return ex
}

export function deleteExpense(id) {
  const i = store.exps.findIndex((e) => e._id === id)
  if (i >= 0) { store.exps.splice(i, 1); persist(); bump() }
}

// ---------------------------------------------------------------------------
// Crew assignment (Crew A/B/C). Absent = derived from the painter's team.
// ---------------------------------------------------------------------------
export function crewOf(empId) { return store.crews[empId] || null }
export function allCrews() { return store.crews }

export function saveCrew(empId, crew) {
  if (crew) store.crews[empId] = crew
  else delete store.crews[empId]
  persist()
  bump()
}

// ---------------------------------------------------------------------------
// Validation — flag an entry that "needs review" (returns a reason or null).
// Deliberately conservative so it flags genuinely odd rows, not routine ones.
// ---------------------------------------------------------------------------
// `payType` (the employee's) gates the hours check — only Hourly staff log a
// literal shift; Fixed/Per-Day/Contract "hours" are period buckets (e.g. a
// 40-hr weekly salary), which are routine and must not be flagged.
export function needsReview(e, payType) {
  const h = Number(e.hours) || 0
  if (h < 0) return 'Negative hours'
  if (payType === 'Hourly' && h > 16) return `Unusually high hours (${h})`
  if ((Number(e.addition) || 0) < 0) return 'Negative addition'
  if ((Number(e.deduction) || 0) < 0) return 'Negative deduction'
  if (e.manual && (!e.empId || !e.date)) return 'Missing employee or date'
  return null
}
