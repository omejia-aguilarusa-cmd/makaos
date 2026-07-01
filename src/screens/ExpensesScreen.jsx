import React, { useState, useMemo } from 'react'
import { css } from '../lib/css.js'
import { Badge } from '../ds/index.jsx'
import { Modal, Field, INPUT, THEAD, TD, BTN_PRIMARY } from '../ui/bits.jsx'
import { money } from '../lib/macPayroll.js'
import { useEdits, expenses, addExpense, updateExpense, deleteExpense } from '../lib/edits.js'
import { projectOptions, keyFromName } from '../lib/projects.js'

// Expenses — materials, equipment and other project spend on top of recorded
// labor. Each expense counts toward its project's cost.

const CATS = ['Materials', 'Labor', 'Equipment', 'Subcontractor', 'Travel', 'Permits', 'Other']
const blank = { projectKey: '', title: '', category: 'Materials', vendor: '', amount: '', status: 'unpaid', date: '' }

export function ExpForm({ initial, onSave, onClose, onDelete }) {
  const [f, setF] = useState(initial)
  const opts = useMemo(() => projectOptions(), [])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    const name = f.projectName || (opts.find((o) => o.key === f.projectKey) || {}).name || f.projectKey
    onSave({ ...f, projectName: name, projectKey: f.projectKey || keyFromName(name), amount: Number(f.amount) || 0 })
    onClose()
  }
  return (
    <Modal title={onDelete ? 'Edit expense' : 'Add expense'} onClose={onClose} width={480}
      footer={<>
        {onDelete && <button onClick={() => { onDelete(); onClose() }} style={css('background:var(--red-soft);color:var(--red);border:1px solid var(--red-line);border-radius:7px;padding:7px 12px;font-size:12.5px;font-weight:700;cursor:pointer;margin-right:auto')}>Delete</button>}
        <button onClick={onClose} style={css('background:var(--panel-2);color:var(--muted);border:1px solid var(--line);border-radius:7px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer')}>Cancel</button>
        <button onClick={save} disabled={!f.title.trim()} style={css(BTN_PRIMARY + (f.title.trim() ? '' : ';opacity:.5;cursor:not-allowed'))}>Save</button>
      </>}>
      <Field label="Item"><input value={f.title} onChange={set('title')} placeholder="Sherwin-Williams — premium primer" style={css(INPUT)} /></Field>
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
        <Field label="Category"><select value={f.category} onChange={set('category')} style={css(INPUT)}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
        <Field label="Vendor"><input value={f.vendor} onChange={set('vendor')} style={css(INPUT)} /></Field>
      </div>
      <Field label="Project">
        <select value={f.projectKey} onChange={set('projectKey')} style={css(INPUT)}>
          <option value="">— Select a project —</option>
          {opts.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
        </select>
      </Field>
      <div style={css('display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px')}>
        <Field label="Amount ($)"><input value={f.amount} onChange={set('amount')} inputMode="decimal" style={css(INPUT + ';font-family:var(--font-mono)')} /></Field>
        <Field label="Status"><select value={f.status} onChange={set('status')} style={css(INPUT)}><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></Field>
        <Field label="Date"><input type="date" value={f.date} onChange={set('date')} style={css(INPUT + ';font-family:var(--font-mono)')} /></Field>
      </div>
    </Modal>
  )
}

export default function ExpensesScreen({ projectFilter }) {
  const editV = useEdits()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)

  const rows = useMemo(() => {
    void editV
    let r = expenses().slice()
    if (projectFilter) r = r.filter((e) => e.projectKey === projectFilter)
    return r.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [editV, projectFilter])

  const total = rows.reduce((s, e) => s + e.amount, 0)
  const unpaid = rows.filter((e) => e.status !== 'paid').reduce((s, e) => s + e.amount, 0)

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:18px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0')}>
        <div style={css('display:flex;flex-direction:column')}><span style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700')}>Total expenses</span><span style={css('font-family:var(--font-mono);font-weight:700')}>{money(total)}</span></div>
        <div style={css('display:flex;flex-direction:column')}><span style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700')}>Unpaid</span><span style={css('font-family:var(--font-mono);font-weight:700;color:var(--amber)')}>{money(unpaid)}</span></div>
        <div style={css('flex:1')} />
        <button onClick={() => setAdding(true)} style={css(BTN_PRIMARY)}>+ Add expense</button>
      </div>
      <div style={css('flex:1;overflow:auto;padding:16px')}>
        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead><tr>
              <th style={css('text-align:left;' + THEAD)}>Item</th>
              <th style={css('text-align:left;' + THEAD)}>Category</th>
              <th style={css('text-align:left;' + THEAD)}>Vendor</th>
              <th style={css('text-align:left;' + THEAD)}>Project</th>
              <th style={css('text-align:left;' + THEAD)}>Date</th>
              <th style={css('text-align:right;' + THEAD)}>Amount</th>
              <th style={css('text-align:left;' + THEAD)}>Status</th>
            </tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e._id} onClick={() => setEditing(e)} style={css('cursor:pointer')}>
                  <td style={css(TD + ';font-weight:600')}>{e.title}</td>
                  <td style={css(TD)}><Badge color="default">{e.category}</Badge></td>
                  <td style={css(TD + ';color:var(--muted)')}>{e.vendor || '—'}</td>
                  <td style={css(TD + ';color:var(--muted)')}>{e.projectName || '—'}</td>
                  <td style={css(TD + ';font-family:var(--font-mono);color:var(--faint)')}>{e.date}</td>
                  <td style={css(TD + ';text-align:right;font-family:var(--font-mono);font-weight:700')}>{money(e.amount)}</td>
                  <td style={css(TD)}><Badge color={e.status === 'paid' ? 'green' : 'amber'}>{e.status}</Badge></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} style={css('padding:30px;text-align:center;color:var(--faint)')}>No expenses yet. Add materials, equipment or other spend to see true project cost and margin.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {adding && <ExpForm initial={{ ...blank, projectKey: projectFilter || '' }} onClose={() => setAdding(false)} onSave={(r) => addExpense(r)} />}
      {editing && <ExpForm initial={{ projectKey: editing.projectKey, projectName: editing.projectName, title: editing.title, category: editing.category, vendor: editing.vendor, amount: editing.amount, status: editing.status, date: editing.date }}
        onClose={() => setEditing(null)} onSave={(r) => updateExpense(editing._id, r)} onDelete={() => deleteExpense(editing._id)} />}
    </div>
  )
}
