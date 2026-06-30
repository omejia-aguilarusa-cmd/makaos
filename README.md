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

Everything runs on the **real merged payroll** — Darwin and Mauricio are partners
in one company (Mac Painters) who share/borrow painters, so their two books are
merged into one de‑duplicated roster. No demo data.

| Area | Screens / features |
| --- | --- |
| **Dashboard** | Real KPIs (active painters, hours, wages vs. contract billing, entries), top painters by hours, a Darwin‑vs‑Mauricio split, and recent activity |
| **Schedule** | A work timeline — weekly hours heatmap per painter, team‑coloured (Darwin / Mauricio / both), darker = more hours |
| **Mac Painters** | The merged roster: a Team toggle (Both / Darwin / Mauricio) + date range, est. wages, name‑variant `aka` lines, and a click‑through drawer with each painter's daily log |
| **Payroll** | Pick a team + pay period: est. gross, additions, deductions and net per painter, with wages vs. contract‑billing split and CSV export |
| **Time logs** | Every recorded entry (date, painter, team, location, hours, base/additions/deductions/net, notes), filterable by team / date / search, with CSV export |
| **Integrations** | Connect/disconnect Google Sheets, Drive, Calendar, Gmail, Claude, QuickBooks, Slack |
| **Assistant** | Copilot that answers from the real payroll — runs a model **on‑device** (WebLLM) with no API key, or falls back to a built‑in responder |

Keyboard: **⌘K / Ctrl‑K** searches the roster, **Esc** closes overlays.

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

## Mac Painters — real payroll import

`Mac Painters` (in the sidebar) is built from the two real company payroll
spreadsheets — **Darwin** and **Mauricio** are partners in the same company, so
their books are merged into one roster:

- **One person, counted once.** Name variants across both books (typos,
  first‑name vs. full name, accents, English/Spanish) are normalised and merged
  — e.g. *Nery / Nery Josue Ramos*, *Flor / Flor Helena*, *Alonso / Alonso
  Mejia*. The `aka` line under each name lists the source spellings.
- **Tagged by team.** Each painter is tagged with the team(s) they were logged
  under. The ~25 people who appear under **both** owners are the shared /
  borrowed crew. Use the **Both / Darwin / Mauricio** toggle plus the date range
  to see, say, just Darwin's crew for a given week — every total recomputes from
  the dated entries.
- **Source of truth.** `src/lib/macPainters.js` is generated from the sheets
  (55 employees, ~2,080 dated entries). The merge decisions — including a few
  flagged for confirmation (⚑) — are written up in
  [`docs/mac-painters-merge-report.txt`](docs/mac-painters-merge-report.txt).
  "Recorded $" is the amount logged per row (wages for hourly crew, contract/job
  values for subcontractors), so **hours** is the cleanest cross‑team metric.
- **Drill‑down + wages.** Each entry also carries its base / additions /
  deductions / net, so the roster shows **estimated wages** (hours × rate for
  hourly/per‑day; recorded total for fixed/contract). Click any painter to see
  their full daily log for the current team + window.
- **Wages vs. contract billing.** Subcontractors log whole‑job values (Point
  Hope, Daniel Island, …) under their row, which dwarfs hourly wages — so the
  Payroll and Mac Painters KPIs **split** them: *Wages* (hourly/per‑day/fixed
  crew) vs *Contract billing* (subcontractor job totals), with an All / Wages /
  Contract filter.
- **Everywhere it's wired.** The same data drives the **Payroll** screen
  ("Mac Painters · real" mode), the **Time Logs** screen (the full daily entry
  log), and the **Schedule** screen (a real work‑timeline heatmap of weekly
  hours per painter, team‑coloured). Every view has **Export CSV** for the
  current team + date selection.

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
