import React from 'react'
import { css } from '../lib/css.js'

// Shared empty-state card shown on a demo screen that has no records.
export function EmptyState({ title, hint, actionLabel, onAction, secondaryLabel, onSecondary, compact }) {
  const pad = compact ? '28px 20px' : '52px 24px'
  const minH = compact ? '160px' : '300px'
  return (
    <div style={css('display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:' + pad + ';margin:8px;background:var(--panel);border:1px dashed var(--line-strong);border-radius:12px;min-height:' + minH)}>
      <div style={css('width:44px;height:44px;border-radius:12px;background:var(--panel-2);border:1px solid var(--line);display:grid;place-items:center;color:var(--blue-hi);font-size:20px')}>✦</div>
      <div style={css('font-size:15px;font-weight:700;color:var(--text)')}>{title}</div>
      {hint && <div style={css('font-size:12.5px;color:var(--muted);max-width:400px;line-height:1.5')}>{hint}</div>}
      {(actionLabel || secondaryLabel) && (
        <div style={css('display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;justify-content:center')}>
          {actionLabel && <button onClick={onAction} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:0;border-radius:7px;padding:8px 14px;font-size:12.5px;font-weight:700;cursor:pointer')}>{actionLabel}</button>}
          {secondaryLabel && <button onClick={onSecondary} style={css('display:inline-flex;align-items:center;gap:6px;background:var(--panel-2);color:var(--text);border:1px solid var(--line);border-radius:7px;padding:8px 14px;font-size:12.5px;font-weight:600;cursor:pointer')}>{secondaryLabel}</button>}
        </div>
      )}
    </div>
  )
}
