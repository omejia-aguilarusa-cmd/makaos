import React, { useState, useMemo, useEffect } from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { StatCard, Badge } from '../ds/index.jsx'
import { payroll, employeeById, employeeEntries, money, fmtH, fmtDate, META, TEAM_LABEL, TEAM_COLOR, CATEGORIES, CATEGORY_LABEL } from '../lib/macPayroll.js'
import { downloadCSV } from '../lib/csv.js'

// Mac Painters — the real merged payroll: Darwin + Mauricio (partners, same
// company). Similar names across both books are counted as one person and
// tagged with the team(s) they were logged under. Pick a team + date range and
// every number recomputes; click a person to see their daily entries.

const segStyle = (active) => {
  const b = 'background:transparent;border:0;padding:5px 13px;border-radius:6px;font-size:12.5px;cursor:pointer;font-weight:600;color:var(--muted);white-space:nowrap'
  return active ? b + ';background:var(--panel-3);color:var(--text)' : b
}
const inputStyle = 'background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 9px;font-size:12.5px;color:var(--text);outline:none;font-family:var(--font-mono)'

export default function MacPaintersScreen() {
  const [team, setTeam] = useState('both')
  const [from, setFrom] = useState(META.dateMin)
  const [to, setTo] = useState(META.dateMax)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('hours') // hours | est | net | name | entries
  const [cat, setCat] = useState('all')
  const [selId, setSelId] = useState(null)

  const { rows, totals } = useMemo(() => payroll(team, from, to, { q }), [team, from, to, q])
  const sorted = useMemo(() => {
    const r = (cat === 'all' ? rows : rows.filter((x) => x.category === cat)).slice()
    r.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'est' ? b.est - a.est : sort === 'net' ? b.net - a.net : sort === 'entries' ? b.n - a.n : b.hours - a.hours)
    return r
  }, [rows, sort, cat])

  const exportCSV = () => {
    const headers = ['Employee', 'Role', 'Pay type', 'Rate', 'Teams', 'Category', 'Hours', 'Days', 'Est. wages', 'Net', 'Entries', 'Last active']
    const data = sorted.map((r) => [r.name, r.role, r.payType, r.rate ?? '', r.teamsIn.join('+'), r.category, r.hours, r.days, Math.round(r.est), Math.round(r.net), r.n, r.last])
    downloadCSV(`mac-painters_${team}_${cat}_${from}_${to}.csv`, headers, data)
  }

  const sel = selId ? employeeById(selId) : null
  const selEntries = useMemo(() => (selId ? employeeEntries(selId, team, from, to) : []), [selId, team, from, to])
  const selAgg = selId ? rows.find((r) => r.id === selId) : null

  // Close the detail drawer on Escape. The drawer lives in this component's
  // local state, so the app-level Escape handler can't reach it.
  useEffect(() => {
    if (!selId) return
    const onKey = (e) => { if (e.key === 'Escape') setSelId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selId])

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
        <input placeholder="Search employee…" value={q} onChange={(e) => setQ(e.target.value)} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:170px;outline:none')} />
        <div style={css('flex:1')} />
        <button onClick={exportCSV} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer')}>Export CSV</button>
      </div>

      <div style={css('flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px')}>
        <div style={css('display:grid;grid-template-columns:repeat(5,1fr);gap:11px')}>
          <StatCard label="Employees" value={String(sorted.length)} sub={totals.shared + ' shared across teams'} tone="blue" />
          <StatCard label="Hours" value={fmtH(totals.hours)} sub="in selected window" tone="muted" />
          <StatCard label="Wages" value={money(totals.wages)} sub="hourly · per-day · fixed" tone="cyan" />
          <StatCard label="Contract billing" value={money(totals.billing)} sub="subcontractor job totals" tone="amber" />
          <StatCard label="Entries" value={totals.n.toLocaleString('en-US')} sub={team === 'both' ? 'Darwin + Mauricio' : TEAM_LABEL[team]} tone="muted" />
        </div>

        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead>
              <tr>
                <Th k="name">Employee</Th><Th>Team</Th><Th>Pay</Th>
                <Th k="hours" num>Hours</Th><Th k="est" num>Est. wages</Th><Th k="net" num>Net $</Th>
                <Th k="entries" num>Entries</Th><Th num>Last</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <Box as="tr" key={r.id} onClick={() => setSelId(r.id)} style={css('cursor:pointer')} hover="background:var(--panel-2)">
                  <td style={css(td)}>
                    <div style={css('display:flex;align-items:center;gap:7px')}>
                      <span style={css('font-weight:600')}>{r.name}</span>
                      {r.you && <Badge color="amber">You</Badge>}
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
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--green)')}>{money(r.net)}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--faint)')}>{r.n}</td>
                  <td style={css(td + ';text-align:right;font-family:var(--font-mono);color:var(--faint)')}>{fmtDate(r.last)}</td>
                </Box>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={8} style={css('padding:26px;text-align:center;color:var(--faint)')}>No payroll entries for this team and date range.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={css('font-size:11px;color:var(--faint-2);line-height:1.6')}>
          Merged from the Darwin and Mauricio payroll spreadsheets ({META.entryCount.toLocaleString('en-US')} entries, {META.dateMin} → {META.dateMax}).
          Similar names are counted as one person; <span style={css('color:var(--amber)')}>⚑</span> marks a merge worth confirming. Click a row to see daily entries.
          “Est. wages” = hours × rate for hourly/per-day crew (recorded total for fixed/contract); “Net $” is what was logged.
        </div>
      </div>

      {sel && selAgg && (
        <>
          <div onClick={() => setSelId(null)} aria-hidden="true" style={css('position:fixed;inset:0;background:rgba(4,6,10,.5);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:100')} />
          <aside role="dialog" aria-modal="true" aria-label={`${sel.name} — daily entries`} style={css('position:fixed;top:12px;right:12px;bottom:12px;width:760px;max-width:94vw;background:var(--panel);border:1px solid var(--line-strong);border-radius:14px;box-shadow:0 28px 70px rgba(0,0,0,.6);z-index:110;display:flex;flex-direction:column;overflow:hidden')}>
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
              <button onClick={() => setSelId(null)} style={css('width:28px;height:28px;border-radius:7px;display:grid;place-items:center;background:transparent;border:1px solid var(--line);cursor:pointer;color:var(--muted)')}>✕</button>
            </div>
            <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px 16px;flex-shrink:0')}>
              {[['Hours', fmtH(selAgg.hours)], ['Days', String(selAgg.days)], ['Est. wages', money(selAgg.est)], ['Net recorded', money(selAgg.net)]].map(([l, val]) => (
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
                    {['Date', 'Team', 'Location', 'Hrs', 'Base', '+Add', '−Ded', 'Net', 'Notes'].map((h, i) => (
                      <th key={h} style={css(`text-align:${i >= 3 && i <= 7 ? 'right' : 'left'};font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line);background:var(--panel-2);white-space:nowrap`)}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {selEntries.map((e, i) => (
                      <tr key={i}>
                        <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);font-family:var(--font-mono);color:var(--faint);white-space:nowrap')}>{fmtDate(e.date)}</td>
                        <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft)')}><Badge color={TEAM_COLOR[e.team]}>{TEAM_LABEL[e.team]}</Badge></td>
                        <td style={css('padding:7px 9px;border-bottom:1px solid var(--line-soft);color:var(--muted);max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={e.location}>{e.location || '—'}</td>
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
