import React, { useState, useMemo, useEffect } from 'react'
import { css } from '../lib/css.js'
import { Badge } from '../ds/index.jsx'
import { Avatar, avatarStyle, initials, THEAD, TD, Tile, useEscapeClose } from '../ui/bits.jsx'
import {
  payroll, employeeEntries, siteKeyOf, money, fmtH, fmtDate, META, TEAM_LABEL,
} from '../lib/macPayroll.js'
import { useEdits, saveCrew } from '../lib/edits.js'
import { CREWS, crewFor, crewName, colorForKey, splitAddress } from '../lib/projects.js'

// Painters — the crew roster. Each row is a real employee with their period
// hours, pay, crew and the sites they're active on. Click for a full profile.

const daysTo = (d) => (Date.parse(META.dateMax + 'T00:00:00') - Date.parse(d + 'T00:00:00')) / 86400000

// The distinct job sites a painter logged in the window, newest first.
function painterProjects(empId) {
  const by = {}
  for (const e of employeeEntries(empId, 'both', META.dateMin, META.dateMax)) {
    if (!e.location) continue
    const k = siteKeyOf(e.location)
    const a = by[k] || (by[k] = { key: k, name: e.location, hours: 0, cost: 0, last: '' })
    a.hours += e.hours; a.cost += e.total
    if (e.date > a.last) { a.last = e.date; a.name = e.location }
  }
  return Object.values(by).sort((x, y) => (x.last < y.last ? 1 : -1))
}

function availability(emp, lastDate) {
  if (emp.status === 'Inactive') return { label: 'Inactive', color: 'red' }
  if (lastDate && daysTo(lastDate) <= 21) return { label: 'On a job', color: 'blue' }
  return { label: 'Available', color: 'green' }
}

export default function PaintersScreen({ crewFilter, onOpenProject }) {
  const editV = useEdits()
  const [q, setQ] = useState('')
  const [crew, setCrew] = useState(crewFilter || 'all')
  const [selId, setSelId] = useState(null)

  useEffect(() => { setCrew(crewFilter || 'all') }, [crewFilter])

  const rows = useMemo(() => {
    void editV
    return payroll('both', META.dateMin, META.dateMax, {}).rows.map((r) => {
      const projs = painterProjects(r.id)
      return { ...r, crew: crewFor(r.id), projs, avail: availability(r, r.last) }
    })
  }, [editV])

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return rows
      .filter((r) => (crew === 'all' || r.crew === crew) && (!ql || r.name.toLowerCase().includes(ql)))
      .sort((a, b) => b.hours - a.hours)
  }, [rows, crew, q])

  const sel = selId ? rows.find((r) => r.id === selId) : null

  const segStyle = (active) => 'background:transparent;border:0;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;color:var(--muted)' + (active ? ';background:var(--panel-3);color:var(--text)' : '')

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0;flex-wrap:wrap')}>
        <input placeholder="Search painters…" value={q} onChange={(e) => setQ(e.target.value)} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:220px;outline:none')} />
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          <button onClick={() => setCrew('all')} style={css(segStyle(crew === 'all'))}>All</button>
          {CREWS.map((c) => <button key={c.id} onClick={() => setCrew(c.id)} style={css(segStyle(crew === c.id))}>{c.name}</button>)}
        </div>
        <div style={css('flex:1')} />
        <span style={css('font-size:12px;color:var(--faint);font-family:var(--font-mono)')}>{filtered.length} painters</span>
      </div>

      <div style={css('flex:1;overflow:auto;padding:16px')}>
        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead><tr>
              {['Painter', 'Crew', 'Pay type', 'Rate', 'Hours', 'Availability', 'Active projects'].map((h, i) => (
                <th key={h} style={css(`text-align:${i === 3 || i === 4 ? 'right' : 'left'};${THEAD}`)}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} onClick={() => setSelId(r.id)} style={css('cursor:pointer')}>
                  <td style={css(TD)}><div style={css('display:flex;align-items:center;gap:9px')}><Avatar name={r.name} /><div><div style={css('font-weight:600')}>{r.name}{r.you ? ' (You)' : ''}</div><div style={css('font-size:10.5px;color:var(--faint)')}>{r.role}</div></div></div></td>
                  <td style={css(TD)}><span style={css('display:inline-flex;align-items:center;gap:6px')}><span style={css('width:8px;height:8px;border-radius:50%;background:' + (CREWS.find((c) => c.id === r.crew) || {}).color)} />{crewName(r.crew)}</span></td>
                  <td style={css(TD)}><Badge color="default">{r.payType}</Badge></td>
                  <td style={css(TD + ';text-align:right;font-family:var(--font-mono)')}>{r.rate != null ? '$' + r.rate : '—'}</td>
                  <td style={css(TD + ';text-align:right;font-family:var(--font-mono);font-weight:700')}>{fmtH(r.hours)}</td>
                  <td style={css(TD)}><Badge color={r.avail.color}>{r.avail.label}</Badge></td>
                  <td style={css(TD)}>
                    <div style={css('display:flex;gap:4px;flex-wrap:wrap')}>
                      {r.projs.slice(0, 2).map((p) => <span key={p.key} style={css('background:var(--inset);border:1px solid var(--line-soft);border-radius:5px;padding:2px 7px;font-size:10px;color:var(--muted);max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={p.name}>{splitAddress(p.name).address}</span>)}
                      {r.projs.length > 2 && <span style={css('font-size:10px;color:var(--faint);align-self:center')}>+{r.projs.length - 2}</span>}
                      {r.projs.length === 0 && <span style={css('font-size:11px;color:var(--faint-2)')}>—</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={css('padding:28px;text-align:center;color:var(--faint)')}>No painters match this crew and search.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {sel && <PainterDrawer r={sel} onClose={() => setSelId(null)} onOpenProject={onOpenProject} />}
    </div>
  )
}

function PainterDrawer({ r, onClose, onOpenProject }) {
  useEscapeClose(onClose)
  const logs = useMemo(() => employeeEntries(r.id, 'both', META.dateMin, META.dateMax).slice(0, 40), [r.id])
  const set = (crewId) => saveCrew(r.id, crewId === crewFor(r.id) ? null : crewId)
  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={css('position:fixed;inset:0;background:rgba(4,6,10,.5);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:100')} />
      <aside role="dialog" aria-modal="true" aria-label={r.name} style={css('position:fixed;top:12px;right:12px;bottom:12px;width:720px;max-width:94vw;background:var(--panel);border:1px solid var(--line-strong);border-radius:14px;box-shadow:0 28px 70px rgba(0,0,0,.6);z-index:110;display:flex;flex-direction:column;overflow:hidden')}>
        <div style={css('padding:14px 16px;border-bottom:1px solid var(--line-soft);display:flex;align-items:center;gap:9px;flex-shrink:0')}>
          <div style={css('flex:1;min-width:0')}><div style={css('font-size:15px;font-weight:700')}>{r.name}{r.you ? ' (You)' : ''}</div><div style={css('font-size:11.5px;color:var(--faint)')}>{r.role} · {r.teamsIn.map((t) => TEAM_LABEL[t]).join(' + ')}</div></div>
          <Badge color={r.avail.color}>{r.avail.label}</Badge>
          <button onClick={onClose} aria-label="Close" style={css('width:28px;height:28px;border-radius:7px;display:grid;place-items:center;background:transparent;border:1px solid var(--line);cursor:pointer;color:var(--muted)')}>✕</button>
        </div>
        <div style={css('flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px')}>
          <div style={css('display:flex;align-items:center;gap:13px')}>
            <div style={avatarStyle(r.name, 46)}>{initials(r.name)}</div>
            <div style={css('flex:1')}><div style={css('font-size:16px;font-weight:700')}>{r.name}</div><div style={css('font-size:11.5px;color:var(--faint);font-family:var(--font-mono)')}>{r.payType}{r.rate != null ? ' · $' + r.rate : ''} · last logged {fmtDate(r.last)}</div></div>
          </div>

          <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px')}>
            <Tile label="Hours" value={fmtH(r.hours)} />
            <Tile label="Days" value={String(r.days)} />
            <Tile label="Entries" value={String(r.n)} />
            <Tile label="Projects" value={String(r.projs.length)} />
          </div>

          <div>
            <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin-bottom:8px')}>Crew</div>
            <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
              {CREWS.map((c) => <button key={c.id} onClick={() => set(c.id)} style={css('background:' + (crewFor(r.id) === c.id ? 'var(--panel-3)' : 'transparent') + ';border:0;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;color:' + (crewFor(r.id) === c.id ? 'var(--text)' : 'var(--muted)') + ';display:inline-flex;align-items:center;gap:6px')}><span style={css('width:8px;height:8px;border-radius:50%;background:' + c.color)} />{c.name}</button>)}
            </div>
          </div>

          <div>
            <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin-bottom:8px')}>Projects worked</div>
            <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;overflow:hidden')}>
              {r.projs.slice(0, 8).map((p) => (
                <div key={p.key} onClick={() => onOpenProject && onOpenProject(p.key)} style={css('display:flex;align-items:center;gap:10px;padding:10px 13px;border-bottom:1px solid var(--line-soft);cursor:pointer')}>
                  <span style={css('width:3px;height:26px;border-radius:2px;flex-shrink:0;background:' + colorForKey(p.key))} />
                  <div style={css('flex:1;min-width:0')}><div style={css('font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={p.name}>{splitAddress(p.name).address}</div><div style={css('font-size:11px;color:var(--faint)')}>{splitAddress(p.name).city || '—'}</div></div>
                  <div style={css('text-align:right')}><div style={css('font-family:var(--font-mono);font-weight:700')}>{fmtH(p.hours)}</div><div style={css('font-size:10.5px;color:var(--faint);font-family:var(--font-mono)')}>{money(p.cost)}</div></div>
                </div>
              ))}
              {r.projs.length === 0 && <div style={css('padding:14px;color:var(--faint);font-size:12px')}>No sites logged in this period.</div>}
            </div>
          </div>

          <div>
            <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin-bottom:8px')}>Recent time logs</div>
            <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden')}>
              <table style={css('width:100%;border-collapse:collapse;font-size:12px')}>
                <thead><tr>{['Date', 'Job site', 'Hrs', 'Total'].map((h, i) => <th key={h} style={css(`text-align:${i >= 2 ? 'right' : 'left'};${THEAD}`)}>{h}</th>)}</tr></thead>
                <tbody>
                  {logs.map((e, i) => (
                    <tr key={i}>
                      <td style={css(TD + ';font-family:var(--font-mono);color:var(--faint)')}>{fmtDate(e.date)}</td>
                      <td style={css(TD + ';color:var(--muted);max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={e.location}>{e.location || '—'}</td>
                      <td style={css(TD + ';text-align:right;font-family:var(--font-mono)')}>{e.hours || ''}</td>
                      <td style={css(TD + ';text-align:right;font-family:var(--font-mono);font-weight:600')}>{e.total ? money(e.total) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
