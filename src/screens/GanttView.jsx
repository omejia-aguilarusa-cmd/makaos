import React, { useState, useMemo, useEffect, useRef } from 'react'
import { css } from '../lib/css.js'
import { Badge } from '../ds/index.jsx'
import { jobSites, siteEntries, filterEntries, employeeById, siteKeyOf, fmtH, fmtDate, money, META, TEAM_LABEL, TEAM_COLOR } from '../lib/macPayroll.js'
import { useEdits, siteSchedule, saveSiteSchedule, addChangeOrder, addExpense } from '../lib/edits.js'
import { COForm } from './ChangeOrdersScreen.jsx'
import { ExpForm } from './ExpensesScreen.jsx'

// Interactive Gantt for the Schedule page — per project (job site) or per
// employee. The solid bar is the ACTUAL work span (first → last day logged,
// immutable, real data). The outlined strip above it is the PLAN: drag its body
// to move planned start + deadline together, drag its edges to change either
// date, or drag a project with no plan to create one. Zoom (day/week/month),
// status filter, "scheduled only", sorting and search narrow the board.

const dayNum = (s) => { const [y, m, d] = s.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000) }
const dateOfDay = (n) => new Date(n * 86400000).toISOString().slice(0, 10)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const ZOOMS = { day: 8, week: 3.4, month: 1.6 }
const NAME_W = 260
const ROW = 34
const ACTIVE_DAYS = 21 // logged work within 3 weeks of the dataset edge = "in progress"
const teamColor = (teams) => (teams.length > 1 ? '#a855f7' : teams[0] === 'darwin' ? '#2f82ff' : '#18d6e8')
const seg = (active) => {
  const b = 'background:transparent;border:0;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;color:var(--muted);white-space:nowrap'
  return active ? b + ';background:var(--panel-3);color:var(--text)' : b
}
const dInput = 'background:var(--input-bg);border:1px solid var(--line);border-radius:6px;padding:5px 7px;font-size:11.5px;color:var(--text);outline:none;font-family:var(--font-mono)'
const selStyle = 'background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 8px;font-size:12px;color:var(--text);outline:none'

export default function GanttView({ ModeToggle }) {
  const editV = useEdits()
  const [group, setGroup] = useState('project') // project | employee
  const [team, setTeam] = useState('both')
  const [q, setQ] = useState('')
  const [zoom, setZoom] = useState('week')
  const [status, setStatus] = useState('all') // all | active | done
  const [schedOnly, setSchedOnly] = useState(false)
  const [sort, setSort] = useState('order') // order | start | deadline | hours | painters | name
  const [editKey, setEditKey] = useState(null)
  const [sd, setSd] = useState(null) // schedule draft (precise-date editor)
  const [detail, setDetail] = useState(null) // project row for the daily-painter drawer
  const [coForm, setCoForm] = useState(false)
  const [expForm, setExpForm] = useState(false)
  const [drag, setDrag] = useState(null) // { key, mode:'move'|'left'|'right', dd } live preview
  const dragRef = useRef(null)

  const PXD = ZOOMS[zoom]
  const D0 = dayNum(META.dateMin)
  const D1 = dayNum(META.dateMax)
  const width = (D1 - D0 + 1) * PXD
  const xFor = (s) => (dayNum(s) - D0) * PXD
  const clampX = (x) => Math.max(0, Math.min(width, x))
  // Clamped bar geometry so a planned date outside the data window can't overflow.
  const barGeo = (a, b) => { const l = clampX(xFor(a)); const r = clampX(xFor(b) + PXD); return { left: l, width: Math.max(5, r - l) } }
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
  }, [D0, D1, PXD])

  // Top painters (by hours) per site, for on-bar labels.
  const namesBySite = useMemo(() => {
    const by = {}
    for (const e of filterEntries('both', META.dateMin, META.dateMax)) {
      if (!e.location) continue
      const k = siteKeyOf(e.location)
      const m = by[k] || (by[k] = {})
      const name = (employeeById(e.empId) || {}).name || e.empId
      m[name] = (m[name] || 0) + e.hours
    }
    const out = {}
    for (const [k, m] of Object.entries(by)) out[k] = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([n]) => n)
    return out
  }, [editV]) // eslint-disable-line react-hooks/exhaustive-deps

  const projRows = useMemo(() => {
    void editV
    const { rows } = jobSites(team, META.dateMin, META.dateMax, { q })
    let out = rows.map((r) => {
      const sc = siteSchedule(r.key) || {}
      const start = sc.start || r.first
      const ends = [r.last, sc.deadline, start].filter(Boolean).sort()
      const active = dayNum(META.dateMax) - dayNum(r.last) <= ACTIVE_DAYS
      return {
        ...r, planStart: sc.start || null, deadline: sc.deadline || null,
        order: sc.order == null ? null : sc.order, start, end: ends[ends.length - 1],
        active, topNames: namesBySite[r.key] || [],
      }
    })
    if (status !== 'all') out = out.filter((r) => (status === 'active' ? r.active : !r.active))
    if (schedOnly) out = out.filter((r) => r.planStart || r.deadline || r.order != null)
    out.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'hours') return b.hours - a.hours
      if (sort === 'painters') return b.painters - a.painters
      if (sort === 'start') return a.start < b.start ? -1 : a.start > b.start ? 1 : 0
      if (sort === 'deadline') {
        if (!a.deadline && !b.deadline) return a.start < b.start ? -1 : 1
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return a.deadline < b.deadline ? -1 : 1
      }
      // 'order': explicit sequence first, then by start date
      if (a.order != null || b.order != null) return (a.order == null ? 1e9 : a.order) - (b.order == null ? 1e9 : b.order)
      return a.start < b.start ? -1 : a.start > b.start ? 1 : 0
    })
    return out
  }, [team, q, status, schedOnly, sort, editV, namesBySite])

  const empRows = useMemo(() => {
    void editV
    const ql = q.trim().toLowerCase()
    const by = {}
    for (const e of filterEntries(team, META.dateMin, META.dateMax)) {
      const emp = by[e.empId] || (by[e.empId] = { id: e.empId, name: (employeeById(e.empId) || {}).name || e.empId, segs: {}, byDate: {}, hours: 0 })
      emp.hours += e.hours
      const key = e.location || '(no site)'
      const s = emp.segs[key] || (emp.segs[key] = { loc: key, first: e.date, last: e.date, teams: new Set(), hours: 0 })
      if (e.date < s.first) s.first = e.date
      if (e.date > s.last) s.last = e.date
      s.teams.add(e.team); s.hours += e.hours
      // Distinct real job sites per day (canonical key, so alias/typo spellings
      // of one site don't count as two) to flag double-booking.
      if (e.location) (emp.byDate[e.date] = emp.byDate[e.date] || new Set()).add(siteKeyOf(e.location))
    }
    return Object.values(by)
      .filter((emp) => !ql || emp.name.toLowerCase().includes(ql))
      .map((emp) => ({
        ...emp,
        segs: Object.values(emp.segs).map((s) => ({ ...s, teams: [...s.teams] })).sort((a, b) => (a.first < b.first ? -1 : 1)),
        conflicts: Object.entries(emp.byDate).filter(([, set]) => set.size > 1).map(([d]) => d).sort(),
      }))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.hours - a.hours))
  }, [team, q, sort, editV])

  // Daily painter breakdown for the selected project (drawer), newest first.
  const detailDays = useMemo(() => {
    void editV
    if (!detail) return []
    const by = {}
    for (const e of siteEntries(detail.key, 'both', META.dateMin, META.dateMax)) (by[e.date] = by[e.date] || []).push(e)
    return Object.keys(by).sort((a, b) => (a < b ? 1 : -1)).map((date) => ({ date, painters: by[date].sort((a, b) => (a.name || '').localeCompare(b.name || '')), hours: by[date].reduce((s, e) => s + e.hours, 0) }))
  }, [detail, editV])

  useEffect(() => {
    if (!detail) return
    const onKey = (e) => { if (e.key === 'Escape') setDetail(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detail])

  const openSched = (r) => { setEditKey(r.key); setSd({ start: r.planStart || '', deadline: r.deadline || '', order: r.order == null ? '' : String(r.order) }) }
  const saveSched = (r) => { saveSiteSchedule(r.key, { start: sd.start, deadline: sd.deadline, order: sd.order }); setEditKey(null); setSd(null) }
  const clearSched = (r) => { saveSiteSchedule(r.key, { start: null, deadline: null, order: null }); setEditKey(null); setSd(null) }

  // ---- drag-to-edit (pointer events) -------------------------------------
  // Start a drag on a plan strip (or on the actual bar when no plan exists —
  // that CREATES a plan from the actual span). mode: move | left | right.
  const beginDrag = (ev, r, mode) => {
    ev.preventDefault(); ev.stopPropagation()
    const hasPlan = !!(r.planStart || r.deadline)
    const s = dayNum(r.planStart || r.first)
    const e = dayNum(r.deadline || r.last)
    dragRef.current = { key: r.key, mode, x0: ev.clientX, s, e, hasPlan, moved: false }
    setDrag({ key: r.key, mode, dd: 0 })
    try { ev.currentTarget.setPointerCapture(ev.pointerId) } catch (err) { /* older browsers */ }
  }
  const onDragMove = (ev) => {
    const d = dragRef.current
    if (!d) return
    const dd = Math.round((ev.clientX - d.x0) / PXD)
    if (dd !== 0) d.moved = true
    d.dd = dd
    setDrag((prev) => (prev && prev.dd === dd ? prev : { key: d.key, mode: d.mode, dd }))
  }
  const endDrag = () => {
    const d = dragRef.current
    dragRef.current = null
    setDrag(null)
    if (!d || !d.moved) return
    const dd = d.dd || 0
    if (!dd) return
    let s = d.s, e = d.e
    if (d.mode === 'move') { s += dd; e += dd }
    else if (d.mode === 'left') s = Math.min(s + dd, e)
    else if (d.mode === 'right') e = Math.max(e + dd, s)
    saveSiteSchedule(d.key, { start: dateOfDay(s), deadline: dateOfDay(e) })
  }
  // Geometry for a row's plan strip, with live drag preview applied.
  const planGeo = (r) => {
    const hasPlan = !!(r.planStart || r.deadline)
    let s = dayNum(r.planStart || r.first)
    let e = dayNum(r.deadline || r.last)
    if (drag && drag.key === r.key) {
      if (drag.mode === 'move') { s += drag.dd; e += drag.dd }
      else if (drag.mode === 'left') s = Math.min(s + drag.dd, e)
      else if (drag.mode === 'right') e = Math.max(e + drag.dd, s)
    }
    const l = clampX((s - D0) * PXD); const rr = clampX((e - D0 + 1) * PXD)
    return { left: l, width: Math.max(5, rr - l), hasPlan, s, e }
  }

  const zoomSeg = (
    <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
      {['day', 'week', 'month'].map((z) => <button key={z} onClick={() => setZoom(z)} style={css(seg(zoom === z))}>{z[0].toUpperCase() + z.slice(1)}</button>)}
    </div>
  )

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:9px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0;flex-wrap:wrap')}>
        {ModeToggle}
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {['project', 'employee'].map((g) => <button key={g} onClick={() => setGroup(g)} style={css(seg(group === g))}>By {g}</button>)}
        </div>
        {zoomSeg}
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {['both', 'darwin', 'mauricio'].map((t) => <button key={t} onClick={() => setTeam(t)} style={css(seg(team === t))}>{TEAM_LABEL[t]}</button>)}
        </div>
        {group === 'project' && (
          <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
            {[['all', 'All'], ['active', 'In progress'], ['done', 'Completed']].map(([k, l]) => <button key={k} onClick={() => setStatus(k)} style={css(seg(status === k))}>{l}</button>)}
          </div>
        )}
        {group === 'project' && (
          <button onClick={() => setSchedOnly((v) => !v)} title="Only projects with a planned start / deadline / order"
            style={css('display:inline-flex;align-items:center;gap:5px;border-radius:7px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;' + (schedOnly ? 'background:var(--blue-soft);color:var(--blue-hi);border:1px solid var(--blue)' : 'background:var(--panel-2);color:var(--muted);border:1px solid var(--line)'))}>Scheduled</button>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value)} title="Sort rows" style={css(selStyle)}>
          <option value="order">Sort: order / start</option>
          <option value="start">Sort: start date</option>
          {group === 'project' && <option value="deadline">Sort: deadline</option>}
          <option value="hours">Sort: hours</option>
          {group === 'project' && <option value="painters">Sort: painters</option>}
          <option value="name">Sort: name</option>
        </select>
        <input placeholder={group === 'project' ? 'Search job site…' : 'Search employee…'} value={q} onChange={(e) => setQ(e.target.value)} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:150px;outline:none')} />
        <div style={css('flex:1')} />
        <button onClick={() => setExpForm(true)} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--panel-2);border:1px solid var(--line);border-radius:7px;padding:6px 11px;font-size:12px;font-weight:600;color:var(--text);cursor:pointer')}>+ Expense</button>
        <button onClick={() => setCoForm(true)} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer')}>+ Change order</button>
      </div>
      {group === 'project' && (
        <div style={css('display:flex;gap:14px;align-items:center;padding:5px 16px;border-bottom:1px solid var(--line-soft);background:var(--panel);flex-shrink:0;font-size:10.5px;color:var(--faint)')}>
          <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:12px;height:8px;border-radius:2px;background:#2f82ff')} />Actual work</span>
          <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:12px;height:6px;border-radius:3px;border:1.5px solid var(--blue-hi);background:var(--blue-soft)')} />Plan — drag to move, edges to resize</span>
          <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:9px;height:9px;transform:rotate(45deg);border:2px solid var(--red)')} />Deadline</span>
          <span>Drag an unplanned bar to create its plan · click a name for daily painters · ✎ for exact dates</span>
        </div>
      )}

      <div style={css('flex:1;overflow:auto;background:var(--bg)')}>
        <div style={{ width: NAME_W + width + 'px', minWidth: '100%' }}>
          {/* month header */}
          <div style={css('display:flex;position:sticky;top:0;z-index:3;background:var(--panel);border-bottom:1px solid var(--line);height:26px')}>
            <div style={{ ...css('flex-shrink:0;position:sticky;left:0;background:var(--panel);border-right:1px solid var(--line);display:flex;align-items:center;padding:0 12px;font-size:10px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;z-index:1'), width: NAME_W + 'px' }}>
              {group === 'project' ? projRows.length + ' projects' : empRows.length + ' painters'}
            </div>
            <div style={css('position:relative;flex:1')}>
              {months.map((mk, i) => (
                <span key={i} style={{ ...css('position:absolute;top:0;height:26px;display:flex;align-items:center;font-size:10px;font-weight:700;color:var(--muted);white-space:nowrap;padding-left:3px;border-left:1px solid var(--line-soft)'), left: mk.x + 'px' }}>{MONTHS[mk.m]}{mk.m === 0 || i === 0 ? " '" + String(mk.y).slice(2) : ''}</span>
              ))}
              {todayX != null && <span style={{ position: 'absolute', top: 0, bottom: 0, left: todayX + 'px', width: '2px', background: 'var(--blue)', opacity: 0.7 }} />}
            </div>
          </div>

          {/* PROJECT rows */}
          {group === 'project' && projRows.map((r) => {
            const pg = planGeo(r)
            const ag = barGeo(r.first, r.last)
            const dragging = drag && drag.key === r.key
            const names = r.topNames.slice(0, 2).join(', ') + (r.topNames.length > 2 ? ' +' + (r.topNames.length - 2) : '')
            return (
              <React.Fragment key={r.key}>
                <div style={css('display:flex;height:' + ROW + 'px;border-bottom:1px solid var(--line-soft)')}>
                  <div style={{ ...css('flex-shrink:0;position:sticky;left:0;background:var(--panel);border-right:1px solid var(--line);display:flex;align-items:center;gap:6px;padding:0 10px;z-index:1'), width: NAME_W + 'px' }}>
                    {r.order != null && <span style={css('font-size:9.5px;font-weight:800;color:var(--blue-hi);font-family:var(--font-mono);min-width:16px')}>#{r.order}</span>}
                    <span onClick={() => setDetail(r)} title={'View daily painters — ' + r.name} style={css('font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;cursor:pointer')}>{r.name}</span>
                    {!r.active && <Badge color="green">done</Badge>}
                    <button onClick={() => (editKey === r.key ? (setEditKey(null), setSd(null)) : openSched(r))} title="Set planned start / deadline / order" style={css('width:22px;height:22px;border-radius:5px;background:transparent;border:1px solid var(--line);cursor:pointer;color:' + (editKey === r.key ? 'var(--blue-hi)' : 'var(--faint)') + ';flex-shrink:0')}>✎</button>
                  </div>
                  <div style={css('position:relative;flex:1')} onPointerMove={dragging ? onDragMove : undefined} onPointerUp={dragging ? endDrag : undefined}>
                    {todayX != null && <span style={{ position: 'absolute', top: 0, bottom: 0, left: todayX + 'px', width: '2px', background: 'var(--blue)', opacity: 0.5 }} />}

                    {/* PLAN strip (drag body = move, edges = resize) */}
                    {(pg.hasPlan || dragging) && (
                      <div onPointerDown={(ev) => beginDrag(ev, r, 'move')} onPointerMove={onDragMove} onPointerUp={endDrag}
                        title={`Plan · ${fmtDate(dateOfDay(pg.s))} – ${fmtDate(dateOfDay(pg.e))} — drag to move, edges to resize`}
                        style={{ position: 'absolute', left: pg.left + 'px', width: pg.width + 'px', top: '3px', height: '9px', borderRadius: '4px', background: 'var(--blue-soft)', border: '1.5px solid var(--blue-hi)', cursor: 'grab', zIndex: 3, touchAction: 'none', opacity: dragging ? 1 : 0.95 }}>
                        <span onPointerDown={(ev) => beginDrag(ev, r, 'left')} style={{ position: 'absolute', left: '-3px', top: '-3px', bottom: '-3px', width: '8px', cursor: 'ew-resize', touchAction: 'none' }} />
                        <span onPointerDown={(ev) => beginDrag(ev, r, 'right')} style={{ position: 'absolute', right: '-3px', top: '-3px', bottom: '-3px', width: '8px', cursor: 'ew-resize', touchAction: 'none' }} />
                      </div>
                    )}

                    {/* ACTUAL bar (drag creates a plan when none exists) */}
                    <div onPointerDown={pg.hasPlan ? undefined : (ev) => beginDrag(ev, r, 'move')} onPointerMove={onDragMove} onPointerUp={endDrag}
                      title={`${r.name} · ${fmtDate(r.first)} – ${fmtDate(r.last)} · ${fmtH(r.hours)} · ${r.painters} painters${pg.hasPlan ? '' : ' — drag to create a plan'}`}
                      style={{ position: 'absolute', left: ag.left + 'px', width: ag.width + 'px', top: '14px', height: '16px', borderRadius: '4px', background: teamColor(r.teamsIn), opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px', padding: '0 6px', overflow: 'hidden', cursor: pg.hasPlan ? 'default' : 'grab', touchAction: 'none' }}>
                      <span style={css('font-size:10px;font-weight:700;color:#06080d;white-space:nowrap')}>{fmtH(r.hours)}</span>
                      {ag.width > 120 && names && <span style={css('font-size:9.5px;font-weight:600;color:rgba(6,8,13,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{names}</span>}
                    </div>

                    {r.deadline && !dragging && <span title={'Deadline ' + r.deadline} style={{ position: 'absolute', left: (clampX(xFor(r.deadline)) - 5) + 'px', top: '3px', width: '9px', height: '9px', transform: 'rotate(45deg)', background: 'var(--panel)', border: '2px solid var(--red)', zIndex: 2, pointerEvents: 'none' }} />}
                    {dragging && (
                      <span style={{ position: 'absolute', left: pg.left + 'px', top: '-15px', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--blue-hi)', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', padding: '0 5px', zIndex: 5, whiteSpace: 'nowrap' }}>
                        {fmtDate(dateOfDay(pg.s))} → {fmtDate(dateOfDay(pg.e))}
                      </span>
                    )}
                  </div>
                </div>
                {editKey === r.key && sd && (
                  <div style={css('display:flex;gap:12px;align-items:flex-end;padding:9px 12px 9px 20px;background:var(--inset);border-bottom:1px solid var(--line);flex-wrap:wrap')}>
                    <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Planned start</span><input type="date" value={sd.start} onChange={(e) => setSd((d) => ({ ...d, start: e.target.value }))} style={css(dInput)} /></label>
                    <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9px;text-transform:uppercase;color:var(--red);font-weight:700')}>Deadline</span><input type="date" value={sd.deadline} onChange={(e) => setSd((d) => ({ ...d, deadline: e.target.value }))} style={css(dInput)} /></label>
                    <label style={css('display:flex;flex-direction:column;gap:3px')}><span style={css('font-size:9px;text-transform:uppercase;color:var(--faint);font-weight:700')}>Order</span><input type="number" step="1" value={sd.order} placeholder="—" onChange={(e) => setSd((d) => ({ ...d, order: e.target.value }))} style={css(dInput + ';width:70px;text-align:right')} /></label>
                    <button onClick={() => saveSched(r)} style={css('background:var(--blue);color:#fff;border:0;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer')}>Save</button>
                    <button onClick={() => { setEditKey(null); setSd(null) }} style={css('background:var(--panel-2);color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer')}>Cancel</button>
                    {(r.planStart || r.deadline || r.order != null) && <button onClick={() => clearSched(r)} style={css('background:transparent;color:var(--red);border:0;font-size:11px;cursor:pointer;text-decoration:underline')}>Clear plan</button>}
                    <span style={css('font-size:10px;color:var(--faint-2)')}>Actual work: {fmtDate(r.first)} – {fmtDate(r.last)}</span>
                  </div>
                )}
              </React.Fragment>
            )
          })}

          {/* EMPLOYEE rows */}
          {group === 'employee' && empRows.map((emp) => (
            <div key={emp.id} style={css('display:flex;height:' + ROW + 'px;border-bottom:1px solid var(--line-soft)')}>
              <div style={{ ...css('flex-shrink:0;position:sticky;left:0;background:var(--panel);border-right:1px solid var(--line);display:flex;align-items:center;gap:7px;padding:0 12px;z-index:1'), width: NAME_W + 'px' }}>
                <span style={css('font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1')}>{emp.name}</span>
                {emp.conflicts.length > 0 && (
                  <span title={emp.conflicts.length + ' day(s) double-booked across sites: ' + emp.conflicts.map(fmtDate).join(', ')}
                    style={css('display:inline-flex;align-items:center;gap:3px;background:var(--amber-soft);color:var(--amber);border:1px solid var(--amber-line);border-radius:5px;padding:1px 5px;font-size:9.5px;font-weight:800;flex-shrink:0')}>⚠ {emp.conflicts.length}</span>
                )}
                <span style={css('font-size:10px;color:var(--faint-2);font-family:var(--font-mono)')}>{fmtH(emp.hours)}</span>
              </div>
              <div style={css('position:relative;flex:1')}>
                {todayX != null && <span style={{ position: 'absolute', top: 0, bottom: 0, left: todayX + 'px', width: '2px', background: 'var(--blue)', opacity: 0.5 }} />}
                {emp.segs.map((s, i) => (
                  <div key={i} title={`${s.loc} · ${fmtDate(s.first)} – ${fmtDate(s.last)} · ${fmtH(s.hours)}`}
                    style={{ position: 'absolute', left: barGeo(s.first, s.last).left + 'px', width: barGeo(s.first, s.last).width + 'px', top: '9px', height: ROW - 18 + 'px', borderRadius: '3px', background: teamColor(s.teams), opacity: 0.85 }} />
                ))}
                {emp.conflicts.map((d) => (
                  <span key={d} title={'Double-booked on ' + fmtDate(d)} style={{ position: 'absolute', left: (clampX(xFor(d)) - 4) + 'px', top: ROW / 2 - 4 + 'px', width: '8px', height: '8px', transform: 'rotate(45deg)', background: 'var(--amber)', border: '1px solid #06080d', zIndex: 2 }} />
                ))}
              </div>
            </div>
          ))}

          {((group === 'project' && projRows.length === 0) || (group === 'employee' && empRows.length === 0)) && (
            <div style={css('padding:30px;text-align:center;color:var(--faint)')}>Nothing to show for this filter / search.</div>
          )}
        </div>
      </div>

      {detail && (
        <>
          <div onClick={() => setDetail(null)} aria-hidden="true" style={css('position:fixed;inset:0;background:rgba(4,6,10,.5);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:100')} />
          <aside role="dialog" aria-modal="true" aria-label={detail.name + ' — daily painters'} style={css('position:fixed;top:12px;right:12px;bottom:12px;width:720px;max-width:94vw;background:var(--panel);border:1px solid var(--line-strong);border-radius:14px;box-shadow:0 28px 70px rgba(0,0,0,.6);z-index:110;display:flex;flex-direction:column;overflow:hidden')}>
            <div style={css('padding:14px 16px;border-bottom:1px solid var(--line-soft);display:flex;align-items:center;gap:10px;flex-shrink:0')}>
              <div style={css('flex:1;min-width:0')}>
                <div style={css('font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={detail.name}>{detail.name}</div>
                <div style={css('font-size:11.5px;color:var(--faint);display:flex;align-items:center;gap:7px;flex-wrap:wrap')}>
                  {detail.teamsIn.map((t) => <Badge key={t} color={TEAM_COLOR[t]}>{TEAM_LABEL[t]}</Badge>)}
                  <span>{detail.painters} painters · {fmtH(detail.hours)} · {fmtDate(detail.first)} – {fmtDate(detail.last)}</span>
                </div>
              </div>
              <button onClick={() => setDetail(null)} style={css('width:28px;height:28px;border-radius:7px;display:grid;place-items:center;background:transparent;border:1px solid var(--line);cursor:pointer;color:var(--muted)')}>✕</button>
            </div>
            <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 16px;flex-shrink:0')}>
              {[['Painters', String(detail.painters)], ['Hours', fmtH(detail.hours)], ['Planned start', detail.planStart ? fmtDate(detail.planStart) : '—'], ['Deadline', detail.deadline ? fmtDate(detail.deadline) : '—']].map(([l, v]) => (
                <div key={l} style={css('padding:9px 11px;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px')}>
                  <div style={css('font-size:9.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:3px')}>{l}</div>
                  <div style={css('font-size:15px;font-weight:800;font-family:var(--font-mono)')}>{v}</div>
                </div>
              ))}
            </div>
            <div style={css('flex:1;overflow:auto;padding:2px 16px 16px')}>
              {detailDays.map((day) => (
                <div key={day.date} style={css('margin-bottom:11px')}>
                  <div style={css('display:flex;align-items:center;gap:8px;padding:6px 2px')}>
                    <span style={css('font-size:12px;font-weight:700;font-family:var(--font-mono)')}>{fmtDate(day.date)}</span>
                    <span style={css('font-size:10.5px;color:var(--faint)')}>{day.painters.length} painter{day.painters.length === 1 ? '' : 's'} · {fmtH(day.hours)}</span>
                  </div>
                  <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden')}>
                    {day.painters.map((e, i) => (
                      <div key={i} style={css('display:flex;align-items:center;gap:10px;padding:7px 11px;font-size:12px;' + (i ? 'border-top:1px solid var(--line-soft)' : ''))}>
                        <span style={css('font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{e.name}</span>
                        <Badge color={TEAM_COLOR[e.team]}>{TEAM_LABEL[e.team]}</Badge>
                        <span style={css('font-family:var(--font-mono);width:46px;text-align:right;color:var(--muted)')}>{e.hours ? e.hours + 'h' : ''}</span>
                        <span style={css('font-family:var(--font-mono);width:74px;text-align:right;color:var(--green)')}>{e.total ? money(e.total) : ''}</span>
                        <span style={css('color:var(--faint-2);width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={e.notes}>{e.notes || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {detailDays.length === 0 && <div style={css('padding:20px;text-align:center;color:var(--faint)')}>No entries logged for this project.</div>}
            </div>
          </aside>
        </>
      )}

      {coForm && <COForm initial={{ projectKey: '', title: '', desc: '', requestedBy: '', amount: '', cost: '', status: 'pending', date: '' }} onClose={() => setCoForm(false)} onSave={(r) => addChangeOrder(r)} />}
      {expForm && <ExpForm initial={{ projectKey: '', title: '', category: 'Materials', vendor: '', amount: '', status: 'unpaid', date: '' }} onClose={() => setExpForm(false)} onSave={(r) => addExpense(r)} />}
    </div>
  )
}
