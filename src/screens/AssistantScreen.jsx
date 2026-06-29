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
          <div style={css('font-size:13.5px;font-weight:700')}>Claude · Maka copilot</div>
          <div style={css('font-size:11px;color:var(--faint)')}>Reads your live workspace — projects, payroll, schedule, expenses</div>
        </div>
        <Pill led="ok" tone="paper">CONNECTED</Pill>
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
        <div style={css('display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px')}>
          {v.chatSuggest.map((s, i) => (
            <Box key={i} as="button" onClick={s.onClick} style={css('background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:5px 12px;font-size:11.5px;font-weight:600;color:var(--muted);cursor:pointer')} hover="border-color:var(--line-strong);color:var(--text)">{s.text}</Box>
          ))}
        </div>
        <div style={{ ...css('display:flex;gap:9px;align-items:flex-end;background:var(--input-bg);border:1px solid var(--line);border-radius:11px;padding:9px 9px 9px 13px'), ...(inputFocused ? { borderColor: 'var(--line-strong)' } : {}) }}>
          <textarea ref={v.chatInputRef} onKeyDown={v.onChatKey} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)} rows="1" placeholder="Ask about margins, payroll, schedule, or a specific job…" style={css('flex:1;background:transparent;border:0;outline:none;resize:none;color:var(--text);font-size:13px;line-height:1.5;max-height:120px;font-family:var(--font-ui)')}></textarea>
          <button onClick={v.chatSend} style={css('width:32px;height:32px;border-radius:8px;background:var(--blue);color:#fff;border:0;display:grid;place-items:center;cursor:pointer;flex-shrink:0')}>{v.icSend}</button>
        </div>
        <div style={css('font-size:10px;color:var(--faint-2);margin-top:8px;text-align:center')}>Claude reads your sample workspace data. Responses are AI-generated — verify before acting.</div>
      </div>
    </div>
  )
}
