// OBSIDIAN Trading OS — Design System (React port)
// Ported verbatim from the design's _ds_bundle.js so Maka OS renders with the
// exact same components, styles, and tokens. Every value here mirrors the
// source; visual output is identical.

import React from 'react'

/**
 * Badge — tiny rounded, uppercase status chip used in tables and card heads.
 */
export function Badge({ color = 'default', children, style, ...rest }) {
  const colors = {
    default: { bg: 'var(--panel-3)', color: 'var(--muted)' },
    green: { bg: 'var(--green-soft)', color: 'var(--green)' },
    blue: { bg: 'var(--blue-soft)', color: 'var(--blue)' },
    cyan: { bg: 'var(--cyan-soft)', color: 'var(--cyan)' },
    amber: { bg: 'var(--amber-soft)', color: 'var(--amber)' },
    red: { bg: 'var(--red-soft)', color: 'var(--red)' },
    purple: { bg: 'var(--purple-soft)', color: 'var(--purple)' },
  }
  const c = colors[color] || colors.default
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        minHeight: 20,
        padding: '2px 8px',
        borderRadius: 'var(--r-pill)',
        background: c.bg,
        color: c.color,
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-micro)',
        fontWeight: 'var(--fw-black)',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  )
}

/**
 * Button — hairline-bordered control on a dark inset. variants: primary,
 * danger, estop, ghost, tab.
 */
export function Button({
  variant = 'default',
  size = 'md',
  active = false,
  disabled = false,
  type = 'button',
  onClick,
  style,
  children,
  ...rest
}) {
  const sizes = {
    sm: { minHeight: 26, padding: '4px 9px', fontSize: 'var(--fs-caption)' },
    md: { minHeight: 30, padding: '6px 10px', fontSize: 'var(--fs-body)' },
    lg: { minHeight: 36, padding: '8px 16px', fontSize: 'var(--fs-body)' },
  }
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    fontFamily: 'var(--font-ui)',
    fontWeight: 'var(--fw-bold)',
    borderRadius: 'var(--r-md)',
    border: '1px solid var(--line)',
    background: 'var(--panel-2)',
    color: 'var(--muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'color var(--dur-fast), background var(--dur-fast), border-color var(--dur-fast)',
    ...sizes[size],
  }
  const variants = {
    default: {},
    primary: { background: 'var(--blue)', borderColor: 'var(--blue)', color: '#fff', fontWeight: 'var(--fw-heavy)' },
    danger: { background: 'var(--red-soft)', borderColor: 'var(--red-line)', color: 'var(--red)' },
    estop: {
      background: 'var(--grad-estop)',
      borderColor: '#ff666d',
      color: '#fff',
      fontWeight: 'var(--fw-black)',
      padding: '7px 14px',
      letterSpacing: '.04em',
    },
    ghost: { background: 'transparent' },
    tab: {
      background: 'transparent',
      border: 0,
      borderRadius: 0,
      borderBottom: '2px solid ' + (active ? 'var(--blue)' : 'transparent'),
      color: active ? 'var(--blue)' : 'var(--muted)',
      padding: '12px 16px',
      fontWeight: 'var(--fw-bold)',
    },
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  )
}

/**
 * StatusLED — small status dot; "ok" glows green and pulses.
 */
export function StatusLED({ status = 'idle', size = 8, pulse, style, ...rest }) {
  const map = {
    ok: { bg: 'var(--green)', glow: 'var(--glow-green)', pulse: true },
    bad: { bg: 'var(--red)', glow: 'var(--glow-red)' },
    warn: { bg: 'var(--amber)', glow: 'var(--glow-amber)' },
    blue: { bg: 'var(--blue)', glow: 'var(--glow-blue)' },
    cyan: { bg: 'var(--cyan)', glow: 'none' },
    purple: { bg: 'var(--purple)', glow: 'none' },
    idle: { bg: 'var(--faint)', glow: 'none' },
  }
  const s = map[status] || map.idle
  const doPulse = pulse ?? s.pulse ?? false
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 'var(--r-pill)',
        background: s.bg,
        boxShadow: s.glow,
        animation: doPulse ? 'obsidian-pulse 2s infinite' : 'none',
        flex: 'none',
        ...style,
      }}
      {...rest}
    />
  )
}

/**
 * Pill — compact, uppercase status capsule, optional leading StatusLED.
 */
export function Pill({ led, tone = 'default', as = 'span', children, style, ...rest }) {
  const tones = {
    default: { bg: '#0e1522', border: 'var(--line)', color: 'var(--muted)' },
    paper: { bg: 'var(--green-soft)', border: 'var(--green-line)', color: 'var(--green)' },
    pending: { bg: 'var(--amber-soft)', border: 'var(--amber-line)', color: 'var(--amber)' },
    danger: { bg: 'var(--red-soft)', border: 'var(--red-line)', color: 'var(--red)' },
  }
  const t = tones[tone] || tones.default
  const Tag = as
  return (
    <Tag
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        minHeight: 28,
        padding: '4px 10px',
        borderRadius: 'var(--r-md)',
        border: '1px solid ' + t.border,
        background: t.bg,
        color: t.color,
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-label)',
        fontWeight: 'var(--fw-heavy)',
        textTransform: 'uppercase',
        letterSpacing: '.02em',
        cursor: as === 'button' ? 'pointer' : 'default',
        ...style,
      }}
      {...rest}
    >
      {led && <StatusLED status={led} />}
      {children}
    </Tag>
  )
}

/**
 * Switch — minimal toggle. On = blue track, knob right.
 */
export function Switch({ checked = false, onChange, disabled = false, style, ...rest }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        width: 34,
        height: 18,
        padding: 0,
        border: 0,
        borderRadius: 'var(--r-pill)',
        background: checked ? 'var(--blue)' : '#263149',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background var(--dur)',
        flex: 'none',
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 'auto' : 2,
          right: checked ? 2 : 'auto',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          transition: 'all var(--dur)',
        }}
      />
    </button>
  )
}

/**
 * Tag — square-cornered, bordered label for direction/side semantics.
 */
export function Tag({ tone = 'info', children, style, ...rest }) {
  const tones = {
    long: { color: 'var(--green)', border: 'var(--green-line)', bg: 'var(--green-soft)' },
    buy: { color: 'var(--green)', border: 'var(--green-line)', bg: 'var(--green-soft)' },
    short: { color: 'var(--red)', border: 'var(--red-line)', bg: 'var(--red-soft)' },
    sell: { color: 'var(--red)', border: 'var(--red-line)', bg: 'var(--red-soft)' },
    ok: { color: 'var(--green)', border: 'var(--line)', bg: 'transparent' },
    bad: { color: 'var(--red)', border: 'var(--line)', bg: 'transparent' },
    warn: { color: 'var(--amber)', border: 'var(--line)', bg: 'transparent' },
    info: { color: 'var(--cyan)', border: 'var(--cyan-line)', bg: 'transparent' },
  }
  const t = tones[tone] || tones.info
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 'var(--r-md)',
        border: '1px solid ' + t.border,
        background: t.bg,
        color: t.color,
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-label)',
        fontWeight: 'var(--fw-bold)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  )
}

/**
 * Card — the universal surface: panel, hairline border, optional header.
 */
export function Card({ title, action, pad = true, accent, children, style, bodyStyle, ...rest }) {
  const accents = {
    blue: 'var(--blue)',
    green: 'var(--green)',
    red: 'var(--red)',
    amber: 'var(--amber)',
    cyan: 'var(--cyan)',
    purple: 'var(--purple)',
  }
  return (
    <div
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderTop: accent ? '3px solid ' + (accents[accent] || accent) : undefined,
        borderRadius: 'var(--r-lg)',
        minWidth: 0,
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {title != null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--line-soft)',
            background: 'var(--panel-2)',
            fontSize: 'var(--fs-caption)',
            fontWeight: 'var(--fw-black)',
            textTransform: 'uppercase',
            letterSpacing: '.5px',
            color: 'var(--muted)',
          }}
        >
          <span>{title}</span>
          {action}
        </div>
      )}
      <div style={{ padding: pad ? 16 : 0, ...bodyStyle }}>{children}</div>
    </div>
  )
}

/**
 * MetricRow — a label/value line with a soft underline divider.
 */
export function MetricRow({ label, value, tone, mono, last = false, style, ...rest }) {
  const tones = {
    green: 'var(--green)',
    red: 'var(--red)',
    blue: 'var(--blue)',
    amber: 'var(--amber)',
    cyan: 'var(--cyan)',
    faint: 'var(--faint)',
  }
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 0',
        borderBottom: last ? '0' : '1px solid var(--line-soft)',
        fontSize: 'var(--fs-body)',
        ...style,
      }}
      {...rest}
    >
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <strong
        style={{
          fontWeight: 'var(--fw-bold)',
          color: tone ? tones[tone] || tone : 'var(--text)',
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
          fontVariantNumeric: mono ? 'tabular-nums' : undefined,
        }}
      >
        {value}
      </strong>
    </div>
  )
}

/**
 * ProgressBar — thin rounded utilization bar, clamps to 0–100%.
 */
export function ProgressBar({ value = 0, max = 100, color = 'var(--blue)', dangerAt = 100, height = 5, style, ...rest }) {
  const pct = Math.max(0, Math.min(100, ((Number(value) || 0) / (Number(max) || 100)) * 100))
  const fill = pct >= dangerAt ? 'var(--red)' : color
  return (
    <div
      style={{ height, borderRadius: 'var(--r-pill)', background: '#202a3e', overflow: 'hidden', ...style }}
      {...rest}
    >
      <span
        style={{
          display: 'block',
          height: '100%',
          width: pct + '%',
          background: fill,
          borderRadius: 'var(--r-pill)',
          transition: 'width var(--dur)',
        }}
      />
    </div>
  )
}

/**
 * StatCard — big-number KPI tile.
 */
export function StatCard({ label, value, sub, tone, style, ...rest }) {
  const tones = {
    green: 'var(--green)',
    red: 'var(--red)',
    blue: 'var(--blue)',
    amber: 'var(--amber)',
    cyan: 'var(--cyan)',
    muted: 'var(--muted)',
  }
  return (
    <div
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-xl)',
        padding: '14px 16px',
        minWidth: 0,
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          color: 'var(--faint-2)',
          fontSize: 'var(--fs-label)',
          fontWeight: 'var(--fw-black)',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 'var(--fs-stat)',
          lineHeight: 'var(--lh-tight)',
          fontWeight: 'var(--fw-black)',
          fontVariantNumeric: 'tabular-nums',
          marginTop: 12,
          color: tone ? tones[tone] || tone : 'var(--text)',
        }}
      >
        {value}
      </div>
      {sub != null && sub !== '' && (
        <div style={{ color: 'var(--muted)', fontSize: 'var(--fs-caption)', marginTop: 8 }}>{sub}</div>
      )}
    </div>
  )
}

/**
 * Banner — full-width prominent notice.
 */
export function Banner({ tone = 'danger', children, style, ...rest }) {
  const tones = {
    danger: { bg: 'rgba(255,69,79,.1)', border: 'rgba(255,69,79,.5)', color: '#ffd5d7' },
    warn: { bg: '#27130f', border: '#5b2b1e', color: 'var(--amber)' },
    info: { bg: 'var(--blue-soft)', border: 'rgba(47,130,255,.45)', color: '#cfe0ff' },
    paper: { bg: 'var(--green-soft)', border: 'var(--green-line)', color: 'var(--green)' },
  }
  const t = tones[tone] || tones.danger
  return (
    <div
      role="status"
      style={{
        padding: '12px 16px',
        borderRadius: 'var(--r-md)',
        border: '1px solid ' + t.border,
        background: t.bg,
        color: t.color,
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-body)',
        fontWeight: 'var(--fw-bold)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

/**
 * Toast — transient corner notification.
 */
export function Toast({ tone = 'blue', title, message, style, ...rest }) {
  const tones = {
    green: 'var(--green)',
    red: 'var(--red)',
    blue: 'var(--blue)',
    amber: 'var(--amber)',
    cyan: 'var(--cyan)',
  }
  return (
    <div
      role="alert"
      style={{
        border: '1px solid var(--line)',
        background: 'var(--panel-2)',
        borderRadius: 'var(--r-lg)',
        padding: '10px 12px',
        boxShadow: 'var(--shadow)',
        ...style,
      }}
      {...rest}
    >
      <strong style={{ color: tones[tone] || tones.blue, fontWeight: 'var(--fw-heavy)' }}>{title}</strong>
      {message != null && message !== '' && (
        <div style={{ color: 'var(--muted)', fontSize: 'var(--fs-caption)', marginTop: 2 }}>{message}</div>
      )}
    </div>
  )
}
