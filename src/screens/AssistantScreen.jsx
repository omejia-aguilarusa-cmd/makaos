import React, { useState } from 'react'
import { css } from '../lib/css.js'
import { Box } from '../ui/Box.jsx'
import { Pill } from '../ds/index.jsx'

// Assistant (Claude chat). Ported 1:1 from the source template's isAssistant block.
export default function AssistantScreen({ v }) {
  const [inputFocused, setInputFocused] = useState(false)
  return (
    <div style={css('height:100%;display:flex;flex-direction:column;min-height:0;max-width:940px;margin:0 auto;width:100%')}>
      <div style={css('display:flex;align-items:center;gap:11px;padding:13px 18px;border-bottom:1px solid var(--line);flex-shrink:0')}>
        <div style={css('width:34px;height:34px;border-radius:9px;background:rgba(217,119,87,.18);border:1px solid rgba(217,119,87,.45);display:grid;place-items:center;color:#e8927c;flex-shrink:0')}>{v.icSparkleSm}</div>
        <div style={css('flex:1;min-width:0')}>
          <div style={css('font-size:13.5px;font-weight:700')}>Claude · Mac Painters copilot</div>
          <div style={css('font-size:11px;color:var(--faint)')}>Reads your real payroll — Darwin + Mauricio, hours, wages, crew</div>
        </div>
        {v.ai.status === 'ready' ? (
          <Pill led="ok" tone="paper">ON-DEVICE · {v.aiLabel}</Pill>
        ) : v.ai.status === 'loading' ? (
          <Pill led="warn" tone="pending">LOADING {v.aiPct}%</Pill>
        ) : (
          <Pill led="ok" tone="paper">CONNECTED</Pill>
        )}
      </div>
      <div ref={v.chatScrollRef} style={css('flex:1;overflow:auto;padding:20px 18px;display:flex;flex-direction:column;gap:14px')}>
        {v.chatMsgs.map((m, i) => (
          <div key={i} style={m.rowStyle}>
            {m.isAssistant && (<div style={css('width:28px;height:28px;border-radius:8px;background:rgba(217,119,87,.18);border:1px solid rgba(217,119,87,.4);display:grid;place-items:center;flex-shrink:0;margin-top:1px')}>{v.icSparkleSm}</div>)}
            <div style={m.bubbleStyle}>{m.text}</div>
          </div>
        ))}
        {v.chatBusy && (
          <div style={css('display:flex;gap:10px;align-items:flex-start')}>
            <div style={css('width:28px;height:28px;border-radius:8px;background:rgba(217,119,87,.18);border:1px solid rgba(217,119,87,.4);display:grid;place-items:center;flex-shrink:0')}>{v.icSparkleSm}</div>
            <div style={css('background:var(--panel);border:1px solid var(--line);border-radius:13px 13px 13px 4px;padding:13px 15px;display:flex;gap:5px;align-items:center')}>
              <span style={css('width:6px;height:6px;border-radius:50%;background:var(--faint);animation:makablink 1s ease-in-out infinite')}></span>
              <span style={css('width:6px;height:6px;border-radius:50%;background:var(--faint);animation:makablink 1s ease-in-out .2s infinite')}></span>
              <span style={css('width:6px;height:6px;border-radius:50%;background:var(--faint);animation:makablink 1s ease-in-out .4s infinite')}></span>
            </div>
          </div>
        )}
      </div>
      <div style={css('padding:12px 18px 16px;border-top:1px solid var(--line);flex-shrink:0')}>
        {v.ai.status === 'idle' && (
          <div style={css('display:flex;align-items:center;gap:10px;margin-bottom:10px;background:linear-gradient(135deg,var(--blue-soft),var(--panel));border:1px solid var(--line);border-radius:9px;padding:9px 11px')}>
            <span style={css('display:inline-flex;color:var(--blue-hi)')}>{v.icSparkleSm}</span>
            <div style={css('flex:1;min-width:0')}>
              <div style={css('font-size:12px;font-weight:700')}>Run the AI on this device</div>
              <div style={css('font-size:10.5px;color:var(--faint)')}>Private &amp; offline · {v.aiLabel} · {v.aiSize}, downloaded once</div>
            </div>
            <Box as="button" onClick={v.aiEnable} style={css('background:var(--blue);color:#fff;border:0;border-radius:7px;padding:6px 13px;font-size:12px;font-weight:700;cursor:pointer')} hover="filter:brightness(1.08)">Enable</Box>
          </div>
        )}
        {v.ai.status === 'loading' && (
          <div style={css('margin-bottom:10px;background:var(--panel);border:1px solid var(--line);border-radius:9px;padding:10px 11px')}>
            <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:7px')}>
              <span style={css('width:7px;height:7px;border-radius:50%;background:var(--amber);box-shadow:0 0 8px var(--amber);animation:makapulse 2s ease-in-out infinite')} />
              <span style={css('font-size:11.5px;font-weight:700')}>Loading {v.aiLabel}…</span>
              <span style={css('margin-left:auto;font-family:var(--font-mono);font-size:11px;color:var(--muted)')}>{v.aiPct}%</span>
            </div>
            <div style={css('height:6px;border-radius:999px;background:var(--inset);overflow:hidden')}><div style={{ ...css('height:100%;background:var(--blue);border-radius:999px;transition:width .2s'), width: v.aiPct + '%' }} /></div>
            {v.ai.note && <div style={css('font-size:10px;color:var(--faint);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:var(--font-mono)')}>{v.ai.note}</div>}
          </div>
        )}
        {v.ai.status === 'error' && (
          <div style={css('display:flex;align-items:center;gap:10px;margin-bottom:10px;background:var(--panel);border:1px solid var(--red-line);border-radius:9px;padding:9px 11px')}>
            <div style={css('flex:1;min-width:0')}>
              <div style={css('font-size:11.5px;font-weight:700;color:var(--red)')}>On-device AI didn’t load</div>
              <div style={css('font-size:10.5px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>Using the built-in responder. {v.ai.note}</div>
            </div>
            <Box as="button" onClick={v.aiEnable} style={css('background:var(--panel-2);border:1px solid var(--line);border-radius:7px;padding:6px 11px;font-size:12px;font-weight:600;color:var(--text);cursor:pointer')} hover="border-color:var(--line-strong)">Retry</Box>
          </div>
        )}
        {v.ai.status === 'unsupported' && (
          <div style={css('margin-bottom:10px;background:var(--panel);border:1px solid var(--line);border-radius:9px;padding:9px 11px;font-size:11px;color:var(--faint)')}>
            On-device AI needs a WebGPU browser (Chrome, Edge, or Safari 18+). Using the built-in responder over your workspace data.
          </div>
        )}
        <div style={css('display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px')}>
          {v.chatSuggest.map((s, i) => (
            <Box key={i} as="button" onClick={s.onClick} style={css('background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:5px 12px;font-size:11.5px;font-weight:600;color:var(--muted);cursor:pointer')} hover="border-color:var(--line-strong);color:var(--text)">{s.text}</Box>
          ))}
        </div>
        <div style={{ ...css('display:flex;gap:9px;align-items:flex-end;background:var(--input-bg);border:1px solid var(--line);border-radius:11px;padding:9px 9px 9px 13px'), ...(inputFocused ? { borderColor: 'var(--line-strong)' } : {}) }}>
          <textarea ref={v.chatInputRef} onKeyDown={v.onChatKey} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)} rows="1" placeholder="Ask about hours, wages, a team, or a painter…" style={css('flex:1;background:transparent;border:0;outline:none;resize:none;color:var(--text);font-size:13px;line-height:1.5;max-height:120px;font-family:var(--font-ui)')}></textarea>
          <button onClick={v.chatSend} style={css('width:32px;height:32px;border-radius:8px;background:var(--blue);color:#fff;border:0;display:grid;place-items:center;cursor:pointer;flex-shrink:0')}>{v.icSend}</button>
        </div>
        <div style={css('font-size:10px;color:var(--faint-2);margin-top:8px;text-align:center')}>
          {v.ai.status === 'ready'
            ? `Answers run on-device (${v.aiLabel}) over your Mac Painters payroll. AI-generated — verify before acting.`
            : 'Reads your Mac Painters payroll. Responses are AI-generated — verify before acting.'}
        </div>
      </div>
    </div>
  )
}
