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
    }
  } catch (e) {
    return { entries: {}, added: [], schedule: {}, seq: 0 }
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
// Validation — flag an entry that "needs review" (returns a reason or null).
// Deliberately conservative so it flags genuinely odd rows, not routine ones.
// ---------------------------------------------------------------------------
export function needsReview(e) {
  const h = Number(e.hours) || 0
  const net = Number(e.total) || 0
  if (h < 0) return 'Negative hours'
  if (h > 16) return `Unusually high hours (${h})`
  if ((Number(e.addition) || 0) < 0) return 'Negative addition'
  if ((Number(e.deduction) || 0) < 0) return 'Negative deduction'
  if (net < 0) return 'Negative net — deductions exceed pay'
  if (e.manual && (!e.empId || !e.date)) return 'Missing employee or date'
  return null
}
