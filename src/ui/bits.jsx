import React, { useEffect } from 'react'
import { css } from '../lib/css.js'
import { Badge } from '../ds/index.jsx'

// Small shared building blocks for the Projects / Painters / Reports / Change
// orders / Expenses / Addresses screens, ported to match the Maka OS design.

export const THEAD = 'font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--panel-2);white-space:nowrap'
export const TD = 'padding:9px 11px;border-bottom:1px solid var(--line-soft)'
export const INPUT = 'background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none;box-sizing:border-box'
export const LABEL = 'font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px;display:block'
export const BTN_PRIMARY = 'display:inline-flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:1px solid transparent;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer'
export const BTN_GHOST = 'display:inline-flex;align-items:center;gap:6px;background:var(--panel-2);border:1px solid var(--line);border-radius:7px;padding:6px 11px;font-size:12px;font-weight:600;color:var(--text);cursor:pointer'

export function Th({ children, num, k, activeKey, onSort }) {
  const active = k && k === activeKey
  return (
    <th onClick={k && onSort ? () => onSort(k) : undefined}
      style={css(`text-align:${num ? 'right' : 'left'};${THEAD};color:${active ? 'var(--text)' : 'var(--faint)'};${k && onSort ? 'cursor:pointer' : ''}`)}>
      {children}{active ? ' ↓' : ''}
    </th>
  )
}

// Small stat tile on an inset background (used in drawers / summaries).
export function Tile({ label, value, valStyle }) {
  return (
    <div style={css('padding:10px 11px;background:var(--inset);border:1px solid var(--line-soft);border-radius:8px')}>
      <div style={css('font-size:9.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:4px')}>{label}</div>
      <div style={valStyle || css('font-size:15px;font-weight:800;font-family:var(--font-mono)')}>{value}</div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div style={css('display:flex;flex-direction:column')}>
      <label style={css(LABEL)}>{label}</label>
      {children}
    </div>
  )
}

// Section heading used inside drawers / panels.
export function SectionTitle({ children, right }) {
  return (
    <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:11px')}>
      <span style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)')}>{children}</span>
      {right && <span style={css('margin-left:auto')}>{right}</span>}
    </div>
  )
}

// Centered modal dialog. Closes on Escape / backdrop click.
export function Modal({ title, sub, onClose, children, footer, width = 460 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={css('position:fixed;inset:0;background:rgba(4,6,10,.55);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:120')} />
      <div role="dialog" aria-modal="true" aria-label={title} style={css(`position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:${width}px;max-width:94vw;max-height:88vh;overflow:auto;background:var(--panel);border:1px solid var(--line-strong);border-radius:14px;box-shadow:0 28px 70px rgba(0,0,0,.6);z-index:130;display:flex;flex-direction:column`)}>
        <div style={css('padding:14px 16px;border-bottom:1px solid var(--line-soft);display:flex;align-items:center;gap:9px;flex-shrink:0')}>
          <div style={css('flex:1;min-width:0')}>
            <div style={css('font-size:14.5px;font-weight:700')}>{title}</div>
            {sub && <div style={css('font-size:11.5px;color:var(--faint)')}>{sub}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={css('width:28px;height:28px;border-radius:7px;display:grid;place-items:center;background:transparent;border:1px solid var(--line);cursor:pointer;color:var(--muted)')}>✕</button>
        </div>
        <div style={css('padding:16px;display:flex;flex-direction:column;gap:12px')}>{children}</div>
        {footer && <div style={css('padding:12px 16px;border-top:1px solid var(--line-soft);display:flex;align-items:center;gap:8px;justify-content:flex-end')}>{footer}</div>}
      </div>
    </>
  )
}

export function initials(name) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
}

const AV_GRADS = [
  'linear-gradient(140deg,#1387ff,#2a5fff)', 'linear-gradient(140deg,#18d6e8,#1387ff)',
  'linear-gradient(140deg,#a855f7,#6d28d9)', 'linear-gradient(140deg,#20e070,#0ea54b)',
  'linear-gradient(140deg,#ffac18,#f97316)', 'linear-gradient(140deg,#ff6b6b,#e8333e)',
]
export function avatarStyle(seed, size = 26) {
  let h = 0
  const s = String(seed || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return css(`width:${size}px;height:${size}px;border-radius:50%;background:${AV_GRADS[h % AV_GRADS.length]};color:#fff;font-size:${size < 28 ? 10 : 12}px;font-weight:800;display:grid;place-items:center;flex-shrink:0`)
}

export function Avatar({ name, size }) {
  return <div style={avatarStyle(name, size)}>{initials(name)}</div>
}

// Signed-money color helper.
export const signColor = (n) => (n > 0 ? 'var(--green)' : n < 0 ? 'var(--red)' : 'var(--muted)')

export { Badge }
