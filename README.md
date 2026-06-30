# Maka OS

> Operations console for a commercial painting contractor — scheduling, payroll, job‑cost, change orders, and an AI copilot.

Maka OS is an internal tool: a single‑page dark "ops dashboard" that pulls a paint
business together in one place — a Gantt schedule, projects with live P&L,
painters and crews, payroll, change orders, expenses, time logs, integrations,
and a Claude copilot that can read the whole workspace.

This repository is a faithful React implementation of the **Maka OS** design
created in Claude Design. It reproduces every screen, drawer, overlay, and
interaction from the source, pixel‑for‑pixel, on top of the **OBSIDIAN Trading
OS** design system.

## Stack

- **React 18** + **Vite** (plain JSX, no router — navigation is in‑app view state, matching the design)
- Design tokens + the 12 design‑system components are reproduced verbatim from the source (`src/styles`, `src/ds`)
- No backend. The dataset is mock/sample data held in the app; user edits and a couple of preferences persist to `localStorage`.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## What's inside

| Area | Screens / features |
| --- | --- |
| **Command Center** | KPIs, active projects, at‑risk, milestones, activity feed, "Ask Claude" prompts |
| **Schedule** | Interactive Gantt — day/week/month zoom, group by project or painter, bars with progress, milestones, conflict detection, today line |
| **Projects** | Searchable, status‑filtered cards with revenue / cost / profit / margin and progress |
| **Painters** | Crew‑filtered roster table with pay, hours, availability, and active‑project chips |
| **Payroll** | Weekly cycle: reg/OT hours, gross, deductions, net, per‑employee, with KPIs |
| **Reports** | A library of payroll, labor, P&L, change‑order and productivity reports |
| **Change orders / Expenses / Time logs / Addresses** | Operational tables across every project |
| **Integrations** | Connect/disconnect Google Sheets, Drive, Calendar, Gmail, Claude, QuickBooks, Slack |
| **Assistant** | Copilot that answers from the live workspace data — runs a model **on-device** (WebLLM) with no API key, or falls back to a built‑in responder |
| **Overlays** | Project & painter drawers, schedule‑block popover, ⌘K universal search, and change‑order / expense / bulk‑hours forms |

Keyboard: **⌘K / Ctrl‑K** opens universal search, **Esc** closes any overlay.

## Project layout

```
index.html               Vite entry (mounts #root)
src/
  main.jsx               React entry
  App.jsx                The controller — state, mock dataset, financial math,
                         icon set, and all view‑model builders. Screens render it.
  styles/                Design system CSS, extracted verbatim from the source:
                         fonts, color/typography/spacing tokens, component styles
  ds/index.jsx           The 12 OBSIDIAN Trading OS components (Badge, Button,
                         Pill, StatusLED, Switch, Tag, Card, MetricRow,
                         ProgressBar, StatCard, Banner, Toast)
  lib/css.js             css() — parses inline CSS strings into React style objects
  ui/                    Box (hover primitive) + Shell (sidebar, top bar, banner, toast)
  screens/               One component per screen
  overlays/              Spotlight, Popover, drawers, forms
public/fonts/            Inter web fonts (woff2)
design/                  The original Claude Design artifacts, kept for provenance:
                           Maka OS.standalone.html  — open in a browser to see the
                                                      exact source design running
                           Maka OS.dc.html          — the design‑component source
```

## Notes

- **Data is simulated.** "Today" is locked to May 1, 2026 so the schedule and
  payroll cycle stay stable. The sandbox banner makes this explicit; no external
  data is ever sent.
- **Assistant — on-device AI.** The copilot can run a small LLM
  (**Llama 3.2 1B** via [WebLLM](https://github.com/mlc-ai/web-llm)) entirely in
  the browser on WebGPU — no server and no API key. Open **Assistant** and click
  **Enable**; the model (~0.9 GB) downloads once, is cached by the browser, and
  then works offline, streaming answers grounded in your workspace data. WebLLM
  is lazy‑loaded, so it never weighs down the initial app load. Requires a
  WebGPU browser (Chrome, Edge, or Safari 18+). The copilot also uses a
  `window.claude.complete` bridge if one is injected, and always falls back to a
  built‑in grounded responder, so it works everywhere.
- **Fidelity.** Screen markup is translated close to 1:1 from the design. Inline
  styles are preserved as CSS strings (parsed by `css()`), and `style-hover`
  states are handled by the `Box` primitive, so the rendered result matches the
  source design.
