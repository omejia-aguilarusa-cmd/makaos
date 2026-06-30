# Maka OS

> Operations console for a commercial painting contractor — the merged Darwin + Mauricio payroll, scheduling, time logs, and an AI copilot.

Maka OS is an internal tool: a single-page dark "ops dashboard" that pulls a paint
business together in one place — live KPIs, a work-timeline schedule, the merged
painter roster, payroll, time logs, integrations, and a Claude copilot that can
read the whole workspace.

This repository is a React implementation of the **Maka OS** design created in
Claude Design, wired to the company's **real merged payroll** and focused down to
the screens that run on it, on top of the **OBSIDIAN Trading OS** design system.

## Stack

- **React 18** + **Vite** (plain JSX, no router — navigation is in-app view state, matching the design)
- Design tokens + the OBSIDIAN Trading OS components are reproduced from the source (`src/styles`, `src/ds`)
- No backend. The dataset is the imported payroll held in the app; the current view, integration toggles and copilot chat persist to `localStorage`.
- Tooling: **ESLint** (flat config) + **Prettier**.

## Getting started

```bash
npm install
npm run dev          # start the dev server (http://localhost:5173)
npm run build        # production build to dist/
npm run preview      # preview the production build
npm run lint         # ESLint
npm run format       # Prettier (writes src/)
```

## What's inside

Everything runs on the **real merged payroll** — Darwin and Mauricio are partners
in one company (Mac Painters) who share/borrow painters, so their two books are
merged into one de-duplicated roster. No demo data.

| Area | Screens / features |
| --- | --- |
| **Dashboard** | Real KPIs (active painters, hours, wages vs. contract billing, entries), top painters by hours, a Darwin-vs-Mauricio split, and recent activity |
| **Schedule** | A work timeline — weekly hours heatmap per painter, team-coloured (Darwin / Mauricio / both), darker = more hours |
| **Mac Painters** | The merged roster: a Team toggle (Both / Darwin / Mauricio) + date range, est. wages, name-variant `aka` lines, and a click-through drawer with each painter's daily log |
| **Payroll** | Pick a team + pay period: est. gross, additions, deductions and net per painter, with wages vs. contract-billing split and CSV export |
| **Time logs** | Every recorded entry (date, painter, team, location, hours, base/additions/deductions/net, notes), filterable by team / date / search, with CSV export |
| **Integrations** | Connect/disconnect Google Sheets, Drive, Calendar, Gmail, Claude, QuickBooks, Slack |
| **Assistant** | Copilot that answers from the real payroll — runs a model **on-device** (WebLLM) with no API key, or falls back to a built-in responder |

Keyboard: **⌘K / Ctrl-K** opens search over the roster, **Esc** closes the search overlay and the roster drawer.

## Project layout

```
index.html               Vite entry (mounts #root)
src/
  main.jsx               React entry
  App.jsx                The controller — app state (view, connections, copilot
                         chat, on-device AI), the icon set, and the shell /
                         spotlight / integrations / assistant view-models.
  lib/macPainters.js     The imported, de-duplicated payroll dataset (generated)
  lib/macPayroll.js      payroll(team, from, to) aggregation + formatters
  lib/localAI.js         WebLLM engine (lazy-loaded) for the on-device copilot
  lib/css.js             css() — parses inline CSS strings into React style objects
  lib/csv.js             downloadCSV() — client-side CSV export
  styles/                Design system CSS: fonts, color/typography/spacing
                         tokens, component styles
  ds/index.jsx           The OBSIDIAN Trading OS components (Badge, Pill,
                         StatusLED, StatCard, …)
  ui/                    Box (hover primitive) + Shell (sidebar, top bar, toast)
  screens/               One component per screen — Dashboard, Schedule, Mac
                         Painters, Payroll, Time logs, Integrations, Assistant
  overlays/Spotlight.jsx ⌘K search over the roster
public/fonts/            Inter web fonts (woff2)
design/                  The original Claude Design artifacts, kept for provenance:
                           Maka OS.standalone.html  — open in a browser to see the
                                                      exact source design running
                           Maka OS.dc.html          — the design-component source
```

## Mac Painters — real payroll import

`Mac Painters` (in the sidebar) is built from the two real company payroll
spreadsheets — **Darwin** and **Mauricio** are partners in the same company, so
their books are merged into one roster:

- **One person, counted once.** Name variants across both books (typos,
  first-name vs. full name, accents, English/Spanish) are normalised and merged
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
  values for subcontractors), so **hours** is the cleanest cross-team metric.
- **Drill-down + wages.** Each entry also carries its base / additions /
  deductions / net, so the roster shows **estimated wages** (hours × rate for
  hourly/per-day; recorded total for fixed/contract). Click any painter to see
  their full daily log for the current team + window.
- **Wages vs. contract billing.** Subcontractors log whole-job values (Point
  Hope, Daniel Island, …) under their row, which dwarfs hourly wages — so the
  Payroll and Mac Painters KPIs **split** them: *Wages* (hourly/per-day/fixed
  crew) vs *Contract billing* (subcontractor job totals), with an All / Wages /
  Contract filter.
- **Everywhere it's wired.** The same data drives the **Payroll** screen, the
  **Time Logs** screen (the full daily entry log), and the **Schedule** screen (a
  work-timeline heatmap of weekly hours per painter, team-coloured). Every view
  has **Export CSV** for the current team + date selection.

## Notes

- **Local-only.** The dataset is the imported payroll, held in the app and saved
  in your browser (`localStorage`); user edits never leave the device and no
  external data is ever sent. The data window is 2025-08-14 → 2026-06-24.
- **Assistant — on-device AI.** The copilot can run a small LLM
  (**Llama 3.2 1B** via [WebLLM](https://github.com/mlc-ai/web-llm)) entirely in
  the browser on WebGPU — no server and no API key. Open **Assistant** and click
  **Enable**; the model (~0.9 GB) downloads once, is cached by the browser, and
  then works offline, streaming answers grounded in your workspace data. WebLLM
  is lazy-loaded, so it never weighs down the initial app load. Requires a
  WebGPU browser (Chrome, Edge, or Safari 18+). The copilot also uses a
  `window.claude.complete` bridge if one is injected, and always falls back to a
  built-in grounded responder, so it works everywhere.
- **Styling.** Screen markup is translated close to 1:1 from the design. Inline
  styles are preserved as CSS strings (parsed by `css()`), and `style-hover`
  states are handled by the `Box` primitive, so the rendered result matches the
  source design.
