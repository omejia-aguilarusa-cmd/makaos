import { useSyncExternalStore } from 'react'
import { filterEntries, employeeById, employeeOptions, META } from './macPayroll.js'
import { subscribeEdits, saveEntryEdit, addEntry } from './edits.js'

// Near-real-time two-way sync between the Time Logs dataset and a Google
// Spreadsheet ("Maka OS — Time Logs" / tab "TimeLogs"), via /api/sheets/sync
// using the operator's Google OAuth session.
//
//   portal → sheet : any edit-overlay change schedules a debounced push (~3s),
//                    which rewrites the tab with the current entries.
//   sheet → portal : a poller pulls the tab every 45s; changed editable cells
//                    (hours, base, +add, −ded, location, notes) are applied as
//                    entry edits by row ID, and rows added in the sheet (no ID)
//                    become manual entries when Date + Employee resolve. A push
//                    follows to write IDs back onto sheet-added rows.
//
// Conflict rule: the sheet's value wins on pull; the portal's on push. With a
// 3s push debounce vs a 45s pull, portal edits effectively win unless the
// portal is idle. Requires Google connected in Integrations; degrades to "off"
// otherwise. Enable state + spreadsheet id persist per browser.

const KEY = 'makaos.sheets.v1'
const HEADER = ['ID', 'Date', 'Team', 'EmployeeID', 'Employee', 'Hours', 'Base', 'Addition', 'Deduction', 'Total', 'Location', 'Notes', 'Source']
const PUSH_DEBOUNCE = 3000
const PULL_INTERVAL = 45000
const MAX_SHEET_ADDS = 200

function loadCfg() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch (e) { return {} }
}
let cfg = { enabled: false, spreadsheetId: '', url: '', ...loadCfg() }
function persistCfg() { try { localStorage.setItem(KEY, JSON.stringify(cfg)) } catch (e) { /* private mode */ } }

// ---- status store (for the UI chip) ---------------------------------------
let snap = { enabled: cfg.enabled, state: cfg.enabled ? 'idle' : 'off', url: cfg.url, lastSyncAt: null, detail: '', pushed: 0, applied: 0 }
const listeners = new Set()
function setStatus(patch) {
  snap = { ...snap, ...patch, enabled: cfg.enabled, url: cfg.url }
  listeners.forEach((l) => { try { l() } catch (e) { /* listener */ } })
}
export function useSheetSync() {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    () => snap, () => snap,
  )
}

// ---- row building / parsing ------------------------------------------------
const num = (v) => { const n = Number(String(v == null ? '' : v).replace(/[$,]/g, '')); return Number.isFinite(n) ? n : 0 }
const near = (a, b) => Math.abs(num(a) - num(b)) < 0.005

export function buildRows() {
  const rows = [HEADER]
  for (const e of filterEntries('both', META.dateMin, META.dateMax)) {
    rows.push([
      e._id, e.date, e.team, e.empId, (employeeById(e.empId) || {}).name || e.empId,
      e.hours || 0, e.subtotal || 0, e.addition || 0, e.deduction || 0, e.total || 0,
      e.location || '', e.notes || '', e.manual ? 'portal-manual' : 'import',
    ])
  }
  return rows
}

// Apply sheet values back onto the portal. Returns how many changes landed.
export function applyPulled(values) {
  if (!Array.isArray(values) || values.length < 2) return 0
  const head = values[0].map((h) => String(h || '').trim().toLowerCase())
  const col = (name) => head.indexOf(name.toLowerCase())
  const iId = col('ID'), iDate = col('Date'), iTeam = col('Team'), iEmpId = col('EmployeeID'), iEmp = col('Employee')
  const iH = col('Hours'), iB = col('Base'), iA = col('Addition'), iD = col('Deduction'), iL = col('Location'), iN = col('Notes')
  if (iId < 0 || iH < 0) return 0 // not our layout — don't guess

  const current = new Map()
  for (const e of filterEntries('both', META.dateMin, META.dateMax)) current.set(e._id, e)
  const roster = employeeOptions()
  const byName = new Map(roster.map((o) => [o.name.toLowerCase(), o]))
  const byId = new Map(roster.map((o) => [o.id, o]))

  let changed = 0, added = 0
  for (let r = 1; r < values.length; r++) {
    const row = values[r] || []
    const id = String(row[iId] || '').trim()
    if (id && current.has(id)) {
      const e = current.get(id)
      const patch = {}
      if (iH >= 0 && row[iH] !== undefined && !near(row[iH], e.hours)) patch.hours = num(row[iH])
      if (iB >= 0 && row[iB] !== undefined && !near(row[iB], e.subtotal)) patch.subtotal = num(row[iB])
      if (iA >= 0 && row[iA] !== undefined && !near(row[iA], e.addition)) patch.addition = num(row[iA])
      if (iD >= 0 && row[iD] !== undefined && !near(row[iD], e.deduction)) patch.deduction = num(row[iD])
      if (iL >= 0 && String(row[iL] || '') !== (e.location || '')) patch.location = String(row[iL] || '')
      if (iN >= 0 && String(row[iN] || '') !== (e.notes || '')) patch.notes = String(row[iN] || '')
      if (Object.keys(patch).length) { saveEntryEdit(id, patch); changed++ }
    } else if (!id && added < MAX_SHEET_ADDS) {
      // A row typed directly into the sheet: needs a valid date + a known
      // employee (by EmployeeID or exact name) to become a portal entry.
      const date = String(row[iDate] || '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < META.dateMin || date > META.dateMax) continue
      const emp = (iEmpId >= 0 && byId.get(String(row[iEmpId] || '').trim())) || (iEmp >= 0 && byName.get(String(row[iEmp] || '').trim().toLowerCase()))
      if (!emp) continue
      // Dedupe: if an identical manual entry already exists (a prior pull added
      // it but the ID write-back push hasn't landed yet), skip re-adding.
      const dup = [...current.values()].some((e) => e.manual && e.date === date && e.empId === emp.id
        && near(row[iH], e.hours) && (iB < 0 || near(row[iB], e.subtotal)) && (iL < 0 || String(row[iL] || '') === (e.location || '')))
      if (dup) continue
      const team = String(row[iTeam] || '').trim().toLowerCase()
      addEntry({
        date, empId: emp.id, team: team === 'mauricio' ? 'mauricio' : team === 'darwin' ? 'darwin' : emp.team,
        hours: iH >= 0 ? num(row[iH]) : 0, subtotal: iB >= 0 ? num(row[iB]) : 0,
        addition: iA >= 0 ? num(row[iA]) : 0, deduction: iD >= 0 ? num(row[iD]) : 0,
        location: iL >= 0 ? String(row[iL] || '') : '', notes: (iN >= 0 ? String(row[iN] || '') : '') || 'added via Google Sheets',
      })
      changed++; added++
    }
  }
  return changed
}

// ---- transport --------------------------------------------------------------
let inFlight = false
async function callApi(payload) {
  const r = await fetch('/api/sheets/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  let data = {}
  try { data = await r.json() } catch (e) { /* non-json error body */ }
  return { ok: r.ok, status: r.status, data }
}

export async function pushNow() {
  if (!cfg.enabled) return
  if (inFlight) {
    // A pull (or a prior push) is mid-flight — re-arm instead of dropping the
    // edit, so a portal change can never be silently reverted by the next pull.
    clearTimeout(pushTimer)
    pushTimer = setTimeout(pushNow, 1500)
    return
  }
  inFlight = true
  setStatus({ state: 'syncing', detail: 'pushing…' })
  try {
    const rows = buildRows()
    const r = await callApi({ action: 'push', spreadsheetId: cfg.spreadsheetId, rows })
    if (r.status === 401) { setStatus({ state: 'disconnected', detail: (r.data && r.data.hint) || 'Connect Google in Integrations' }); return }
    if (!r.ok) { setStatus({ state: 'error', detail: (r.data && (r.data.detail || r.data.error)) || 'push failed' }); return }
    if (r.data.spreadsheetId && r.data.spreadsheetId !== cfg.spreadsheetId) { cfg.spreadsheetId = r.data.spreadsheetId; cfg.url = r.data.url; persistCfg() }
    setStatus({ state: 'idle', lastSyncAt: Date.now(), detail: '', pushed: r.data.count || 0 })
  } catch (e) {
    setStatus({ state: 'error', detail: 'network error' })
  } finally { inFlight = false }
}

export async function pullNow() {
  if (!cfg.enabled || !cfg.spreadsheetId || inFlight) return
  inFlight = true
  setStatus({ state: 'syncing', detail: 'pulling…' })
  try {
    const r = await callApi({ action: 'pull', spreadsheetId: cfg.spreadsheetId })
    if (r.status === 401) { setStatus({ state: 'disconnected', detail: (r.data && r.data.hint) || 'Connect Google in Integrations' }); return }
    if (r.status === 404) { cfg.spreadsheetId = ''; cfg.url = ''; persistCfg(); setStatus({ state: 'idle', detail: 'sheet missing — will recreate on next push' }); return }
    if (!r.ok) { setStatus({ state: 'error', detail: (r.data && (r.data.detail || r.data.error)) || 'pull failed' }); return }
    const applied = applyPulled(r.data.values)
    setStatus({ state: 'idle', lastSyncAt: Date.now(), detail: '', applied })
    // Applying edits bumps the overlay version, which schedules the follow-up
    // push (writing IDs back onto sheet-added rows). Nothing else to do here.
  } catch (e) {
    setStatus({ state: 'error', detail: 'network error' })
  } finally { inFlight = false }
}

// ---- engine ------------------------------------------------------------------
let started = false, pushTimer = null, poller = null
function schedulePush() {
  if (!cfg.enabled) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(pushNow, PUSH_DEBOUNCE)
}

export function startSheetSync() {
  if (started || typeof window === 'undefined') return
  started = true
  subscribeEdits(schedulePush)
  poller = setInterval(() => { if (cfg.enabled) pullNow() }, PULL_INTERVAL)
  // Pull FIRST when a sheet already exists: edits made in the sheet while the
  // portal was closed must merge in before push clears + rewrites the tab.
  if (cfg.enabled) { if (cfg.spreadsheetId) pullNow().then(pushNow); else pushNow() }
}
export function stopSheetSync() {
  started = false
  clearTimeout(pushTimer)
  clearInterval(poller)
}

export function sheetSyncEnabled() { return cfg.enabled }
export function setSheetSyncEnabled(on) {
  cfg.enabled = !!on
  persistCfg()
  if (on) {
    setStatus({ state: 'syncing', detail: 'starting…' })
    if (cfg.spreadsheetId) pullNow().then(pushNow)
    else pushNow()
  } else { clearTimeout(pushTimer); setStatus({ state: 'off', detail: '' }) }
}
