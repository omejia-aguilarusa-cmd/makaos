import React from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { Badge } from '../ds/index.jsx'
import { EmptyState } from '../ui/Empty.jsx'

export default function ChangeOrdersScreen({ v }) {
  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:18px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0')}>
        <div style={css('display:flex;flex-direction:column')}><span style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700')}>Approved</span><span style={css('font-family:var(--font-mono);font-weight:700;color:var(--green)')}>{v.coApprovedS}</span></div>
        <div style={css('display:flex;flex-direction:column')}><span style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700')}>Pending</span><span style={css('font-family:var(--font-mono);font-weight:700;color:var(--amber)')}>{v.coPendingS}</span></div>
        <div style={css('flex:1')}></div>
        <button onClick={v.addCOTop} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer')}>+ New change order</button>
      </div>
      <div style={css('flex:1;overflow:auto;padding:16px')}>
        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead><tr>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Change order</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Project</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Requested by</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Amount</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Profit</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Status</th>
            </tr></thead>
            <tbody>
              {v.hasCORows ? v.coRows.map((c) => (
                <Box as="tr" key={c.id} onClick={c.onOpen} style={css('cursor:pointer')} hover="background:var(--panel-2)">
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><div style={css('font-weight:600')}>{c.title}</div><div style={css('font-size:11px;color:var(--faint)')}>{c.desc}</div></td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);color:var(--muted)')}>{c.project}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);color:var(--muted)')}>{c.requestedBy}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);font-weight:700')}>{c.amount}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);color:var(--green)')}>{c.profit}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><Badge color={c.statusColor}>{c.status}</Badge></td>
                </Box>
              )) : <tr><td colSpan={6}><EmptyState title="No change orders" hint="Sample change orders were cleared." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
