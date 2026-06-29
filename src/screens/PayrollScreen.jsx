import React from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { StatCard, Badge } from '../ds/index.jsx'

export default function PayrollScreen({ v }) {
  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0')}>
        <span style={css('display:inline-flex;align-items:center;gap:6px;background:var(--inset);border:1px solid var(--line-soft);border-radius:7px;padding:5px 10px;font-size:11.5px;color:var(--muted);font-family:var(--font-mono)')}>Apr 27 – May 3, 2026 · Weekly</span>
        <div style={css('flex:1')}></div>
        <button onClick={v.payBulk} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--panel-2);border:1px solid var(--line);border-radius:7px;padding:6px 11px;font-size:12px;font-weight:600;color:var(--text);cursor:pointer')}>Bulk log hours</button>
        <button onClick={v.payExport} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--panel-2);border:1px solid var(--line);border-radius:7px;padding:6px 11px;font-size:12px;font-weight:600;color:var(--text);cursor:pointer')}>Export</button>
        <button onClick={v.payApprove} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer')}>Review &amp; approve</button>
      </div>
      <div style={css('flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px')}>
        <div style={css('display:grid;grid-template-columns:repeat(5,1fr);gap:11px')}>
          {v.payKpis.map((k, i) => (
            <StatCard key={i} label={k.label} value={k.value} sub={k.sub} tone={k.tone} />
          ))}
        </div>
        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead><tr>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Employee</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Project</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Reg</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>OT</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Rate</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Gross</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Deduction</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Net</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Status</th>
            </tr></thead>
            <tbody>
              {v.payRows.map((r) => (
                <Box as="tr" key={r.id} onClick={r.onOpen} style={css('cursor:pointer')} hover="background:var(--panel-2)">
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><div style={css('display:flex;align-items:center;gap:8px')}><div style={r.avatarStyle}>{r.initials}</div><span style={css('font-weight:600')}>{r.name}</span></div></td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);color:var(--muted)')}>{r.project}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{r.regS}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);color:var(--amber)')}>{r.otS}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{r.rateS}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{r.grossS}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);color:var(--red)')}>{r.dedS}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--green)')}>{r.netS}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><Badge color={r.statusColor}>{r.status}</Badge></td>
                </Box>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
