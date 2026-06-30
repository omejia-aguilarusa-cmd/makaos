import React, { useState, useMemo, useEffect } from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { StatCard, Badge } from '../ds/index.jsx'
import {
  jobSites, siteEntries, ENTRIES_WITHOUT_SITE,
  money, fmtH, fmtDate, META, TEAM_LABEL, TEAM_COLOR, CATEGORIES, CATEGORY_LABEL,
} from '../lib/macPayroll.js'
import { downloadCSV } from '../lib/csv.js'

// Projects — real job sites derived from the payroll `location` field. Each
// project is a site with the work actually logged against it (hours, recorded
// wages/contract $, crew, teams, date span). No contracts/budgets/margins exist
// in the data, so none are shown — this is the honest, real Projects view.

const segStyle = (active) => {
  const b = 'background:transparent;border:0;padding:5px 13px;border-radius:6px;font-size:12.5px;cursor:pointer;font-weight:600;color:var(--muted);white-space:nowrap'
  return active ? b + ';background:var(--panel-3);color:var(--text)' : b
}
const inputStyle = 'background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 9px;font-size:12.5px;color:var(--text);outline:none;font-family:var(--font-mono)'

export default function ProjectsScreen() {
  const [team, setTeam] = useState('both')
  const [from, setFrom] = useState(META.dateMin)
  const [to, setTo] = useState(META.dateMax)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('hours') // hours | wages | billing | painters | entries | name | last
  const [selKey, setSelKey] = useState(null)

  const { rows, totals } = useMemo(() => jobSites(team, from, to, { q, category: cat }), [team, from, to, q, cat])
  const sorted = useMemo(() => {
    const r = rows.slice()
    r.sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name)
      : sort === 'wages' ? b.wages - a.wages
      : sort === 'billing' ? b.billing - a.billing
      : sort === 'painters' ? b.painters - a.painters
      : sort === 'entries' ? b.n - a.n
      : sort === 'last' ? (a.last < b.last ? 1 : a.last > b.last ? -1 : 0)
      : b.hours - a.hours,
    )
    return r
  }, [rows, sort])

  const sel = selKey ? rows.find((r) => r.key === selKey) : null
  const selEntries = useMemo(() => (selKey ? siteEntries(selKey, team, from, to) : []), [selKey, team, from, to])

  // Close the detail drawer on Escape (it lives in local state, out of reach of
  // the app-level Escape handler).
  useEffect(() => {
    if (!selKey) return
    const onKey = (e) => { if (e.key === 'Escape') setSelKey(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selKey])

  const exportCSV = () => {
    const headers = ['Job site', 'Teams', 'Painters', 'Hours', 'Wages $', 'Contract $', 'Recorded $', 'Entries', 'First', 'Last']
    const data = sorted.map((r) => [r.name, r.teamsIn.join('+'), r.painters, r.hours, Math.round(r.wages), Math.round(r.billing), Math.round(r.total), r.n, r.first, r.last])
    downloadCSV(`mac-painters-projects_${team}_${cat}_${from}_${to}.csv`, headers, data)
  }

  const Th = ({ children, k, num }) => (
    <th onClick={k ? () => setSort(k) : undefined}
      style={css(`text-align:${num ? 'right' : 'left'};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${sort === k ? 'var(--text)' : 'var(--faint)'};font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2);${k ? 'cursor:pointer' : ''};white-space:nowrap`)}>
      {children}{sort === k ? ' ↓' : ''}
    </th>
  )
  const td = 'padding:9px 11px;border-bottom:1px solid var(--line-soft)'

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
        <input placeholder="Search job site / address…" value={q} onChange={(e) => setQ(e.target.value)} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:190px;outline:none')} />
        <div style={css('flex:1')} />
        <button onClick={exportCSV} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer')}>Export CSV</button>
      </div>

      <div style={css('flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px')}>
        <div style={css('display:grid;grid-template-columns:repeat(5,1fr);gap:11px')}>
          <StatCard label="Job sites" value={String(totals.sites)} sub="distinct addresses logged" tone="blue" />
          <StatCard label="Hours" value={fmtH(totals.hours)} sub="in selected window" tone="muted" />
          <StatCard label="Wages" value={money(totals.wages)} sub="recorded · wage crew" tone="cyan" />
          <StatCard label="Contract billing" value={money(totals.billing)} sub="recorded · subcontractors" tone="amber" />
          <StatCard label="Painters" value={String(totals.painters)} sub={totals.n.toLocaleString('en-US') + ' entries'} tone="green" />
        </div>

        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead>
              <tr>
                <Th k="name">Job site</Th><Th>Teams</Th>
                <Th k="painters" num>Painters</Th><Th k="hours" num>Hours</Th>
                <Th k="wages" num>Wages $</Th><Th k="billing" num>Contract $</Th>
                <Th k="entries" num>Entries</Th><Th k="last" num>Last</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <Box as="tr" key={r.key} onClick={() => setSelKey(r.key)} style={css('cursor:pointer')} hover="background:var(--panel-2)">
                  <td style={css(td)}>
                    <div style={css('font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px')} title={r.name}>{r.name}</div>
                    <div style={css('font-size:10px;color:var(--faint-2)')}>{fmtDate(r.first)} – {fmtDate(r.last)}</div>
                  </td>
                  <td style={css(td)}><div style={css('display:flex;gap:4px')}>{r.teamsIn.map((t) => <Badge key={t} color={TEAM_COLOR[t]}>{TEAM_LABEL[t]}</Badge>)}</div></td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono)')}>{r.painters}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);font-weight:700')}>{fmtH(r.hours)}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--cyan)')}>{r.wages ? money(r.wages) : '—'}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--amber)')}>{r.billing ? money(r.billing) : '—'}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--faint)')}>{r.n}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--faint)')}>{fmtDate(r.last)}</td>
                </Box>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={8} style={css('padding:26px;text-align:center;color:var(--faint)')}>No job sites for this team, category and date range.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={css('font-size:11px;color:var(--faint-2);line-height:1.6')}>
          Each project is a <strong style={css('color:var(--text)')}>job site</strong> built from the payroll <code>location</code> field — addresses are grouped after light normalization (casing/spacing), so a few hand-typed variants may remain separate.
          <strong style={css('color:var(--cyan)')}> Wages</strong> and <strong style={css('color:var(--amber)')}>contract</strong> are the recorded $ logged on wage-crew vs. subcontractor entries; <strong style={css('color:var(--text)')}>hours</strong> is the cleanest cross-site metric. {ENTRIES_WITHOUT_SITE} entries have no recorded site and aren't shown here. Click a site for its full daily log.
        </div>
      </div>

      {sel && (
        <>
          <div onClick={() => setSelKey(null)} aria-hidden="true" style={css('position:fixed;inset:0;background:rgba(4,6,10,.5);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:100')} />
          <aside role="dialog" aria-modal="true" aria-label={`${sel.name} — daily log`} style={css('position:fixed;top:12px;right:12px;bottom:12px;width:820px;max-width:94vw;background:var(--panel);border:1px solid var(--line-strong);border-radius:14px;box-shadow:0 28px 70px rgba(0,0,0,.6);z-index:110;display:flex;flex-direction:column;overflow:hidden')}>
            <div style={css('padding:14px 16px;border-bottom:1px solid var(--line-soft);display:flex;align-items:center;gap:10px;flex-shrink:0')}>
              <div style={css('flex:1;min-width:0')}>
                <div style={css('font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={sel.name}>{sel.name}</div>
                <div style={css('font-size:11.5px;color:var(--faint);display:flex;align-items:center;gap:7px')}>
                  {sel.teamsIn.map((t) => <Badge key={t} color={TEAM_COLOR[t]}>{TEAM_LABEL[t]}</Badge>)}
                  <span>{sel.painters} painters · {fmtDate(sel.first)} – {fmtDate(sel.last)}</span>
                </div>
              </div>
              <span style={css('font-size:11px;color:var(--faint);font-family:var(--font-mono)')}>{fmtDate(from)} – {fmtDate(to)} · {TEAM_LABEL[team]}</span>
              <button onClick={() => setSelKey(null)} style={css('width:28px;height:28px;border-radius:7px;display:grid;place-items:center;background:transparent;border:1px solid var(--line);cursor:pointer;color:var(--muted)')}>✕</button>
            </div>
            <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px 16px;flex-shrink:0')}>
              {[['Hours', fmtH(sel.hours)], ['Painters', String(sel.painters)], ['Wages', money(sel.wages)], ['Contract', money(sel.billing)]].map(([l, val]) => (
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
                    {['Date', 'Painter', 'Team', 'Hrs', 'Base', '+Add', '−Ded', 'Total', 'Notes'].map((h, i) => (
                      <th key={h} style={css(`text-align:${i >= 3 && i <= 7 ? 'right' : 'left'};font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line);background:var(--panel-2);white-space:nowrap`)}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {selEntries.map((e, i) => (
                      <tr key={i}>
                        <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);font-family:var(--font-mono);color:var(--faint);white-space:nowrap')}>{fmtDate(e.date)}</td>
                        <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);font-weight:600')}>{e.name}</td>
                        <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft)')}><Badge color={TEAM_COLOR[e.team]}>{TEAM_LABEL[e.team]}</Badge></td>
                        <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{e.hours || ''}</td>
                        <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{e.subtotal ? money(e.subtotal) : ''}</td>
                        <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);color:var(--green)')}>{e.addition ? money(e.addition) : ''}</td>
                        <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);color:var(--red)')}>{e.deduction ? money(e.deduction) : ''}</td>
                        <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);font-weight:700')}>{e.total ? money(e.total) : ''}</td>
                        <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);color:var(--faint-2);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={e.notes}>{e.notes || ''}</td>
                      </tr>
                    ))}
                    {selEntries.length === 0 && <tr><td colSpan={9} style={css('padding:20px;text-align:center;color:var(--faint)')}>No entries in this window.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
