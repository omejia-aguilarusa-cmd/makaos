import React, { useState, useMemo } from 'react'
import { css } from '../lib/css.js'
import { filterEntries, employeeById, fmtH, META, TEAM_LABEL } from '../lib/macPayroll.js'

// Real work timeline for the Mac Painters crew: a heatmap of weekly hours per
// employee, colored by the team they worked under. Shows who was on the tools
// when, across both partners' books.

const dayNum = (s) => { const [y, m, d] = s.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000) }
const mondayOf = (n) => { const dow = (n + 4) % 7; return n - ((dow + 6) % 7) }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const labelOf = (mondayDays) => { const dt = new Date(mondayDays * 86400000); return { m: dt.getUTCMonth(), d: dt.getUTCDate(), y: dt.getUTCFullYear() } }
const cellColor = (t) => (t.has('darwin') && t.has('mauricio') ? '#a855f7' : t.has('darwin') ? '#2f82ff' : '#18d6e8')

const segStyle = (active) => {
  const b = 'background:transparent;border:0;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;color:var(--muted);white-space:nowrap'
  return active ? b + ';background:var(--panel-3);color:var(--text)' : b
}
const COL = 22, ROW = 26, NAME_W = 210

export default function MacScheduleView({ ModeToggle }) {
  const [team, setTeam] = useState('both')

  const { weeks, rows } = useMemo(() => {
    const startM = mondayOf(dayNum(META.dateMin)), endM = mondayOf(dayNum(META.dateMax))
    const weeks = []
    for (let m = startM; m <= endM; m += 7) weeks.push(m)
    const wIdx = Object.fromEntries(weeks.map((m, i) => [m, i]))
    const emp = {}
    for (const e of filterEntries(team, META.dateMin, META.dateMax)) {
      const wi = wIdx[mondayOf(dayNum(e.date))]
      if (wi == null) continue
      const a = emp[e.empId] || (emp[e.empId] = { hours: 0, total: 0, teams: new Set(), w: {} })
      a.hours += e.hours; a.total += e.total; a.teams.add(e.team)
      const c = a.w[wi] || (a.w[wi] = { h: 0, t: new Set() })
      c.h += e.hours; c.t.add(e.team)
    }
    const rows = Object.entries(emp)
      .map(([id, d]) => ({ emp: employeeById(id) || { id, name: id, role: '' }, ...d }))
      .sort((a, b) => b.hours - a.hours)
    return { weeks, rows }
  }, [team])

  // month label segments across the header
  const monthMarks = weeks.map((m, i) => ({ i, ...labelOf(m) }))

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0;flex-wrap:wrap')}>
        {ModeToggle}
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {['both', 'darwin', 'mauricio'].map((t) => <button key={t} onClick={() => setTeam(t)} style={css(segStyle(team === t))}>{TEAM_LABEL[t]}</button>)}
        </div>
        <div style={css('flex:1')} />
        <div style={css('display:flex;gap:13px;align-items:center;font-size:10.5px;color:var(--faint)')}>
          <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:10px;height:10px;border-radius:3px;background:#2f82ff')} />Darwin</span>
          <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:10px;height:10px;border-radius:3px;background:#18d6e8')} />Mauricio</span>
          <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:10px;height:10px;border-radius:3px;background:#a855f7')} />Both</span>
          <span style={css('color:var(--faint-2)')}>· darker = more hours that week</span>
        </div>
      </div>

      <div style={css('flex:1;overflow:auto;background:var(--bg)')}>
        <div style={{ width: NAME_W + weeks.length * COL + 'px', minWidth: '100%' }}>
          {/* header: month labels */}
          <div style={css('display:flex;position:sticky;top:0;z-index:3;background:var(--panel);border-bottom:1px solid var(--line);height:26px')}>
            <div style={{ ...css('flex-shrink:0;position:sticky;left:0;background:var(--panel);border-right:1px solid var(--line);display:flex;align-items:center;padding:0 12px;font-size:10px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;z-index:1'), width: NAME_W + 'px' }}>Painter</div>
            <div style={css('position:relative;flex:1')}>
              {monthMarks.map((mk, idx) => (
                (idx === 0 || mk.m !== monthMarks[idx - 1].m) && (
                  <span key={idx} style={{ ...css('position:absolute;top:0;height:26px;display:flex;align-items:center;font-size:10px;font-weight:700;color:var(--muted);white-space:nowrap;padding-left:3px;border-left:1px solid var(--line-soft)'), left: mk.i * COL + 'px' }}>{MONTHS[mk.m]}{mk.m === 0 ? " '" + String(mk.y).slice(2) : ''}</span>
                )
              ))}
            </div>
          </div>
          {/* rows */}
          {rows.map((r) => (
            <div key={r.emp.id} style={css('display:flex;height:' + ROW + 'px;border-bottom:1px solid var(--line-soft)')}>
              <div style={{ ...css('flex-shrink:0;position:sticky;left:0;background:var(--panel);border-right:1px solid var(--line);display:flex;align-items:center;gap:7px;padding:0 12px;z-index:1'), width: NAME_W + 'px' }}>
                <span style={{ ...css('width:7px;height:7px;border-radius:50%;flex-shrink:0'), background: cellColor(r.teams) }} />
                <span style={css('font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1')}>{r.emp.name}{r.emp.you ? ' (You)' : ''}</span>
                <span style={css('font-size:10px;color:var(--faint-2);font-family:var(--font-mono);flex-shrink:0')}>{fmtH(r.hours)}</span>
              </div>
              <div style={css('position:relative;flex:1')}>
                {weeks.map((m, wi) => {
                  const c = r.w[wi]
                  if (!c || !c.h) return null
                  const op = 0.25 + 0.75 * Math.min(1, c.h / 40)
                  const lab = labelOf(m)
                  return (
                    <span key={wi} title={`${MONTHS[lab.m]} ${lab.d}: ${c.h}h · ${[...c.t].map((t) => TEAM_LABEL[t]).join(' + ')}`}
                      style={{ position: 'absolute', left: wi * COL + 2 + 'px', top: '4px', width: COL - 4 + 'px', height: ROW - 8 + 'px', borderRadius: '3px', background: cellColor(c.t), opacity: op }} />
                  )
                })}
              </div>
            </div>
          ))}
          {rows.length === 0 && <div style={css('padding:30px;text-align:center;color:var(--faint)')}>No work logged for this team.</div>}
        </div>
      </div>
    </div>
  )
}
