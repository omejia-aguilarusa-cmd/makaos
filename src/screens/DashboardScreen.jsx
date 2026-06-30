import React, { useMemo } from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { StatCard, Badge } from '../ds/index.jsx'
import { payroll, filterEntries, employeeById, money, fmtH, fmtDate, META, TEAM_LABEL, TEAM_COLOR } from '../lib/macPayroll.js'

// Real dashboard for Mac Painters — a live summary of the merged Darwin +
// Mauricio payroll. No demo data.
export default function DashboardScreen({ onGo }) {
  const all = useMemo(() => payroll('both', META.dateMin, META.dateMax, {}), [])
  const dar = useMemo(() => payroll('darwin', META.dateMin, META.dateMax, {}), [])
  const mau = useMemo(() => payroll('mauricio', META.dateMin, META.dateMax, {}), [])
  const top = useMemo(() => [...all.rows].sort((a, b) => b.hours - a.hours).slice(0, 8), [all])
  const recent = useMemo(
    () => filterEntries('both', META.dateMin, META.dateMax)
      .map((e) => ({ ...e, name: (employeeById(e.empId) || {}).name || e.empId }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 9),
    [],
  )
  const maxH = Math.max(dar.totals.hours, mau.totals.hours, 1)
  const teamCard = (label, color, r) => (
    <div style={css('padding:11px 13px;border-bottom:1px solid var(--line-soft)')}>
      <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:7px')}>
        <span style={{ ...css('width:9px;height:9px;border-radius:3px;flex-shrink:0'), background: color }} />
        <span style={css('font-size:13px;font-weight:700;flex:1')}>{label}</span>
        <span style={css('font-size:11px;color:var(--faint);font-family:var(--font-mono)')}>{r.rows.length} painters</span>
      </div>
      <div style={css('height:6px;border-radius:999px;background:var(--inset);overflow:hidden;margin-bottom:7px')}>
        <div style={{ ...css('height:100%;border-radius:999px'), width: (r.totals.hours / maxH) * 100 + '%', background: color }} />
      </div>
      <div style={css('display:flex;gap:16px;font-size:11.5px;color:var(--faint);font-family:var(--font-mono)')}>
        <span>{fmtH(r.totals.hours)}</span>
        <span style={css('color:var(--cyan)')}>{money(r.totals.wages)} wages</span>
        <span style={css('color:var(--amber)')}>{money(r.totals.billing)} billing</span>
      </div>
    </div>
  )

  return (
    <div style={css('padding:16px;display:flex;flex-direction:column;gap:14px')}>
      <div style={css('display:grid;grid-template-columns:repeat(5,1fr);gap:11px')}>
        <StatCard label="Active painters" value={String(all.rows.length)} sub={all.totals.shared + ' shared · ' + META.employeeCount + ' on roster'} tone="blue" />
        <StatCard label="Hours logged" value={fmtH(all.totals.hours)} sub={META.dateMin + ' → ' + META.dateMax} tone="muted" />
        <StatCard label="Wages" value={money(all.totals.wages)} sub="hourly · per-day · fixed crew" tone="cyan" />
        <StatCard label="Contract billing" value={money(all.totals.billing)} sub="subcontractor job totals" tone="amber" />
        <StatCard label="Entries" value={all.totals.n.toLocaleString('en-US')} sub="daily payroll records" tone="green" />
      </div>

      <div style={css('display:grid;grid-template-columns:1.5fr 1fr;gap:14px;align-items:start')}>
        <div style={css('display:flex;flex-direction:column;gap:14px')}>
          <div style={css('background:var(--panel);border:1px solid var(--line);border-radius:8px')}>
            <div style={css('display:flex;align-items:center;gap:8px;padding:11px 14px;background:var(--panel-2);border-bottom:1px solid var(--line-soft);border-radius:8px 8px 0 0')}>
              <span style={css('font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)')}>Top painters by hours</span>
              <button onClick={() => onGo && onGo('mac-painters')} style={css('margin-left:auto;background:transparent;border:0;color:var(--blue-hi);font-size:11.5px;font-weight:600;cursor:pointer')}>View all →</button>
            </div>
            <div>
              {top.map((r) => (
                <Box key={r.id} onClick={() => onGo && onGo('mac-painters')} style={css('display:flex;align-items:center;gap:11px;padding:10px 14px;border-bottom:1px solid var(--line-soft);cursor:pointer')} hover="background:var(--panel-2)">
                  <div style={css('flex:1;min-width:0')}>
                    <div style={css('display:flex;align-items:center;gap:7px')}>
                      <span style={css('font-size:13px;font-weight:600')}>{r.name}{r.you ? ' (You)' : ''}</span>
                      {r.teamsIn.map((t) => <Badge key={t} color={TEAM_COLOR[t]}>{TEAM_LABEL[t]}</Badge>)}
                    </div>
                    <div style={css('font-size:10.5px;color:var(--faint)')}>{r.role} · {r.payType}{r.rate != null ? ' · $' + r.rate : ''}</div>
                  </div>
                  <span style={css('font-family:var(--font-mono);font-weight:700;font-size:13px')}>{fmtH(r.hours)}</span>
                  <span style={css('font-family:var(--font-mono);font-size:12px;color:var(--cyan);width:78px;text-align:right')}>{money(r.value)}</span>
                </Box>
              ))}
            </div>
          </div>
        </div>

        <div style={css('display:flex;flex-direction:column;gap:14px')}>
          <div style={css('background:var(--panel);border:1px solid var(--line);border-radius:8px')}>
            <div style={css('padding:11px 14px;border-bottom:1px solid var(--line-soft)')}><span style={css('font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)')}>By team (partners)</span></div>
            {teamCard('Darwin', '#2f82ff', dar)}
            {teamCard('Mauricio', '#18d6e8', mau)}
          </div>

          <div style={css('background:var(--panel);border:1px solid var(--line);border-radius:8px')}>
            <div style={css('display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid var(--line-soft)')}>
              <span style={css('font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)')}>Recent activity</span>
              <button onClick={() => onGo && onGo('time-logs')} style={css('margin-left:auto;background:transparent;border:0;color:var(--blue-hi);font-size:11.5px;font-weight:600;cursor:pointer')}>Time logs →</button>
            </div>
            <div style={css('padding:4px 14px 8px')}>
              {recent.map((e, i) => (
                <div key={i} style={css('display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px dashed var(--line-soft)')}>
                  <span style={css('font-family:var(--font-mono);font-size:10px;color:var(--faint-2);width:52px;flex-shrink:0')}>{fmtDate(e.date)}</span>
                  <Badge color={TEAM_COLOR[e.team]}>{TEAM_LABEL[e.team]}</Badge>
                  <span style={css('font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1')}>{e.name}</span>
                  <span style={css('font-family:var(--font-mono);font-size:11px;color:var(--faint)')}>{e.hours ? e.hours + 'h' : e.total ? money(e.total) : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
