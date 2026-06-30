import React, { useState, useMemo } from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { StatCard, Badge } from '../ds/index.jsx'
import { MAC_PAINTERS as DB } from '../lib/macPainters.js'

// Mac Painters — the real merged payroll: Darwin + Mauricio (partners, same
// company). Similar names across both books are counted as one person and
// tagged with the team(s) they were logged under. Pick a team + date range and
// every number recomputes from the dated entries, so the view stays accurate.

const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US')
const fmtH = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US') + 'h'
const fmtDate = (s) => { const [y, m, d] = (s || '').split('-'); return s ? `${m}/${d}/${y.slice(2)}` : '—' }
const TEAM_LABEL = { darwin: 'Darwin', mauricio: 'Mauricio' }
const TEAM_COLOR = { darwin: 'blue', mauricio: 'cyan' }

const segStyle = (active) => {
  const b = 'background:transparent;border:0;padding:5px 13px;border-radius:6px;font-size:12.5px;cursor:pointer;font-weight:600;color:var(--muted);white-space:nowrap'
  return active ? b + ';background:var(--panel-3);color:var(--text)' : b
}
const inputStyle = 'background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 9px;font-size:12.5px;color:var(--text);outline:none;font-family:var(--font-mono)'

export default function MacPaintersScreen() {
  const [team, setTeam] = useState('both') // both | darwin | mauricio
  const [from, setFrom] = useState(DB.meta.dateMin)
  const [to, setTo] = useState(DB.meta.dateMax)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('hours') // hours | amount | name | entries

  const view = useMemo(() => {
    const inSel = (e) => (team === 'both' || e.team === team) && e.date >= from && e.date <= to
    const filtered = DB.entries.filter(inSel)
    const byEmp = {}
    let totH = 0, totA = 0
    for (const e of filtered) {
      totH += e.hours; totA += e.amount
      const a = byEmp[e.empId] || (byEmp[e.empId] = { hours: 0, amount: 0, n: 0, teams: new Set(), last: '' })
      a.hours += e.hours; a.amount += e.amount; a.n += 1; a.teams.add(e.team)
      if (e.date > a.last) a.last = e.date
    }
    const ql = q.trim().toLowerCase()
    let rows = DB.employees
      .filter((emp) => byEmp[emp.id])
      .filter((emp) => !ql || emp.name.toLowerCase().includes(ql) || (emp.variants || []).some((v) => v.toLowerCase().includes(ql)))
      .map((emp) => ({ ...emp, agg: byEmp[emp.id] }))
    rows.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'amount') return b.agg.amount - a.agg.amount
      if (sort === 'entries') return b.agg.n - a.agg.n
      return b.agg.hours - a.agg.hours
    })
    const sharedShown = rows.filter((r) => r.agg.teams.size > 1).length
    return { rows, totH, totA, entryCount: filtered.length, sharedShown }
  }, [team, from, to, q, sort])

  const Th = ({ children, k, num }) => (
    <th
      onClick={k ? () => setSort(k) : undefined}
      style={css(`text-align:${num ? 'right' : 'left'};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${sort === k ? 'var(--text)' : 'var(--faint)'};font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2);${k ? 'cursor:pointer' : ''};white-space:nowrap`)}
    >
      {children}{sort === k ? ' ↓' : ''}
    </th>
  )

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      {/* toolbar */}
      <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0;flex-wrap:wrap')}>
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {['both', 'darwin', 'mauricio'].map((t) => (
            <button key={t} onClick={() => setTeam(t)} style={css(segStyle(team === t))}>
              {t === 'both' ? 'Both teams' : TEAM_LABEL[t]}
            </button>
          ))}
        </div>
        <span style={css('display:inline-flex;align-items:center;gap:6px;color:var(--faint);font-size:11.5px')}>
          <input type="date" value={from} min={DB.meta.dateMin} max={to} onChange={(e) => setFrom(e.target.value || DB.meta.dateMin)} style={css(inputStyle)} />
          <span style={css('color:var(--faint-2)')}>→</span>
          <input type="date" value={to} min={from} max={DB.meta.dateMax} onChange={(e) => setTo(e.target.value || DB.meta.dateMax)} style={css(inputStyle)} />
        </span>
        <button onClick={() => { setFrom(DB.meta.dateMin); setTo(DB.meta.dateMax) }} style={css('background:var(--panel-2);border:1px solid var(--line);border-radius:7px;padding:6px 11px;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer')}>All dates</button>
        <input placeholder="Search employee…" value={q} onChange={(e) => setQ(e.target.value)} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:190px;outline:none')} />
        <div style={css('flex:1')} />
        <span style={css('font-size:11px;color:var(--faint);font-family:var(--font-mono)')}>{fmtDate(from)} – {fmtDate(to)}</span>
      </div>

      <div style={css('flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px')}>
        {/* KPIs */}
        <div style={css('display:grid;grid-template-columns:repeat(5,1fr);gap:11px')}>
          <StatCard label="Employees" value={String(view.rows.length)} sub={view.sharedShown + ' shared across teams'} tone="blue" />
          <StatCard label="Hours" value={fmtH(view.totH)} sub="in selected window" tone="muted" />
          <StatCard label="Recorded $" value={money(view.totA)} sub="totals as logged" tone="green" />
          <StatCard label="Entries" value={view.entryCount.toLocaleString('en-US')} sub="daily payroll rows" tone="muted" />
          <StatCard label="Team" value={team === 'both' ? 'Darwin + Mauricio' : TEAM_LABEL[team]} sub={'roster: ' + DB.meta.employeeCount + ' people'} tone="cyan" />
        </div>

        {/* roster */}
        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead>
              <tr>
                <Th k="name">Employee</Th>
                <Th>Team</Th>
                <Th>Role</Th>
                <Th>Pay</Th>
                <Th k="hours" num>Hours</Th>
                <Th k="amount" num>Recorded $</Th>
                <Th k="entries" num>Entries</Th>
                <Th num>Last active</Th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((r) => (
                <Box as="tr" key={r.id} style={css('')} hover="background:var(--panel-2)">
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}>
                    <div style={css('display:flex;align-items:center;gap:7px')}>
                      <span style={css('font-weight:600')}>{r.name}</span>
                      {r.status === 'Inactive' && <span style={css('font-size:9.5px;color:var(--faint);border:1px solid var(--line-soft);border-radius:4px;padding:0 5px;text-transform:uppercase;letter-spacing:.05em')}>inactive</span>}
                      {r.flag && <span title={r.flag} style={css('color:var(--amber);cursor:help')}>⚑</span>}
                    </div>
                    {r.variants && r.variants.length > 1 && (
                      <div style={css('font-size:10px;color:var(--faint-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px')}>aka {r.variants.filter((v) => v !== r.name).join(', ')}</div>
                    )}
                  </td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}>
                    <div style={css('display:flex;gap:4px')}>
                      {[...r.agg.teams].sort().map((t) => (
                        <Badge key={t} color={TEAM_COLOR[t]}>{TEAM_LABEL[t]}</Badge>
                      ))}
                    </div>
                  </td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);color:var(--muted)')}>{r.role || '—'}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);color:var(--muted);font-family:var(--font-mono);font-size:11.5px')}>
                    {r.payType || '—'}{r.rate != null ? ' · $' + r.rate : ''}
                  </td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);font-weight:700')}>{fmtH(r.agg.hours)}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{money(r.agg.amount)}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);color:var(--faint)')}>{r.agg.n}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);color:var(--faint)')}>{fmtDate(r.agg.last)}</td>
                </Box>
              ))}
              {view.rows.length === 0 && (
                <tr><td colSpan={8} style={css('padding:26px;text-align:center;color:var(--faint)')}>No payroll entries for this team and date range.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={css('font-size:11px;color:var(--faint-2);line-height:1.6')}>
          Merged from the Darwin and Mauricio payroll spreadsheets ({DB.meta.entryCount.toLocaleString('en-US')} entries, {DB.meta.dateMin} → {DB.meta.dateMax}).
          Similar names across both books are counted as one person; <span style={css('color:var(--amber)')}>⚑</span> marks a merge worth confirming.
          “Recorded $” is the total logged per row (wages for hourly crew, contract/job values for subcontractors), so hours is the cleanest cross-team metric.
        </div>
      </div>
    </div>
  )
}
