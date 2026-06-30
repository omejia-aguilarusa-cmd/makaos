import React, { useState, useMemo } from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { Badge } from '../ds/index.jsx'
import { filterEntries, employeeById, money, fmtH, fmtDate, META, TEAM_LABEL, TEAM_COLOR } from '../lib/macPayroll.js'
import { downloadCSV } from '../lib/csv.js'

const th = (align = 'left') => `text-align:${align};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2);white-space:nowrap`
const td = 'padding:8px 11px;border-bottom:1px solid var(--line-soft)'
const segStyle = (active) => {
  const b = 'background:transparent;border:0;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;color:var(--muted);white-space:nowrap'
  return active ? b + ';background:var(--panel-3);color:var(--text)' : b
}
const dateInput = 'background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 9px;font-size:12.5px;color:var(--text);outline:none;font-family:var(--font-mono)'
const CAP = 600

export default function TimeLogsScreen({ v }) {
  const [mode, setMode] = useState('mac')
  const [team, setTeam] = useState('both')
  const [from, setFrom] = useState(META.dateMin)
  const [to, setTo] = useState(META.dateMax)
  const [q, setQ] = useState('')

  const entries = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return filterEntries(team, from, to)
      .map((e) => ({ ...e, name: (employeeById(e.empId) || {}).name || e.empId }))
      .filter((e) => !ql || e.name.toLowerCase().includes(ql) || (e.location || '').toLowerCase().includes(ql))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.name.localeCompare(b.name)))
  }, [team, from, to, q])

  const ModeToggle = (
    <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
      <button onClick={() => setMode('mac')} style={css(segStyle(mode === 'mac'))}>Mac Painters · real</button>
      <button onClick={() => setMode('demo')} style={css(segStyle(mode === 'demo'))}>Demo</button>
    </div>
  )

  if (mode === 'demo') {
    return (
      <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
        <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0')}>
          {ModeToggle}
          <span style={css('font-size:12.5px;color:var(--muted)')}>All recorded hours across crews</span>
          <div style={css('flex:1')}></div>
          <button onClick={v.logHoursTop} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer')}>+ Log hours</button>
        </div>
        <div style={css('flex:1;overflow:auto;padding:16px')}>
          <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
            <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
              <thead><tr>
                <th style={css(th())}>Employee</th><th style={css(th())}>Project</th><th style={css(th())}>Date</th>
                <th style={css(th('right'))}>Reg</th><th style={css(th('right'))}>OT</th><th style={css(th())}>Notes</th><th style={css(th())}>Status</th>
              </tr></thead>
              <tbody>
                {v.tlRows.map((l) => (
                  <Box as="tr" key={l.id} onClick={l.onOpen} style={css('cursor:pointer')} hover="background:var(--panel-2)">
                    <td style={css(td)}><div style={css('display:flex;align-items:center;gap:8px')}><div style={l.avatarStyle}>{l.initials}</div><span style={css('font-weight:600')}>{l.name}</span></div></td>
                    <td style={css(td + ';color:var(--muted)')}>{l.project}</td>
                    <td style={css(td + ';font-family:var(--font-mono);color:var(--faint)')}>{l.date}</td>
                    <td style={css(td + ';text-align:right;font-family:var(--font-mono)')}>{l.reg}</td>
                    <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--amber)')}>{l.ot}</td>
                    <td style={css(td + ';color:var(--faint)')}>{l.notes}</td>
                    <td style={css(td)}><Badge color={l.statusColor}>{l.status}</Badge></td>
                  </Box>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const exportCSV = () => {
    const headers = ['Date', 'Employee', 'Team', 'Location', 'Hours', 'Base', 'Additions', 'Deductions', 'Net', 'Notes']
    const data = entries.map((e) => [e.date, e.name, e.team, e.location, e.hours, e.subtotal, e.addition, e.deduction, e.total, e.notes])
    downloadCSV(`mac-painters-timelogs_${team}_${from}_${to}.csv`, headers, data)
  }
  const shown = entries.slice(0, CAP)
  const totH = entries.reduce((s, e) => s + e.hours, 0)

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0;flex-wrap:wrap')}>
        {ModeToggle}
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {['both', 'darwin', 'mauricio'].map((t) => <button key={t} onClick={() => setTeam(t)} style={css(segStyle(team === t))}>{TEAM_LABEL[t]}</button>)}
        </div>
        <span style={css('display:inline-flex;align-items:center;gap:6px')}>
          <input type="date" value={from} min={META.dateMin} max={to} onChange={(e) => setFrom(e.target.value || META.dateMin)} style={css(dateInput)} />
          <span style={css('color:var(--faint-2)')}>→</span>
          <input type="date" value={to} min={from} max={META.dateMax} onChange={(e) => setTo(e.target.value || META.dateMax)} style={css(dateInput)} />
        </span>
        <input placeholder="Search name or location…" value={q} onChange={(e) => setQ(e.target.value)} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:200px;outline:none')} />
        <div style={css('flex:1')} />
        <span style={css('font-size:11px;color:var(--faint);font-family:var(--font-mono)')}>{entries.length.toLocaleString('en-US')} entries · {fmtH(totH)}</span>
        <button onClick={exportCSV} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer')}>Export CSV</button>
      </div>
      <div style={css('flex:1;overflow:auto;padding:16px')}>
        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12px')}>
            <thead><tr>
              <th style={css(th())}>Date</th><th style={css(th())}>Employee</th><th style={css(th())}>Team</th><th style={css(th())}>Location</th>
              <th style={css(th('right'))}>Hrs</th><th style={css(th('right'))}>Base</th><th style={css(th('right'))}>+Add</th><th style={css(th('right'))}>−Ded</th><th style={css(th('right'))}>Net</th><th style={css(th())}>Notes</th>
            </tr></thead>
            <tbody>
              {shown.map((e, i) => (
                <tr key={i}>
                  <td style={css(td + ';font-family:var(--font-mono);color:var(--faint);white-space:nowrap')}>{fmtDate(e.date)}</td>
                  <td style={css(td + ';font-weight:600')}>{e.name}</td>
                  <td style={css(td)}><Badge color={TEAM_COLOR[e.team]}>{TEAM_LABEL[e.team]}</Badge></td>
                  <td style={css(td + ';color:var(--muted);max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={e.location}>{e.location || '—'}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono)')}>{e.hours || ''}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono)')}>{e.subtotal ? money(e.subtotal) : ''}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--green)')}>{e.addition ? money(e.addition) : ''}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--red)')}>{e.deduction ? money(e.deduction) : ''}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);font-weight:700')}>{e.total ? money(e.total) : ''}</td>
                  <td style={css(td + ';color:var(--faint-2);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={e.notes}>{e.notes || ''}</td>
                </tr>
              ))}
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
