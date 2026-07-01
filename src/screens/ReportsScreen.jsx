import React, { useState, useMemo } from 'react'
import { css } from '../lib/css.js'
import { Modal, THEAD, TD } from '../ui/bits.jsx'
import { downloadCSV } from '../lib/csv.js'
import { useEdits, changeOrders, expenses, allSiteSchedules } from '../lib/edits.js'
import {
  payroll, jobSites, filterEntries, employeeById, META, TEAM_LABEL,
} from '../lib/macPayroll.js'
import { projectList } from '../lib/projects.js'

// Reports — a grid of report cards. "View" previews the first rows in a modal;
// "Export" downloads the full report as CSV. Every report is built from the real
// merged payroll plus the operator's change-order / expense records — nothing is
// synthetic, so an unfilled finance report simply comes back with $0 revenue.

const ISO_WEEK = (d) => {
  const dt = new Date(d + 'T00:00:00')
  const day = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - day + 3)
  const firstThu = new Date(dt.getFullYear(), 0, 4)
  const week = 1 + Math.round(((dt - firstThu) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7)
  return `${dt.getFullYear()}-W${String(week).padStart(2, '0')}`
}

const ic = (name) => {
  const d = {
    wallet: 'M3.5 6.5h17v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2zM3.5 9.5h13.5a2 2 0 0 1 0 4H3.5',
    users: 'M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19a5.5 5.5 0 0 1 11 0M16 8a2.4 2.4 0 1 0 0 0M14.5 13.5A4.5 4.5 0 0 1 20.5 18',
    folder: 'M3.5 7.5a2 2 0 0 1 2-2h3.5l2 2h7.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z',
    dollar: 'M12 4v16M16 8a3 3 0 0 0-3-2h-2.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5h-3a3 3 0 0 1-3-2',
    chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8',
    doc: 'M6 3h8l4 4v14H6zM14 3v4h4',
    receipt: 'M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21zM9 8h6M9 12h6',
    pin: 'M12 2.5c3.5 0 6 2.5 6 6 0 4.5-6 12-6 12s-6-7.5-6-12c0-3.5 2.5-6 6-6zM12 9.2a1.6 1.6 0 1 0 0 0.1',
    gantt: 'M4 7h9M8 12h11M6 17h8',
    calendar: 'M3.5 5h17v15h-17zM3.5 9.5h17M8 3v4M16 3v4',
  }
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {(d[name] || d.doc).split('M').filter(Boolean).map((seg, i) => <path key={i} d={'M' + seg} />)}
    </svg>
  )
}

export default function ReportsScreen({ onGo }) {
  const editV = useEdits()
  const [preview, setPreview] = useState(null) // { title, columns, rows }

  const reports = useMemo(() => {
    void editV
    const F = (t) => filterEntries('both', META.dateMin, META.dateMax).filter(t ? t : () => true)
    const nm = (id) => (employeeById(id) || {}).name || id

    return [
      {
        id: 'pay-week', title: 'Payroll by week', icon: 'wallet', view: 'payroll',
        desc: 'Gross, additions, deductions and net wages bucketed by ISO week.',
        columns: ['Week', 'Entries', 'Hours', 'Gross', 'Additions', 'Deductions', 'Net'],
        build: () => {
          const by = {}
          for (const e of F()) { const k = ISO_WEEK(e.date); const a = by[k] || (by[k] = [0, 0, 0, 0, 0, 0]); a[0]++; a[1] += e.hours; a[2] += e.subtotal; a[3] += e.addition; a[4] += e.deduction; a[5] += e.total }
          return Object.entries(by).sort((x, y) => (x[0] < y[0] ? 1 : -1)).map(([k, a]) => [k, a[0], Math.round(a[1]), Math.round(a[2]), Math.round(a[3]), Math.round(a[4]), Math.round(a[5])])
        },
      },
      {
        id: 'pay-month', title: 'Payroll by month', icon: 'calendar', view: 'payroll',
        desc: 'Monthly labor totals — the fastest read on payroll trend.',
        columns: ['Month', 'Entries', 'Hours', 'Gross', 'Net'],
        build: () => {
          const by = {}
          for (const e of F()) { const k = e.date.slice(0, 7); const a = by[k] || (by[k] = [0, 0, 0, 0]); a[0]++; a[1] += e.hours; a[2] += e.subtotal; a[3] += e.total }
          return Object.entries(by).sort((x, y) => (x[0] < y[0] ? 1 : -1)).map(([k, a]) => [k, a[0], Math.round(a[1]), Math.round(a[2]), Math.round(a[3])])
        },
      },
      {
        id: 'pay-emp', title: 'Payroll by employee', icon: 'users', view: 'payroll',
        desc: 'Per-painter hours, rate and net pay across the full period.',
        columns: ['Painter', 'Role', 'Pay type', 'Rate', 'Hours', 'Days', 'Gross', 'Net'],
        build: () => payroll('both', META.dateMin, META.dateMax, {}).rows.sort((a, b) => b.hours - a.hours)
          .map((r) => [r.name, r.role, r.payType, r.rate != null ? r.rate : '', Math.round(r.hours), r.days, Math.round(r.subtotal), Math.round(r.total)]),
      },
      {
        id: 'pay-project', title: 'Payroll by project', icon: 'folder', view: 'projects',
        desc: 'Labor dollars and hours grouped by job site.',
        columns: ['Job site', 'Teams', 'Painters', 'Hours', 'Wages', 'Contract', 'Recorded'],
        build: () => jobSites('both', META.dateMin, META.dateMax, {}).rows.sort((a, b) => b.total - a.total)
          .map((r) => [r.name, r.teamsIn.map((t) => TEAM_LABEL[t]).join('+'), r.painters, Math.round(r.hours), Math.round(r.wages), Math.round(r.billing), Math.round(r.total)]),
      },
      {
        id: 'labor-cost', title: 'Labor cost', icon: 'dollar', view: 'projects',
        desc: 'Recorded labor plus material expenses, per project.',
        columns: ['Project', 'Hours', 'Labor cost', 'Materials', 'Total cost'],
        build: () => projectList('both', META.dateMin, META.dateMax, {}).rows.filter((p) => p.hours > 0).sort((a, b) => b.cost - a.cost)
          .map((p) => [p.name, Math.round(p.hours), Math.round(p.laborCost), Math.round(p.materials), Math.round(p.cost)]),
      },
      {
        id: 'pnl', title: 'P&L report', icon: 'chart', view: 'projects',
        desc: 'Revenue, cost, profit and margin per project (contract + change orders).',
        columns: ['Project', 'Contract', 'Approved CO', 'Revenue', 'Cost', 'Profit', 'Margin'],
        build: () => projectList('both', META.dateMin, META.dateMax, {}).rows.filter((p) => p.revenue > 0 || p.cost > 0).sort((a, b) => b.revenue - a.revenue)
          .map((p) => [p.name, Math.round(p.contract), Math.round(p.coApprovedAmt), Math.round(p.revenue), Math.round(p.cost), Math.round(p.profit), p.margin == null ? '' : Math.round(p.margin * 100) + '%']),
      },
      {
        id: 'co', title: 'Change order report', icon: 'doc', view: 'change-orders',
        desc: 'Every change order with amount, cost impact and status.',
        columns: ['Change order', 'Project', 'Requested by', 'Amount', 'Cost', 'Status', 'Date'],
        build: () => changeOrders().slice().sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((c) => [c.title, c.projectName, c.requestedBy, Math.round(c.amount), Math.round(c.cost), c.status, c.date]),
      },
      {
        id: 'exp', title: 'Expense report', icon: 'receipt', view: 'expenses',
        desc: 'Materials, equipment and other spend by project and vendor.',
        columns: ['Item', 'Category', 'Vendor', 'Project', 'Amount', 'Status', 'Date'],
        build: () => expenses().slice().sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((e) => [e.title, e.category, e.vendor, e.projectName, Math.round(e.amount), e.status, e.date]),
      },
      {
        id: 'history', title: 'Painter work history', icon: 'gantt', view: 'time-logs',
        desc: 'The full daily log — every entry, painter, site and amount.',
        columns: ['Date', 'Painter', 'Team', 'Job site', 'Hours', 'Total'],
        build: () => F().slice().sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((e) => [e.date, nm(e.empId), TEAM_LABEL[e.team], e.location || '', e.hours, Math.round(e.total)]),
      },
      {
        id: 'schedule', title: 'Project schedule', icon: 'calendar', view: 'schedule',
        desc: 'Status, % complete and planned vs. logged dates for each project.',
        columns: ['Project', 'Status', '% complete', 'Planned start', 'Deadline', 'First logged', 'Last logged'],
        build: () => {
          const sch = allSiteSchedules()
          return projectList('both', META.dateMin, META.dateMax, {}).rows.filter((p) => p.hours > 0).sort((a, b) => (a.last < b.last ? 1 : -1))
            .map((p) => [p.name, p.statusLabel, p.percent + '%', (sch[p.key] || {}).start || '', (sch[p.key] || {}).deadline || '', p.first, p.last])
        },
      },
      {
        id: 'productivity', title: 'Employee productivity', icon: 'chart', view: 'painters',
        desc: 'Hours, days worked and average hours per day, per painter.',
        columns: ['Painter', 'Entries', 'Hours', 'Days', 'Hours / day'],
        build: () => payroll('both', META.dateMin, META.dateMax, {}).rows.filter((r) => r.hours > 0).sort((a, b) => b.hours - a.hours)
          .map((r) => [r.name, r.n, Math.round(r.hours), r.days, r.days ? (Math.round((r.hours / r.days) * 10) / 10) : '']),
      },
    ]
  }, [editV])

  const doExport = (r) => downloadCSV(`maka-${r.id}.csv`, r.columns, r.build())
  const doView = (r) => setPreview({ title: r.title, columns: r.columns, rows: r.build() })

  return (
    <div style={css('padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:13px;overflow:auto;height:100%;align-content:start')}>
      {reports.map((r) => (
        <div key={r.id} style={css('background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:15px;display:flex;flex-direction:column;gap:8px')}>
          <div style={css('width:34px;height:34px;border-radius:9px;background:var(--blue-soft);color:var(--accent);display:grid;place-items:center')}>{ic(r.icon)}</div>
          <div style={css('font-size:13.5px;font-weight:700')}>{r.title}</div>
          <div style={css('font-size:11.5px;color:var(--faint);flex:1;line-height:1.5')}>{r.desc}</div>
          <div style={css('display:flex;gap:7px;margin-top:2px')}>
            <button onClick={() => doView(r)} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-size:11.5px;font-weight:600;color:var(--text);cursor:pointer')}>View</button>
            <button onClick={() => doExport(r)} style={css('display:inline-flex;align-items:center;gap:5px;background:transparent;border:1px solid transparent;border-radius:6px;padding:5px 10px;font-size:11.5px;font-weight:600;color:var(--muted);cursor:pointer')}>Export CSV</button>
            {r.view && onGo && <button onClick={() => onGo(r.view)} style={css('display:inline-flex;align-items:center;gap:5px;background:transparent;border:1px solid transparent;border-radius:6px;padding:5px 6px;font-size:11.5px;font-weight:600;color:var(--blue-hi);cursor:pointer;margin-left:auto')}>Open →</button>}
          </div>
        </div>
      ))}

      {preview && (
        <Modal title={preview.title} sub={`${preview.rows.length.toLocaleString('en-US')} rows · showing first ${Math.min(preview.rows.length, 40)}`} width={780} onClose={() => setPreview(null)}
          footer={<button onClick={() => { downloadCSV(`maka-preview.csv`, preview.columns, preview.rows); }} style={css('background:var(--blue);color:#fff;border:0;border-radius:7px;padding:7px 14px;font-size:12.5px;font-weight:700;cursor:pointer')}>Export CSV</button>}>
          <div style={css('border:1px solid var(--line);border-radius:8px;overflow:auto;max-height:56vh')}>
            <table style={css('width:100%;border-collapse:collapse;font-size:12px')}>
              <thead><tr>{preview.columns.map((c, i) => <th key={c} style={css(`text-align:${i === 0 ? 'left' : 'right'};${THEAD};position:sticky;top:0`)}>{c}</th>)}</tr></thead>
              <tbody>
                {preview.rows.slice(0, 40).map((row, ri) => (
                  <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={css(`${TD};${ci === 0 ? '' : 'text-align:right;font-family:var(--font-mono)'};${ci === 0 ? 'font-weight:600' : ''}`)}>{typeof cell === 'number' && ci > 0 ? cell.toLocaleString('en-US') : cell}</td>)}</tr>
                ))}
                {preview.rows.length === 0 && <tr><td colSpan={preview.columns.length} style={css('padding:22px;text-align:center;color:var(--faint)')}>No data yet — this report fills in as work and finance are recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  )
}
