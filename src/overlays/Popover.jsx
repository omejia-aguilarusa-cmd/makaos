import React from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'

export default function Popover({ v }) {
  return (
    <>
      <div onClick={v.closePopover} style={css('position:fixed;inset:0;z-index:115')}></div>
      <div style={v.popoverStyle}>
        <div style={css('background:var(--panel);border:1px solid var(--line-strong);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,.6);padding:13px')}>
          <div style={css('display:flex;align-items:center;gap:9px;margin-bottom:11px')}>
            <span style={v.pop.swatch}></span>
            <div style={css('flex:1;min-width:0')}><div style={css('font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{v.pop.projName}</div><div style={css('font-size:11px;color:var(--faint)')}>{v.pop.addr}</div></div>
            <Box as="button" onClick={v.closePopover} style={css('width:26px;height:26px;border-radius:6px;display:grid;place-items:center;background:transparent;border:1px solid transparent;cursor:pointer;color:var(--muted)')} hover="background:var(--panel-2)">{v.icClose}</Box>
          </div>
          <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:7px 14px;margin-bottom:12px')}>
            {v.pop.kvs.map((kv, i) => (
              <div key={i} style={css('display:flex;justify-content:space-between;font-size:12px')}><span style={css('color:var(--faint)')}>{kv.l}</span><span style={css('font-weight:600;font-family:var(--font-mono)')}>{kv.v}</span></div>
            ))}
          </div>
          <div style={css('display:flex;gap:6px')}>
            <button onClick={v.pop.openPainter} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:5px 11px;font-size:11.5px;font-weight:600;color:var(--text);cursor:pointer')}>Painter</button>
            <button onClick={v.pop.openProj} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:5px 11px;font-size:11.5px;font-weight:600;color:var(--text);cursor:pointer')}>Project</button>
            <div style={css('flex:1')}></div>
            <button onClick={v.closePopover} style={css('background:var(--blue);color:#fff;border:0;border-radius:6px;padding:5px 13px;font-size:11.5px;font-weight:700;cursor:pointer')}>Done</button>
          </div>
        </div>
      </div>
    </>
  )
}
