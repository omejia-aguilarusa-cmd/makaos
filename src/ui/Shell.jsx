import React from 'react'
import { css } from '../lib/css.js'
import { Box } from './Box.jsx'

// App shell: sidebar navigation, top bar, sandbox banner, toast.
// Ported 1:1 from the source template. `v` is the merged view-model from
// App.renderVals(); nav items carry their own computed `style` object + handler.

function NavRow({ n }) {
  return (
    <Box
      style={n.style}
      hover="background:var(--panel-2);color:var(--text)"
      onClick={n.onClick}
    >
      <span style={css('display:inline-flex;align-items:center;flex-shrink:0')}>{n.icon}</span>
      <span style={css('flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{n.label}</span>
      {n.hasCount && <span style={css('font-family:var(--font-mono);font-size:11px;color:var(--faint)')}>{n.count}</span>}
      {n.hasDot && <span style={css('width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)')} />}
    </Box>
  )
}

export function Sidebar({ v }) {
  return (
    <aside style={css('background:var(--nav);border-right:1px solid var(--line);display:flex;flex-direction:column;padding:13px 10px;gap:1px;overflow-y:auto;min-height:0')}>
      <div style={css('display:flex;align-items:center;gap:10px;padding:4px 8px 14px')}>
        <div style={css('width:31px;height:31px;border-radius:9px;background:var(--grad-logo);display:grid;place-items:center;color:#fff;font-weight:800;font-size:16px;letter-spacing:-.04em;box-shadow:inset 0 -1px 0 rgba(0,0,0,.3),0 2px 7px rgba(19,135,255,.35)')}>M</div>
        <div style={css('line-height:1.15')}>
          <div style={css('font-size:14px;font-weight:800;letter-spacing:-.01em')}>Maka OS</div>
          <div style={css('font-size:10.5px;color:var(--faint);letter-spacing:.03em')}>Maka Painters</div>
        </div>
      </div>

      {v.navMain.map((n) => <NavRow key={n.id} n={n} />)}

      {v.navOps && v.navOps.length > 0 && (
        <>
          <div style={css('font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint-2);padding:14px 10px 5px;font-weight:700')}>Operations</div>
          {v.navOps.map((n) => <NavRow key={n.id} n={n} />)}
        </>
      )}

      {v.navCrews && v.navCrews.length > 0 && (
        <>
          <div style={css('font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint-2);padding:14px 10px 5px;font-weight:700')}>Crews</div>
          {v.navCrews.map((c) => (
            <Box key={c.id} onClick={c.onClick}
              style={css('display:flex;align-items:center;gap:9px;padding:6px 9px;border-radius:8px;cursor:pointer;font-size:13px;color:' + (c.active ? 'var(--text)' : 'var(--muted)') + (c.active ? ';background:var(--panel-2);border:1px solid var(--line)' : ';border:1px solid transparent'))}
              hover="background:var(--panel-2)">
              <span style={css('width:9px;height:9px;border-radius:50%;margin-left:3px;flex-shrink:0;background:' + c.color)} />
              <span style={css('flex:1')}>{c.name}</span>
              <span style={css('font-family:var(--font-mono);font-size:11px;color:var(--faint)')}>{c.count}</span>
            </Box>
          ))}
        </>
      )}

      <div style={css('font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint-2);padding:14px 10px 5px;font-weight:700')}>Workspace</div>
      {v.navWork.map((n) => <NavRow key={n.id} n={n} />)}

      <div style={css('margin-top:auto;display:flex;flex-direction:column;gap:9px;padding-top:12px')}>
        <div style={css('display:flex;align-items:center;gap:9px;padding:8px 9px;background:var(--panel);border:1px solid var(--line-soft);border-radius:8px')}>
          <span style={css('width:8px;height:8px;border-radius:50%;flex-shrink:0;background:var(--green);box-shadow:0 0 10px var(--green);animation:makapulse 2s ease-in-out infinite')} />
          <div style={css('line-height:1.2;flex:1;min-width:0')}>
            <div style={css('font-size:10px;font-weight:800;letter-spacing:.07em;color:var(--green)')}>SYNCED</div>
            <div style={css('font-size:10px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{v.syncSummary}</div>
          </div>
          <span style={css('font-family:var(--font-mono);font-size:9.5px;color:var(--faint-2)')}>{v.syncTime}</span>
        </div>
        <div style={css('display:flex;align-items:center;gap:9px;padding:4px 4px;border-top:1px solid var(--line-soft);padding-top:10px')}>
          <div style={css('width:28px;height:28px;border-radius:50%;background:linear-gradient(140deg,#1387ff,#2a5fff);color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;flex-shrink:0')}>OM</div>
          <div style={css('line-height:1.2;flex:1;min-width:0')}>
            <div style={css('font-size:12px;font-weight:600')}>Oscar Mejia</div>
            <div style={css('font-size:10.5px;color:var(--faint)')}>Business Manager</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function Topbar({ v }) {
  return (
    <header style={css('height:52px;flex-shrink:0;background:var(--topbar);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:11px;padding:0 16px;z-index:10')}>
      <span style={css('font-size:15px;font-weight:800;letter-spacing:-.01em')}>{v.crumb.label}</span>
      {v.crumb.sub && <span style={css('font-size:11.5px;color:var(--faint);font-family:var(--font-mono)')}>{v.crumb.sub}</span>}
      <div style={css('flex:1')} />
      <Box as="button" onClick={v.openSpotlight} style={css('display:flex;align-items:center;gap:8px;background:var(--input-bg);border:1px solid var(--line);border-radius:8px;padding:6px 9px;width:236px;color:var(--faint);font-size:12px;cursor:pointer')} hover="border-color:var(--line-strong)">
        <span style={css('display:inline-flex')}>{v.icSearch}</span>
        <span style={css('flex:1;text-align:left')}>Search Maka…</span>
        <span style={css('font-family:var(--font-mono);font-size:10px;background:var(--panel-2);border:1px solid var(--line-soft);border-radius:4px;padding:1px 5px')}>⌘K</span>
      </Box>
      <Box as="button" onClick={v.goIntegrations} style={css('display:inline-flex;align-items:center;gap:7px;background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer')} hover="border-color:var(--line-strong);color:var(--text)">
        <span style={css('display:inline-flex;color:var(--cyan)')}>{v.icGrid}</span>
        <span style={css('font-family:var(--font-mono)')}>{v.connectedCount}</span> connected
      </Box>
      <Box as="button" onClick={v.openAssistant} style={css('display:inline-flex;align-items:center;gap:7px;background:var(--blue);border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;color:#fff;cursor:pointer;box-shadow:0 2px 10px rgba(47,130,255,.35)')} hover="filter:brightness(1.08)">
        <span style={css('display:inline-flex')}>{v.icSparkle}</span> Ask Claude
      </Box>
      <Box as="button" onClick={v.onToggleTheme} title={v.themeTitle} aria-label={v.themeTitle} style={css('width:30px;height:30px;border-radius:7px;display:grid;place-items:center;background:transparent;border:1px solid var(--line);cursor:pointer;color:var(--muted)')} hover="background:var(--panel-2);color:var(--text)">{v.icTheme}</Box>
      <span style={css('position:relative;display:inline-flex')}>
        <Box as="button" onClick={v.toggleNotif} title="Notifications" aria-label="Notifications" style={css('width:30px;height:30px;border-radius:7px;display:grid;place-items:center;background:transparent;border:1px solid ' + (v.notifOpen ? 'var(--line-strong)' : 'transparent') + ';cursor:pointer;color:var(--muted);position:relative')} hover="background:var(--panel-2);color:var(--text)">
          {v.icInbox}
        </Box>
        {v.notifAlerts.length > 0 && (
          <span style={css('position:absolute;top:2px;right:2px;min-width:14px;height:14px;border-radius:999px;background:var(--red);color:#fff;font-size:9px;font-weight:800;display:grid;place-items:center;padding:0 3px;pointer-events:none')}>{v.notifAlerts.length}</span>
        )}
        {v.notifOpen && (
          <>
            <div onClick={v.closeNotif} aria-hidden="true" style={css('position:fixed;inset:0;z-index:115')} />
            <div role="dialog" aria-label="Notifications" style={css('position:absolute;top:36px;right:0;width:330px;max-height:420px;overflow:auto;background:var(--panel);border:1px solid var(--line-strong);border-radius:11px;box-shadow:0 20px 54px rgba(0,0,0,.45);z-index:120;padding:6px')}>
              <div style={css('font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);padding:8px 10px 6px')}>Notifications</div>
              {v.notifAlerts.map((a) => (
                <Box key={a.id} onClick={() => { v.closeNotif(); v.goAlert(a.view) }} style={css('display:flex;gap:9px;align-items:flex-start;padding:9px 10px;border-radius:8px;cursor:pointer')} hover="background:var(--panel-2)">
                  <span style={css('width:8px;height:8px;border-radius:50%;margin-top:4px;flex-shrink:0;background:var(--' + (a.tone || 'blue') + ')')} />
                  <span style={css('flex:1;min-width:0')}>
                    <span style={css('display:block;font-size:12.5px;font-weight:600;color:var(--text)')}>{a.text}</span>
                    <span style={css('display:block;font-size:11px;color:var(--faint)')}>{a.sub}</span>
                  </span>
                  <span style={css('font-size:11px;color:var(--faint-2);margin-top:2px')}>→</span>
                </Box>
              ))}
              {v.notifAlerts.length === 0 && <div style={css('padding:16px 10px;text-align:center;color:var(--faint);font-size:12px')}>All clear — nothing needs attention.</div>}
            </div>
          </>
        )}
      </span>
    </header>
  )
}

export function ToastBar({ v }) {
  return (
    <div style={css('position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--panel-2);border:1px solid var(--line-strong);color:var(--text);padding:9px 15px;border-radius:9px;font-size:12.5px;z-index:300;box-shadow:0 18px 48px rgba(0,0,0,.5);display:flex;align-items:center;gap:9px')}>
      <span style={css('width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)')} />
      {v.toast}
    </div>
  )
}
