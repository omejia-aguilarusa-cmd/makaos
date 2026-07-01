import React, { useState } from 'react'
import { css } from '../lib/css.js'
import MacScheduleView from './MacScheduleView.jsx'
import GanttView from './GanttView.jsx'

// Schedule — two views of the real Mac Painters timeline: a weekly-hours
// heatmap, and a Gantt (per project or per employee) with editable planned
// start / deadline / order. The mode toggle is passed into each view's toolbar.
export default function ScheduleScreen() {
  const [mode, setMode] = useState('timeline') // timeline | gantt
  const seg = (active) => {
    const b = 'background:transparent;border:0;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;color:var(--muted);white-space:nowrap'
    return active ? b + ';background:var(--panel-3);color:var(--text)' : b
  }
  const ModeToggle = (
    <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
      <button onClick={() => setMode('timeline')} style={css(seg(mode === 'timeline'))}>Heatmap</button>
      <button onClick={() => setMode('gantt')} style={css(seg(mode === 'gantt'))}>Gantt</button>
    </div>
  )
  return mode === 'gantt' ? <GanttView ModeToggle={ModeToggle} /> : <MacScheduleView ModeToggle={ModeToggle} />
}
