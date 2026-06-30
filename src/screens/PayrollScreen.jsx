import React, { useState, useMemo } from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { StatCard, Badge } from '../ds/index.jsx'
import { payroll, money, fmtH, fmtDate, META, TEAM_LABEL, TEAM_COLOR, CATEGORIES, CATEGORY_LABEL } from '../lib/macPayroll.js'
import { downloadCSV } from '../lib/csv.js'

const th = (align = 'left') => `text-align:${align};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2);white-space:nowrap`
const td = 'padding:9px 11px;border-bottom:1px solid var(--line-soft)'
const segStyle = (active) => {
  const b = 'background:transparent;border:0;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;color:var(--muted);white-space:nowrap'
  return active ? b + ';background:var(--panel-3);color:var(--text)' : b
}
const dateInput = 'background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 9px;font-size:12.5px;color:var(--text);outline:none;font-family:var(--font-mono)'

export default function PayrollScreen({ v }) {
  const [mode, setMode] = useState('mac')
  const [team, setTeam] = useState('both')
  const [cat, setCat] = useState('all')
  const [from, setFrom] = useState(META.dateMin)
  const [to, setTo] = useState(META.dateMax)
  const { rows, totals } = useMemo(() => payroll(team, from, to, {}), [team, from, to])
  const tableRows = useMemo(() => (cat === 'all' ? rows : rows.filter((r) => r.category === cat)).slice().sort((a, b) => b.value - a.value), [rows, cat])

  const ModeToggle = (
    <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
      <button onClick={() => setMode('mac')} style={css(segStyle(mode === 'mac'))}>Mac Painters · real</button>
      <button onClick={() => setMode('demo')} style={css(segStyle(mode === 'demo'))}>Demo cycle</button>
    </div>
  )

  if (mode === 'demo') {
    return (
      <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
        <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0')}>
          {ModeToggle}
          <span style={css('display:inline-flex;align-items:center;gap:6px;background:var(--inset);border:1px solid var(--line-soft);border-radius:7px;padding:5px 10px;font-size:11.5px;color:var(--muted);font-family:var(--font-mono)')}>Apr 27 – May 3, 2026 · Weekly</span>
          <div style={css('flex:1')}></div>
          <button onClick={v.payBulk} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--panel-2);border:1px solid var(--line);border-radius:7px;padding:6px 11px;font-size:12px;font-weight:600;color:var(--text);cursor:pointer')}>Bulk log hours</button>
          <button onClick={v.payExport} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--panel-2);border:1px solid var(--line);border-radius:7px;padding:6px 11px;font-size:12px;font-weight:600;color:var(--text);cursor:pointer')}>Export</button>
          <button onClick={v.payApprove} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer')}>Review &amp; approve</button>
        </div>
        <div style={css('flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px')}>
          <div style={css('display:grid;grid-template-columns:repeat(5,1fr);gap:11px')}>
            {v.payKpis.map((k, i) => <StatCard key={i} label={k.label} value={k.value} sub={k.sub} tone={k.tone} />)}
          </div>
          <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
            <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
              <thead><tr>
                <th style={css(th())}>Employee</th><th style={css(th())}>Project</th><th style={css(th('right'))}>Reg</th><th style={css(th('right'))}>OT</th>
                <th style={css(th('right'))}>Rate</th><th style={css(th('right'))}>Gross</th><th style={css(th('right'))}>Deduction</th><th style={css(th('right'))}>Net</th><th style={css(th())}>Status</th>
              </tr></thead>
              <tbody>
                {v.payRows.map((r) => (
                  <Box as="tr" key={r.id} onClick={r.onOpen} style={css('cursor:pointer')} hover="background:var(--panel-2)">
                    <td style={css(td)}><div style={css('display:flex;align-items:center;gap:8px')}><div style={r.avatarStyle}>{r.initials}</div><span style={css('font-weight:600')}>{r.name}</span></div></td>
                    <td style={css(td + ';color:var(--muted)')}>{r.project}</td>
                    <td style={css(td + ';text-align:right;font-family:var(--font-mono)')}>{r.regS}</td>
                    <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--amber)')}>{r.otS}</td>
                    <td style={css(td + ';text-align:right;font-family:var(--font-mono)')}>{r.rateS}</td>
                    <td style={css(td + ';text-align:right;font-family:var(--font-mono)')}>{r.grossS}</td>
                    <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--red)')}>{r.dedS}</td>
                    <td style={css(td + ';text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--green)')}>{r.netS}</td>
                    <td style={css(td)}><Badge color={r.statusColor}>{r.status}</Badge></td>
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
    const headers = ['Employee', 'Role', 'Pay type', 'Rate', 'Teams', 'Category', 'Hours', 'Days', 'Est. gross', 'Base', 'Additions', 'Deductions', 'Net', 'Entries', 'Last active']
    const data = tableRows.map((r) => [r.name, r.role, r.payType, r.rate ?? '', r.teamsIn.join('+'), r.category, r.hours, r.days, Math.round(r.est), Math.round(r.subtotal), Math.round(r.addition), Math.round(r.deduction), Math.round(r.net), r.n, r.last])
    downloadCSV(`mac-painters-payroll_${team}_${cat}_${from}_${to}.csv`, headers, data)
  }

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0;flex-wrap:wrap')}>
        {ModeToggle}
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {['both', 'darwin', 'mauricio'].map((t) => <button key={t} onClick={() => setTeam(t)} style={css(segStyle(team === t))}>{TEAM_LABEL[t]}</button>)}
        </div>
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {CATEGORIES.map((c) => <button key={c} onClick={() => setCat(c)} style={css(segStyle(cat === c))}>{CATEGORY_LABEL[c]}</button>)}
        </div>
        <span style={css('display:inline-flex;align-items:center;gap:6px')}>
          <input type="date" value={from} min={META.dateMin} max={to} onChange={(e) => setFrom(e.target.value || META.dateMin)} style={css(dateInput)} />
          <span style={css('color:var(--faint-2)')}>→</span>
          <input type="date" value={to} min={from} max={META.dateMax} onChange={(e) => setTo(e.target.value || META.dateMax)} style={css(dateInput)} />
        </span>
        <button onClick={() => { setFrom(META.dateMin); setTo(META.dateMax) }} style={css('background:var(--panel-2);border:1px solid var(--line);border-radius:7px;padding:6px 11px;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer')}>All dates</button>
        <div style={css('flex:1')} />
        <button onClick={exportCSV} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer')}>Export CSV</button>
      </div>
      <div style={css('flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px')}>
        <div style={css('display:grid;grid-template-columns:repeat(5,1fr);gap:11px')}>
          <StatCard label="Employees paid" value={String(tableRows.length)} sub={totals.shared + ' shared across teams'} tone="blue" />
          <StatCard label="Hours" value={fmtH(totals.hours)} sub={fmtDate(from) + ' – ' + fmtDate(to)} tone="muted" />
          <StatCard label="Wages" value={money(totals.wages)} sub="hourly · per-day · fixed crew" tone="cyan" />
          <StatCard label="Contract billing" value={money(totals.billing)} sub="subcontractor job totals" tone="amber" />
          <StatCard label="Total recorded" value={money(totals.wages + totals.billing)} sub="wages + contract billing" tone="green" />
        </div>
        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead><tr>
              <th style={css(th())}>Employee</th><th style={css(th())}>Team</th><th style={css(th())}>Pay</th>
              <th style={css(th('right'))}>Hours</th><th style={css(th('right'))}>Est. gross</th><th style={css(th('right'))}>+Add</th>
              <th style={css(th('right'))}>−Ded</th><th style={css(th('right'))}>Net</th>
            </tr></thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.id}>
                  <td style={css(td)}>
                    <div style={css('display:flex;align-items:center;gap:7px')}>
                      <span style={css('font-weight:600')}>{r.name}</span>
                      {r.you && <Badge color="amber">You</Badge>}
                      {r.category === 'contract' && <Badge color="default">contract</Badge>}
                      {r.status === 'Inactive' && <span style={css('font-size:9.5px;color:var(--faint);border:1px solid var(--line-soft);border-radius:4px;padding:0 5px;text-transform:uppercase')}>inactive</span>}
                    </div>
                    <div style={css('font-size:10px;color:var(--faint-2)')}>{r.role}</div>
                  </td>
                  <td style={css(td)}><div style={css('display:flex;gap:4px')}>{r.teamsIn.map((t) => <Badge key={t} color={TEAM_COLOR[t]}>{TEAM_LABEL[t]}</Badge>)}</div></td>
                  <td style={css(td + ';color:var(--muted);font-family:var(--font-mono);font-size:11.5px')}>{r.payType}{r.rate != null ? ' · $' + r.rate : ''}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono)')}>{fmtH(r.hours)}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--cyan)')}>{money(r.est)}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--green)')}>{r.addition ? money(r.addition) : '—'}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--red)')}>{r.deduction ? money(r.deduction) : '—'}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--green)')}>{money(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={css('font-size:11px;color:var(--faint-2);line-height:1.6')}>
          <strong style={css('color:var(--cyan)')}>Wages</strong> = hours × rate for hourly/per-day crew (recorded total for fixed). <strong style={css('color:var(--amber)')}>Contract billing</strong> = whole-job values logged under subcontractors — split out so it doesn't inflate the wage totals. Use the team toggle + date range to scope the pay period; Export CSV downloads the current selection.
        </div>
      </div>
    </div>
  )
}
