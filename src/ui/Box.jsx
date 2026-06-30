import React, { useState } from 'react'
import { css } from '../lib/css.js'

// Box — a styled element that supports the source design's `style-hover`
// behaviour. In the original dc-runtime, `style-hover="..."` generates a
// :hover pseudo-class; here we merge the hover styles on pointer enter/leave.
//
// Usage mirrors the source markup almost verbatim:
//   <Box style="display:flex;gap:8px" hover="background:var(--panel-2)" onClick={...}>
//
// `style` and `hover` accept CSS strings (parsed via css()) or style objects.
export const Box = React.forwardRef(function Box(
  { as = 'div', style, hover, onMouseEnter, onMouseLeave, children, ...rest },
  ref,
) {
  const [isHover, setHover] = useState(false)
  const Tag = as
  const base = css(style) || {}
  const merged = isHover && hover ? { ...base, ...(css(hover) || {}) } : base
  return (
    <Tag
      ref={ref}
      style={merged}
      onMouseEnter={(e) => {
        if (hover) setHover(true)
        onMouseEnter && onMouseEnter(e)
      }}
      onMouseLeave={(e) => {
        if (hover) setHover(false)
        onMouseLeave && onMouseLeave(e)
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
})
