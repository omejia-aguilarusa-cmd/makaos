import React from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'

export default function ReportsScreen({ v }) {
  return (
    <div style={css('padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:13px;overflow:auto;height:100%;align-content:start')}>
      {v.reportCards.map((r, i) => (
        <Box key={i} style={css('background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:15px;display:flex;flex-direction:column;gap:8px')} hover="border-color:var(--line-strong)">
          <div style={css('width:34px;height:34px;border-radius:9px;background:var(--blue-soft);color:var(--accent);display:grid;place-items:center')}>{r.icon}</div>
          <div style={css('font-size:13.5px;font-weight:700')}>{r.title}</div>
          <div style={css('font-size:11.5px;color:var(--faint);flex:1')}>{r.desc}</div>
          <div style={css('display:flex;gap:7px;margin-top:2px')}>
            <button onClick={r.onView} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-size:11.5px;font-weight:600;color:var(--text);cursor:pointer')}>View</button>
            <button onClick={r.onExport} style={css('display:inline-flex;align-items:center;gap:5px;background:transparent;border:1px solid transparent;border-radius:6px;padding:5px 10px;font-size:11.5px;font-weight:600;color:var(--muted);cursor:pointer')}>Export</button>
          </div>
        </Box>
      ))}
    </div>
  )
}
