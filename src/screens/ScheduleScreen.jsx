import React, { useState } from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import MacScheduleView from './MacScheduleView.jsx'

// Schedule. Demo Gantt (1:1 port of the source) + a real Mac Painters work
// timeline built from the imported payroll entries.
export default function ScheduleScreen({ v }) {
  const [mode, setMode] = useState('mac')
  const seg = (active) => css('background:transparent;border:0;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;white-space:nowrap' + (active ? ';background:var(--panel-3);color:var(--text)' : ';color:var(--muted)'))
  const ModeToggle = (
    <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
      <button onClick={() => setMode('mac')} style={seg(mode === 'mac')}>Mac Painters · real</button>
      <button onClick={() => setMode('demo')} style={seg(mode === 'demo')}>Demo Gantt</button>
    </div>
  )
  if (mode === 'mac') return <MacScheduleView ModeToggle={ModeToggle} />
  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0;flex-wrap:wrap')}>
        {ModeToggle}
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>{v.schZoomTabs.map((t, i) => (<button key={i} onClick={t.onClick} style={t.style}>{t.label}</button>))}</div>
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>{v.schGroupTabs.map((g, i) => (<button key={i} onClick={g.onClick} style={g.style}>{g.label}</button>))}</div>
        <span style={css('display:inline-flex;align-items:center;gap:6px;background:var(--inset);border:1px solid var(--line-soft);border-radius:7px;padding:5px 10px;font-size:11.5px;color:var(--muted);font-family:var(--font-mono)')}>{v.schDateLabel}</span>
        <div style={css('flex:1')}></div>
        <div style={css('display:flex;gap:13px;align-items:center;font-size:10.5px;color:var(--faint);margin-right:6px')}>
          <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:9px;height:9px;border-radius:3px;background:var(--blue)')}></span>In progress</span>
          <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:9px;height:9px;border-radius:3px;background:var(--purple)')}></span>Commercial</span>
          <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:9px;height:9px;transform:rotate(45deg);border:2px solid var(--amber)')}></span>Milestone</span>
        </div>
        <button onClick={v.schAdd} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer')}>+ Add schedule</button>
      </div>
      <div style={css('flex:1;display:grid;grid-template-columns:240px 1fr;min-height:0;overflow:hidden')}>
        <div style={css('border-right:1px solid var(--line);background:var(--panel);overflow-y:auto;display:flex;flex-direction:column')}>
          <div style={css('height:54px;display:flex;align-items:flex-end;padding:0 12px 8px;font-size:10px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--panel);z-index:2')}>{v.schLeftHeader}</div>
          {v.schRows.map((r) => (
            <Box key={r.id} onClick={r.onOpen} style={css('height:44px;display:flex;align-items:center;gap:9px;padding:0 12px;border-bottom:1px solid var(--line-soft);cursor:pointer')} hover="background:var(--panel-2)">
              <span style={r.swatchStyle}></span>
              <div style={css('flex:1;min-width:0')}><div style={css('font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{r.label}</div><div style={css('font-size:10.5px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{r.sub}</div></div>
            </Box>
          ))}
        </div>
        <div style={css('overflow:auto;position:relative;background:var(--bg)')}>
          <div style={v.schTotalWidth}>
            <div style={css('position:sticky;top:0;z-index:3;background:var(--panel);border-bottom:1px solid var(--line)')}>
              <div style={css('display:flex;height:22px;border-bottom:1px solid var(--line-soft)')}>{v.schMonths.map((m, i) => (<div key={i} style={m.style}>{m.label}</div>))}</div>
              <div style={css('display:flex;height:32px')}>{v.schDays.map((d, i) => (<div key={i} style={d.cellStyle}><span style={css('font-size:9px;color:var(--faint-2)')}>{d.dl}</span><span style={css('font-size:11px;color:var(--text);font-weight:600;font-family:var(--font-mono)')}>{d.num}</span></div>))}</div>
            </div>
            <div style={css('position:relative')}>
              {v.schDays.map((d, i) => (<div key={i} style={d.colStyle}></div>))}
              <div style={v.schTodayStyle}></div>
              {v.schRows.map((r) => (
                <div key={r.id} style={css('height:44px;border-bottom:1px solid var(--line-soft);position:relative')}>
                  {r.bars.map((b) => (
                    <div key={b.id} onClick={b.onClick} style={b.style}><div style={b.progStyle}></div><span style={b.textStyle}>{b.label}</span></div>
                  ))}
                  {r.milestones.map((mi, i) => (<div key={i} style={mi.style} title={mi.title}></div>))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
