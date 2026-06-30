import React from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { StatCard, Badge, Pill } from '../ds/index.jsx'
import { EmptyState } from '../ui/Empty.jsx'

// Command Center (home). Ported 1:1 from the source template's isHome block.
export default function HomeScreen({ v }) {
  return (
    <div style={css('padding:16px;display:flex;flex-direction:column;gap:14px')}>
      <div style={css('display:grid;grid-template-columns:repeat(5,1fr);gap:11px')}>
        {v.kpis.map((k, i) => (
          <StatCard key={i} label={k.label} value={k.value} sub={k.sub} tone={k.tone} />
        ))}
      </div>

      <div style={css('display:grid;grid-template-columns:1.55fr 1fr;gap:14px;align-items:start')}>
        <div style={css('display:flex;flex-direction:column;gap:14px')}>
          <div style={css('background:var(--panel);border:1px solid var(--line);border-radius:8px')}>
            <div style={css('display:flex;align-items:center;gap:8px;padding:11px 14px;background:var(--panel-2);border-bottom:1px solid var(--line-soft);border-radius:8px 8px 0 0')}>
              <span style={css('font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)')}>Active Projects</span>
              <button onClick={v.goProjects} style={css('margin-left:auto;background:transparent;border:0;color:var(--blue-hi);font-size:11.5px;font-weight:600;cursor:pointer')}>View all →</button>
            </div>
            <div>
              {v.hasProjects ? v.homeProjects.map((p) => (
                <Box key={p.id} onClick={p.onOpen} style={css('display:flex;align-items:center;gap:11px;padding:11px 14px;border-bottom:1px solid var(--line-soft);cursor:pointer')} hover="background:var(--panel-2)">
                  <span style={{ ...css('width:3px;height:32px;border-radius:2px;flex-shrink:0'), background: p.color }} />
                  <div style={css('flex:1;min-width:0')}>
                    <div style={css('font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{p.name}</div>
                    <div style={css('font-size:11px;color:var(--faint);font-family:var(--font-mono)')}>{p.metaLine}</div>
                  </div>
                  <div style={css('width:120px;flex-shrink:0')}>
                    <div style={css('height:5px;border-radius:999px;background:var(--inset);overflow:hidden')}><div style={p.progressFill} /></div>
                    <div style={css('font-size:10px;color:var(--faint);font-family:var(--font-mono);margin-top:3px;text-align:right')}>{p.progressLabel}</div>
                  </div>
                  <span style={p.marginStyle}>{p.marginLabel}</span>
                  <Badge color={p.statusColor}>{p.status}</Badge>
                </Box>
              )) : <EmptyState compact title="Dashboard cleared" hint="Sample projects were removed. Your real crew, hours and payroll are in the Mac Painters view." actionLabel="View Mac Painters" onAction={v.goMacPainters} />}
            </div>
          </div>

          <div style={css('background:linear-gradient(135deg,var(--blue-soft),var(--panel));border:1px solid var(--line);border-radius:8px;padding:14px')}>
            <div style={css('display:flex;align-items:center;gap:9px;margin-bottom:10px')}>
              <span style={css('display:inline-flex;color:var(--blue-hi)')}>{v.icSparkle}</span>
              <span style={css('font-size:13px;font-weight:700')}>Ask Claude about your operation</span>
              <Pill led={v.claudeLed} tone="paper" style={css('margin-left:auto')}>{v.claudeStatus}</Pill>
            </div>
            <div style={css('display:flex;flex-wrap:wrap;gap:8px')}>
              {v.claudePrompts.map((q, i) => (
                <Box key={i} as="button" onClick={q.onClick} style={css('text-align:left;background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:9px 11px;font-size:12px;color:var(--text);cursor:pointer;flex:1;min-width:180px')} hover="border-color:var(--line-strong);background:var(--panel-2)">{q.text}</Box>
              ))}
            </div>
          </div>
        </div>

        <div style={css('display:flex;flex-direction:column;gap:14px')}>
          <div style={css('background:var(--panel);border:1px solid var(--line);border-top:3px solid var(--amber);border-radius:8px')}>
            <div style={css('display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid var(--line-soft)')}>
              <span style={css('font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--amber)')}>At Risk</span>
              <span style={css('margin-left:auto;font-family:var(--font-mono);font-size:11px;color:var(--faint)')}>{v.atRiskCount}</span>
            </div>
            <div>
              {v.hasAtRisk ? v.homeAtRisk.map((p) => (
                <Box key={p.id} onClick={p.onOpen} style={css('display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer')} hover="background:var(--panel-2)">
                  <span style={css('width:3px;height:28px;border-radius:2px;background:var(--amber);flex-shrink:0')} />
                  <div style={css('flex:1;min-width:0')}>
                    <div style={css('font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{p.name}</div>
                    <div style={css('font-size:10.5px;color:var(--faint);font-family:var(--font-mono)')}>{p.riskLine}</div>
                  </div>
                </Box>
              )) : <div style={css('padding:14px;color:var(--faint);font-size:12px')}>Nothing at risk</div>}
            </div>
          </div>

          <div style={css('background:var(--panel);border:1px solid var(--line);border-radius:8px')}>
            <div style={css('padding:11px 14px;border-bottom:1px solid var(--line-soft)')}><span style={css('font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)')}>Upcoming Milestones</span></div>
            <div>
              {v.hasMilestones ? v.homeMilestones.map((m, i) => (
                <div key={i} style={css('display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--line-soft)')}>
                  <span style={{ ...css('width:9px;height:9px;flex-shrink:0;transform:rotate(45deg)'), border: '2px solid ' + m.color }} />
                  <div style={css('flex:1;min-width:0')}>
                    <div style={css('font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{m.label}</div>
                    <div style={css('font-size:10.5px;color:var(--faint)')}>{m.sub}</div>
                  </div>
                  <span style={css('font-family:var(--font-mono);font-size:10.5px;color:var(--faint)')}>{m.date}</span>
                </div>
              )) : <div style={css('padding:14px;color:var(--faint);font-size:12px')}>No upcoming milestones</div>}
            </div>
          </div>

          <div style={css('background:var(--panel);border:1px solid var(--line);border-radius:8px')}>
            <div style={css('display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid var(--line-soft)')}>
              <span style={css('display:inline-flex;color:var(--faint)')}>{v.icActivity}</span>
              <span style={css('font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)')}>Activity</span>
            </div>
            <div style={css('padding:4px 14px 8px')}>
              {v.hasActivity ? v.homeActivity.map((a, i) => (
                <div key={i} style={css('display:flex;gap:10px;padding:7px 0;border-bottom:1px dashed var(--line-soft)')}>
                  <span style={css('font-family:var(--font-mono);font-size:10px;color:var(--faint-2);width:72px;flex-shrink:0')}>{a.time}</span>
                  <span style={css('font-size:12px;color:var(--muted)')}>{a.text}</span>
                </div>
              )) : <div style={css('padding:7px 0;color:var(--faint);font-size:12px')}>No activity yet</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
