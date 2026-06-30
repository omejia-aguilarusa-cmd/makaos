import React from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { Badge } from '../ds/index.jsx'
import { EmptyState } from '../ui/Empty.jsx'

export default function ProjectsScreen({ v }) {
  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0')}>
      <div style={css('display:flex;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0')}>
        <input placeholder="Search projects, addresses…" onInput={v.onProjSearch} style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--text);width:260px;outline:none')} />
        <div style={css('display:inline-flex;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px;padding:2px;gap:2px')}>
          {v.projStatusTabs.map((t, i) => (
            <button key={i} onClick={t.onClick} style={t.style}>{t.label}</button>
          ))}
        </div>
        <div style={css('flex:1')}></div>
        <button onClick={v.newProjectToast} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer')}>+ New project</button>
      </div>
      <div style={css('flex:1;overflow:auto;padding:16px')}>
        <div style={css('display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:12px')}>
          {v.hasProjects ? v.projectCards.map((p) => (
            <Box key={p.id} onClick={p.onOpen} style={css('background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:13px;cursor:pointer;display:flex;flex-direction:column;gap:11px')} hover="border-color:var(--line-strong)">
              <div style={css('display:flex;align-items:flex-start;gap:10px')}>
                <span style={{ ...css('width:4px;align-self:stretch;border-radius:2px'), background: p.color }}></span>
                <div style={css('flex:1;min-width:0')}>
                  <div style={css('font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{p.name}</div>
                  <div style={css('font-size:11.5px;color:var(--faint)')}>{p.address}</div>
                </div>
                <Badge color={p.statusColor}>{p.status}</Badge>
              </div>
              <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px')}>
                <div><div style={css('font-size:9.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:2px')}>Revenue</div><div style={css('font-family:var(--font-mono);font-weight:700;font-size:13px')}>{p.revenue}</div></div>
                <div><div style={css('font-size:9.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:2px')}>Cost</div><div style={css('font-family:var(--font-mono);font-weight:700;font-size:13px')}>{p.cost}</div></div>
                <div><div style={css('font-size:9.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:2px')}>Profit</div><div style={p.profitStyle}>{p.profit}</div></div>
                <div><div style={css('font-size:9.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:2px')}>Margin</div><div style={p.marginStyle}>{p.margin}</div></div>
              </div>
              <div>
                <div style={css('display:flex;justify-content:space-between;font-size:10.5px;color:var(--faint);font-family:var(--font-mono);margin-bottom:4px')}><span>{p.dates}</span><span>{p.progressLabel}</span></div>
                <div style={css('height:5px;border-radius:999px;background:var(--inset);overflow:hidden')}><div style={p.progressFill}></div></div>
              </div>
            </Box>
          )) : <EmptyState title="No projects yet" hint="The sample jobs were cleared. Your real crew, hours and payroll are in the Mac Painters view." actionLabel="View Mac Painters" onAction={v.goMacPainters} />}
        </div>
      </div>
    </div>
  )
}
