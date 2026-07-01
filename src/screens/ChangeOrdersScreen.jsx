import React, { useState, useMemo } from 'react'
import { css } from '../lib/css.js'
import { Badge } from '../ds/index.jsx'
import { Modal, Field, INPUT, THEAD, TD, BTN_PRIMARY } from '../ui/bits.jsx'
import { money } from '../lib/macPayroll.js'
import { useEdits, changeOrders, addChangeOrder, updateChangeOrder, deleteChangeOrder } from '../lib/edits.js'
import { projectOptions, keyFromName } from '../lib/projects.js'

// Change orders — added scope on a project (extra revenue + a cost impact).
// Approved orders flow into project revenue/profit; pending ones are tracked
// separately. Records are the operator's, persisted with an audit stamp.

const CO_STATUS = { pending: 'amber', approved: 'green', rejected: 'red' }
const blank = { projectKey: '', title: '', desc: '', requestedBy: '', amount: '', cost: '', status: 'pending', date: '' }

export function COForm({ initial, onSave, onClose, onDelete }) {
  const [f, setF] = useState(initial)
  const opts = useMemo(() => projectOptions(), [])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    // Derive the name from the SELECTED key first, so reassigning the project
    // dropdown updates the stored name too (not the stale initial one).
    const opt = opts.find((o) => o.key === f.projectKey)
    const name = opt ? opt.name : (f.projectName || f.projectKey)
    onSave({ ...f, projectName: name, projectKey: f.projectKey || keyFromName(name), amount: Number(f.amount) || 0, cost: Number(f.cost) || 0 })
    onClose()
  }
  const profit = (Number(f.amount) || 0) - (Number(f.cost) || 0)
  return (
    <Modal title={onDelete ? 'Edit change order' : 'New change order'} onClose={onClose} width={480}
      footer={<>
        {onDelete && <button onClick={() => { onDelete(); onClose() }} style={css('background:var(--red-soft);color:var(--red);border:1px solid var(--red-line);border-radius:7px;padding:7px 12px;font-size:12.5px;font-weight:700;cursor:pointer;margin-right:auto')}>Delete</button>}
        <button onClick={onClose} style={css('background:var(--panel-2);color:var(--muted);border:1px solid var(--line);border-radius:7px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer')}>Cancel</button>
        <button onClick={save} disabled={!f.title.trim()} style={css(BTN_PRIMARY + (f.title.trim() ? '' : ';opacity:.5;cursor:not-allowed'))}>Save</button>
      </>}>
      <Field label="Project">
        <select value={f.projectKey} onChange={set('projectKey')} style={css(INPUT)}>
          <option value="">— Select a project —</option>
          {opts.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
        </select>
      </Field>
      <Field label="Title"><input value={f.title} onChange={set('title')} placeholder="Add accent wall in lobby" style={css(INPUT)} /></Field>
      <Field label="Description"><textarea value={f.desc} onChange={set('desc')} style={css(INPUT + ';min-height:60px;resize:vertical;font-family:var(--font-ui)')} /></Field>
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
        <Field label="Amount ($)"><input value={f.amount} onChange={set('amount')} inputMode="decimal" style={css(INPUT + ';font-family:var(--font-mono)')} /></Field>
        <Field label="Cost impact ($)"><input value={f.cost} onChange={set('cost')} inputMode="decimal" style={css(INPUT + ';font-family:var(--font-mono)')} /></Field>
      </div>
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
        <Field label="Requested by"><input value={f.requestedBy} onChange={set('requestedBy')} placeholder="Client / PM" style={css(INPUT)} /></Field>
        <Field label="Status">
          <select value={f.status} onChange={set('status')} style={css(INPUT)}>
            <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
          </select>
        </Field>
      </div>
      <Field label="Date"><input type="date" value={f.date} onChange={set('date')} style={css(INPUT + ';font-family:var(--font-mono)')} /></Field>
      <div style={css('display:flex;justify-content:space-between;align-items:center;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:9px 12px')}>
        <span style={css('font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700')}>Added profit</span>
        <span style={css('font-family:var(--font-mono);font-weight:700;color:' + (profit >= 0 ? 'var(--green)' : 'var(--red)'))}>{money(profit)}</span>
      </div>
    </Modal>
  )
}

export default function ChangeOrdersScreen({ projectFilter }) {
  const editV = useEdits()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)

  const rows = useMemo(() => {
    void editV
    let r = changeOrders().slice()
    if (projectFilter) r = r.filter((c) => c.projectKey === projectFilter)
    return r.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [editV, projectFilter])

  const approved = rows.filter((c) => c.status === 'approved').reduce((s, c) => s + c.amount, 0)
  const pending = rows.filter((c) => c.status === 'pending').reduce((s, c) => s + c.amount, 0)

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:18px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0')}>
        <div style={css('display:flex;flex-direction:column')}><span style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700')}>Approved</span><span style={css('font-family:var(--font-mono);font-weight:700;color:var(--green)')}>{money(approved)}</span></div>
        <div style={css('display:flex;flex-direction:column')}><span style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700')}>Pending</span><span style={css('font-family:var(--font-mono);font-weight:700;color:var(--amber)')}>{money(pending)}</span></div>
        <div style={css('flex:1')} />
        <button onClick={() => setAdding(true)} style={css(BTN_PRIMARY)}>+ New change order</button>
      </div>
      <div style={css('flex:1;overflow:auto;padding:16px')}>
        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead><tr>
              <th style={css('text-align:left;' + THEAD)}>Change order</th>
              <th style={css('text-align:left;' + THEAD)}>Project</th>
              <th style={css('text-align:left;' + THEAD)}>Requested by</th>
              <th style={css('text-align:right;' + THEAD)}>Amount</th>
              <th style={css('text-align:right;' + THEAD)}>Profit</th>
              <th style={css('text-align:left;' + THEAD)}>Status</th>
            </tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c._id} onClick={() => setEditing(c)} style={css('cursor:pointer')}>
                  <td style={css(TD)}><div style={css('font-weight:600')}>{c.title}</div><div style={css('font-size:11px;color:var(--faint);max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{c.desc}</div></td>
                  <td style={css(TD + ';color:var(--muted)')}>{c.projectName || '—'}</td>
                  <td style={css(TD + ';color:var(--muted)')}>{c.requestedBy || '—'}</td>
                  <td style={css(TD + ';text-align:right;font-family:var(--font-mono);font-weight:700')}>{money(c.amount)}</td>
                  <td style={css(TD + ';text-align:right;font-family:var(--font-mono);color:' + (c.amount - c.cost >= 0 ? 'var(--green)' : 'var(--red)'))}>{money(c.amount - c.cost)}</td>
                  <td style={css(TD)}><Badge color={CO_STATUS[c.status] || 'default'}>{c.status}</Badge></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} style={css('padding:30px;text-align:center;color:var(--faint)')}>No change orders yet. Add one to track extra scope, revenue and profit on a project.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {adding && <COForm initial={{ ...blank, projectKey: projectFilter || '' }} onClose={() => setAdding(false)} onSave={(r) => addChangeOrder(r)} />}
      {editing && <COForm initial={{ projectKey: editing.projectKey, projectName: editing.projectName, title: editing.title, desc: editing.desc, requestedBy: editing.requestedBy, amount: editing.amount, cost: editing.cost, status: editing.status, date: editing.date }}
        onClose={() => setEditing(null)} onSave={(r) => updateChangeOrder(editing._id, r)} onDelete={() => deleteChangeOrder(editing._id)} />}
    </div>
  )
}
