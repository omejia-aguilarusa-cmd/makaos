import React, { useState, useMemo } from 'react'
import { css } from '../lib/css.js'
import { jobSites, filterEntries, employeeById, fmtH, fmtDate, META, TEAM_LABEL } from '../lib/macPayroll.js'
import { useEdits, siteSchedule, saveSiteSchedule } from '../lib/edits.js'

// Gantt timeline for the Schedule page — per project (job site) or per employee.
// Bars show the actual work span (first → last day logged); per project you can
// also set a PLANNED start, a deadline, and an order (sequence), stored in the
// edit overlay. Deadlines show as a red marker; ordering answers "what's next".

const dayNum = (s) => { const [y, m, d] = s.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000) }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PXD = 3.4
const NAME_W = 250
const ROW = 30
const teamColor = (teams) => (teams.length > 1 ? '#a855f7' : teams[0] === 'darwin' ? '#2f82ff' : '#18d6e8')
const seg = (active) => {
  const b = 'background:transparent;border:0;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;color:var(--muted);white-space:nowrap'
  return active ? b + ';background:var(--panel-3);color:var(--text)' : b
}
const dInput = 'background:var(--input-bg);border:1px solid var(--line);border-radius:6px;padding:5px 7px;font-size:11.5px;color:var(--text);outline:none;font-family:var(--font-mono)'

export default function GanttView({ ModeToggle }) {
  const editV = useEdits()
  const [group, setGroup] = useState('project') // project | employee
  const [team, setTeam] = useState('both')
  const [q, setQ] = useState('')
  const [editKey, setEditKey] = useState(null)
  const [sd, setSd] = useState(null) // schedule draft

  const D0 = dayNum(META.dateMin)
  const D1 = dayNum(META.dateMax)
  const totalDays = D1 - D0 + 1
  const width = totalDays * PXD
  const xFor = (s) => (dayNum(s) - D0) * PXD
  const wFor = (a, b) => Math.max(5, (dayNum(b) - dayNum(a) + 1) * PXD)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const todayX = todayStr >= META.dateMin && todayStr <= META.dateMax ? xFor(todayStr) : null

  const months = useMemo(() => {
    const out = []
    for (let n = D0; n <= D1; n++) {
      const dt = new Date(n * 86400000)
      const m = dt.getUTCMonth(); const y = dt.getUTCFullYear()
      const prev = out[out.length - 1]
      if (!prev || prev.m !== m || prev.y !== y) out.push({ m, y, x: (n - D0) * PXD })
    }
    return out
  }, [D0, D1])

  const projRows = useMemo(() => {
    void editV
    const { rows } = jobSites(team, META.dateMin, META.dateMax, { q })
    return rows
      .map((r) => {
        const sc = siteSchedule(r.key) || {}
        return { ...r, planStart: sc.start || null, deadline: sc.deadline || null, order: sc.order == null ? null : sc.order, start: sc.start || r.first, end: sc.deadline && sc.deadline > r.last ? sc.deadline : r.last }
      })
      .sort((a, b) => {
        if (a.order != null || b.order != null) return (a.order == null ? 1e9 : a.order) - (b.order == null ? 1e9 : b.order)
        return a.start < b.start ? -1 : a.start > b.start ? 1 : 0
      })
  }, [team, q, editV])

  const empRows = useMemo(() => {
    void editV
    const ql = q.trim().toLowerCase()
    const by = {}
    for (const e of filterEntries(team, META.dateMin, META.dateMax)) {
      const emp = by[e.empId] || (by[e.empId] = { id: e.empId, name: (employeeById(e.empId) || {}).name || e.empId, segs: {}, hours: 0 })
      emp.hours += e.hours
      const key = e.location || '(no site)'
      const s = emp.segs[key] || (emp.segs[key] = { loc: key, first: e.date, last: e.date, teams: new Set(), hours: 0 })
      if (e.date < s.first) s.first = e.date
      if (e.date > s.last) s.last = e.date
      s.teams.add(e.team); s.hours += e.hours
    }
    return Object.values(by)
      .filter((emp) => !ql || emp.name.toLowerCase().includes(ql))
      .map((emp) => ({ ...emp, segs: Object.values(emp.segs).map((s) => ({ ...s, teams: [...s.teams] })).sort((a, b) => (a.first < b.first ? -1 : 1)) }))
      .sort((a, b) => b.hours - a.hours)
  }, [team, q, editV])

  const openSched = (r) => { setEditKey(r.key); setSd({ start: r.planStart || '', deadline: r.deadline || '', order: r.order == null ? '' : String(r.order) }) }
  const saveSched = (r) => { saveSiteSchedule(r.key, { start: sd.start, deadline: sd.deadline, order: sd.order }); setEditKey(null); setSd(null) }
  const clearSched = (r) => { saveSiteSchedule(r.key, { start: null, deadline: null, order: null }); setEditKey(null); setSd(null) }

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0;flex-wrap:wrap')}>
        {ModeToggle}
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {['project', 'employee'].map((g) => <button key={g} onClick={() => setGroup(g)} style={css(seg(group === g))}>By {g}</button>)}
        </div>
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {['both', 'darwin', 'mauricio'].map((t) => <button key={t} onClick={() => setTeam(t)} style={css(seg(team === t))}>{TEAM_LABEL[t]}</button>)}
        </div>
        <input placeholder={group === 'project' ? 'Search job site…' : 'Search employee…'} value={q} onChange={(e) => setQ(e.target.value)} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:170px;outline:none')} />
        <div style={css('flex:1')} />
        <span style={css('font-size:10.5px;color:var(--faint)')}>{group === 'project' ? 'Set planned start / deadline / order on a project (✎). ' : ''}Bars = first → last day worked.</span>
      </div>

      <div style={css('flex:1;overflow:auto;background:var(--bg)')}>
        <div style={{ width: NAME_W + width + 'px', minWidth: '100%' }}>
          {/* month header */}
          <div style={css('display:flex;position:sticky;top:0;z-index:3;background:var(--panel);border-bottom:1px solid var(--line);height:26px')}>
            <div style={{ ...css('flex-shrink:0;position:sticky;left:0;background:var(--panel);border-right:1px solid var(--line);display:flex;align-items:center;padding:0 12px;font-size:10px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;z-index:1'), width: NAME_W + 'px' }}>{group === 'project' ? 'Project (job site)' : 'Employee'}</div>
            <div style={css('position:relative;flex:1')}>
              {months.map((mk, i) => (
                <span key={i} style={{ ...css('position:absolute;top:0;height:26px;display:flex;align-items:center;font-size:10px;font-weight:700;color:var(--muted);white-space:nowrap;padding-left:3px;border-left:1px solid var(--line-soft)'), left: mk.x + 'px' }}>{MONTHS[mk.m]}{mk.m === 0 || i === 0 ? " '" + String(mk.y).slice(2) : ''}</span>
              ))}
              {todayX != null && <span style={{ position: 'absolute', top: 0, bottom: 0, left: todayX + 'px', width: '2px', background: 'var(--blue)', opacity: 0.7 }} />}
            </div>
          </div>

          {/* PROJECT rows */}
          {group === 'project' && projRows.map((r) => (
            <React.Fragment key={r.key}>
              <div style={css('display:flex;height:' + ROW + 'px;border-bottom:1px solid var(--line-soft)')}>
                <div style={{ ...css('flex-shrink:0;position:sticky;left:0;background:var(--panel);border-right:1px solid var(--line);display:flex;align-items:center;gap:6px;padding:0 10px;z-index:1'), width: NAME_W + 'px' }}>
                  {r.order != null && <span style={css('font-size:9.5px;font-weight:800;color:var(--blue-hi);font-family:var(--font-mono);min-width:16px')}>#{r.order}</span>}
                  <span style={css('font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1')} title={r.name}>{r.name}</span>
                  <button onClick={() => (editKey === r.key ? (setEditKey(null), setSd(null)) : openSched(r))} title="Set planned start / deadline / order" style={css('width:22px;height:22px;border-radius:5px;background:transparent;border:1px solid var(--line);cursor:pointer;color:' + (editKey === r.key ? 'var(--blue-hi)' : 'var(--faint)') + ';flex-shrink:0')}>✎</button>
                </div>
                <div style={css('position:relative;flex:1')}>
                  {todayX != null && <span style={{ position: 'absolute', top: 0, bottom: 0, left: todayX + 'px', width: '2px', background: 'var(--blue)', opacity: 0.5 }} />}
                  <div title={`${r.name} · ${fmtDate(r.start)} – ${fmtDate(r.end)} · ${fmtH(r.hours)} · ${r.painters} painters${r.planStart ? ' · planned ' + r.planStart : ''}${r.deadline ? ' · deadline ' + r.deadline : ''}`}
                    style={{ position: 'absolute', left: xFor(r.start) + 'px', width: wFor(r.start, r.end) + 'px', top: '6px', height: ROW - 12 + 'px', borderRadius: '4px', background: teamColor(r.teamsIn), opacity: 0.9, display: 'flex', alignItems: 'center', padding: '0 6px', overflow: 'hidden', border: r.planStart || r.deadline ? '1px dashed rgba(255,255,255,.5)' : 'none' }}>
                    <span style={css('font-size:10px;font-weight:600;color:#06080d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{fmtH(r.hours)}</span>
                  </div>
                  {r.deadline && <span title={'Deadline ' + r.deadline} style={{ position: 'absolute', left: xFor(r.deadline) - 5 + 'px', top: ROW / 2 - 5 + 'px', width: '10px', height: '10px', transform: 'rotate(45deg)', background: 'var(--panel)', border: '2px solid var(--red)', zIndex: 2 }} />}
                </div>
              </div>
              {editKey === r.key && sd && (
                <div style={css('display:flex;gap:12px;align-items:flex-end;padding:9px 12px 9px ' + (NAME_W - 240) + 'px;background:var(--inset);border-bottom:1px solid var(--line);flex-wrap:wrap')}>
                  <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Planned start</span><input type="date" value={sd.start} min={META.dateMin} onChange={(e) => setSd((d) => ({ ...d, start: e.target.value }))} style={css(dInput)} /></label>
                  <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9px;text-transform:uppercase;color:var(--red);font-weight:700')}>Deadline</span><input type="date" value={sd.deadline} onChange={(e) => setSd((d) => ({ ...d, deadline: e.target.value }))} style={css(dInput)} /></label>
                  <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Order</span><input type="number" step="1" value={sd.order} placeholder="—" onChange={(e) => setSd((d) => ({ ...d, order: e.target.value }))} style={css(dInput + ';width:70px;text-align:right')} /></label>
                  <button onClick={() => saveSched(r)} style={css('background:var(--blue);color:#fff;border:0;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer')}>Save</button>
                  <button onClick={() => { setEditKey(null); setSd(null) }} style={css('background:var(--panel-2);color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer')}>Cancel</button>
                  {(r.planStart || r.deadline || r.order != null) && <button onClick={() => clearSched(r)} style={css('background:transparent;color:var(--red);border:0;font-size:11px;cursor:pointer;text-decoration:underline')}>Clear</button>}
                  <span style={css('font-size:10px;color:var(--faint-2)')}>Actual work: {fmtDate(r.first)} – {fmtDate(r.last)}</span>
                </div>
              )}
            </React.Fragment>
          ))}

          {/* EMPLOYEE rows */}
          {group === 'employee' && empRows.map((emp) => (
            <div key={emp.id} style={css('display:flex;height:' + ROW + 'px;border-bottom:1px solid var(--line-soft)')}>
              <div style={{ ...css('flex-shrink:0;position:sticky;left:0;background:var(--panel);border-right:1px solid var(--line);display:flex;align-items:center;gap:7px;padding:0 12px;z-index:1'), width: NAME_W + 'px' }}>
                <span style={css('font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1')}>{emp.name}</span>
                <span style={css('font-size:10px;color:var(--faint-2);font-family:var(--font-mono)')}>{fmtH(emp.hours)}</span>
              </div>
              <div style={css('position:relative;flex:1')}>
                {todayX != null && <span style={{ position: 'absolute', top: 0, bottom: 0, left: todayX + 'px', width: '2px', background: 'var(--blue)', opacity: 0.5 }} />}
                {emp.segs.map((s, i) => (
                  <div key={i} title={`${s.loc} · ${fmtDate(s.first)} – ${fmtDate(s.last)} · ${fmtH(s.hours)}`}
                    style={{ position: 'absolute', left: xFor(s.first) + 'px', width: wFor(s.first, s.last) + 'px', top: '7px', height: ROW - 14 + 'px', borderRadius: '3px', background: teamColor(s.teams), opacity: 0.85 }} />
                ))}
              </div>
            </div>
          ))}

          {((group === 'project' && projRows.length === 0) || (group === 'employee' && empRows.length === 0)) && (
            <div style={css('padding:30px;text-align:center;color:var(--faint)')}>Nothing to show for this team / search.</div>
          )}
        </div>
      </div>
    </div>
  )
}
