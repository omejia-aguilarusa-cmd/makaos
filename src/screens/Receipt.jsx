import React, { useMemo } from 'react'
import { employeeById, employeeEntries, money, fmtH, fmtDate, TEAM_LABEL } from '../lib/macPayroll.js'

// Printable pay receipts — a clean white sheet per employee for the selected
// team + pay period, showing every day (date, job site, hours, base,
// additions, deductions) and the net total paid. Rendered as an overlay; the
// print stylesheet (styles/print.css) prints only the sheets, one page each.
// Styling is intentionally light/explicit (not the app's dark theme) so it
// prints well on white paper.

const INK = '#1a2230'
const MUTE = '#5b6472'
const LINE = '#dfe3ea'
const GREEN = '#0a7d33'
const RED = '#b00020'

const cell = (align = 'left', extra = {}) => ({ padding: '6px 8px', borderBottom: `1px solid ${LINE}`, fontSize: '12px', textAlign: align, ...extra })
const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }

function Sheet({ id, team, from, to, preparedOn }) {
  const emp = employeeById(id) || { name: id, role: '', payType: '', rate: null }
  const entries = employeeEntries(id, team, from, to)
  const t = entries.reduce(
    (a, e) => { a.hours += e.hours; a.base += e.subtotal; a.add += e.addition; a.ded += e.deduction; a.net += e.total; return a },
    { hours: 0, base: 0, add: 0, ded: 0, net: 0 },
  )
  return (
    <div className="receipt-sheet" style={{ width: '760px', maxWidth: '100%', background: '#fff', color: INK, borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,.35)', padding: '38px 40px', margin: '0 auto' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: `2px solid ${INK}`, paddingBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '.02em' }}>Maka Painters</div>
          <div style={{ fontSize: '12px', color: MUTE, marginTop: '2px' }}>Payroll Receipt</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11.5px', color: MUTE, lineHeight: 1.6 }}>
          <div><strong style={{ color: INK }}>Period</strong> {fmtDate(from)} – {fmtDate(to)}</div>
          <div><strong style={{ color: INK }}>Team</strong> {TEAM_LABEL[team]}</div>
          <div>Prepared by Oscar Mejia · {preparedOn}</div>
        </div>
      </div>

      {/* employee */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '16px 0 10px' }}>
        <div>
          <div style={{ fontSize: '17px', fontWeight: 800 }}>{emp.name}{emp.you ? ' (You)' : ''}</div>
          <div style={{ fontSize: '12px', color: MUTE }}>{emp.role}{emp.payType ? ' · ' + emp.payType : ''}{emp.rate != null ? ' · $' + emp.rate : ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '.06em', color: MUTE, fontWeight: 700 }}>Net paid</div>
          <div style={{ fontSize: '26px', fontWeight: 800, ...mono }}>{money(t.net)}</div>
        </div>
      </div>

      {/* line items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
        <thead>
          <tr>
            {['Date', 'Job site', 'Hours', 'Base', 'Additions', 'Deductions', 'Net'].map((h, i) => (
              <th key={h} style={{ ...cell(i >= 2 ? 'right' : 'left'), borderBottom: `1.5px solid ${INK}`, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '.05em', color: MUTE, fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}>
              <td style={{ ...cell('left', mono), whiteSpace: 'nowrap', color: MUTE }}>{fmtDate(e.date)}</td>
              <td style={cell('left', { maxWidth: '230px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })} title={e.location}>{e.location || '—'}</td>
              <td style={{ ...cell('right', mono) }}>{e.hours || ''}</td>
              <td style={{ ...cell('right', mono) }}>{e.subtotal ? money(e.subtotal) : ''}</td>
              <td style={{ ...cell('right', mono), color: e.addition ? GREEN : INK }}>{e.addition ? money(e.addition) : ''}</td>
              <td style={{ ...cell('right', mono), color: e.deduction ? RED : INK }}>{e.deduction ? money(e.deduction) : ''}</td>
              <td style={{ ...cell('right', mono), fontWeight: 700 }}>{e.total ? money(e.total) : ''}</td>
            </tr>
          ))}
          {entries.length === 0 && <tr><td colSpan={7} style={{ ...cell('center'), color: MUTE, padding: '18px' }}>No entries for this period.</td></tr>}
        </tbody>
        {entries.length > 0 && (
          <tfoot>
            <tr>
              <td style={{ ...cell('left'), borderTop: `1.5px solid ${INK}`, borderBottom: 'none', fontWeight: 800 }}>TOTAL</td>
              <td style={{ ...cell(), borderTop: `1.5px solid ${INK}`, borderBottom: 'none', color: MUTE }}>{entries.length} day(s)</td>
              <td style={{ ...cell('right', mono), borderTop: `1.5px solid ${INK}`, borderBottom: 'none', fontWeight: 700 }}>{fmtH(t.hours)}</td>
              <td style={{ ...cell('right', mono), borderTop: `1.5px solid ${INK}`, borderBottom: 'none', fontWeight: 700 }}>{money(t.base)}</td>
              <td style={{ ...cell('right', mono), borderTop: `1.5px solid ${INK}`, borderBottom: 'none', fontWeight: 700, color: GREEN }}>{t.add ? money(t.add) : '—'}</td>
              <td style={{ ...cell('right', mono), borderTop: `1.5px solid ${INK}`, borderBottom: 'none', fontWeight: 700, color: RED }}>{t.ded ? money(t.ded) : '—'}</td>
              <td style={{ ...cell('right', mono), borderTop: `1.5px solid ${INK}`, borderBottom: 'none', fontWeight: 800 }}>{money(t.net)}</td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '34px', gap: '30px' }}>
        <div style={{ fontSize: '10.5px', color: MUTE, lineHeight: 1.6, maxWidth: '380px' }}>
          This receipt reflects hours and pay logged for the period above. Additions and deductions are itemized per day. Questions? Contact the office.
        </div>
        <div style={{ textAlign: 'center', minWidth: '210px' }}>
          <div style={{ borderTop: `1px solid ${INK}`, paddingTop: '5px', fontSize: '11px', color: MUTE }}>Received by (signature)</div>
        </div>
      </div>
    </div>
  )
}

export default function ReceiptOverlay({ ids, team, from, to, onClose }) {
  const preparedOn = useMemo(() => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), [])
  // Only include employees who actually have entries in the window.
  const shown = useMemo(() => (ids || []).filter((id) => employeeEntries(id, team, from, to).length > 0), [ids, team, from, to])

  return (
    <div className="receipt-portal" style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#e9ebef', overflow: 'auto' }}>
      <div className="receipt-no-print" style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 18px', background: '#12161d', borderBottom: '1px solid #2a3140', color: '#e7ecf3' }}>
        <span style={{ fontSize: '13px', fontWeight: 700 }}>{shown.length} receipt{shown.length === 1 ? '' : 's'}</span>
        <span style={{ fontSize: '11.5px', color: '#98a2b3' }}>{TEAM_LABEL[team]} · {fmtDate(from)} – {fmtDate(to)}</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#2f82ff', color: '#fff', border: 0, borderRadius: '7px', padding: '7px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>🖨 Print{shown.length > 1 ? ' all' : ''}</button>
        <button onClick={onClose} style={{ background: 'transparent', color: '#cdd5e0', border: '1px solid #2a3140', borderRadius: '7px', padding: '7px 12px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>Close</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', padding: '22px 16px 60px' }}>
        {shown.length === 0 && <div style={{ textAlign: 'center', color: '#6b7480', padding: '40px', fontSize: '13px' }}>No employees with entries in this period.</div>}
        {shown.map((id) => <Sheet key={id} id={id} team={team} from={from} to={to} preparedOn={preparedOn} />)}
      </div>
    </div>
  )
}
