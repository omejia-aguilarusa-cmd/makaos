import React from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { Badge } from '../ds/index.jsx'

// Expenses (ops). Ported 1:1 from the source template's isExpenses block.
export default function ExpensesScreen({ v }) {
  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:18px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0')}>
        <div style={css('display:flex;flex-direction:column')}><span style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700')}>Total expenses</span><span style={css('font-family:var(--font-mono);font-weight:700')}>{v.expTotalS}</span></div>
        <div style={css('display:flex;flex-direction:column')}><span style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700')}>Unpaid</span><span style={css('font-family:var(--font-mono);font-weight:700;color:var(--amber)')}>{v.expUnpaidS}</span></div>
        <div style={css('flex:1')}></div>
        <button onClick={v.addExpenseTop} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer')}>+ Add expense</button>
      </div>
      <div style={css('flex:1;overflow:auto;padding:16px')}>
        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead><tr>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Item</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Category</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Vendor</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Project</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Date</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Amount</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Status</th>
            </tr></thead>
            <tbody>
              {v.expRows.map((e) => (
                <Box as="tr" key={e.id} onClick={e.onOpen} style={css('cursor:pointer')} hover="background:var(--panel-2)">
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);font-weight:600')}>{e.title}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><Badge color="default">{e.category}</Badge></td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);color:var(--muted)')}>{e.vendor}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);color:var(--muted)')}>{e.project}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);font-family:var(--font-mono);color:var(--faint)')}>{e.date}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);font-weight:700')}>{e.amount}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><Badge color={e.statusColor}>{e.status}</Badge></td>
                </Box>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
