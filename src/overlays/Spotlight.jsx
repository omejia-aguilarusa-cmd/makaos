import React from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'

export default function Spotlight({ v }) {
  return (
    <div onClick={v.closeSpotlight} style={css('position:fixed;inset:0;background:rgba(4,6,10,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding-top:12vh')}>
      <div onClick={v.stop} style={css('width:640px;max-width:92vw;background:var(--panel);border:1px solid var(--line-strong);border-radius:14px;box-shadow:0 28px 70px rgba(0,0,0,.65);overflow:hidden')}>
        <div style={css('display:flex;align-items:center;gap:11px;padding:14px 18px;border-bottom:1px solid var(--line-soft)')}>
          <span style={css('display:inline-flex;color:var(--faint)')}>{v.icSearch}</span>
          <input ref={v.spotInputRef} onInput={v.onSpotInput} placeholder="Search projects, painters, change orders, expenses…" style={css('flex:1;background:transparent;border:0;outline:none;color:var(--text);font-size:16px;font-weight:500')} />
          <span style={css('font-family:var(--font-mono);font-size:10px;color:var(--faint);border:1px solid var(--line-soft);border-radius:4px;padding:2px 6px')}>esc</span>
        </div>
        {v.spotHasResults && (
          <div style={css('max-height:52vh;overflow:auto;padding:6px')}>
            {v.spotResults.map((r, i) => (
              <Box key={i} onClick={r.onPick} style={css('display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:8px;cursor:pointer')} hover="background:var(--panel-2)">
                <div style={css('width:28px;height:28px;border-radius:7px;background:var(--inset);border:1px solid var(--line-soft);display:grid;place-items:center;color:var(--muted);flex-shrink:0')}>{r.icon}</div>
                <div style={css('flex:1;min-width:0')}><div style={css('font-size:13px;font-weight:600')}>{r.title}</div><div style={css('font-size:11.5px;color:var(--faint)')}>{r.sub}</div></div>
                <span style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em')}>{r.kind}</span>
              </Box>
            ))}
          </div>
        )}
        <div style={css('padding:11px 18px;border-top:1px solid var(--line-soft);font-size:11.5px;color:var(--faint)')}>Search projects, painters, addresses, change orders, expenses — or press <span style={css('font-family:var(--font-mono)')}>esc</span> to close.</div>
      </div>
    </div>
  )
}
