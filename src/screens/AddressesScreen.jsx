import React, { useState, useMemo } from 'react'
import { css } from '../lib/css.js'
import { Badge } from '../ds/index.jsx'
import { money, fmtH, META } from '../lib/macPayroll.js'
import { useEdits } from '../lib/edits.js'
import { projectList } from '../lib/projects.js'

// Addresses — every job site as a location card. A lighter, map-style read of
// the same real sites shown on Projects; click one to open its project drawer.

const pin = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.5c3.5 0 6 2.5 6 6 0 4.5-6 12-6 12s-6-7.5-6-12c0-3.5 2.5-6 6-6z" /><circle cx="12" cy="9" r="2.2" />
  </svg>
)

export default function AddressesScreen({ onOpenProject }) {
  const editV = useEdits()
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    void editV
    return projectList('both', META.dateMin, META.dateMax, { q }).rows
      .filter((p) => p.hours > 0)
      .sort((a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : 0))
  }, [editV, q])

  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0')}>
        <input placeholder="Search addresses…" value={q} onChange={(e) => setQ(e.target.value)} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:260px;outline:none')} />
        <span style={css('font-size:12px;color:var(--faint);font-family:var(--font-mono)')}>{rows.length} sites</span>
      </div>
      <div style={css('flex:1;overflow:auto;padding:16px')}>
        <div style={css('display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px')}>
          {rows.map((a) => (
            <div key={a.key} onClick={() => onOpenProject && onOpenProject(a.key)} style={css('background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:13px;cursor:pointer;display:flex;gap:11px;align-items:flex-start')}>
              <span style={css('width:30px;height:30px;border-radius:8px;background:var(--inset);border:1px solid var(--line-soft);display:grid;place-items:center;flex-shrink:0;color:' + a.color)}>{pin}</span>
              <div style={css('flex:1;min-width:0')}>
                <div style={css('font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')} title={a.address}>{a.address}</div>
                <div style={css('font-size:11px;color:var(--faint);font-family:var(--font-mono);margin-bottom:6px')}>{a.city || '—'}</div>
                <div style={css('font-size:11.5px;color:var(--muted)')}>{a.painters} painters · {fmtH(a.hours)}</div>
              </div>
              <div style={css('text-align:right;flex-shrink:0')}>
                <div style={css('font-family:var(--font-mono);font-weight:700;font-size:13px')}>{a.revenue > 0 ? money(a.revenue) : money(a.laborCost)}</div>
                <div style={css('font-size:9.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:5px')}>{a.revenue > 0 ? 'revenue' : 'labor'}</div>
                <Badge color={a.statusColor}>{a.statusLabel}</Badge>
              </div>
            </div>
          ))}
          {rows.length === 0 && <div style={css('color:var(--faint);padding:20px')}>No sites match “{q}”.</div>}
        </div>
      </div>
    </div>
  )
}
