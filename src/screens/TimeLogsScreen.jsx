import React from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { Badge } from '../ds/index.jsx'

// Time Logs. Ported 1:1 from the source template's isTimeLogs block.
export default function TimeLogsScreen({ v }) {
  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0')}>
        <span style={css('font-size:12.5px;color:var(--muted)')}>All recorded hours across crews</span>
        <div style={css('flex:1')}></div>
        <button onClick={v.logHoursTop} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer')}>+ Log hours</button>
      </div>
      <div style={css('flex:1;overflow:auto;padding:16px')}>
        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead><tr>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Employee</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Project</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Date</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Reg</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>OT</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Notes</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Status</th>
            </tr></thead>
            <tbody>
              {v.tlRows.map((l) => (
                <Box as="tr" key={l.id} onClick={l.onOpen} style={css('cursor:pointer')} hover="background:var(--panel-2)">
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><div style={css('display:flex;align-items:center;gap:8px')}><div style={l.avatarStyle}>{l.initials}</div><span style={css('font-weight:600')}>{l.name}</span></div></td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);color:var(--muted)')}>{l.project}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);font-family:var(--font-mono);color:var(--faint)')}>{l.date}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{l.reg}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);color:var(--amber)')}>{l.ot}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);color:var(--faint)')}>{l.notes}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><Badge color={l.statusColor}>{l.status}</Badge></td>
                </Box>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
