import React, { useState, useMemo, useEffect } from 'react'
import { css } from '../lib/css.js'
import { Badge } from '../ds/index.jsx'
import { Tile, Field, INPUT, THEAD, TD, Avatar, signColor, BTN_PRIMARY, Modal, useEscapeClose } from '../ui/bits.jsx'
import { money, fmtH, fmtDate, META } from '../lib/macPayroll.js'
import {
  projectList, projectDetail, PROJECT_STATUS, STATUS_TABS, STATUS_TAB_LABEL, keyFromName,
} from '../lib/projects.js'
import {
  useEdits, saveProjectMeta, projectMeta, addChangeOrder, updateChangeOrder, deleteChangeOrder,
  addExpense, updateExpense, deleteExpense, siteSchedule, saveSiteSchedule,
} from '../lib/edits.js'
import { COForm } from './ChangeOrdersScreen.jsx'
import { ExpForm } from './ExpensesScreen.jsx'

// Projects — the finance card grid + a project drawer. Cards show Revenue /
// Cost / Profit / Margin: Cost is real (recorded labor + expenses), Revenue is
// the operator's contract + approved change orders. A project with no contract
// yet reads "—" until it's entered; nothing here is invented.

const money0 = (n) => (n ? money(n) : '—')
const pct = (m) => (m == null ? '—' : (m >= 0 ? '+' : '') + Math.round(m * 100) + '%')

const segStyle = (active) => 'background:transparent;border:0;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;color:var(--muted);white-space:nowrap' + (active ? ';background:var(--panel-3);color:var(--text)' : '')

export default function ProjectsScreen({ initialKey, onConsumeInitial, onToast }) {
  const editV = useEdits()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('revenue') // revenue | hours | recent | margin | percent | name
  const [selKey, setSelKey] = useState(null)
  const [adding, setAdding] = useState(false)

  const { rows, totals } = useMemo(() => { void editV; return projectList('both', META.dateMin, META.dateMax, { q, status }) }, [editV, q, status])
  const sorted = useMemo(() => rows.slice().sort((a, b) =>
    sort === 'hours' ? b.hours - a.hours
    : sort === 'recent' ? ((a.last || '') < (b.last || '') ? 1 : (a.last || '') > (b.last || '') ? -1 : 0)
    : sort === 'margin' ? ((b.margin == null ? -9 : b.margin) - (a.margin == null ? -9 : a.margin))
    : sort === 'percent' ? b.percent - a.percent
    : sort === 'name' ? a.address.localeCompare(b.address)
    : (b.revenue - a.revenue) || (b.hours - a.hours),
  ), [rows, sort])

  // Open a specific project when navigated here (Addresses / Reports / Painters).
  useEffect(() => {
    if (initialKey) { setSelKey(initialKey); if (onConsumeInitial) onConsumeInitial() }
  }, [initialKey, onConsumeInitial])

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0;flex-wrap:wrap')}>
        <input placeholder="Search projects, addresses…" value={q} onChange={(e) => setQ(e.target.value)} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:240px;outline:none')} />
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {STATUS_TABS.map((t) => <button key={t} onClick={() => setStatus(t)} style={css(segStyle(status === t))}>{STATUS_TAB_LABEL[t]}</button>)}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 8px;font-size:12px;color:var(--text);outline:none')}>
          <option value="revenue">Sort: revenue</option>
          <option value="hours">Sort: hours</option>
          <option value="recent">Sort: most recent</option>
          <option value="margin">Sort: margin</option>
          <option value="percent">Sort: % complete</option>
          <option value="name">Sort: name</option>
        </select>
        <div style={css('flex:1')} />
        <span style={css('font-size:12px;color:var(--faint);font-family:var(--font-mono)')}>{totals.count} · {money(totals.revenue)} rev · {money(totals.cost)} cost</span>
        <button onClick={() => setAdding(true)} style={css(BTN_PRIMARY)}>+ New project</button>
      </div>

      <div style={css('flex:1;overflow:auto;padding:16px')}>
        <div style={css('display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:12px')}>
          {sorted.map((p) => (
            <div key={p.key} onClick={() => setSelKey(p.key)} style={css('background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:13px;cursor:pointer;display:flex;flex-direction:column;gap:11px')}>
              <div style={css('display:flex;align-items:flex-start;gap:10px')}>
                <span style={css('width:4px;align-self:stretch;border-radius:2px;background:' + p.color)} />
                <div style={css('flex:1;min-width:0')}>
                  <div style={css('font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={p.name}>{p.address}</div>
                  <div style={css('font-size:11.5px;color:var(--faint)')}>{p.city || (p.overlayOnly ? 'New project' : '—')}</div>
                </div>
                <Badge color={p.statusColor}>{p.statusLabel}</Badge>
              </div>
              <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px')}>
                {[['Revenue', money0(p.revenue), 'var(--text)'], ['Cost', money0(p.cost), 'var(--text)'], ['Profit', p.hasFinance ? money(p.profit) : '—', p.hasFinance ? signColor(p.profit) : 'var(--faint)'], ['Margin', p.hasFinance ? pct(p.margin) : '—', p.hasFinance && p.margin != null ? signColor(p.margin) : 'var(--faint)']].map(([l, val, color]) => (
                  <div key={l}>
                    <div style={css('font-size:9.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:2px')}>{l}</div>
                    <div style={css('font-family:var(--font-mono);font-weight:700;font-size:13px;color:' + color)}>{val}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={css('display:flex;justify-content:space-between;font-size:10.5px;color:var(--faint);font-family:var(--font-mono);margin-bottom:4px')}>
                  <span>{p.first ? fmtDate(p.first) + ' – ' + fmtDate(p.last) : 'not started'}</span>
                  <span>{p.hours > 0 ? fmtH(p.hours) + ' · ' + p.percent + '%' : p.percent + '%'}</span>
                </div>
                <div style={css('height:5px;border-radius:999px;background:var(--inset);overflow:hidden')}><div style={css('height:100%;width:' + p.percent + '%;background:' + p.color)} /></div>
              </div>
            </div>
          ))}
          {sorted.length === 0 && <div style={css('color:var(--faint);padding:20px')}>No projects for this filter.</div>}
        </div>
      </div>

      {selKey && <ProjectDrawer key={selKey} pkey={selKey} onClose={() => setSelKey(null)} onToast={onToast} />}
      {adding && <NewProjectModal onClose={() => setAdding(false)} onCreated={(key) => { setAdding(false); setSelKey(key) }} />}
    </div>
  )
}

// ---------------------------------------------------------------------------

const TABS = [
  { id: 'overview', label: 'Overview' }, { id: 'painters', label: 'Painters' },
  { id: 'cos', label: 'Change orders' }, { id: 'exps', label: 'Expenses' },
  { id: 'timeline', label: 'Timeline' }, { id: 'activity', label: 'Activity' },
]

function ProjectDrawer({ pkey, onClose, onToast }) {
  const editV = useEdits()
  const [tab, setTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [coForm, setCoForm] = useState(false)
  const [expForm, setExpForm] = useState(false)
  useEscapeClose(onClose)

  const d = useMemo(() => { void editV; return projectDetail(pkey, 'both', META.dateMin, META.dateMax) }, [editV, pkey])
  if (!d) return null
  const p = d.p

  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={css('position:fixed;inset:0;background:rgba(4,6,10,.5);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:100')} />
      <aside role="dialog" aria-modal="true" aria-label={p.name} style={css('position:fixed;top:12px;right:12px;bottom:12px;width:760px;max-width:95vw;background:var(--panel);border:1px solid var(--line-strong);border-radius:14px;box-shadow:0 28px 70px rgba(0,0,0,.6);z-index:110;display:flex;flex-direction:column;overflow:hidden')}>
        <div style={css('padding:14px 16px;border-bottom:1px solid var(--line-soft);display:flex;align-items:center;gap:9px;flex-shrink:0')}>
          <span style={css('width:4px;height:34px;border-radius:2px;background:' + p.color)} />
          <div style={css('flex:1;min-width:0')}><div style={css('font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={p.name}>{p.address}</div><div style={css('font-size:11.5px;color:var(--faint)')}>{p.city || '—'}</div></div>
          <Badge color={p.statusColor}>{p.statusLabel}</Badge>
          <button onClick={() => { setTab('exps'); setExpForm(true) }} style={css('background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-size:11.5px;font-weight:600;color:var(--text);cursor:pointer')}>Expense</button>
          <button onClick={() => { setTab('cos'); setCoForm(true) }} style={css('background:var(--blue);color:#fff;border:0;border-radius:6px;padding:5px 11px;font-size:11.5px;font-weight:700;cursor:pointer')}>+ Change order</button>
          <button onClick={onClose} aria-label="Close" style={css('width:28px;height:28px;border-radius:7px;display:grid;place-items:center;background:transparent;border:1px solid var(--line);cursor:pointer;color:var(--muted)')}>✕</button>
        </div>

        <div style={css('display:flex;gap:2px;border-bottom:1px solid var(--line-soft);padding:0 16px;flex-shrink:0;overflow-x:auto')}>
          {TABS.map((t) => {
            const active = tab === t.id
            const count = t.id === 'cos' ? p.coCount : t.id === 'exps' ? p.expCount : t.id === 'painters' ? d.painters.length : 0
            return (
              <div key={t.id} onClick={() => setTab(t.id)} style={css('padding:11px 12px;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;border-bottom:2px solid ' + (active ? 'var(--blue)' : 'transparent') + ';color:' + (active ? 'var(--text)' : 'var(--muted)'))}>
                {t.label}{count ? <span style={css('color:var(--faint);font-family:var(--font-mono);margin-left:5px')}>{count}</span> : null}
              </div>
            )
          })}
        </div>

        <div style={css('flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:13px')}>
          {tab === 'overview' && <Overview d={d} editing={editing} setEditing={setEditing} onToast={onToast} />}
          {tab === 'painters' && <PaintersTab d={d} />}
          {tab === 'cos' && <COTab d={d} />}
          {tab === 'exps' && <ExpTab d={d} />}
          {tab === 'timeline' && <TimelineTab d={d} />}
          {tab === 'activity' && <ActivityTab d={d} />}
        </div>
      </aside>

      {coForm && <COForm initial={{ projectKey: p.key, projectName: p.name, title: '', desc: '', requestedBy: '', amount: '', cost: '', status: 'pending', date: '' }} onClose={() => setCoForm(false)} onSave={(r) => addChangeOrder(r)} />}
      {expForm && <ExpForm initial={{ projectKey: p.key, projectName: p.name, title: '', category: 'Materials', vendor: '', amount: '', status: 'unpaid', date: '' }} onClose={() => setExpForm(false)} onSave={(r) => addExpense(r)} />}
    </>
  )
}

function Overview({ d, editing, setEditing, onToast }) {
  const p = d.p
  const pnl = d.pnl
  const base = Math.max(pnl.revenue, pnl.cost, 1)
  const segDefs = [
    ['Labor', pnl.labor, '#2f82ff'], ['Materials', pnl.materials, '#ffac18'],
    ['Other', pnl.other, '#a855f7'], ['Profit', Math.max(pnl.profit, 0), '#20e070'],
  ]
  const kvs = [
    ['Contract', money(pnl.contract)], ['Approved CO', money(pnl.coApproved)], ['Revenue', money(pnl.revenue)],
    ['Labor', money(pnl.labor)], ['Materials', money(pnl.materials)], ['Cost', money(pnl.cost)],
  ]
  const toneColor = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', blue: 'var(--blue)', muted: 'var(--muted)' }

  return (
    <>
      <div style={css('display:flex;align-items:center;gap:8px')}>
        <span style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)')}>Overview</span>
        <button onClick={() => setEditing(!editing)} style={css('margin-left:auto;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:4px 10px;font-size:11.5px;font-weight:600;color:var(--text);cursor:pointer')}>{editing ? 'Done' : 'Edit details'}</button>
      </div>

      {editing && <FinanceEdit p={p} onToast={onToast} />}

      <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px')}>
        <Tile label="Contract" value={money0(p.contract)} />
        <Tile label="Approved CO" value={money0(p.coApprovedAmt)} />
        <Tile label="Revenue" value={money0(p.revenue)} />
        <Tile label="Margin" value={p.hasFinance ? pct(p.margin) : '—'} valStyle={css('font-size:15px;font-weight:800;font-family:var(--font-mono);color:' + (p.margin == null ? 'var(--text)' : signColor(p.margin)))} />
      </div>

      <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:13px')}>
        <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:11px')}>
          <span style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)')}>Real-time P&L</span>
          <span style={css('margin-left:auto')}><Badge color={p.profit >= 0 ? 'green' : 'red'}>{p.hasFinance ? (p.profit >= 0 ? 'Profit' : 'Loss') : 'No contract yet'}</Badge></span>
        </div>
        <div style={css('height:10px;border-radius:999px;background:var(--inset);overflow:hidden;display:flex;margin-bottom:8px')}>
          {segDefs.map(([l, v, c]) => v > 0 ? <div key={l} title={l + ' ' + money(v)} style={css('height:100%;width:' + (v / base * 100) + '%;background:' + c)} /> : null)}
        </div>
        <div style={css('display:flex;gap:14px;font-size:10.5px;color:var(--faint);margin-bottom:13px;flex-wrap:wrap')}>
          {[['Labor', '#2f82ff'], ['Materials', '#ffac18'], ['Other', '#a855f7'], ['Profit', '#20e070']].map(([l, c]) => (
            <span key={l} style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:8px;height:8px;border-radius:2px;background:' + c)} />{l}</span>
          ))}
        </div>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-bottom:12px')}>
          {kvs.map(([l, v]) => <div key={l} style={css('display:flex;justify-content:space-between;font-size:12px')}><span style={css('color:var(--faint)')}>{l}</span><span style={css('font-family:var(--font-mono)')}>{v}</span></div>)}
        </div>
        <div style={css('height:1px;background:var(--line-soft);margin-bottom:11px')} />
        <div style={css('display:flex;justify-content:space-between;align-items:flex-end')}>
          <div><div style={css('font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;margin-bottom:3px')}>Current profit</div><div style={css('font-size:18px;font-weight:800;font-family:var(--font-mono);color:' + signColor(p.profit))}>{p.hasFinance ? money(p.profit) : '—'}</div></div>
          <div style={css('text-align:right')}><div style={css('font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;margin-bottom:3px')}>Forecast at completion</div><div style={css('font-size:15px;font-weight:700;font-family:var(--font-mono);color:' + signColor(d.forecastProfit))}>{p.hasFinance ? money(d.forecastProfit) : '—'}</div></div>
        </div>
      </div>

      <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:13px')}>
        <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:12px')}>Project health</div>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:11px 16px')}>
          {d.health.map((h) => (
            <div key={h.label}>
              <div style={css('display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px')}><span style={css('color:var(--muted)')}>{h.label}</span><span style={css('font-family:var(--font-mono);font-weight:700;color:' + (toneColor[h.tone] || 'var(--text)'))}>{h.valText}</span></div>
              <div style={css('height:6px;border-radius:999px;background:var(--inset);overflow:hidden')}><div style={css('height:100%;width:' + Math.round(h.fill * 100) + '%;background:' + (toneColor[h.tone] || 'var(--blue)'))} /></div>
            </div>
          ))}
        </div>
      </div>

      <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:13px;display:flex;align-items:center;gap:10px')}>
        <div style={css('flex:1;min-width:0')}>
          <div style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;margin-bottom:3px')}>Client</div>
          <div style={css('font-size:13px;font-weight:700')}>{p.clientName || 'Not set'}</div>
          <div style={css('font-size:11.5px;color:var(--faint)')}>{p.clientEmail || '—'}</div>
        </div>
        {p.clientEmail && <a href={'mailto:' + p.clientEmail} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px 11px;font-size:11.5px;font-weight:600;color:var(--text);cursor:pointer;text-decoration:none')}>Email</a>}
      </div>
    </>
  )
}

function FinanceEdit({ p, onToast }) {
  // Seed % from the RAW override, not the derived value: '' means "auto"
  // (time-derived from logged work), so merely editing the contract/client
  // doesn't silently freeze a project's progress bar.
  const rawPct = (() => { const m = projectMeta(p.key); return m && m.percent != null ? m.percent : '' })()
  const [f, setF] = useState({ contract: p.contract || '', clientName: p.clientName || '', clientEmail: p.clientEmail || '', status: p.status, percent: rawPct })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    saveProjectMeta(p.key, { contract: f.contract === '' ? null : Number(f.contract), clientName: f.clientName, clientEmail: f.clientEmail, status: f.status, percent: f.percent === '' ? null : Number(f.percent) })
    if (onToast) onToast('Saved project details')
  }
  const isAuto = f.percent === ''
  return (
    <div style={css('background:var(--inset);border:1px solid var(--line-soft);border-radius:9px;padding:13px;display:flex;flex-direction:column;gap:11px')}>
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:11px')}>
        <Field label="Contract value ($)"><input value={f.contract} onChange={set('contract')} inputMode="decimal" placeholder="e.g. 42000" style={css(INPUT + ';font-family:var(--font-mono)')} /></Field>
        <Field label="Status"><select value={f.status} onChange={set('status')} style={css(INPUT)}>{Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
      </div>
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:11px')}>
        <Field label="Client name"><input value={f.clientName} onChange={set('clientName')} style={css(INPUT)} /></Field>
        <Field label="Client email"><input value={f.clientEmail} onChange={set('clientEmail')} type="email" style={css(INPUT)} /></Field>
      </div>
      <Field label={'% complete (' + (isAuto ? 'auto · ' + p.percent + '%' : f.percent + '%') + ')'}>
        <div style={css('display:flex;align-items:center;gap:10px')}>
          <input type="range" min="0" max="100" value={isAuto ? p.percent : f.percent} onChange={set('percent')} style={css('flex:1')} />
          {!isAuto && <button onClick={() => setF({ ...f, percent: '' })} style={css('background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:4px 9px;font-size:11px;font-weight:600;color:var(--muted);cursor:pointer;white-space:nowrap')}>Reset to auto</button>}
        </div>
      </Field>
      <div style={css('display:flex;justify-content:flex-end')}>
        <button onClick={save} style={css(BTN_PRIMARY)}>Save details</button>
      </div>
    </div>
  )
}

function PaintersTab({ d }) {
  return (
    <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden')}>
      <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
        <thead><tr>{['Painter', 'Crew', 'Dates', 'Hours', 'Labor cost'].map((h, i) => <th key={h} style={css(`text-align:${i >= 3 ? 'right' : 'left'};${THEAD}`)}>{h}</th>)}</tr></thead>
        <tbody>
          {d.painters.map((pa) => (
            <tr key={pa.empId}>
              <td style={css(TD)}><div style={css('display:flex;align-items:center;gap:8px')}><Avatar name={pa.name} size={24} /><span style={css('font-weight:600')}>{pa.name}</span></div></td>
              <td style={css(TD + ';color:var(--muted)')}>{pa.crew}</td>
              <td style={css(TD + ';font-family:var(--font-mono);color:var(--faint)')}>{fmtDate(pa.first)} – {fmtDate(pa.last)}</td>
              <td style={css(TD + ';text-align:right;font-family:var(--font-mono)')}>{fmtH(pa.hours)}</td>
              <td style={css(TD + ';text-align:right;font-family:var(--font-mono);font-weight:600')}>{money(pa.cost)}</td>
            </tr>
          ))}
          {d.painters.length === 0 && <tr><td colSpan={5} style={css('padding:22px;text-align:center;color:var(--faint)')}>No painters logged on this project yet.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function COTab({ d }) {
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const CO_STATUS = { pending: 'amber', approved: 'green', rejected: 'red' }
  return (
    <>
      <div style={css('display:flex;justify-content:flex-end')}><button onClick={() => setAdding(true)} style={css(BTN_PRIMARY)}>+ Change order</button></div>
      {d.cos.map((co) => (
        <div key={co._id} onClick={() => setEditing(co)} style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:12px;display:flex;align-items:flex-start;gap:12px;cursor:pointer')}>
          <div style={css('flex:1;min-width:0')}>
            <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:4px')}><span style={css('font-weight:700')}>{co.title}</span><Badge color={CO_STATUS[co.status] || 'default'}>{co.status}</Badge></div>
            <div style={css('font-size:12px;color:var(--muted)')}>{co.desc}</div>
            <div style={css('font-size:11px;color:var(--faint);margin-top:5px')}>{co.requestedBy ? 'Requested by ' + co.requestedBy + ' · ' : ''}{co.date}</div>
          </div>
          <div style={css('text-align:right;flex-shrink:0')}><div style={css('font-family:var(--font-mono);font-weight:700;color:var(--green)')}>{money(co.amount)}</div><div style={css('font-size:11px;color:' + signColor(co.amount - co.cost) + ';font-family:var(--font-mono)')}>{money(co.amount - co.cost)} profit</div></div>
        </div>
      ))}
      {d.cos.length === 0 && <div style={css('padding:22px;text-align:center;color:var(--faint);border:1px dashed var(--line-soft);border-radius:9px')}>No change orders on this project.</div>}
      {adding && <COForm initial={{ projectKey: d.p.key, projectName: d.p.name, title: '', desc: '', requestedBy: '', amount: '', cost: '', status: 'pending', date: '' }} onClose={() => setAdding(false)} onSave={(r) => addChangeOrder(r)} />}
      {editing && <COForm initial={{ projectKey: editing.projectKey, projectName: editing.projectName, title: editing.title, desc: editing.desc, requestedBy: editing.requestedBy, amount: editing.amount, cost: editing.cost, status: editing.status, date: editing.date }} onClose={() => setEditing(null)} onSave={(r) => updateChangeOrder(editing._id, r)} onDelete={() => deleteChangeOrder(editing._id)} />}
    </>
  )
}

function ExpTab({ d }) {
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  return (
    <>
      <div style={css('display:flex;justify-content:flex-end')}><button onClick={() => setAdding(true)} style={css(BTN_PRIMARY)}>+ Add expense</button></div>
      <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden')}>
        <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
          <thead><tr>{['Item', 'Vendor', 'Date', 'Amount', 'Status'].map((h, i) => <th key={h} style={css(`text-align:${i === 3 ? 'right' : 'left'};${THEAD}`)}>{h}</th>)}</tr></thead>
          <tbody>
            {d.exps.map((e) => (
              <tr key={e._id} onClick={() => setEditing(e)} style={css('cursor:pointer')}>
                <td style={css(TD + ';font-weight:600')}>{e.title}<div style={css('font-size:10.5px;color:var(--faint)')}>{e.category}</div></td>
                <td style={css(TD + ';color:var(--muted)')}>{e.vendor || '—'}</td>
                <td style={css(TD + ';font-family:var(--font-mono);color:var(--faint)')}>{e.date}</td>
                <td style={css(TD + ';text-align:right;font-family:var(--font-mono);font-weight:700')}>{money(e.amount)}</td>
                <td style={css(TD)}><Badge color={e.status === 'paid' ? 'green' : 'amber'}>{e.status}</Badge></td>
              </tr>
            ))}
            {d.exps.length === 0 && <tr><td colSpan={5} style={css('padding:22px;text-align:center;color:var(--faint)')}>No expenses on this project.</td></tr>}
          </tbody>
        </table>
      </div>
      {adding && <ExpForm initial={{ projectKey: d.p.key, projectName: d.p.name, title: '', category: 'Materials', vendor: '', amount: '', status: 'unpaid', date: '' }} onClose={() => setAdding(false)} onSave={(r) => addExpense(r)} />}
      {editing && <ExpForm initial={{ projectKey: editing.projectKey, projectName: editing.projectName, title: editing.title, category: editing.category, vendor: editing.vendor, amount: editing.amount, status: editing.status, date: editing.date }} onClose={() => setEditing(null)} onSave={(r) => updateExpense(editing._id, r)} onDelete={() => deleteExpense(editing._id)} />}
    </>
  )
}

function TimelineTab({ d }) {
  const p = d.p
  const editV = useEdits()
  const sched = useMemo(() => { void editV; return siteSchedule(p.key) || {} }, [editV, p.key])
  const [f, setF] = useState({ start: sched.start || '', deadline: sched.deadline || '' })
  useEffect(() => { setF({ start: sched.start || '', deadline: sched.deadline || '' }) }, [sched.start, sched.deadline])
  const save = (patch) => saveSiteSchedule(p.key, patch)

  return (
    <>
      <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:13px')}>
        <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:12px')}>Planned schedule</div>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          <Field label="Planned start"><input type="date" value={f.start} onChange={(e) => { setF({ ...f, start: e.target.value }); save({ start: e.target.value }) }} style={css(INPUT + ';font-family:var(--font-mono)')} /></Field>
          <Field label="Deadline"><input type="date" value={f.deadline} onChange={(e) => { setF({ ...f, deadline: e.target.value }); save({ deadline: e.target.value }) }} style={css(INPUT + ';font-family:var(--font-mono)')} /></Field>
        </div>
        <div style={css('display:flex;gap:20px;margin-top:12px;font-size:12px;color:var(--faint)')}>
          <span>First logged <b style={css('color:var(--text);font-family:var(--font-mono)')}>{p.first ? fmtDate(p.first) : '—'}</b></span>
          <span>Last logged <b style={css('color:var(--text);font-family:var(--font-mono)')}>{p.last ? fmtDate(p.last) : '—'}</b></span>
          <span>% complete <b style={css('color:var(--text);font-family:var(--font-mono)')}>{p.percent}%</b></span>
        </div>
      </div>
      <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:6px 14px')}>
        {d.activity.filter((a) => /logged/.test(a.text)).slice(0, 10).map((a, i) => (
          <div key={i} style={css('display:flex;gap:11px;padding:9px 0;border-bottom:1px dashed var(--line-soft)')}><span style={css('font-family:var(--font-mono);font-size:10.5px;color:var(--faint-2);width:84px;flex-shrink:0')}>{fmtDate(a.time)}</span><span style={css('font-size:12.5px;color:var(--text)')}>{a.text}</span></div>
        ))}
        {p.hours === 0 && <div style={css('padding:14px;color:var(--faint);font-size:12px')}>No hours logged yet.</div>}
      </div>
    </>
  )
}

function ActivityTab({ d }) {
  return (
    <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:6px 14px')}>
      {d.activity.map((a, i) => (
        <div key={i} style={css('display:flex;gap:11px;padding:9px 0;border-bottom:1px dashed var(--line-soft)')}><span style={css('font-family:var(--font-mono);font-size:10.5px;color:var(--faint-2);width:84px;flex-shrink:0')}>{fmtDate(a.time)}</span><span style={css('font-size:12.5px;color:var(--text)')}>{a.text}</span></div>
      ))}
      {d.activity.length === 0 && <div style={css('padding:14px;color:var(--faint);font-size:12px')}>No activity yet.</div>}
    </div>
  )
}

function NewProjectModal({ onClose, onCreated }) {
  const [f, setF] = useState({ name: '', team: 'darwin', contract: '', clientName: '', clientEmail: '', status: 'lead' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const create = () => {
    const key = keyFromName(f.name)
    saveProjectMeta(key, { name: f.name.trim(), address: f.name.trim(), team: f.team, contract: f.contract === '' ? null : Number(f.contract), clientName: f.clientName, clientEmail: f.clientEmail, status: f.status })
    onCreated(key)
  }
  return (
    <Modal title="New project" sub="Create a lead or job — hours attach automatically once logged to this address." onClose={onClose} width={480}
      footer={<>
        <button onClick={onClose} style={css('background:var(--panel-2);color:var(--muted);border:1px solid var(--line);border-radius:7px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer')}>Cancel</button>
        <button onClick={create} disabled={!f.name.trim()} style={css(BTN_PRIMARY + (f.name.trim() ? '' : ';opacity:.5;cursor:not-allowed'))}>Create project</button>
      </>}>
      <Field label="Project / address"><input value={f.name} onChange={set('name')} placeholder="e.g. 118 Harbor View Rd, Charleston" style={css(INPUT)} /></Field>
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
        <Field label="Team"><select value={f.team} onChange={set('team')} style={css(INPUT)}><option value="darwin">Darwin</option><option value="mauricio">Mauricio</option></select></Field>
        <Field label="Status"><select value={f.status} onChange={set('status')} style={css(INPUT)}>{Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
      </div>
      <Field label="Contract value ($)"><input value={f.contract} onChange={set('contract')} inputMode="decimal" style={css(INPUT + ';font-family:var(--font-mono)')} /></Field>
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
        <Field label="Client name"><input value={f.clientName} onChange={set('clientName')} style={css(INPUT)} /></Field>
        <Field label="Client email"><input value={f.clientEmail} onChange={set('clientEmail')} type="email" style={css(INPUT)} /></Field>
      </div>
    </Modal>
  )
}
