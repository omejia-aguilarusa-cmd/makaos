import { useSyncExternalStore } from 'react'

// Local edit overlay for payroll entries.
//
// The base dataset (macPainters.js) is generated and immutable. User edits —
// additions, deductions, a comment, and the job location — are stored here in
// the browser (localStorage) with an audit trail (who saved and when) and
// layered onto each entry at read time by macPayroll. Because every screen
// reads entries through macPayroll, an edit made in Payroll automatically flows
// to Projects, Schedule and Time Logs. Nothing leaves the device.

const KEY = 'makaos.edits.v1'

// The operator making edits (shown as "saved by"). Matches the sidebar footer.
export const CURRENT_USER = { name: 'Oscar Mejia', role: 'Business Manager' }

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return s && s.entries ? s : { entries: {} }
  } catch (e) {
    return { entries: {} }
  }
}

let store = load()
let version = 0
const listeners = new Set()

function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)) } catch (e) {} }
function bump() { version += 1; listeners.forEach((l) => { try { l() } catch (e) {} }) }

export function subscribeEdits(fn) { listeners.add(fn); return () => listeners.delete(fn) }
export function editsVersion() { return version }

// React hook: re-render whenever any edit is saved or cleared.
export function useEdits() { return useSyncExternalStore(subscribeEdits, editsVersion, editsVersion) }

export function entryEdit(id) { return store.entries[id] || null }

// Save an edit for entry `id`. `patch` may include addition, deduction, notes,
// location — only the provided fields change. Stamps the author + time.
export function saveEntryEdit(id, patch) {
  const next = { ...(store.entries[id] || {}) }
  if (patch.addition != null) next.addition = round2(patch.addition)
  if (patch.deduction != null) next.deduction = round2(patch.deduction)
  if (patch.notes != null) next.notes = String(patch.notes)
  if (patch.location != null) next.location = String(patch.location)
  next.savedBy = CURRENT_USER.name
  next.savedAt = new Date().toISOString()
  store.entries[id] = next
  persist()
  bump()
  return next
}

// Remove an entry's edit (revert to the original imported values).
export function clearEntryEdit(id) {
  if (store.entries[id]) { delete store.entries[id]; persist(); bump() }
}

// Layer an entry's edit onto it, recomputing net total = base + additions −
// deductions. Adds `edited: { by, at }` when an override exists.
export function applyEntryEdit(e) {
  const ov = store.entries[e._id]
  if (!ov) return e
  const addition = ov.addition != null ? ov.addition : e.addition
  const deduction = ov.deduction != null ? ov.deduction : e.deduction
  const notes = ov.notes != null ? ov.notes : e.notes
  const location = ov.location != null ? ov.location : e.location
  return {
    ...e,
    addition,
    deduction,
    notes,
    location,
    total: round2(e.subtotal + addition - deduction),
    edited: { by: ov.savedBy, at: ov.savedAt },
  }
}
