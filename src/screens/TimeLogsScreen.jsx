import React, { useState, useMemo } from 'react'
import { css } from '../lib/css.js'
import { Badge } from '../ds/index.jsx'
import { filterEntries, employeeById, employeeOptions, siteOptions, money, fmtH, fmtDate, META, TEAM_LABEL, TEAM_COLOR } from '../lib/macPayroll.js'
import { downloadCSV } from '../lib/csv.js'
import { useEdits, saveEntryEdit, clearEntryEdit, addEntry, deleteEntry, needsReview } from '../lib/edits.js'

const th = (align = 'left') => `text-align:${align};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2);white-space:nowrap`
const td = 'padding:8px 11px;border-bottom:1px solid var(--line-soft)'
const segStyle = (active) => {
  const b = 'background:transparent;border:0;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;color:var(--muted);white-space:nowrap'
  return active ? b + ';background:var(--panel-3);color:var(--text)' : b
}
const dateInput = 'background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 9px;font-size:12.5px;color:var(--text);outline:none;font-family:var(--font-mono)'
const inp = 'background:var(--input-bg);border:1px solid var(--line);border-radius:6px;padding:6px 8px;font-size:12px;color:var(--text);outline:none'
const CAP = 600
const fmtWhen = (iso) => { try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch (err) { return '' } }

// Every recorded payroll entry across both partners, filterable by team / date /
// search. You can add a manual entry, edit any entry (hours, base, additions,
// deductions, job site, notes), and it flags rows that look off for review.
// All edits carry an audit trail and flow to Payroll, Projects and Schedule.
export default function TimeLogsScreen() {
  const editV = useEdits()
  const [team, setTeam] = useState('both')
  const [from, setFrom] = useState(META.dateMin)
  const [to, setTo] = useState(META.dateMax)
  const [q, setQ] = useState('')
  const [reviewOnly, setReviewOnly] = useState(false)
  const [editId, setEditId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [addDraft, setAddDraft] = useState(null)

  const empOpts = useMemo(() => employeeOptions(), [])
  const siteOpts = useMemo(() => { void editV; return siteOptions() }, [editV])

  const all = useMemo(() => {
    void editV
    const ql = q.trim().toLowerCase()
    return filterEntries(team, from, to)
      .map((e) => ({ ...e, name: (employeeById(e.empId) || {}).name || e.empId, review: needsReview(e, (employeeById(e.empId) || {}).payType) }))
      .filter((e) => !ql || e.name.toLowerCase().includes(ql) || (e.location || '').toLowerCase().includes(ql))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.name.localeCompare(b.name)))
  }, [team, from, to, q, editV])
  const reviewCount = useMemo(() => all.filter((e) => e.review).length, [all])
  const entries = reviewOnly ? all.filter((e) => e.review) : all
  const shown = entries.slice(0, CAP)
  const totH = entries.reduce((s, e) => s + e.hours, 0)

  const exportCSV = () => {
    const headers = ['Date', 'Employee', 'Team', 'Location', 'Hours', 'Base', 'Additions', 'Deductions', 'Net', 'Notes', 'Source', 'Needs review']
    const data = entries.map((e) => [e.date, e.name, e.team, e.location, e.hours, e.subtotal, e.addition, e.deduction, e.total, e.notes, e.manual ? 'manual' : 'imported', e.review || ''])
    downloadCSV(`mac-painters-timelogs_${team}_${from}_${to}.csv`, headers, data)
  }

  const beginEdit = (e) => { setAddDraft(null); setEditId(e._id); setDraft({ hours: e.hours ?? 0, subtotal: e.subtotal ?? 0, addition: e.addition || 0, deduction: e.deduction || 0, location: e.location || '', notes: e.notes || '' }) }
  const cancelEdit = () => { setEditId(null); setDraft(null) }
  const commitEdit = (e) => {
    const patch = {}
    const num = (v) => (v === '' ? 0 : Number(v))
    const nh = num(draft.hours), nb = num(draft.subtotal), na = num(draft.addition), nd = num(draft.deduction)
    if (Number.isFinite(nh) && nh !== (e.hours || 0)) patch.hours = nh
    if (Number.isFinite(nb) && nb !== (e.subtotal || 0)) patch.subtotal = nb
    if (Number.isFinite(na) && na !== (e.addition || 0)) patch.addition = na
    if (Number.isFinite(nd) && nd !== (e.deduction || 0)) patch.deduction = nd
    if (draft.notes !== (e.notes || '')) patch.notes = draft.notes
    if (draft.location !== (e.location || '')) patch.location = draft.location
    if (Object.keys(patch).length) saveEntryEdit(e._id, patch)
    setEditId(null); setDraft(null)
  }
  const resetEdit = (e) => { clearEntryEdit(e._id); setEditId(null); setDraft(null) }

  const openAdd = () => { setEditId(null); setAddDraft({ date: to, empId: empOpts[0] ? empOpts[0].id : '', team: 'darwin', location: '', hours: '', subtotal: '', addition: '', deduction: '', notes: '' }) }
  const addValid = (d) => {
    if (!d || !d.empId || !d.date || d.date < META.dateMin || d.date > META.dateMax) return false
    const h = d.hours === '' ? null : Number(d.hours)
    const b = d.subtotal === '' ? null : Number(d.subtotal)
    if (h == null && b == null) return false                 // nothing to log
    if (h != null && !Number.isFinite(h)) return false
    if (b != null && !Number.isFinite(b)) return false
    return true
  }
  const commitAdd = () => {
    if (!addValid(addDraft)) return
    addEntry({ ...addDraft, hours: addDraft.hours === '' ? 0 : Number(addDraft.hours), subtotal: addDraft.subtotal === '' ? 0 : Number(addDraft.subtotal) })
    setAddDraft(null)
  }

  const numCell = (v, color) => <td style={css(td + ';text-align:right;font-family:var(--font-mono)' + (color ? ';color:' + color : ''))}>{v}</td>

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0;flex-wrap:wrap')}>
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {['both', 'darwin', 'mauricio'].map((t) => <button key={t} onClick={() => setTeam(t)} style={css(segStyle(team === t))}>{TEAM_LABEL[t]}</button>)}
        </div>
        <span style={css('display:inline-flex;align-items:center;gap:6px')}>
          <input type="date" value={from} min={META.dateMin} max={to} onChange={(e) => setFrom(e.target.value || META.dateMin)} style={css(dateInput)} />
          <span style={css('color:var(--faint-2)')}>→</span>
          <input type="date" value={to} min={from} max={META.dateMax} onChange={(e) => setTo(e.target.value || META.dateMax)} style={css(dateInput)} />
        </span>
        <input placeholder="Search name or location…" value={q} onChange={(e) => setQ(e.target.value)} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:180px;outline:none')} />
        <button onClick={() => setReviewOnly((v) => !v)} title="Show only entries that look off (odd hours, negative net, missing data)"
          style={css('display:inline-flex;align-items:center;gap:5px;border-radius:7px;padding:6px 11px;font-size:12px;font-weight:700;cursor:pointer;' + (reviewOnly ? 'background:var(--amber-soft,rgba(255,172,24,.16));color:var(--amber);border:1px solid var(--amber)' : 'background:var(--panel-2);color:var(--muted);border:1px solid var(--line)'))}>⚠ Needs review{reviewCount ? ' (' + reviewCount + ')' : ''}</button>
        <div style={css('flex:1')} />
        <span style={css('font-size:11px;color:var(--faint);font-family:var(--font-mono)')}>{entries.length.toLocaleString('en-US')} · {fmtH(totH)}</span>
        <button onClick={openAdd} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--panel-2);color:var(--text);border:1px solid var(--line);border-radius:7px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer')}>+ Add time log</button>
        <button onClick={exportCSV} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer')}>Export CSV</button>
      </div>

      {addDraft && (
        <div style={css('padding:12px 16px;border-bottom:1px solid var(--line);background:var(--inset);flex-shrink:0;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end')}>
          <span style={css('font-size:12px;font-weight:700;color:var(--text);align-self:center')}>New time log</span>
          <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Date</span><input type="date" value={addDraft.date} min={META.dateMin} max={META.dateMax} onChange={(e) => setAddDraft((d) => ({ ...d, date: e.target.value }))} style={css(inp + ';font-family:var(--font-mono)')} /></label>
          <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Employee</span><select value={addDraft.empId} onChange={(e) => setAddDraft((d) => ({ ...d, empId: e.target.value }))} style={css(inp + ';min-width:160px')}>{empOpts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
          <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Team</span><select value={addDraft.team} onChange={(e) => setAddDraft((d) => ({ ...d, team: e.target.value }))} style={css(inp)}>{['darwin', 'mauricio'].map((t) => <option key={t} value={t}>{TEAM_LABEL[t]}</option>)}</select></label>
          <label style={css('display:flex;flex-direction:column;gap:3px;flex:1;min-width:200px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Job site</span><select value={addDraft.location} onChange={(e) => setAddDraft((d) => ({ ...d, location: e.target.value }))} style={css(inp + ';min-width:200px')}><option value="">(no site)</option>{siteOpts.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
          <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Hours</span><input type="number" step="0.5" value={addDraft.hours} onChange={(e) => setAddDraft((d) => ({ ...d, hours: e.target.value }))} style={css(inp + ';width:80px;text-align:right;font-family:var(--font-mono)')} /></label>
          <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Base $</span><input type="number" step="0.01" value={addDraft.subtotal} onChange={(e) => setAddDraft((d) => ({ ...d, subtotal: e.target.value }))} style={css(inp + ';width:100px;text-align:right;font-family:var(--font-mono)')} /></label>
          <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--green);font-weight:700')}>+Add</span><input type="number" step="0.01" value={addDraft.addition} onChange={(e) => setAddDraft((d) => ({ ...d, addition: e.target.value }))} style={css(inp + ';width:90px;text-align:right;font-family:var(--font-mono)')} /></label>
          <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--red);font-weight:700')}>−Ded</span><input type="number" step="0.01" value={addDraft.deduction} onChange={(e) => setAddDraft((d) => ({ ...d, deduction: e.target.value }))} style={css(inp + ';width:90px;text-align:right;font-family:var(--font-mono)')} /></label>
          <label style={css('display:flex;flex-direction:column;gap:3px;flex:1;min-width:160px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Notes</span><input type="text" value={addDraft.notes} onChange={(e) => setAddDraft((d) => ({ ...d, notes: e.target.value }))} style={css(inp + ';min-width:160px')} /></label>
          <div style={css('display:flex;gap:7px')}>
            <button onClick={commitAdd} disabled={!addValid(addDraft)} style={css('background:var(--blue);color:#fff;border:0;border-radius:6px;padding:7px 13px;font-size:12px;font-weight:700;cursor:pointer;' + (addValid(addDraft) ? '' : 'opacity:.5;cursor:not-allowed'))}>Add</button>
            <button onClick={() => setAddDraft(null)} style={css('background:var(--panel-2);color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:7px 11px;font-size:12px;font-weight:600;cursor:pointer')}>Cancel</button>
          </div>
          <div style={css('font-size:10px;flex-basis:100%;' + (addValid(addDraft) ? 'color:var(--faint-2)' : 'color:var(--amber)'))}>{addValid(addDraft) ? 'Manual entries are tagged “added by Oscar Mejia” with the time, and count everywhere (Payroll, Projects, Schedule).' : 'Enter an employee, a date within ' + META.dateMin + '–' + META.dateMax + ', and at least Hours or Base.'}</div>
        </div>
      )}

      <div style={css('flex:1;overflow:auto;padding:16px')}>
        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12px')}>
            <thead><tr>
              <th style={css(th())}>Date</th><th style={css(th())}>Employee</th><th style={css(th())}>Team</th><th style={css(th())}>Location</th>
              <th style={css(th('right'))}>Hrs</th><th style={css(th('right'))}>Base</th><th style={css(th('right'))}>+Add</th><th style={css(th('right'))}>−Ded</th><th style={css(th('right'))}>Net</th><th style={css(th())}>Notes</th><th style={css(th('right'))}></th>
            </tr></thead>
            <tbody>
              {shown.map((e) => (
                <React.Fragment key={e._id}>
                  <tr style={e.review ? css('background:rgba(255,172,24,.06)') : e.edited || e.manual ? css('background:rgba(47,130,255,.05)') : undefined}>
                    <td style={css(td + ';font-family:var(--font-mono);color:var(--faint);white-space:nowrap')}>{fmtDate(e.date)}</td>
                    <td style={css(td)}>
                      <div style={css('display:flex;align-items:center;gap:6px;flex-wrap:wrap')}>
                        <span style={css('font-weight:600')}>{e.name}</span>
                        {e.manual && <Badge color="blue">manual</Badge>}
                        {e.review && <span title={e.review} style={css('color:var(--amber);cursor:help;font-size:11px;font-weight:700')}>⚠ review</span>}
                      </div>
                      {(e.manual || e.edited) && <div style={css('font-size:9px;color:var(--blue-hi);font-family:var(--font-mono);margin-top:1px')}>{e.manual ? 'added by ' + (e.addedBy || '').split(' ')[0] + ' · ' + fmtWhen(e.addedAt) : '✎ ' + e.edited.by.split(' ')[0] + ' · ' + fmtWhen(e.edited.at)}</div>}
                    </td>
                    <td style={css(td)}><Badge color={TEAM_COLOR[e.team]}>{TEAM_LABEL[e.team]}</Badge></td>
                    <td style={css(td + ';color:var(--muted);max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={e.location}>{e.location || '—'}</td>
                    {numCell(e.hours || '')}
                    {numCell(e.subtotal ? money(e.subtotal) : '')}
                    {numCell(e.addition ? money(e.addition) : '', 'var(--green)')}
                    {numCell(e.deduction ? money(e.deduction) : '', 'var(--red)')}
                    <td style={css(td + ';text-align:right;font-family:var(--font-mono);font-weight:700')}>{e.total ? money(e.total) : ''}</td>
                    <td style={css(td + ';color:var(--faint-2);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={e.notes}>{e.notes || ''}</td>
                    <td style={css(td + ';text-align:right;white-space:nowrap')}>
                      <button onClick={() => (editId === e._id ? cancelEdit() : beginEdit(e))} title="Edit this entry" style={css('width:24px;height:24px;border-radius:6px;background:transparent;border:1px solid var(--line);cursor:pointer;color:' + (editId === e._id ? 'var(--blue-hi)' : 'var(--muted)'))}>{editId === e._id ? '✕' : '✎'}</button>
                      {e.manual && <button onClick={() => deleteEntry(e._id)} title="Delete this manual entry" style={css('width:24px;height:24px;border-radius:6px;background:transparent;border:1px solid var(--line);cursor:pointer;color:var(--red);margin-left:5px')}>🗑</button>}
                    </td>
                  </tr>
                  {editId === e._id && draft && (
                    <tr>
                      <td colSpan={11} style={css('padding:11px 14px;background:var(--inset);border-bottom:1px solid var(--line)')}>
                        <div style={css('display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end')}>
                          <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Hours</span><input type="number" step="0.5" value={draft.hours} onChange={(ev) => setDraft((d) => ({ ...d, hours: ev.target.value }))} style={css(inp + ';width:80px;text-align:right;font-family:var(--font-mono)')} /></label>
                          <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Base $</span><input type="number" step="0.01" value={draft.subtotal} onChange={(ev) => setDraft((d) => ({ ...d, subtotal: ev.target.value }))} style={css(inp + ';width:100px;text-align:right;font-family:var(--font-mono)')} /></label>
                          <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--green);font-weight:700')}>+Add</span><input type="number" step="0.01" value={draft.addition} onChange={(ev) => setDraft((d) => ({ ...d, addition: ev.target.value }))} style={css(inp + ';width:90px;text-align:right;font-family:var(--font-mono)')} /></label>
                          <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--red);font-weight:700')}>−Ded</span><input type="number" step="0.01" value={draft.deduction} onChange={(ev) => setDraft((d) => ({ ...d, deduction: ev.target.value }))} style={css(inp + ';width:90px;text-align:right;font-family:var(--font-mono)')} /></label>
                          <label style={css('display:flex;flex-direction:column;gap:3px;flex:1;min-width:200px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Job site (syncs with Projects)</span><select value={draft.location} onChange={(ev) => setDraft((d) => ({ ...d, location: ev.target.value }))} style={css(inp + ';min-width:200px')}>{draft.location && !siteOpts.includes(draft.location) && <option value={draft.location}>{draft.location}</option>}<option value="">(no site)</option>{siteOpts.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
                          <label style={css('display:flex;flex-direction:column;gap:3px;flex:1;min-width:180px')}><span style={css('font-size:9.5px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Notes</span><input type="text" value={draft.notes} onChange={(ev) => setDraft((d) => ({ ...d, notes: ev.target.value }))} style={css(inp + ';min-width:180px')} /></label>
                          <div style={css('display:flex;gap:8px;align-items:center')}>
                            <button onClick={() => commitEdit(e)} style={css('background:var(--blue);color:#fff;border:0;border-radius:6px;padding:7px 13px;font-size:12px;font-weight:700;cursor:pointer')}>Save</button>
                            <button onClick={cancelEdit} style={css('background:var(--panel-2);color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:7px 11px;font-size:12px;font-weight:600;cursor:pointer')}>Cancel</button>
                            {e.edited && <button onClick={() => resetEdit(e)} title="Revert to imported values" style={css('background:transparent;color:var(--red);border:0;font-size:11px;cursor:pointer;text-decoration:underline')}>Reset</button>}
                          </div>
                        </div>
                        {e.review && <div style={css('font-size:10.5px;color:var(--amber);margin-top:7px')}>⚠ {e.review} — adjust the values above and Save to resolve.</div>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {shown.length === 0 && <tr><td colSpan={11} style={css('padding:26px;text-align:center;color:var(--faint)')}>{reviewOnly ? 'Nothing needs review in this window.' : 'No entries for this team and date range.'}</td></tr>}
            </tbody>
          </table>
          {entries.length > CAP && (
            <div style={css('padding:10px 14px;font-size:11px;color:var(--faint);border-top:1px solid var(--line-soft)')}>Showing the {CAP} most recent of {entries.length.toLocaleString('en-US')} — narrow the team or dates, or Export CSV for the full set.</div>
          )}
        </div>
      </div>
    </div>
  )
}
