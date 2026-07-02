import React from 'react'
import { css } from '../lib/css.js'
import { StatusLED } from '../ds/index.jsx'
import { Modal } from '../ui/bits.jsx'

// Integrations (connected workspace). Ported 1:1 from the source template's isIntegrations block.
export default function IntegrationsScreen({ v }) {
  return (
    <div style={css('padding:16px;display:flex;flex-direction:column;gap:14px;overflow:auto;height:100%')}>
      <div style={css('display:flex;align-items:center;gap:15px;background:linear-gradient(135deg,var(--blue-soft),var(--panel));border:1px solid var(--line);border-radius:10px;padding:15px 17px')}>
        <div style={css('width:42px;height:42px;border-radius:11px;background:var(--blue-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0')}>{v.icGridBig}</div>
        <div style={css('flex:1;min-width:0')}>
          <div style={css('font-size:14.5px;font-weight:800')}>Connected workspace</div>
          <div style={css('font-size:12px;color:var(--muted)')}>Wire Maka OS into the tools you already run your business on — <span style={css('font-family:var(--font-mono);color:var(--text);font-weight:700')}>{v.intConnected}/{v.intTotal}</span> connected.</div>
        </div>
        <div style={css('display:flex;gap:22px;flex-shrink:0')}>
          <div style={css('text-align:right')}><div style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700')}>Connected</div><div style={css('font-family:var(--font-mono);font-weight:800;font-size:18px;color:var(--green)')}>{v.intConnected}</div></div>
          <div style={css('text-align:right')}><div style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700')}>Records synced</div><div style={css('font-family:var(--font-mono);font-weight:800;font-size:18px')}>{v.intRecords}</div></div>
          <div style={css('text-align:right')}><div style={css('font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700')}>Last sync</div><div style={css('font-family:var(--font-mono);font-weight:800;font-size:18px')}>{v.intLastSync}</div></div>
        </div>
      </div>

      <div style={css('display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:13px')}>
        {v.integrationCards.map((c) => (
          <div key={c.id} style={c.cardStyle}>
            <div style={css('display:flex;align-items:center;gap:11px')}>
              <div style={c.logoStyle}>{c.icon}</div>
              <div style={css('flex:1;min-width:0')}><div style={css('font-size:13.5px;font-weight:700')}>{c.name}</div><div style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;font-weight:700')}>{c.cat}</div></div>
              <StatusLED status={c.ledStatus}></StatusLED>
            </div>
            <div style={css('font-size:12px;color:var(--muted);line-height:1.5;flex:1')}>{c.desc}</div>
            <div style={css('display:flex;flex-wrap:wrap;gap:5px')}>
              {c.caps.map((cap, i) => (
                <span key={i} style={c.capStyle}>{cap}</span>
              ))}
            </div>
            <div style={css('display:flex;align-items:center;gap:8px;border-top:1px solid var(--line-soft);padding-top:11px')}>
              <span style={c.statusStyle}>{c.statusText}</span>
              <div style={css('flex:1')}></div>
              <button onClick={c.onAction} style={css('display:inline-flex;align-items:center;gap:5px;background:transparent;border:1px solid transparent;border-radius:6px;padding:5px 9px;font-size:11.5px;font-weight:600;color:var(--muted);cursor:pointer')}>{c.actionLabel}</button>
              <button onClick={c.onToggle} style={c.toggleStyle}>{c.toggleLabel}</button>
            </div>
          </div>
        ))}
      </div>

      <div style={css('background:var(--panel);border:1px solid var(--line);border-radius:9px')}>
        <div style={css('display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid var(--line-soft)')}>
          <span style={css('display:inline-flex;color:var(--faint)')}>{v.icActivity}</span>
          <span style={css('font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)')}>Sync activity</span>
          <span style={css('margin-left:auto;width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:makapulse 2s ease-in-out infinite')}></span>
        </div>
        <div style={css('padding:4px 14px 10px')}>
          {v.intHasActivity ? v.intActivity.map((a, i) => (
            <div key={i} style={css('display:flex;align-items:center;gap:11px;padding:8px 0;border-bottom:1px dashed var(--line-soft)')}>
              <span style={css('width:6px;height:6px;border-radius:50%;background:var(--blue);flex-shrink:0')}></span>
              <span style={css('font-size:12px;color:var(--text);flex:1')}>{a.text}</span>
              <span style={css('font-family:var(--font-mono);font-size:10.5px;color:var(--faint-2)')}>{a.time}</span>
            </div>
          )) : <div style={css('padding:14px;color:var(--faint);font-size:12px;text-align:center')}>No sync activity yet</div>}
        </div>
      </div>

      {v.setupInfo && (
        <Modal title={'Set up ' + v.setupInfo.name} sub="Credentials live in Vercel environment variables — never in the app." onClose={v.closeSetup} width={520}>
          <div style={css('font-size:12.5px;color:var(--muted);line-height:1.6')}>{v.setupInfo.steps}</div>
          <div>
            <div style={css('font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;margin-bottom:6px')}>Create credentials at</div>
            <div style={css('font-size:12.5px;color:var(--text);background:var(--inset);border:1px solid var(--line-soft);border-radius:7px;padding:9px 11px')}>{v.setupInfo.consoleHint}</div>
          </div>
          <div>
            <div style={css('font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;margin-bottom:6px')}>Environment variables (Vercel)</div>
            {v.setupInfo.envs.map((e) => (
              <div key={e} style={css('font-family:var(--font-mono);font-size:12.5px;color:var(--text);background:var(--inset);border:1px solid var(--line-soft);border-radius:7px;padding:8px 11px;margin-bottom:5px')}>{e}</div>
            ))}
          </div>
          {v.setupInfo.redirect && (
            <div>
              <div style={css('font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;margin-bottom:6px')}>Authorized redirect URI (register with the provider)</div>
              <div style={css('font-family:var(--font-mono);font-size:12px;color:var(--text);background:var(--inset);border:1px solid var(--line-soft);border-radius:7px;padding:8px 11px;word-break:break-all')}>{v.setupInfo.redirect}</div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
