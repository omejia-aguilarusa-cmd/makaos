import React from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { Badge } from '../ds/index.jsx'

export default function PaintersScreen({ v }) {
  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0')}>
        <input placeholder="Search painters…" onInput={v.onPaintSearch} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:230px;outline:none')} />
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {v.paintCrewTabs.map((t, i) => (
            <button key={i} onClick={t.onClick} style={t.style}>{t.label}</button>
          ))}
        </div>
        <div style={css('flex:1')}></div>
        <button onClick={v.newPainterToast} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer')}>+ New painter</button>
      </div>
      <div style={css('flex:1;overflow:auto;padding:16px')}>
        <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
            <thead><tr>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Painter</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Crew</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Pay type</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Rate</th>
              <th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Hours (mo)</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Availability</th>
              <th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Active projects</th>
            </tr></thead>
            <tbody>
              {v.painterRows.map((p) => (
                <Box as="tr" key={p.id} onClick={p.onOpen} style={css('cursor:pointer')} hover="background:var(--panel-2)">
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><div style={css('display:flex;align-items:center;gap:9px')}><div style={p.avatarStyle}>{p.initials}</div><div><div style={css('font-weight:600')}>{p.name}</div><div style={css('font-size:10.5px;color:var(--faint)')}>{p.role}</div></div></div></td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}>{p.crew}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><Badge color="default">{p.payType}</Badge></td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{p.rate}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{p.hours}</td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><Badge color={p.availColor}>{p.avail}</Badge></td>
                  <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><div style={css('display:flex;gap:4px;flex-wrap:wrap')}>{p.chips.map((ch, i) => (<span key={i} style={ch.style}>{ch.label}</span>))}</div></td>
                </Box>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
