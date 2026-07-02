import React, { useState, useMemo, useEffect } from 'react'
import { css } from '../lib/css.js'
import { registerEsc } from '../ui/bits.jsx'
import { Box } from '../ui/Box.jsx'
import { StatCard, Badge } from '../ds/index.jsx'
import { payroll, employeeById, employeeEntries, siteOptions, money, fmtH, fmtDate, META, TEAM_LABEL, TEAM_COLOR, CATEGORIES, CATEGORY_LABEL } from '../lib/macPayroll.js'
import { downloadCSV } from '../lib/csv.js'
import { useEdits, saveEntryEdit, clearEntryEdit, CURRENT_USER } from '../lib/edits.js'
import ReceiptOverlay from './Receipt.jsx'

// Payroll — the single view of the merged Darwin + Mauricio payroll roster.
// Pick a team + pay period (+ optional category/search); every KPI and row
// recomputes from the same source, and clicking a person shows their full daily
// log. This is the one place the payroll data lives — there is no separate
// roster page.

const segStyle = (active) => {
  const b = 'background:transparent;border:0;padding:5px 13px;border-radius:6px;font-size:12.5px;cursor:pointer;font-weight:600;color:var(--muted);white-space:nowrap'
  return active ? b + ';background:var(--panel-3);color:var(--text)' : b
}
const inputStyle = 'background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 9px;font-size:12.5px;color:var(--text);outline:none;font-family:var(--font-mono)'

export default function PayrollScreen() {
  const [team, setTeam] = useState('both')
  const [from, setFrom] = useState(META.dateMin)
  const [to, setTo] = useState(META.dateMax)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('hours') // hours | est | net | entries | last | name
  const [selId, setSelId] = useState(null)
  const editV = useEdits()                     // re-render when an entry edit is saved/cleared
  const siteOpts = useMemo(() => { void editV; return siteOptions() }, [editV])
  const [editId, setEditId] = useState(null)   // entry._id currently being edited
  const [draft, setDraft] = useState(null)
  const [receiptIds, setReceiptIds] = useState(null)  // employee ids to print receipts for

  // Single source: category is applied here so the KPI totals and the table
  // rows always agree (category is a per-employee property, so filtering by it
  // filters whole people — the drawer stays consistent too). editV is a
  // dependency so every total refreshes the instant an edit is saved.
  const { rows, totals } = useMemo(() => { void editV; return payroll(team, from, to, { q, category: cat }) }, [team, from, to, q, cat, editV])
  const sorted = useMemo(() => {
    const r = rows.slice()
    r.sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name)
      : sort === 'est' ? b.est - a.est
      : sort === 'net' ? b.net - a.net
      : sort === 'entries' ? b.n - a.n
      : sort === 'last' ? (a.last < b.last ? 1 : a.last > b.last ? -1 : 0)
      : b.hours - a.hours,
    )
    return r
  }, [rows, sort])

  const sel = selId ? employeeById(selId) : null
  const selAgg = selId ? rows.find((r) => r.id === selId) : null
  const selEntries = useMemo(() => { void editV; return selId ? employeeEntries(selId, team, from, to) : [] }, [selId, team, from, to, editV])

  // Clear a stale selection when the selected person drops out of the filtered
  // results, so the drawer can't silently reopen when the filter is relaxed.
  useEffect(() => {
    if (selId && !rows.some((r) => r.id === selId)) setSelId(null)
  }, [rows, selId])

  // Close the detail drawer on Escape via the shared overlay stack, so only
  // the topmost layer (receipt overlay, modal, spotlight) handles the key.
  useEffect(() => {
    if (!selId) return
    return registerEsc(() => setSelId(null))
  }, [selId])

  // Reset the row editor whenever the selected person changes or the drawer closes.
  useEffect(() => { setEditId(null); setDraft(null) }, [selId])

  const exportCSV = () => {
    const headers = ['Employee', 'Role', 'Pay type', 'Rate', 'Teams', 'Category', 'Hours', 'Days', 'Est. gross', 'Base', 'Additions', 'Deductions', 'Net', 'Entries', 'Last active']
    const data = sorted.map((r) => [r.name, r.role, r.payType, r.rate ?? '', r.teamsIn.join('+'), r.category, r.hours, r.days, Math.round(r.est), Math.round(r.subtotal), Math.round(r.addition), Math.round(r.deduction), Math.round(r.net), r.n, r.last])
    downloadCSV(`maka-painters-payroll_${team}_${cat}_${from}_${to}.csv`, headers, data)
  }

  const Th = ({ children, k, num }) => (
    <th onClick={k ? () => setSort(k) : undefined}
      style={css(`text-align:${num ? 'right' : 'left'};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${sort === k ? 'var(--text)' : 'var(--faint)'};font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2);${k ? 'cursor:pointer' : ''};white-space:nowrap`)}>
      {children}{sort === k ? ' ↓' : ''}
    </th>
  )
  const td = 'padding:9px 11px;border-bottom:1px solid var(--line-soft)'

  const beginEdit = (e) => { setEditId(e._id); setDraft({ location: e.location || '', addition: e.addition || 0, deduction: e.deduction || 0, notes: e.notes || '' }) }
  const cancelEdit = () => { setEditId(null); setDraft(null) }
  const commitEdit = (e) => {
    // Send only the fields the user actually changed, with clean number parsing
    // (empty → 0; non-numeric → skip, never silently wipe).
    const patch = {}
    const na = draft.addition === '' ? 0 : Number(draft.addition)
    const nd = draft.deduction === '' ? 0 : Number(draft.deduction)
    if (Number.isFinite(na) && na !== (e.addition || 0)) patch.addition = na
    if (Number.isFinite(nd) && nd !== (e.deduction || 0)) patch.deduction = nd
    if (draft.notes !== (e.notes || '')) patch.notes = draft.notes
    if (draft.location !== (e.location || '')) patch.location = draft.location
    if (Object.keys(patch).length) saveEntryEdit(e._id, patch)
    setEditId(null); setDraft(null)
  }
  const resetEdit = (e) => { clearEntryEdit(e._id); setEditId(null); setDraft(null) }
  const fmtWhen = (iso) => { try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch (err) { return '' } }
  const editInput = 'background:var(--input-bg);border:1px solid var(--line);border-radius:6px;padding:5px 8px;font-size:12px;color:var(--text);outline:none;font-family:var(--font-mono)'

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0;flex-wrap:wrap')}>
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {['both', 'darwin', 'mauricio'].map((t) => (
            <button key={t} onClick={() => setTeam(t)} style={css(segStyle(team === t))}>{TEAM_LABEL[t]}</button>
          ))}
        </div>
        <span style={css('display:inline-flex;align-items:center;gap:6px')}>
          <input type="date" value={from} min={META.dateMin} max={to} onChange={(e) => setFrom(e.target.value || META.dateMin)} style={css(inputStyle)} />
          <span style={css('color:var(--faint-2)')}>→</span>
          <input type="date" value={to} min={from} max={META.dateMax} onChange={(e) => setTo(e.target.value || META.dateMax)} style={css(inputStyle)} />
        </span>
        <button onClick={() => { setFrom(META.dateMin); setTo(META.dateMax) }} style={css('background:var(--panel-2);border:1px solid var(--line);border-radius:7px;padding:6px 11px;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer')}>All dates</button>
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {CATEGORIES.map((c) => <button key={c} onClick={() => setCat(c)} style={css(segStyle(cat === c))}>{CATEGORY_LABEL[c]}</button>)}
        </div>
        <input placeholder="Search employee…" value={q} onChange={(e) => setQ(e.target.value)} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:170px;outline:none')} />
        <div style={css('flex:1')} />
        <button onClick={() => setReceiptIds(sorted.map((r) => r.id))} title="Printable pay receipts for everyone in this selection" style={css('display:inline-flex;align-items:center;gap:6px;background:var(--panel-2);color:var(--text);border:1px solid var(--line);border-radius:7px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer')}>🧾 Receipts</button>
        <button onClick={exportCSV} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer')}>Export CSV</button>
      </div>

      <div style={css('flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px')}>
        <div style={css('display:grid;grid-template-columns:repeat(5,1fr);gap:11px')}>
          <StatCard label="Employees" value={String(sorted.length)} sub={totals.shared + ' shared across teams'} tone="blue" />
          <StatCard label="Hours" value={fmtH(totals.hours)} sub={fmtDate(from) + ' – ' + fmtDate(to)} tone="muted" />
          <StatCard label="Wages" value={money(totals.wages)} sub="hourly · per-day · fixed crew" tone="cyan" />
          <StatCard label="Contract billing" value={money(totals.billing)} sub="subcontractor job totals" tone="amber" />
          <StatCard label="Net pay" value={money(totals.net)} sub={totals.n.toLocaleString('en-US') + ' entries'} tone="green" />
        </div>

        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead>
              <tr>
                <Th k="name">Employee</Th><Th>Team</Th><Th>Pay</Th>
                <Th k="hours" num>Hours</Th><Th k="est" num>Est. gross</Th>
                <Th num>+Add</Th><Th num>−Ded</Th><Th k="net" num>Net</Th>
                <Th k="entries" num>Entries</Th><Th k="last" num>Last</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <Box as="tr" key={r.id} onClick={() => setSelId(r.id)} style={css('cursor:pointer')} hover="background:var(--panel-2)">
                  <td style={css(td)}>
                    <div style={css('display:flex;align-items:center;gap:7px')}>
                      <span style={css('font-weight:600')}>{r.name}</span>
                      {r.you && <Badge color="amber">You</Badge>}
                      {r.category === 'contract' && <Badge color="default">contract</Badge>}
                      {r.status === 'Inactive' && <span style={css('font-size:9.5px;color:var(--faint);border:1px solid var(--line-soft);border-radius:4px;padding:0 5px;text-transform:uppercase;letter-spacing:.05em')}>inactive</span>}
                      {r.flag && <span title={r.flag} style={css('color:var(--amber);cursor:help')}>⚑</span>}
                    </div>
                    <div style={css('font-size:10px;color:var(--faint-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px')}>
                      {r.role}{r.variants && r.variants.length > 1 ? ' · aka ' + r.variants.filter((v) => v !== r.name).join(', ') : ''}
                    </div>
                  </td>
                  <td style={css(td)}><div style={css('display:flex;gap:4px')}>{r.teamsIn.map((t) => <Badge key={t} color={TEAM_COLOR[t]}>{TEAM_LABEL[t]}</Badge>)}</div></td>
                  <td style={css(td + ';color:var(--muted);font-family:var(--font-mono);font-size:11.5px')}>{r.payType || '—'}{r.rate != null ? ' · $' + r.rate : ''}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);font-weight:700')}>{fmtH(r.hours)}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--cyan)')}>{money(r.est)}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--green)')}>{r.addition ? money(r.addition) : '—'}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--red)')}>{r.deduction ? money(r.deduction) : '—'}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--green)')}>{money(r.net)}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--faint)')}>{r.n}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--faint)')}>{fmtDate(r.last)}</td>
                </Box>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={10} style={css('padding:26px;text-align:center;color:var(--faint)')}>No payroll entries for this team, category and date range.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={css('font-size:11px;color:var(--faint-2);line-height:1.6')}>
          One merged roster from the Darwin and Mauricio payroll spreadsheets ({META.entryCount.toLocaleString('en-US')} entries, {META.dateMin} → {META.dateMax}). Similar names are counted as one person; <span style={css('color:var(--amber)')}>⚑</span> marks a merge worth confirming. Click a row for that person's daily log.
          <strong style={css('color:var(--cyan)')}> Wages</strong> = hours × rate for hourly/per-day crew (recorded total for fixed); <strong style={css('color:var(--amber)')}>contract billing</strong> = whole-job values logged under subcontractors, split out so it doesn't inflate wages. Use the team/category toggles + date range to scope the pay period; Export CSV downloads the current selection.
        </div>
      </div>

      {sel && selAgg && (
        <>
          <div onClick={() => setSelId(null)} aria-hidden="true" style={css('position:fixed;inset:0;background:rgba(4,6,10,.5);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:100')} />
          <aside role="dialog" aria-modal="true" aria-label={`${sel.name} — daily log`} style={css('position:fixed;top:12px;right:12px;bottom:12px;width:760px;max-width:94vw;background:var(--panel);border:1px solid var(--line-strong);border-radius:14px;box-shadow:0 28px 70px rgba(0,0,0,.6);z-index:110;display:flex;flex-direction:column;overflow:hidden')}>
            <div style={css('padding:14px 16px;border-bottom:1px solid var(--line-soft);display:flex;align-items:center;gap:10px;flex-shrink:0')}>
              <div style={css('flex:1;min-width:0')}>
                <div style={css('display:flex;align-items:center;gap:7px')}>
                  <span style={css('font-size:15px;font-weight:700')}>{sel.name}</span>
                  {sel.you && <Badge color="amber">You</Badge>}
                  {selAgg.teamsIn.map((t) => <Badge key={t} color={TEAM_COLOR[t]}>{TEAM_LABEL[t]}</Badge>)}
                </div>
                <div style={css('font-size:11.5px;color:var(--faint)')}>{sel.role} · {sel.payType}{sel.rate != null ? ' · $' + sel.rate : ''}{sel.variants && sel.variants.length > 1 ? ' · aka ' + sel.variants.filter((v) => v !== sel.name).join(', ') : ''}</div>
              </div>
              <span style={css('font-size:11px;color:var(--faint);font-family:var(--font-mono)')}>{fmtDate(from)} – {fmtDate(to)} · {TEAM_LABEL[team]}</span>
              <button onClick={() => setReceiptIds([selId])} title="Printable pay receipt for this person + period" style={css('background:var(--panel-2);color:var(--text);border:1px solid var(--line);border-radius:7px;padding:6px 11px;font-size:12px;font-weight:600;cursor:pointer')}>🧾 Receipt</button>
              <button onClick={() => setSelId(null)} style={css('width:28px;height:28px;border-radius:7px;display:grid;place-items:center;background:transparent;border:1px solid var(--line);cursor:pointer;color:var(--muted)')}>✕</button>
            </div>
            <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px 16px;flex-shrink:0')}>
              {[['Hours', fmtH(selAgg.hours)], ['Days', String(selAgg.days)], ['Est. gross', money(selAgg.est)], ['Net recorded', money(selAgg.net)]].map(([l, val]) => (
                <div key={l} style={css('padding:10px 11px;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px')}>
                  <div style={css('font-size:9.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:4px')}>{l}</div>
                  <div style={css('font-size:16px;font-weight:800;font-family:var(--font-mono)')}>{val}</div>
                </div>
              ))}
            </div>
            <div style={css('flex:1;overflow:auto;padding:0 16px 16px')}>
              <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden')}>
                <table style={css('width:100%;border-collapse:collapse;font-size:12px')}>
                  <thead><tr>
                    {['Date', 'Team', 'Location', 'Hrs', 'Base', '+Add', '−Ded', 'Net', 'Notes', ''].map((h, i) => (
                      <th key={i} style={css(`text-align:${i >= 3 && i <= 7 ? 'right' : 'left'};font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line);background:var(--panel-2);white-space:nowrap`)}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {selEntries.map((e) => (
                      <React.Fragment key={e._id}>
                        <tr style={e.edited ? css('background:rgba(47,130,255,.06)') : undefined}>
                          <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);font-family:var(--font-mono);color:var(--faint);white-space:nowrap')}>{fmtDate(e.date)}</td>
                          <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft)')}><Badge color={TEAM_COLOR[e.team]}>{TEAM_LABEL[e.team]}</Badge></td>
                          <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);color:var(--muted);max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={e.location}>{e.location || '—'}</td>
                          <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{e.hours || ''}</td>
                          <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{e.subtotal ? money(e.subtotal) : ''}</td>
                          <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);color:var(--green)')}>{e.addition ? money(e.addition) : ''}</td>
                          <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);color:var(--red)')}>{e.deduction ? money(e.deduction) : ''}</td>
                          <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);font-weight:700')}>{e.total ? money(e.total) : ''}</td>
                          <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);color:var(--faint-2);max-width:200px')} title={e.notes}>
                            <div style={css('white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px')}>{e.notes || ''}</div>
                            {e.edited && <div style={css('font-size:9px;color:var(--blue-hi);font-family:var(--font-mono);margin-top:2px')}>✎ {e.edited.by.split(' ')[0]} · {fmtWhen(e.edited.at)}</div>}
                          </td>
                          <td style={css('padding:7px 6px;border-bottom:1px solid var(--line-soft);text-align:right')}>
                            <button onClick={() => (editId === e._id ? cancelEdit() : beginEdit(e))} title="Edit additions, deductions, comment or job site"
                              style={css('width:24px;height:24px;border-radius:6px;display:inline-grid;place-items:center;background:transparent;cursor:pointer;border:1px solid var(--line);color:' + (editId === e._id ? 'var(--blue-hi)' : 'var(--muted)'))}>{editId === e._id ? '✕' : '✎'}</button>
                          </td>
                        </tr>
                        {editId === e._id && draft && (
                          <tr>
                            <td colSpan={10} style={css('padding:11px 12px;background:var(--inset);border-bottom:1px solid var(--line)')}>
                              <div style={css('display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end')}>
                                <label style={css('display:flex;flex-direction:column;gap:3px;flex:1;min-width:220px')}>
                                  <span style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);font-weight:700')}>Job site (syncs with Projects)</span>
                                  <select value={draft.location} onChange={(ev) => setDraft((d) => ({ ...d, location: ev.target.value }))} style={css(editInput + ';font-family:var(--font-ui);min-width:220px')}>
                                    {draft.location && !siteOpts.includes(draft.location) && <option value={draft.location}>{draft.location}</option>}
                                    <option value="">(no site)</option>
                                    {siteOpts.map((o) => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                </label>
                                <label style={css('display:flex;flex-direction:column;gap:3px')}>
                                  <span style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--green);font-weight:700')}>+ Addition</span>
                                  <input type="number" step="0.01" value={draft.addition} onChange={(ev) => setDraft((d) => ({ ...d, addition: ev.target.value }))} style={css(editInput + ';width:110px;text-align:right')} />
                                </label>
                                <label style={css('display:flex;flex-direction:column;gap:3px')}>
                                  <span style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--red);font-weight:700')}>− Deduction</span>
                                  <input type="number" step="0.01" value={draft.deduction} onChange={(ev) => setDraft((d) => ({ ...d, deduction: ev.target.value }))} style={css(editInput + ';width:110px;text-align:right')} />
                                </label>
                                <label style={css('display:flex;flex-direction:column;gap:3px;flex:2;min-width:200px')}>
                                  <span style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);font-weight:700')}>Comment</span>
                                  <input type="text" value={draft.notes} placeholder="e.g. bonus for finishing early" onChange={(ev) => setDraft((d) => ({ ...d, notes: ev.target.value }))} style={css(editInput + ';font-family:var(--font-ui);min-width:200px')} />
                                </label>
                                <div style={css('display:flex;gap:8px;align-items:center')}>
                                  <button onClick={() => commitEdit(e)} style={css('background:var(--blue);color:#fff;border:1px solid transparent;border-radius:6px;padding:7px 13px;font-size:12px;font-weight:700;cursor:pointer')}>Save</button>
                                  <button onClick={cancelEdit} style={css('background:var(--panel-2);color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:7px 11px;font-size:12px;font-weight:600;cursor:pointer')}>Cancel</button>
                                  {e.edited && <button onClick={() => resetEdit(e)} title="Revert to the originally imported values" style={css('background:transparent;color:var(--red);border:0;font-size:11px;cursor:pointer;text-decoration:underline')}>Reset</button>}
                                </div>
                              </div>
                              <div style={css('font-size:10px;color:var(--faint-2);margin-top:7px')}>New net = base {money(e.subtotal)} + additions − deductions. Saving records <strong style={css('color:var(--text)')}>{CURRENT_USER.name}</strong> and the current time, and updates Payroll, Projects and Schedule.</div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {selEntries.length === 0 && <tr><td colSpan={10} style={css('padding:20px;text-align:center;color:var(--faint)')}>No entries in this window.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={css('font-size:10.5px;color:var(--faint-2);line-height:1.5;padding:9px 2px 0')}>Click <span style={css('color:var(--muted)')}>✎</span> on any day to add an addition/deduction, write a comment, or change the job site. Saved edits show who saved them and when, and flow to Projects, Payroll and Schedule.</div>
            </div>
          </aside>
        </>
      )}
      {receiptIds && <ReceiptOverlay ids={receiptIds} team={team} from={from} to={to} onClose={() => setReceiptIds(null)} />}
    </div>
  )
}
