import React from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { Badge } from '../ds/index.jsx'

export default function DrawerHost({ v }) {
  return (
    <>
      <div onClick={v.closeDrawerX} style={css('position:fixed;inset:0;background:rgba(4,6,10,.5);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:100')}></div>
      <aside style={css('position:fixed;top:12px;right:12px;bottom:12px;width:720px;max-width:94vw;background:var(--panel);border:1px solid var(--line-strong);border-radius:14px;box-shadow:0 28px 70px rgba(0,0,0,.6);z-index:110;display:flex;flex-direction:column;overflow:hidden')}>

        {v.isProjDrawer && (
          <>
            <div style={css('padding:14px 16px;border-bottom:1px solid var(--line-soft);display:flex;align-items:center;gap:9px;flex-shrink:0')}>
              <div style={css('flex:1;min-width:0')}><div style={css('font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{v.projD.name}</div><div style={css('font-size:11.5px;color:var(--faint)')}>{v.projD.address}</div></div>
              <button onClick={v.projD.logHours} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-size:11.5px;font-weight:600;color:var(--text);cursor:pointer')}>Log hours</button>
              <button onClick={v.projD.addExpense} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-size:11.5px;font-weight:600;color:var(--text);cursor:pointer')}>Expense</button>
              <button onClick={v.projD.addCO} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--blue);color:#fff;border:0;border-radius:6px;padding:5px 11px;font-size:11.5px;font-weight:700;cursor:pointer')}>+ Change order</button>
              <Box as="button" onClick={v.closeDrawerX} style={css('width:28px;height:28px;border-radius:7px;display:grid;place-items:center;background:transparent;border:1px solid transparent;cursor:pointer;color:var(--muted)')} hover="background:var(--panel-2)">{v.icClose}</Box>
            </div>
            <div style={css('display:flex;gap:2px;border-bottom:1px solid var(--line-soft);padding:0 16px;flex-shrink:0')}>
              {v.projD.tabs.map((t, i) => (
                <div key={i} onClick={t.onClick} style={t.style}>{t.label}</div>
              ))}
            </div>
            <div style={css('flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:13px')}>
              {v.projD.isOverview && (
                <>
                  <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px')}>
                    {v.projD.stats.map((s, i) => (
                      <div key={i} style={css('padding:10px 11px;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px')}><div style={css('font-size:9.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:4px')}>{s.label}</div><div style={s.valStyle}>{s.value}</div></div>
                    ))}
                  </div>
                  <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:13px')}>
                    <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:11px')}><span style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)')}>Real-time P&L</span><span style={css('margin-left:auto')}><Badge color={v.projD.plPillColor}>{v.projD.plPillText}</Badge></span></div>
                    <div style={css('height:10px;border-radius:999px;background:var(--inset);overflow:hidden;display:flex;margin-bottom:8px')}>{v.projD.plSegs.map((sg, i) => (
                      <div key={i} style={sg}></div>
                    ))}</div>
                    <div style={css('display:flex;gap:14px;font-size:10.5px;color:var(--faint);margin-bottom:13px;flex-wrap:wrap')}>
                      <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:8px;height:8px;border-radius:2px;background:#2f82ff')}></span>Labor</span>
                      <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:8px;height:8px;border-radius:2px;background:#ffac18')}></span>Materials</span>
                      <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:8px;height:8px;border-radius:2px;background:#a855f7')}></span>Other</span>
                      <span style={css('display:inline-flex;align-items:center;gap:5px')}><span style={css('width:8px;height:8px;border-radius:2px;background:#20e070')}></span>Profit</span>
                    </div>
                    <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-bottom:12px')}>
                      {v.projD.plKvs.map((kv, i) => (
                        <div key={i} style={css('display:flex;justify-content:space-between;font-size:12px')}><span style={css('color:var(--faint)')}>{kv.l}</span><span style={css('font-family:var(--font-mono)')}>{kv.v}</span></div>
                      ))}
                    </div>
                    <div style={css('height:1px;background:var(--line-soft);margin-bottom:11px')}></div>
                    <div style={css('display:flex;justify-content:space-between;align-items:flex-end')}>
                      <div><div style={css('font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;margin-bottom:3px')}>Current profit</div><div style={v.projD.profitStyle}>{v.projD.profit}</div></div>
                      <div style={css('text-align:right')}><div style={css('font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;margin-bottom:3px')}>Forecast at completion</div><div style={v.projD.forecastStyle}>{v.projD.forecast}</div></div>
                    </div>
                  </div>
                  <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:13px')}>
                    <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:12px')}>Project health</div>
                    <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:11px 16px')}>
                      {v.projD.health.map((h, i) => (
                        <div key={i}><div style={css('display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px')}><span style={css('color:var(--muted)')}>{h.label}</span><span style={h.valStyle}>{h.valText}</span></div><div style={css('height:6px;border-radius:999px;background:var(--inset);overflow:hidden')}><div style={h.fillStyle}></div></div></div>
                      ))}
                    </div>
                  </div>
                  <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:13px;display:flex;align-items:center;gap:10px')}>
                    <div style={css('flex:1;min-width:0')}><div style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;margin-bottom:3px')}>Client</div><div style={css('font-size:13px;font-weight:700')}>{v.projD.clientName}</div><div style={css('font-size:11.5px;color:var(--faint)')}>{v.projD.clientSub}</div></div>
                    <button onClick={v.projD.openClientEmail} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px 11px;font-size:11.5px;font-weight:600;color:var(--text);cursor:pointer')}>Email</button>
                  </div>
                </>
              )}
              {v.projD.isPaintersTab && (
                <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden')}>
                  <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
                    <thead><tr><th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Painter</th><th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Crew</th><th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Dates</th><th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Hours</th><th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Labor cost</th></tr></thead>
                    <tbody>
                      {v.projD.painters.map((pa) => (
                        <Box as="tr" key={pa.id} onClick={pa.onOpen} style={css('cursor:pointer')} hover="background:var(--panel-2)">
                          <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><div style={css('display:flex;align-items:center;gap:8px')}><div style={pa.avatarStyle}>{pa.initials}</div><span style={css('font-weight:600')}>{pa.name}</span></div></td>
                          <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);color:var(--muted)')}>{pa.crew}</td>
                          <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);font-family:var(--font-mono);color:var(--faint)')}>{pa.dates}</td>
                          <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{pa.hours}</td>
                          <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{pa.cost}</td>
                        </Box>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {v.projD.isCOTab && (
                <>
                  {v.projD.cos.map((co, i) => (
                    <div key={i} style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:12px;display:flex;align-items:flex-start;gap:12px')}>
                      <div style={css('flex:1;min-width:0')}><div style={css('display:flex;align-items:center;gap:8px;margin-bottom:4px')}><span style={css('font-weight:700')}>{co.title}</span><Badge color={co.statusColor}>{co.status}</Badge></div><div style={css('font-size:12px;color:var(--muted)')}>{co.desc}</div><div style={css('font-size:11px;color:var(--faint);margin-top:5px')}>{co.meta}</div></div>
                      <div style={css('text-align:right;flex-shrink:0')}><div style={css('font-family:var(--font-mono);font-weight:700;color:var(--green)')}>{co.amount}</div><div style={css('font-size:11px;color:var(--green);font-family:var(--font-mono)')}>{co.profit}</div></div>
                    </div>
                  ))}
                </>
              )}
              {v.projD.isExpTab && (
                <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden')}>
                  <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
                    <thead><tr><th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Item</th><th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Vendor</th><th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Date</th><th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Amount</th><th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Status</th></tr></thead>
                    <tbody>
                      {v.projD.exps.map((e, i) => (
                        <Box as="tr" key={i} hover="background:var(--panel-2)">
                          <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);font-weight:600')}>{e.title}</td>
                          <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);color:var(--muted)')}>{e.vendor}</td>
                          <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);font-family:var(--font-mono);color:var(--faint)')}>{e.date}</td>
                          <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);font-weight:700')}>{e.amount}</td>
                          <td style={css('padding:9px 11px;border-bottom:1px solid var(--line-soft)')}><Badge color={e.statusColor}>{e.status}</Badge></td>
                        </Box>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {v.projD.isActTab && (
                <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:6px 14px')}>
                  {v.projD.activity.map((a, i) => (
                    <div key={i} style={css('display:flex;gap:11px;padding:9px 0;border-bottom:1px dashed var(--line-soft)')}><span style={css('font-family:var(--font-mono);font-size:10.5px;color:var(--faint-2);width:84px;flex-shrink:0')}>{a.time}</span><span style={css('font-size:12.5px;color:var(--text)')}>{a.text}</span></div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {v.isPaintDrawer && (
          <>
            <div style={css('padding:14px 16px;border-bottom:1px solid var(--line-soft);display:flex;align-items:center;gap:9px;flex-shrink:0')}>
              <div style={css('flex:1;min-width:0')}><div style={css('font-size:15px;font-weight:700')}>{v.paintD.name}</div><div style={css('font-size:11.5px;color:var(--faint)')}>{v.paintD.sub}</div></div>
              <button onClick={v.paintD.logHours} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-size:11.5px;font-weight:600;color:var(--text);cursor:pointer')}>Log hours</button>
              <button onClick={v.paintD.assign} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--blue);color:#fff;border:0;border-radius:6px;padding:5px 11px;font-size:11.5px;font-weight:700;cursor:pointer')}>+ Assign</button>
              <Box as="button" onClick={v.closeDrawerX} style={css('width:28px;height:28px;border-radius:7px;display:grid;place-items:center;background:transparent;border:1px solid transparent;cursor:pointer;color:var(--muted)')} hover="background:var(--panel-2)">{v.icClose}</Box>
            </div>
            <div style={css('flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:13px')}>
              <div style={css('display:flex;align-items:center;gap:13px')}>
                <div style={v.paintD.bigAvatar}>{v.paintD.initials}</div>
                <div style={css('flex:1')}><div style={css('font-size:16px;font-weight:700')}>{v.paintD.name}</div><div style={css('font-size:11.5px;color:var(--faint);font-family:var(--font-mono)')}>{v.paintD.phone} · since {v.paintD.since}</div></div>
                <Badge color={v.paintD.availColor}>{v.paintD.avail}</Badge>
              </div>
              <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px')}>
                {v.paintD.stats.map((s, i) => (
                  <div key={i} style={css('padding:10px 11px;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px')}><div style={css('font-size:9.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:4px')}>{s.label}</div><div style={css('font-size:14px;font-weight:700;font-family:var(--font-mono)')}>{s.value}</div></div>
                ))}
              </div>
              <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)')}>Current projects</div>
              <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;overflow:hidden')}>
                {v.paintD.projects.map((pr) => (
                  <Box key={pr.id} onClick={pr.onOpen} style={css('display:flex;align-items:center;gap:10px;padding:10px 13px;border-bottom:1px solid var(--line-soft);cursor:pointer')} hover="background:var(--panel-3)"><span style={pr.swatch}></span><div style={css('flex:1;min-width:0')}><div style={css('font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{pr.name}</div><div style={css('font-size:11px;color:var(--faint)')}>{pr.addr}</div></div><div style={css('text-align:right')}><div style={css('font-family:var(--font-mono);font-weight:700')}>{pr.hours}</div><div style={css('font-size:10.5px;color:var(--faint);font-family:var(--font-mono)')}>{pr.cost}</div></div></Box>
                ))}
              </div>
              <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)')}>Upcoming schedule</div>
              <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;overflow:hidden')}>
                {v.paintD.hasUpcoming && (
                  <>
                    {v.paintD.upcoming.map((u, i) => (
                      <div key={i} style={css('display:flex;align-items:center;gap:10px;padding:10px 13px;border-bottom:1px solid var(--line-soft)')}><span style={css('display:inline-flex;color:var(--faint)')}>{v.icActivity}</span><div><div style={css('font-weight:600')}>{u.name}</div><div style={css('font-size:11px;color:var(--faint);font-family:var(--font-mono)')}>{u.meta}</div></div></div>
                    ))}
                  </>
                )}
              </div>
              <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)')}>Recent time logs</div>
              <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden')}>
                <table style={css('width:100%;border-collapse:collapse;font-size:12.5px')}>
                  <thead><tr><th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:8px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Date</th><th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:8px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Project</th><th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:8px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Reg</th><th style={css('text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:8px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>OT</th><th style={css('text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:8px 11px;border-bottom:1px solid var(--line);background:var(--panel-2)')}>Status</th></tr></thead>
                  <tbody>
                    {v.paintD.logs.map((l, i) => (
                      <Box as="tr" key={i} hover="background:var(--panel-2)">
                        <td style={css('padding:8px 11px;border-bottom:1px solid var(--line-soft);font-family:var(--font-mono);color:var(--faint)')}>{l.date}</td>
                        <td style={css('padding:8px 11px;border-bottom:1px solid var(--line-soft);color:var(--muted)')}>{l.project}</td>
                        <td style={css('padding:8px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono)')}>{l.reg}</td>
                        <td style={css('padding:8px 11px;border-bottom:1px solid var(--line-soft);text-align:right;font-family:var(--font-mono);color:var(--amber)')}>{l.ot}</td>
                        <td style={css('padding:8px 11px;border-bottom:1px solid var(--line-soft)')}><Badge color={l.statusColor}>{l.status}</Badge></td>
                      </Box>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </aside>
    </>
  )
}
