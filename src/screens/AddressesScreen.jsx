import React from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { Badge } from '../ds/index.jsx'

export default function AddressesScreen({ v }) {
  return (
    <div style={css('padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px;overflow:auto;height:100%;align-content:start')}>
      {v.addrRows.map((a) => (
        <Box key={a.id} onClick={a.onOpen} style={css('background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:13px;cursor:pointer;display:flex;gap:11px;align-items:flex-start')} hover="border-color:var(--line-strong)">
          <span style={{ ...css('width:30px;height:30px;border-radius:8px;background:var(--inset);border:1px solid var(--line-soft);display:grid;place-items:center;flex-shrink:0'), color: a.color }}>{v.icPin}</span>
          <div style={css('flex:1;min-width:0')}>
            <div style={css('font-size:13px;font-weight:700')}>{a.address}</div>
            <div style={css('font-size:11px;color:var(--faint);font-family:var(--font-mono);margin-bottom:6px')}>{a.city}</div>
            <div style={css('font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{a.name}</div>
          </div>
          <div style={css('text-align:right;flex-shrink:0')}>
            <div style={css('font-family:var(--font-mono);font-weight:700;font-size:13px')}>{a.revenue}</div>
            <Badge color={a.statusColor}>{a.status}</Badge>
          </div>
        </Box>
      ))}
    </div>
  )
}
