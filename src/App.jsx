import React from 'react'
import { css } from './lib/css.js'
import { isWebGPUAvailable, loadEngine, streamChat, MODEL_LABEL, MODEL_APPROX_SIZE } from './lib/localAI.js'
import { Sidebar, Topbar, SafetyBanner, ToastBar } from './ui/Shell.jsx'
import HomeScreen from './screens/HomeScreen.jsx'
import ScheduleScreen from './screens/ScheduleScreen.jsx'
import ProjectsScreen from './screens/ProjectsScreen.jsx'
import PaintersScreen from './screens/PaintersScreen.jsx'
import PayrollScreen from './screens/PayrollScreen.jsx'
import ReportsScreen from './screens/ReportsScreen.jsx'
import ChangeOrdersScreen from './screens/ChangeOrdersScreen.jsx'
import ExpensesScreen from './screens/ExpensesScreen.jsx'
import TimeLogsScreen from './screens/TimeLogsScreen.jsx'
import AddressesScreen from './screens/AddressesScreen.jsx'
import IntegrationsScreen from './screens/IntegrationsScreen.jsx'
import AssistantScreen from './screens/AssistantScreen.jsx'
import MacPaintersScreen from './screens/MacPaintersScreen.jsx'
import { MAC_PAINTERS } from './lib/macPainters.js'
import Spotlight from './overlays/Spotlight.jsx'
import Popover from './overlays/Popover.jsx'
import DrawerHost from './overlays/DrawerHost.jsx'
import FormDrawer from './overlays/FormDrawer.jsx'

// Maka OS — operations console for a commercial painting contractor.
//
// This class is a faithful port of the source design's controller (a DCLogic
// class). The state shape, helpers, financial math, icon set, mock dataset, and
// every view-model builder are reproduced verbatim; only the base class
// (React.Component) and the JSX render() differ. The builders return ready-made
// view-models (labels, handlers, icons, style objects), so the screen and
// overlay components below are thin, near-1:1 translations of the template.

export default class App extends React.Component {
  static defaultProps = { accent: '#2f82ff', safetyBanner: true, defaultView: 'home' }

  constructor(props) {
    super(props)
    this.KEY = 'makaos.dark.v1'
    this.db = this.buildDB()
    const s = this.load()
    this.state = {
      view: s.view || (props.defaultView || 'home'),
      connections: s.connections || { sheets: true, drive: true, calendar: false, gmail: false, claude: true, quickbooks: false, slack: false },
      chat: s.chat || [{ role: 'assistant', text: "I'm your Maka OS copilot. Ask me about margins, schedule risk, payroll, or any project — I can read everything in your workspace." }],
      extras: s.extras || { expenses: [], timeLogs: [], cos: [] },
      drawer: null, drawerTab: 'overview',
      popover: null, form: null,
      spotlight: false, assistant: false,
      toast: null, chatBusy: false,
      zoom: 'week', groupBy: 'project',
      filters: { status: 'all', crew: 'all' },
      // On-device AI engine (WebLLM). 'idle' until the user turns it on.
      ai: { status: isWebGPUAvailable() ? 'idle' : 'unsupported', progress: 0, note: '' },
    }
  }

  // ---------- persistence ----------
  load() { try { return JSON.parse(localStorage.getItem(this.KEY)) || {} } catch (e) { return {} } }
  persist() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({
        view: this.state.view, connections: this.state.connections, chat: this.state.chat, extras: this.state.extras,
      }))
    } catch (e) {}
  }
  componentDidUpdate() { this.persist(); if (this._chatScroll) this._chatScroll.scrollTop = this._chatScroll.scrollHeight }
  componentDidMount() {
    const accent = this.props.accent || '#2f82ff'
    document.documentElement.style.setProperty('--accent', accent)
    document.documentElement.style.setProperty('--blue', accent)
    this._key = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); this.setState({ spotlight: true }) }
      if (e.key === 'Escape') this.setState({ spotlight: false, drawer: null, popover: null, form: null, assistant: false })
    }
    window.addEventListener('keydown', this._key)
  }
  componentWillUnmount() { window.removeEventListener('keydown', this._key) }

  // ---------- helpers ----------
  D(mo, d) { return new Date(2026, mo - 1, d) }
  iso(d) { return d.toISOString().slice(0, 10) }
  addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
  dayDiff(a, b) { return Math.round((b - a) / 86400000) }
  fmtDate(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  fmtMoney(n, opts = {}) {
    if (n == null) return '—'
    const sign = n < 0 ? '-' : ''
    const abs = Math.abs(n)
    if (opts.compact && abs >= 1000) return sign + '$' + (abs / 1000).toFixed(abs >= 100000 ? 0 : 1) + 'k'
    return sign + '$' + abs.toLocaleString('en-US', { minimumFractionDigits: opts.dp ?? 0, maximumFractionDigits: opts.dp ?? 0 })
  }
  colorFor(key) {
    const m = {
      blue: { solid: '#2f82ff', soft: 'rgba(47,130,255,.16)', line: 'rgba(47,130,255,.45)', text: '#65a8ff' },
      teal: { solid: '#18d6e8', soft: 'rgba(24,214,232,.14)', line: 'rgba(24,214,232,.40)', text: '#5fe5f2' },
      green: { solid: '#20e070', soft: 'rgba(32,224,112,.14)', line: 'rgba(32,224,112,.40)', text: '#52e892' },
      amber: { solid: '#ffac18', soft: 'rgba(255,172,24,.16)', line: 'rgba(255,172,24,.50)', text: '#ffc24d' },
      violet: { solid: '#a855f7', soft: 'rgba(168,85,247,.16)', line: 'rgba(168,85,247,.45)', text: '#c08cf9' },
      rose: { solid: '#ff454f', soft: 'rgba(255,69,79,.13)', line: 'rgba(255,69,79,.50)', text: '#ff7b82' },
      slate: { solid: '#94a3b8', soft: 'rgba(148,163,184,.12)', line: 'rgba(148,163,184,.35)', text: '#b6c2d4' },
    }
    return m[key] || m.slate
  }
  statusColor(s) { return ({ 'In Progress': 'blue', Scheduled: 'default', 'At Risk': 'amber', Completed: 'green', 'On Hold': 'red' })[s] || 'default' }

  // ---------- icons ----------
  ic(name, size, color) {
    const defs = {
      home: [['path', { d: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z' }]],
      gantt: [['rect', { x: 3.5, y: 6, width: 9, height: 3, rx: 1.2 }], ['rect', { x: 7.5, y: 11, width: 11, height: 3, rx: 1.2 }], ['rect', { x: 5.5, y: 16, width: 8, height: 3, rx: 1.2 }]],
      folder: [['path', { d: 'M3.5 7.5a2 2 0 0 1 2-2h3.5l2 2h7.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z' }]],
      users: [['circle', { cx: 9, cy: 9, r: 3 }], ['path', { d: 'M3.5 19a5.5 5.5 0 0 1 11 0' }], ['circle', { cx: 16, cy: 8, r: 2.4 }], ['path', { d: 'M14.5 13.5A4.5 4.5 0 0 1 20.5 18' }]],
      user: [['circle', { cx: 12, cy: 9, r: 3.5 }], ['path', { d: 'M5 19.5a7 7 0 0 1 14 0' }]],
      wallet: [['rect', { x: 3.5, y: 6.5, width: 17, height: 12, rx: 2.5 }], ['path', { d: 'M16 12.5h2.5' }], ['path', { d: 'M3.5 9.5h13.5a2 2 0 0 1 0 4H3.5' }]],
      chart: [['path', { d: 'M4 4v16h16' }], ['path', { d: 'M8 14l3-4 3 3 4-6' }]],
      pin: [['path', { d: 'M12 2.5c3.5 0 6 2.5 6 6 0 4.5-6 12-6 12s-6-7.5-6-12c0-3.5 2.5-6 6-6z' }], ['circle', { cx: 12, cy: 9, r: 2.2 }]],
      search: [['circle', { cx: 11, cy: 11, r: 6 }], ['path', { d: 'M16 16l4 4' }]],
      plus: [['path', { d: 'M12 5v14M5 12h14' }]],
      filter: [['path', { d: 'M4 5h16l-6 8v6l-4-2v-4z' }]],
      close: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
      check: [['path', { d: 'M5 12.5l4 4 10-10' }]],
      edit: [['path', { d: 'M14 5l5 5-10 10H4v-5z' }], ['path', { d: 'M13 6l5 5' }]],
      trash: [['path', { d: 'M5 7h14' }], ['path', { d: 'M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2' }], ['path', { d: 'M6.5 7l1 13a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5l1-13' }]],
      clock: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M12 7v5l3 2' }]],
      dollar: [['path', { d: 'M12 4v16' }], ['path', { d: 'M16 8a3 3 0 0 0-3-2h-2.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5h-3a3 3 0 0 1-3-2' }]],
      flag: [['path', { d: 'M5 21V4h11l-2 4 2 4H5' }]],
      send: [['path', { d: 'M21 4L3 11l7 3 3 7z' }], ['path', { d: 'M10 14l11-10' }]],
      tag: [['path', { d: 'M3.5 12.5L12 4h7v7l-8.5 8.5a2 2 0 0 1-2.8 0L3.5 15.3a2 2 0 0 1 0-2.8z' }], ['circle', { cx: 15.5, cy: 8.5, r: 1.2 }]],
      sliders: [['path', { d: 'M5 6h11M5 12h7M5 18h13' }], ['circle', { cx: 18, cy: 6, r: 2 }], ['circle', { cx: 14, cy: 12, r: 2 }], ['circle', { cx: 9, cy: 18, r: 2 }]],
      inbox: [['path', { d: 'M4 13l3-8h10l3 8v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z' }], ['path', { d: 'M4 13h5l1 2h4l1-2h5' }]],
      download: [['path', { d: 'M12 4v11' }], ['path', { d: 'M7 11l5 5 5-5' }], ['path', { d: 'M5 19h14' }]],
      more: [['circle', { cx: 6, cy: 12, r: 1.4, fill: 'currentColor', stroke: 'none' }], ['circle', { cx: 12, cy: 12, r: 1.4, fill: 'currentColor', stroke: 'none' }], ['circle', { cx: 18, cy: 12, r: 1.4, fill: 'currentColor', stroke: 'none' }]],
      calendar: [['rect', { x: 3.5, y: 5, width: 17, height: 15, rx: 2.5 }], ['path', { d: 'M3.5 9.5h17' }], ['path', { d: 'M8 3v4M16 3v4' }]],
      plug: [['path', { d: 'M9 3v5M15 3v5' }], ['path', { d: 'M7 8h10v3a5 5 0 0 1-10 0z' }], ['path', { d: 'M12 16v5' }]],
      sparkle: [['path', { d: 'M12 3l1.7 4.8L18.5 9.5 13.7 11.2 12 16l-1.7-4.8L5.5 9.5 10.3 7.8z' }], ['path', { d: 'M18 14.5l.8 2.2L21 17.5l-2.2.8L18 20.5l-.8-2.2L15 17.5l2.2-.8z' }]],
      refresh: [['path', { d: 'M4 12a8 8 0 0 1 13.7-5.6L20 8' }], ['path', { d: 'M20 4v4h-4' }], ['path', { d: 'M20 12a8 8 0 0 1-13.7 5.6L4 16' }], ['path', { d: 'M4 20v-4h4' }]],
      activity: [['path', { d: 'M3 12h4l2.5 7 5-14L17 12h4' }]],
      grid: [['rect', { x: 4, y: 4, width: 7, height: 7, rx: 1.5 }], ['rect', { x: 13, y: 4, width: 7, height: 7, rx: 1.5 }], ['rect', { x: 4, y: 13, width: 7, height: 7, rx: 1.5 }], ['rect', { x: 13, y: 13, width: 7, height: 7, rx: 1.5 }]],
      sheet: [['rect', { x: 4, y: 3.5, width: 16, height: 17, rx: 2 }], ['path', { d: 'M4 9h16M4 14h16M10 3.5v17' }]],
      drive: [['path', { d: 'M9 4h6l5 9H14z' }], ['path', { d: 'M9 4L4 13l3 5 5-9z' }], ['path', { d: 'M7 18h10l3-5H10z' }]],
      mail: [['rect', { x: 3.5, y: 5.5, width: 17, height: 13, rx: 2 }], ['path', { d: 'M4 7.5l8 5.5 8-5.5' }]],
      chat: [['path', { d: 'M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4V6a1 1 0 0 1 1-1z' }]],
      external: [['path', { d: 'M14 5h5v5' }], ['path', { d: 'M19 5l-8 8' }], ['path', { d: 'M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' }]],
      alert: [['path', { d: 'M12 4l9 16H3z' }], ['path', { d: 'M12 10v4' }], ['path', { d: 'M12 17v.4' }]],
      link: [['path', { d: 'M9.5 14.5l5-5' }], ['path', { d: 'M11 6.5l1-1a3.5 3.5 0 1 1 5 5l-1 1' }], ['path', { d: 'M13 17.5l-1 1a3.5 3.5 0 1 1-5-5l1-1' }]],
      bolt: [['path', { d: 'M13 3l-7 11h5l-1 7 7-11h-5z' }]],
      book: [['path', { d: 'M5 4.5h11a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2z' }], ['path', { d: 'M18 6.5h1.5V20' }], ['path', { d: 'M8 8.5h6M8 12h6' }]],
    }
    const p = defs[name] || [['circle', { cx: 12, cy: 12, r: 6 }]]
    return React.createElement(
      'svg',
      { width: size || 16, height: size || 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', style: { color: color || 'currentColor', display: 'block' } },
      p.map((t, i) => React.createElement(t[0], Object.assign({ key: i }, t[1]))),
    )
  }

  // ---------- data ----------
  buildDB() {
    const D = (mo, d) => new Date(2026, mo - 1, d)
    const today = new Date(2026, 4, 1)
    const clients = [
      { id: 'c1', name: 'Halsted Residences', contact: 'Marin Aldridge', email: 'marin@halsted.co', phone: '(312) 555-0148' },
      { id: 'c2', name: 'Northbrook Hospitality Group', contact: 'Devon Park', email: 'devon@nhg.com', phone: '(847) 555-0192' },
      { id: 'c3', name: 'Greene & Atlas Office', contact: 'Priya Shah', email: 'priya@greeneatlas.com', phone: '(312) 555-0124' },
      { id: 'c4', name: 'Linden Public Schools', contact: 'Carl Ortiz', email: 'cortiz@lps.k12', phone: '(708) 555-0107' },
      { id: 'c5', name: 'Riverside Medical Center', contact: 'Anita Vaughn', email: 'avaughn@rmc.org', phone: '(312) 555-0163' },
    ]
    const painters = [
      { id: 'p1', name: 'Mateo Reyes', role: 'Lead Painter', crew: 'Crew A', color: 'blue', pay: { type: 'Hourly', rate: 38, ot: '1.5x after 40' }, avail: 'available', phone: '(312) 555-0177', start: '2021-06-12' },
      { id: 'p2', name: 'Lena Kowalski', role: 'Painter', crew: 'Crew A', color: 'teal', pay: { type: 'Hourly', rate: 32, ot: '1.5x after 40' }, avail: 'available', phone: '(312) 555-0182', start: '2022-03-04' },
      { id: 'p3', name: 'Jamal Wright', role: 'Painter', crew: 'Crew A', color: 'green', pay: { type: 'Hourly', rate: 30, ot: '1.5x after 40' }, avail: 'pto', phone: '(312) 555-0193', start: '2023-01-22' },
      { id: 'p4', name: 'Anika Patel', role: 'Lead Painter', crew: 'Crew B', color: 'violet', pay: { type: 'Salary', rate: 1730, period: 'weekly' }, avail: 'available', phone: '(312) 555-0114', start: '2020-09-09' },
      { id: 'p5', name: 'Dario Conti', role: 'Painter', crew: 'Crew B', color: 'amber', pay: { type: 'Hourly', rate: 34, ot: '1.5x after 40' }, avail: 'available', phone: '(312) 555-0145', start: '2022-08-15' },
      { id: 'p6', name: 'Ines Marchetti', role: 'Apprentice', crew: 'Crew B', color: 'rose', pay: { type: 'Hourly', rate: 22, ot: '1.5x after 40' }, avail: 'available', phone: '(312) 555-0152', start: '2024-02-19' },
      { id: 'p7', name: 'Owen Brennan', role: 'Painter', crew: 'Crew C', color: 'slate', pay: { type: 'Per Day', rate: 320 }, avail: 'busy', phone: '(312) 555-0188', start: '2023-05-30' },
      { id: 'p8', name: 'Sasha Volkov', role: 'Foreperson', crew: 'Crew C', color: 'blue', pay: { type: 'Salary', rate: 7800, period: 'monthly' }, avail: 'available', phone: '(312) 555-0136', start: '2019-04-18' },
      { id: 'p9', name: 'Theo Nakamura', role: 'Painter', crew: 'Crew C', color: 'teal', pay: { type: 'Hourly', rate: 31, ot: '1.5x after 40' }, avail: 'available', phone: '(312) 555-0179', start: '2023-10-02' },
    ]
    const projects = [
      { id: 'pr1', name: 'Halsted Lofts — Interior Repaint', client: 'c1', address: '2418 N Halsted St, Chicago, IL', color: 'blue', status: 'In Progress', start: D(4, 18), end: D(5, 22), contract: 84500, materialBudget: 12000, laborBudget: 38500, progress: 0.42, health: 86, description: '14-unit interior repaint, lobby refinish, common-area millwork.' },
      { id: 'pr2', name: 'Atlas Tower Lobby Refinish', client: 'c3', address: '120 W Madison, Chicago, IL', color: 'violet', status: 'In Progress', start: D(4, 25), end: D(5, 18), contract: 46200, materialBudget: 7400, laborBudget: 21800, progress: 0.55, health: 78, description: 'High-end commercial lobby — Venetian plaster + custom millwork.' },
      { id: 'pr3', name: 'Northbrook Marriott Suites', client: 'c2', address: '1885 Lake Cook Rd, Northbrook, IL', color: 'teal', status: 'Scheduled', start: D(5, 5), end: D(6, 14), contract: 138400, materialBudget: 22000, laborBudget: 64200, progress: 0.06, health: 92, description: '88 suites, corridor refinish, exterior trim.' },
      { id: 'pr4', name: 'Linden Elementary Summer Refresh', client: 'c4', address: '7300 Linden Ave, Forest Park, IL', color: 'green', status: 'Scheduled', start: D(5, 20), end: D(6, 28), contract: 62800, materialBudget: 9100, laborBudget: 28400, progress: 0, health: 88, description: '12 classrooms, gym epoxy, exterior trim & doors.' },
      { id: 'pr5', name: 'Riverside Med Center — Wing C', client: 'c5', address: '500 22nd St, Maywood, IL', color: 'amber', status: 'At Risk', start: D(4, 14), end: D(5, 12), contract: 92800, materialBudget: 16400, laborBudget: 41200, progress: 0.68, health: 62, description: 'Antimicrobial coatings, after-hours work, infection-control protocols.' },
      { id: 'pr6', name: 'Greene Plaza Exterior Trim', client: 'c3', address: '88 Greene St, Oak Park, IL', color: 'rose', status: 'Scheduled', start: D(5, 11), end: D(5, 30), contract: 28400, materialBudget: 4200, laborBudget: 13800, progress: 0, health: 80, description: 'Exterior trim, weather-dependent.' },
    ]
    const blocks = [
      { id: 'b1', projectId: 'pr1', painterId: 'p1', start: D(4, 27), end: D(5, 9), hoursPerDay: 8, progress: 0.5 },
      { id: 'b2', projectId: 'pr1', painterId: 'p2', start: D(4, 27), end: D(5, 12), hoursPerDay: 8, progress: 0.4 },
      { id: 'b3', projectId: 'pr1', painterId: 'p6', start: D(5, 4), end: D(5, 14), hoursPerDay: 8, progress: 0.1 },
      { id: 'b4', projectId: 'pr2', painterId: 'p4', start: D(4, 25), end: D(5, 18), hoursPerDay: 8, progress: 0.55 },
      { id: 'b5', projectId: 'pr2', painterId: 'p5', start: D(4, 28), end: D(5, 18), hoursPerDay: 8, progress: 0.5 },
      { id: 'b6', projectId: 'pr5', painterId: 'p8', start: D(4, 14), end: D(5, 12), hoursPerDay: 10, progress: 0.7 },
      { id: 'b7', projectId: 'pr5', painterId: 'p9', start: D(4, 20), end: D(5, 12), hoursPerDay: 10, progress: 0.6 },
      { id: 'b8', projectId: 'pr5', painterId: 'p7', start: D(4, 22), end: D(5, 10), hoursPerDay: 10, progress: 0.65 },
      { id: 'b9', projectId: 'pr3', painterId: 'p1', start: D(5, 11), end: D(5, 28), hoursPerDay: 8, progress: 0 },
      { id: 'b10', projectId: 'pr3', painterId: 'p4', start: D(5, 19), end: D(6, 14), hoursPerDay: 8, progress: 0 },
      { id: 'b11', projectId: 'pr3', painterId: 'p2', start: D(5, 13), end: D(5, 28), hoursPerDay: 8, progress: 0 },
      { id: 'b12', projectId: 'pr4', painterId: 'p6', start: D(5, 20), end: D(6, 18), hoursPerDay: 8, progress: 0 },
      { id: 'b13', projectId: 'pr4', painterId: 'p3', start: D(5, 22), end: D(6, 24), hoursPerDay: 8, progress: 0 },
      { id: 'b14', projectId: 'pr6', painterId: 'p7', start: D(5, 11), end: D(5, 24), hoursPerDay: 8, progress: 0 },
      { id: 'b15', projectId: 'pr2', painterId: 'p1', start: D(5, 6), end: D(5, 9), hoursPerDay: 4, progress: 0.3, conflict: true },
    ]
    const milestones = [
      { id: 'm1', projectId: 'pr1', date: D(5, 4), type: 'milestone', label: 'Lobby unveil' },
      { id: 'm2', projectId: 'pr1', date: D(5, 22), type: 'deadline', label: 'Final walk-through' },
      { id: 'm3', projectId: 'pr2', date: D(5, 12), type: 'change', label: 'CO #2 approved' },
      { id: 'm4', projectId: 'pr5', date: D(5, 12), type: 'deadline', label: 'Hospital re-open' },
      { id: 'm5', projectId: 'pr6', date: D(5, 16), type: 'weather', label: 'Rain — possible delay' },
      { id: 'm6', projectId: 'pr3', date: D(6, 14), type: 'deadline', label: 'Marriott opening' },
    ]
    const dependencies = [{ from: 'b1', to: 'b3' }, { from: 'b6', to: 'b8' }, { from: 'b9', to: 'b11' }]
    const timeLogs = [
      { id: 't1', painterId: 'p1', projectId: 'pr1', date: D(4, 27), reg: 8, ot: 0, notes: '', status: 'Approved' },
      { id: 't2', painterId: 'p1', projectId: 'pr1', date: D(4, 28), reg: 8, ot: 1, notes: 'Patching hallway', status: 'Approved' },
      { id: 't3', painterId: 'p1', projectId: 'pr1', date: D(4, 29), reg: 8, ot: 0, notes: '', status: 'Approved' },
      { id: 't4', painterId: 'p1', projectId: 'pr1', date: D(4, 30), reg: 8, ot: 0, notes: '', status: 'Submitted' },
      { id: 't5', painterId: 'p2', projectId: 'pr1', date: D(4, 27), reg: 8, ot: 0, notes: '', status: 'Approved' },
      { id: 't6', painterId: 'p2', projectId: 'pr1', date: D(4, 28), reg: 8, ot: 0, notes: '', status: 'Approved' },
      { id: 't7', painterId: 'p2', projectId: 'pr1', date: D(4, 29), reg: 8, ot: 1, notes: '', status: 'Approved' },
      { id: 't8', painterId: 'p2', projectId: 'pr1', date: D(4, 30), reg: 8, ot: 0, notes: '', status: 'Submitted' },
      { id: 't9', painterId: 'p4', projectId: 'pr2', date: D(4, 28), reg: 8, ot: 0, notes: 'Plaster prep', status: 'Approved' },
      { id: 't10', painterId: 'p4', projectId: 'pr2', date: D(4, 29), reg: 8, ot: 0, notes: '', status: 'Approved' },
      { id: 't11', painterId: 'p4', projectId: 'pr2', date: D(4, 30), reg: 8, ot: 2, notes: 'After-hours', status: 'Submitted' },
      { id: 't12', painterId: 'p5', projectId: 'pr2', date: D(4, 28), reg: 8, ot: 0, notes: '', status: 'Approved' },
      { id: 't13', painterId: 'p8', projectId: 'pr5', date: D(4, 28), reg: 10, ot: 2, notes: 'Wing C antimicrobial', status: 'Approved' },
      { id: 't14', painterId: 'p9', projectId: 'pr5', date: D(4, 28), reg: 10, ot: 2, notes: '', status: 'Approved' },
      { id: 't15', painterId: 'p7', projectId: 'pr5', date: D(4, 28), reg: 10, ot: 0, notes: '', status: 'Submitted' },
      { id: 't16', painterId: 'p6', projectId: 'pr1', date: D(5, 4), reg: 8, ot: 0, notes: '', status: 'Draft' },
    ]
    const changeOrders = [
      { id: 'co1', projectId: 'pr1', title: 'Add stairwell repaint', desc: 'Client added 3 stairwells', requestedBy: 'Marin Aldridge', status: 'Approved', amount: 6800, costImpact: 2400, date: D(4, 22), approved: D(4, 24) },
      { id: 'co2', projectId: 'pr1', title: 'Premium trim paint upgrade', desc: 'Switch to enamel finish', requestedBy: 'Marin Aldridge', status: 'Sent', amount: 2200, costImpact: 700, date: D(4, 28) },
      { id: 'co3', projectId: 'pr2', title: 'Custom plaster color match', desc: 'Match existing 1920s plaster', requestedBy: 'Priya Shah', status: 'Approved', amount: 4400, costImpact: 1500, date: D(5, 1), approved: D(5, 3) },
      { id: 'co4', projectId: 'pr2', title: 'Late-night work surcharge', desc: 'Building required after-hours window', requestedBy: 'Priya Shah', status: 'Approved', amount: 7100, costImpact: 3200, date: D(5, 6), approved: D(5, 12) },
      { id: 'co5', projectId: 'pr5', title: 'Additional infection-control sealing', desc: 'Hospital required negative-air zones', requestedBy: 'Anita Vaughn', status: 'Approved', amount: 9800, costImpact: 4200, date: D(4, 18), approved: D(4, 20) },
      { id: 'co6', projectId: 'pr5', title: 'Weekend schedule compression', desc: 'Compress timeline by 4 days', requestedBy: 'Anita Vaughn', status: 'Sent', amount: 5600, costImpact: 2900, date: D(4, 28) },
      { id: 'co7', projectId: 'pr3', title: 'Add corridor accent wall', desc: 'Marketing requested signature wall', requestedBy: 'Devon Park', status: 'Draft', amount: 3200, costImpact: 1200, date: D(4, 30) },
    ]
    const expenses = [
      { id: 'e1', projectId: 'pr1', title: 'Sherwin-Williams — premium enamel', category: 'Materials', vendor: 'Sherwin-Williams', amount: 1840.22, date: D(4, 21), status: 'Paid' },
      { id: 'e2', projectId: 'pr1', title: 'Drop cloths & masking', category: 'Materials', vendor: 'HD Supply', amount: 312.45, date: D(4, 21), status: 'Paid' },
      { id: 'e3', projectId: 'pr1', title: 'Scaffold rental', category: 'Equipment', vendor: 'Sunbelt Rentals', amount: 720.0, date: D(4, 24), status: 'Unpaid' },
      { id: 'e4', projectId: 'pr2', title: 'Venetian plaster batch', category: 'Materials', vendor: 'Modello Designs', amount: 4280.0, date: D(4, 26), status: 'Paid' },
      { id: 'e5', projectId: 'pr2', title: 'Spray rig calibration', category: 'Equipment', vendor: 'Graco Service', amount: 240.0, date: D(4, 28), status: 'Paid' },
      { id: 'e6', projectId: 'pr5', title: 'Antimicrobial coating system', category: 'Materials', vendor: 'Sherwin-Williams', amount: 6210.5, date: D(4, 18), status: 'Paid' },
      { id: 'e7', projectId: 'pr5', title: 'Negative-air containment', category: 'Subcontractor', vendor: 'AirBarrier Co.', amount: 1880.0, date: D(4, 18), status: 'Paid' },
      { id: 'e8', projectId: 'pr5', title: 'Travel — Maywood team transport', category: 'Travel', vendor: 'Internal', amount: 412.0, date: D(4, 28), status: 'Unpaid' },
      { id: 'e9', projectId: 'pr3', title: 'Corridor primer order', category: 'Materials', vendor: 'Benjamin Moore', amount: 920.0, date: D(5, 1), status: 'Unpaid' },
    ]
    const activity = [
      { id: 'a1', t: 'Today 10:42', text: 'Marin approved CO #1 on Halsted Lofts', proj: 'pr1' },
      { id: 'a2', t: 'Today 09:18', text: 'Mateo logged 8h on Halsted Lofts', proj: 'pr1' },
      { id: 'a3', t: 'Yesterday', text: 'Anika submitted 2h overtime on Atlas Tower', proj: 'pr2' },
      { id: 'a4', t: 'Yesterday', text: 'Sasha completed wing C ceilings (Riverside)', proj: 'pr5' },
      { id: 'a5', t: 'Apr 28', text: 'Devon requested CO #1 on Marriott', proj: 'pr3' },
    ]
    return { today, clients, painters, projects, blocks, milestones, dependencies, timeLogs, changeOrders, expenses, activity }
  }

  allTimeLogs() { return this.db.timeLogs.concat(this.state.extras.timeLogs || []) }
  allExpenses() { return this.db.expenses.concat(this.state.extras.expenses || []) }
  allCOs() { return this.db.changeOrders.concat(this.state.extras.cos || []) }

  projectFinancials(projId) {
    const proj = this.db.projects.find((p) => p.id === projId)
    if (!proj) return null
    const cos = this.allCOs().filter((c) => c.projectId === projId)
    const approvedCO = cos.filter((c) => c.status === 'Approved').reduce((s, c) => s + c.amount, 0)
    const pendingCO = cos.filter((c) => c.status === 'Sent' || c.status === 'Draft').reduce((s, c) => s + c.amount, 0)
    const coCostImpact = cos.filter((c) => c.status === 'Approved').reduce((s, c) => s + (c.costImpact || 0), 0)
    const exp = this.allExpenses().filter((e) => e.projectId === projId)
    const matCost = exp.filter((e) => e.category === 'Materials').reduce((s, e) => s + e.amount, 0)
    const otherCost = exp.filter((e) => e.category !== 'Materials').reduce((s, e) => s + e.amount, 0)
    const logs = this.allTimeLogs().filter((l) => l.projectId === projId)
    let laborCost = 0
    logs.forEach((l) => {
      const pa = this.db.painters.find((p) => p.id === l.painterId)
      if (!pa) return
      const r = pa.pay.type === 'Hourly' ? pa.pay.rate : pa.pay.type === 'Per Day' ? pa.pay.rate / 8 : 40
      laborCost += l.reg * r + l.ot * r * 1.5
    })
    const revenue = proj.contract + approvedCO
    const totalCost = matCost + otherCost + laborCost + coCostImpact
    const profit = revenue - totalCost
    const margin = revenue > 0 ? profit / revenue : 0
    const forecastCost = proj.progress > 0.05 ? totalCost / proj.progress : totalCost * 2.2
    const forecastProfit = revenue - forecastCost
    return { contract: proj.contract, approvedCO, pendingCO, revenue, laborCost, materialCost: matCost, otherCost, coCostImpact, totalCost, profit, margin, forecastCost, forecastProfit, laborBudget: proj.laborBudget, materialBudget: proj.materialBudget }
  }
  painterStats(painterId) {
    const logs = this.allTimeLogs().filter((l) => l.painterId === painterId)
    const totalReg = logs.reduce((s, l) => s + l.reg, 0)
    const totalOT = logs.reduce((s, l) => s + l.ot, 0)
    const projIds = [...new Set(logs.map((l) => l.projectId))]
    const myBlocks = this.db.blocks.filter((b) => b.painterId === painterId)
    const upcoming = myBlocks.filter((b) => b.start >= this.db.today).slice(0, 4)
    const past = myBlocks.filter((b) => b.end < this.db.today)
    return { totalReg, totalOT, projIds, myBlocks, upcoming, past }
  }

  // ---------- actions ----------
  setView(v) { this.setState({ view: v, drawer: null, spotlight: false }) }
  openProject(id) { this.setState({ drawer: { type: 'project', id }, drawerTab: 'overview', spotlight: false }) }
  openPainter(id) { this.setState({ drawer: { type: 'painter', id }, spotlight: false }) }
  toast(m) { this.setState({ toast: m }); clearTimeout(this._t); this._t = setTimeout(() => this.setState({ toast: null }), 2000) }

  // ---------- nav config ----------
  navItem(id, label, icon, count) {
    const active = this.state.view === id
    const base = { display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 9px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', userSelect: 'none', transition: 'background .12s,color .12s' }
    const style = active
      ? Object.assign({}, base, { background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', fontWeight: 600 })
      : Object.assign({}, base, { background: 'transparent', color: 'var(--muted)', border: '1px solid transparent' })
    return { id, label, icon: this.ic(icon, 16, active ? 'var(--accent)' : 'var(--faint)'), count, hasCount: count != null, style, onClick: () => this.setView(id) }
  }

  shellVals() {
    const v = this.state.view
    const D = this.db
    const conns = this.state.connections
    const connectedCount = Object.values(conns).filter(Boolean).length
    const labels = { home: 'Command Center', schedule: 'Schedule', projects: 'Projects', painters: 'Painters', 'mac-painters': 'Mac Painters', payroll: 'Payroll', reports: 'Reports', 'change-orders': 'Change Orders', expenses: 'Expenses', 'time-logs': 'Time Logs', addresses: 'Addresses', integrations: 'Integrations', assistant: 'Assistant' }
    const subs = {
      home: 'May 2026 · ' + D.projects.length + ' projects · ' + D.painters.length + ' painters',
      schedule: D.projects.length + ' projects · ' + D.painters.length + ' painters',
      payroll: 'Apr 27 – May 3, 2026',
      'mac-painters': MAC_PAINTERS.meta.employeeCount + ' employees · Darwin + Mauricio · ' + MAC_PAINTERS.meta.shared + ' shared',
      integrations: connectedCount + ' of 7 connected',
    }
    return {
      navMain: [
        this.navItem('home', 'Command Center', 'home'),
        this.navItem('schedule', 'Schedule', 'gantt'),
        this.navItem('projects', 'Projects', 'folder', D.projects.length),
        this.navItem('painters', 'Painters', 'users', D.painters.length),
        this.navItem('mac-painters', 'Mac Painters', 'book', MAC_PAINTERS.meta.employeeCount),
        this.navItem('payroll', 'Payroll', 'wallet'),
        this.navItem('reports', 'Reports', 'chart'),
      ],
      navOps: [
        this.navItem('change-orders', 'Change orders', 'tag', this.allCOs().length),
        this.navItem('expenses', 'Expenses', 'dollar', this.allExpenses().length),
        this.navItem('time-logs', 'Time logs', 'clock'),
        this.navItem('addresses', 'Addresses', 'pin'),
      ],
      navWork: [
        Object.assign(this.navItem('integrations', 'Integrations', 'plug'), { hasDot: connectedCount > 0 }),
        Object.assign(this.navItem('assistant', 'Assistant', 'sparkle'), { hasDot: !!conns.claude }),
      ],
      crews: ['Crew A', 'Crew B', 'Crew C'].map((c) => ({ name: c, count: D.painters.filter((p) => p.crew === c).length, color: 'var(--accent)' })),
      crumb: { label: labels[v] || 'Maka', sub: subs[v] || '' },
      isHome: v === 'home', isSchedule: v === 'schedule', isProjects: v === 'projects', isPainters: v === 'painters', isMacPainters: v === 'mac-painters', isPayroll: v === 'payroll', isReports: v === 'reports', isChangeOrders: v === 'change-orders', isExpenses: v === 'expenses', isTimeLogs: v === 'time-logs', isAddresses: v === 'addresses', isIntegrations: v === 'integrations', isAssistant: v === 'assistant',
      showBanner: this.props.safetyBanner !== false,
      connectedCount, syncSummary: connectedCount + ' tools live · ' + this.allExpenses().length + ' records', syncTime: '2m ago',
      icSearch: this.ic('search', 14), icGrid: this.ic('grid', 14), icSparkle: this.ic('sparkle', 14), icInbox: this.ic('inbox', 16), icActivity: this.ic('activity', 14), icPin: this.ic('pin', 16), icGridBig: this.ic('grid', 20), icClose: this.ic('close', 15),
      openSpotlight: () => this.setState({ spotlight: true }),
      openAssistant: () => this.setView('assistant'),
      goIntegrations: () => this.setView('integrations'),
      goProjects: () => this.setView('projects'),
      toast: this.state.toast,
    }
  }

  homeVals() {
    const D = this.db
    const totalRevenue = D.projects.reduce((s, p) => s + this.projectFinancials(p.id).revenue, 0)
    const totalCost = D.projects.reduce((s, p) => s + this.projectFinancials(p.id).totalCost, 0)
    const profit = totalRevenue - totalCost
    const avgMargin = profit / totalRevenue
    const kpis = [
      { label: 'Active projects', value: String(D.projects.length), sub: '2 in progress · 3 scheduled', tone: 'blue' },
      { label: 'Revenue YTD', value: this.fmtMoney(totalRevenue, { compact: true }), sub: 'incl. approved COs', tone: 'muted' },
      { label: 'Cost YTD', value: this.fmtMoney(totalCost, { compact: true }), sub: 'labor + materials', tone: 'muted' },
      { label: 'Profit', value: this.fmtMoney(profit, { compact: true }), sub: (avgMargin * 100).toFixed(1) + '% margin', tone: 'green' },
      { label: 'At-risk value', value: this.fmtMoney(D.projects.filter((p) => p.status === 'At Risk').reduce((s, p) => s + this.projectFinancials(p.id).revenue, 0), { compact: true }), sub: '1 project flagged', tone: 'amber' },
    ]
    const mkProj = (p) => {
      const fin = this.projectFinancials(p.id)
      const c = this.colorFor(p.color)
      const mtone = fin.margin >= 0.18 ? 'var(--green)' : fin.margin >= 0.1 ? 'var(--amber)' : 'var(--red)'
      return {
        id: p.id, name: p.name, color: c.solid, status: p.status, statusColor: this.statusColor(p.status),
        metaLine: p.address.split(',')[0] + ' · ' + this.fmtMoney(fin.revenue, { compact: true }),
        progressLabel: Math.round(p.progress * 100) + '%',
        progressFill: this.styleStr({ width: p.progress * 100 + '%', height: '100%', background: c.solid, borderRadius: '999px' }),
        marginLabel: (fin.margin * 100).toFixed(0) + '%',
        marginStyle: this.styleStr({ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: mtone, width: '42px', textAlign: 'right', flexShrink: 0 }),
        onOpen: () => this.openProject(p.id),
      }
    }
    return {
      kpis,
      homeProjects: D.projects.slice(0, 6).map(mkProj),
      atRiskCount: String(D.projects.filter((p) => p.status === 'At Risk').length),
      homeAtRisk: D.projects.filter((p) => p.status === 'At Risk').map((p) => {
        const fin = this.projectFinancials(p.id)
        return { id: p.id, name: p.name, riskLine: 'margin ' + (fin.margin * 100).toFixed(0) + '% · health ' + p.health, onOpen: () => this.openProject(p.id) }
      }),
      homeMilestones: D.milestones.slice(0, 5).map((m) => {
        const proj = D.projects.find((p) => p.id === m.projectId)
        const col = { milestone: 'var(--amber)', deadline: 'var(--red)', change: 'var(--purple)', weather: 'var(--cyan)' }[m.type] || 'var(--amber)'
        return { label: m.label, sub: proj.name.split('—')[0].trim() + ' · ' + m.type, date: this.fmtDate(m.date), color: col }
      }),
      homeActivity: D.activity.map((a) => ({ time: a.t, text: a.text })),
      claudePrompts: [
        { text: 'Which project has the weakest margin and why?', onClick: () => this.askClaude('Which project has the weakest margin and why?') },
        { text: 'Summarize this week’s payroll.', onClick: () => this.askClaude('Summarize this week’s payroll.') },
        { text: 'Any scheduling conflicts I should fix?', onClick: () => this.askClaude('Any scheduling conflicts I should fix?') },
      ],
    }
  }

  askClaude(q) { this.setView('assistant'); setTimeout(() => this.sendChat(q), 70) }
  styleStr(o) { return o }

  // Turn on the on-device model: lazy-load WebLLM + the weights, reporting
  // download/compile progress, then route the copilot through it.
  async enableLocalAI() {
    if (!isWebGPUAvailable()) { this.setState({ ai: { status: 'unsupported', progress: 0, note: '' } }); return }
    const st = this.state.ai.status
    if (st === 'loading' || st === 'ready') return
    this.setState({ ai: { status: 'loading', progress: 0, note: 'Preparing…' } })
    try {
      await loadEngine((r) => this.setState({ ai: { status: 'loading', progress: r.progress || 0, note: r.text || '' } }))
      this.setState({ ai: { status: 'ready', progress: 1, note: '' } })
      this.toast('On-device AI ready · ' + MODEL_LABEL)
    } catch (e) {
      console.error('[Maka OS] local AI load failed:', e)
      this.setState({ ai: { status: 'error', progress: 0, note: String((e && e.message) || e) } })
      this.toast('Could not load on-device AI — using built-in responder')
    }
  }

  buildContext() {
    const D = this.db
    const L = []
    L.push('You are the Maka OS copilot for a commercial painting contractor (Maka OS, dark ops dashboard). Answer ONLY from the data below, concise and operator-to-operator, with specific $ and %. Today is May 1, 2026. No markdown headers.')
    L.push('PROJECTS:')
    D.projects.forEach((p) => { const f = this.projectFinancials(p.id); L.push('- ' + p.name + ' [' + p.status + '] revenue ' + this.fmtMoney(f.revenue) + ', cost ' + this.fmtMoney(f.totalCost, { dp: 0 }) + ', profit ' + this.fmtMoney(f.profit, { dp: 0 }) + ', margin ' + (f.margin * 100).toFixed(1) + '%, ' + Math.round(p.progress * 100) + '% done, health ' + p.health + '/100, ' + p.address) })
    const payReg = this.allTimeLogs().reduce((s, l) => s + l.reg, 0)
    const payOt = this.allTimeLogs().reduce((s, l) => s + l.ot, 0)
    L.push('PAINTERS (' + D.painters.length + '): ' + D.painters.map((p) => p.name + ' — ' + p.role + ', ' + p.crew + ', ' + (p.pay.type === 'Hourly' ? '$' + p.pay.rate + '/hr' : p.pay.type) + ', ' + p.avail).join('; '))
    L.push('PAYROLL this cycle: ' + payReg + 'h regular + ' + payOt + 'h overtime across the crews.')
    L.push('CHANGE ORDERS: ' + this.allCOs().filter((c) => c.status === 'Approved').length + ' approved, ' + this.allCOs().filter((c) => c.status === 'Sent' || c.status === 'Draft').length + ' pending.')
    L.push('MILESTONES: ' + D.milestones.map((m) => m.label + ' (' + this.fmtDate(m.date) + ')').join('; '))
    L.push('KNOWN CONFLICT: Mateo Reyes is double-booked May 6–9 — on Halsted Lofts and a 4h/day block on Atlas Tower.')
    return L.join('\n')
  }

  async sendChat(text) {
    text = (text || '').trim()
    if (!text || this.state.chatBusy) return
    const base = this.state.chat.concat([{ role: 'user', text }])
    this.setState({ chat: base, chatBusy: true })

    // 1) On-device model (WebLLM), streamed token-by-token.
    if (this.state.ai.status === 'ready') {
      const messages = [{ role: 'system', content: this.buildContext() + '\n\nReply as the Maka copilot in 2–5 sentences with specific numbers. Plain text, no markdown headers.' }]
      for (const m of base.slice(-7)) messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })
      let started = false
      const replace = (s, t) => (started ? s.chat.slice(0, -1) : s.chat.slice()).concat([{ role: 'assistant', text: t }])
      try {
        const full = await streamChat(messages, (partial) => {
          this.setState((s) => { const c = replace(s, partial); started = true; return { chat: c, chatBusy: false } })
        })
        const finalText = (full || '').trim() || this.mockReply(text)
        this.setState((s) => ({ chat: replace(s, finalText), chatBusy: false }))
      } catch (e) {
        console.error('[Maka OS] local AI inference failed:', e)
        this.setState((s) => ({ chat: replace(s, this.mockReply(text)), chatBusy: false }))
      }
      return
    }

    // 2) An injected Claude bridge if present, else 3) the built-in grounded responder.
    const prompt = this.buildContext() + '\n\nConversation:\n' + base.slice(-8).map((m) => (m.role === 'user' ? 'Operator: ' : 'Copilot: ') + m.text).join('\n') + '\n\nReply as Copilot in 2–5 sentences with specific numbers.'
    let reply = null
    try { if (window.claude && window.claude.complete) { reply = await window.claude.complete({ messages: [{ role: 'user', content: prompt }] }) } } catch (e) { reply = null }
    if (!reply || !String(reply).trim()) reply = this.mockReply(text)
    this.setState({ chat: base.concat([{ role: 'assistant', text: String(reply).trim() }]), chatBusy: false })
  }

  mockReply(q) {
    const ql = q.toLowerCase()
    if (ql.includes('margin') || ql.includes('weak') || ql.includes('profit')) {
      let worst = null
      this.db.projects.forEach((p) => { const f = this.projectFinancials(p.id); if (!worst || f.margin < worst.m) worst = { p, f, m: f.margin } })
      return worst.p.name + ' is your thinnest at ' + (worst.m * 100).toFixed(1) + '% margin — ' + this.fmtMoney(worst.f.profit, { dp: 0 }) + ' profit on ' + this.fmtMoney(worst.f.revenue) + ' revenue. The drag is labor plus change-order cost on after-hours infection-control work. Push the pending CO to approval and watch overtime to protect the margin.'
    }
    if (ql.includes('payroll') || ql.includes('pay ') || ql.includes('wages')) {
      const reg = this.allTimeLogs().reduce((s, l) => s + l.reg, 0)
      const ot = this.allTimeLogs().reduce((s, l) => s + l.ot, 0)
      return 'This cycle (Apr 27–May 3) logs ' + reg + 'h regular and ' + ot + 'h overtime across the crews. Net pay lands near $4.7k after ~18% withholding, with lead/foreperson bonuses. Atlas Tower and Riverside are driving the overtime — both ran after-hours windows.'
    }
    if (ql.includes('conflict') || ql.includes('double') || ql.includes('overbook') || ql.includes('schedul')) {
      return 'Yes — Mateo Reyes is double-booked May 6–9: he’s on Halsted Lofts and also a 4h/day block on Atlas Tower Lobby. Re-assign the Atlas hours to Dario Conti (available, Crew B) or slide Mateo’s Halsted block by two days to clear it.'
    }
    if (ql.includes('risk')) {
      const r = this.db.projects.filter((p) => p.status === 'At Risk')
      const f = r[0] ? this.projectFinancials(r[0].id) : null
      return r.length ? r[0].name + ' is flagged at risk — health ' + r[0].health + '/100 and margin ' + (f.margin * 100).toFixed(0) + '%. It’s the hospital wing: after-hours work, infection-control protocols and a hard re-open deadline of May 12. Keep the negative-air CO approved and hold the line on overtime.' : 'No projects are currently flagged at risk — all are at health 78+ this week.'
    }
    if (ql.includes('expense') || ql.includes('cost') || ql.includes('spend')) {
      const t = this.allExpenses().reduce((s, e) => s + e.amount, 0)
      const u = this.allExpenses().filter((e) => e.status === 'Unpaid').reduce((s, e) => s + e.amount, 0)
      return 'Recorded expenses total ' + this.fmtMoney(t, { dp: 0 }) + ', of which ' + this.fmtMoney(u, { dp: 0 }) + ' is still unpaid. Materials dominate — Sherwin-Williams enamel and the antimicrobial coating system are the two biggest line items. I’d clear the scaffold rental and Maywood transport to keep vendor terms clean.'
    }
    if (ql.includes('halsted') || ql.includes('atlas') || ql.includes('riverside') || ql.includes('marriott') || ql.includes('linden') || ql.includes('greene')) {
      const p = this.db.projects.find((x) => ql.includes(x.name.split(' ')[0].toLowerCase()))
      if (p) { const f = this.projectFinancials(p.id); return p.name + ' is ' + p.status.toLowerCase() + ' at ' + Math.round(p.progress * 100) + '% complete. Revenue ' + this.fmtMoney(f.revenue) + ', cost ' + this.fmtMoney(f.totalCost, { dp: 0 }) + ', current profit ' + this.fmtMoney(f.profit, { dp: 0 }) + ' (' + (f.margin * 100).toFixed(1) + '% margin). Health is ' + p.health + '/100.' }
    }
    return 'I can read every project, painter, time log, change order and expense in your workspace. Try: “which project has the weakest margin?”, “summarize this week’s payroll”, or “any scheduling conflicts?”'
  }

  assistantVals() {
    if (this.state.view !== 'assistant') return {}
    const msgs = this.state.chat.map((m) => {
      const isU = m.role === 'user'
      return {
        text: m.text, isAssistant: !isU,
        rowStyle: { display: 'flex', gap: '10px', alignItems: 'flex-start', flexDirection: isU ? 'row-reverse' : 'row' },
        bubbleStyle: isU
          ? { background: 'var(--blue)', color: '#fff', borderRadius: '13px 13px 4px 13px', padding: '10px 13px', fontSize: '13px', lineHeight: 1.55, maxWidth: '74%' }
          : { background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: '13px 13px 13px 4px', padding: '11px 14px', fontSize: '13px', lineHeight: 1.6, maxWidth: '80%', whiteSpace: 'pre-wrap' },
      }
    })
    return {
      chatMsgs: msgs, chatBusy: this.state.chatBusy, icSparkleSm: this.ic('sparkle', 15, '#e8927c'), icSend: this.ic('send', 16),
      ai: this.state.ai, aiPct: Math.round((this.state.ai.progress || 0) * 100), aiLabel: MODEL_LABEL, aiSize: MODEL_APPROX_SIZE, aiEnable: () => this.enableLocalAI(),
      chatSuggest: [
        { text: 'Weakest-margin project?', onClick: () => this.sendChat('Which project has the weakest margin and why?') },
        { text: 'This week’s payroll', onClick: () => this.sendChat('Summarize this week’s payroll totals.') },
        { text: 'Scheduling conflicts', onClick: () => this.sendChat('Are there any scheduling conflicts I should fix?') },
        { text: 'What’s at risk?', onClick: () => this.sendChat('What projects are at risk and why?') },
      ],
      chatInputRef: (el) => { this._chatEl = el }, chatScrollRef: (el) => { this._chatScroll = el },
      onChatKey: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const v = this._chatEl ? this._chatEl.value : ''; if (this._chatEl) this._chatEl.value = ''; this.sendChat(v) } },
      chatSend: () => { const v = this._chatEl ? this._chatEl.value : ''; if (this._chatEl) this._chatEl.value = ''; this.sendChat(v) },
    }
  }

  renderVals() {
    const builders = ['shellVals', 'homeVals', 'projectsVals', 'paintersVals', 'reportsVals', 'payrollVals', 'opsVals', 'scheduleVals', 'integrationsVals', 'assistantVals', 'overlayVals']
    let o = {}
    for (const b of builders) { if (typeof this[b] === 'function') { try { o = Object.assign(o, this[b]() || {}) } catch (e) { console.error('builder', b, e) } } }
    return o
  }

  initials(n) { return n.split(' ').map((s) => s[0]).join('') }
  segBtn(active) {
    const b = { background: 'transparent', border: 0, padding: '4px 11px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }
    return active ? Object.assign({}, b, { background: 'var(--panel-3)', color: 'var(--text)' }) : b
  }

  projectsVals() {
    const q = (this._projQ || '').toLowerCase()
    const st = this._projStatus || 'all'
    const cards = this.db.projects.filter((p) => { if (q && !(p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))) return false; if (st !== 'all' && p.status !== st) return false; return true }).map((p) => {
      const fin = this.projectFinancials(p.id)
      const c = this.colorFor(p.color)
      const mtone = fin.margin >= 0.18 ? 'var(--green)' : fin.margin >= 0.1 ? 'var(--amber)' : 'var(--red)'
      const numBase = { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px' }
      return {
        id: p.id, name: p.name, address: p.address, status: p.status, statusColor: this.statusColor(p.status), color: c.solid,
        revenue: this.fmtMoney(fin.revenue, { compact: true }), cost: this.fmtMoney(fin.totalCost, { compact: true }),
        profit: this.fmtMoney(fin.profit, { compact: true }), profitStyle: Object.assign({}, numBase, { color: fin.profit >= 0 ? 'var(--green)' : 'var(--red)' }),
        margin: (fin.margin * 100).toFixed(0) + '%', marginStyle: Object.assign({}, numBase, { color: mtone }),
        dates: this.fmtDate(p.start) + ' – ' + this.fmtDate(p.end), progressLabel: Math.round(p.progress * 100) + '% complete',
        progressFill: { width: p.progress * 100 + '%', height: '100%', background: c.solid, borderRadius: '999px' },
        onOpen: () => this.openProject(p.id),
      }
    })
    const tabs = ['all', 'In Progress', 'Scheduled', 'At Risk', 'Completed'].map((s) => ({ label: s === 'all' ? 'All' : s, style: this.segBtn(st === s), onClick: () => { this._projStatus = s; this.forceUpdate() } }))
    return { projectCards: cards, projStatusTabs: tabs, onProjSearch: (e) => { this._projQ = e.target.value; this.forceUpdate() }, newProjectToast: () => this.toast('New project — form coming soon') }
  }

  paintersVals() {
    const q = (this._paintQ || '').toLowerCase()
    const crew = this._paintCrew || 'all'
    const rows = this.db.painters.filter((p) => { if (q && !p.name.toLowerCase().includes(q)) return false; if (crew !== 'all' && p.crew !== crew) return false; return true }).map((p) => {
      const stats = this.painterStats(p.id)
      const c = this.colorFor(p.color)
      const ratePer = p.pay.type === 'Hourly' ? '/hr' : p.pay.type === 'Per Day' ? '/day' : p.pay.period === 'monthly' ? '/mo' : '/wk'
      const availColor = p.avail === 'available' ? 'green' : p.avail === 'busy' ? 'amber' : 'default'
      return {
        id: p.id, name: p.name, role: p.role, crew: p.crew, initials: this.initials(p.name),
        avatarStyle: { width: '26px', height: '26px', borderRadius: '50%', background: c.solid, color: '#06080d', fontSize: '10px', fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 },
        payType: p.pay.type, rate: this.fmtMoney(p.pay.rate) + ratePer, hours: stats.totalReg + stats.totalOT + 'h', avail: p.avail, availColor,
        chips: stats.projIds.map((pid) => { const pr = this.db.projects.find((x) => x.id === pid); const cc = this.colorFor(pr.color); return { label: pr.name.split('—')[0].trim(), style: { background: cc.soft, color: cc.text, border: '1px solid ' + cc.line, borderRadius: '999px', padding: '2px 8px', fontSize: '10.5px', fontWeight: 600, whiteSpace: 'nowrap' } } }),
        onOpen: () => this.openPainter(p.id),
      }
    })
    const tabs = ['all', 'Crew A', 'Crew B', 'Crew C'].map((s) => ({ label: s === 'all' ? 'All crews' : s, style: this.segBtn(crew === s), onClick: () => { this._paintCrew = s; this.forceUpdate() } }))
    return { painterRows: rows, paintCrewTabs: tabs, onPaintSearch: (e) => { this._paintQ = e.target.value; this.forceUpdate() }, newPainterToast: () => this.toast('New painter — form coming soon') }
  }

  reportsVals() {
    const defs = [
      ['wallet', 'Payroll by week', 'Weekly hours, gross, net by employee.'],
      ['wallet', 'Payroll by month', 'Month-over-month payroll totals & variance.'],
      ['user', 'Payroll by employee', 'Per-painter payroll history.'],
      ['folder', 'Payroll by project', 'Labor allocated by project & address.'],
      ['pin', 'Payroll by location', 'Hours and labor cost by job site.'],
      ['chart', 'Labor cost by project', 'Burn rate & remaining budget per project.'],
      ['chart', 'Profit & Loss by project', 'Revenue, cost, margin, forecast.'],
      ['tag', 'Change order report', 'Approved, pending, paid CO totals & impact.'],
      ['dollar', 'Expense report', 'Expenses by category, vendor, project.'],
      ['users', 'Painter work history', 'Hours, projects, productivity over time.'],
      ['gantt', 'Project schedule report', 'Schedule status, milestones, blockers.'],
      ['download', 'Gantt timeline export', 'PDF / CSV of the live Gantt.'],
      ['bolt', 'Employee productivity', 'Output, OT ratio, attendance.'],
    ]
    return { reportCards: defs.map((d) => ({ icon: this.ic(d[0], 18), title: d[1], desc: d[2], onView: () => this.toast('Generating "' + d[1] + '"…'), onExport: () => this.toast('Exported "' + d[1] + '" to Google Sheets') })) }
  }

  openForm(type, projectId) { this.setState({ form: { type, projectId } }) }
  closeForm(msg) { this.setState({ form: null }); if (msg) this.toast(msg) }
  miniAvatar(p, size) { const c = this.colorFor(p.color); return { width: size + 'px', height: size + 'px', borderRadius: '50%', background: c.solid, color: '#06080d', fontSize: size * 0.42 + 'px', fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 } }

  payrollVals() {
    if (this.state.view !== 'payroll') return {}
    const rows = this.db.painters.map((p) => {
      const logs = this.allTimeLogs().filter((l) => l.painterId === p.id)
      const reg = logs.reduce((s, l) => s + l.reg, 0)
      const ot = logs.reduce((s, l) => s + l.ot, 0)
      const rate = p.pay.type === 'Hourly' ? p.pay.rate : p.pay.type === 'Per Day' ? p.pay.rate / 8 : 40
      const gross = reg * rate + ot * rate * 1.5
      const ded = Math.round(gross * 0.18)
      const bonus = p.role === 'Lead Painter' || p.role === 'Foreperson' ? 150 : 0
      const net = gross - ded + bonus
      const status = logs.some((l) => l.status === 'Submitted') ? 'Submitted' : 'Approved'
      const proj = this.db.projects.find((pr) => this.allTimeLogs().find((l) => l.painterId === p.id && l.projectId === pr.id))
      return {
        reg, ot, gross, ded, bonus, net, id: p.id, name: p.name, initials: this.initials(p.name), avatarStyle: this.miniAvatar(p, 24),
        payType: p.pay.type, project: proj ? proj.name.split('—')[0].trim() : '—',
        regS: String(reg), otS: ot ? String(ot) : '—', rateS: this.fmtMoney(rate), grossS: this.fmtMoney(gross, { dp: 0 }),
        dedS: '−' + this.fmtMoney(ded), netS: this.fmtMoney(net, { dp: 0 }), status, statusColor: status === 'Approved' ? 'green' : 'blue',
        onOpen: () => this.openPainter(p.id),
      }
    }).filter((r) => r.reg + r.ot > 0)
    const t = rows.reduce((a, r) => { a.reg += r.reg; a.ot += r.ot; a.gross += r.gross; a.ded += r.ded; a.net += r.net; return a }, { reg: 0, ot: 0, gross: 0, ded: 0, net: 0 })
    return {
      payRows: rows, payKpis: [
        { label: 'Reg hours', value: t.reg + 'h', sub: rows.length + ' employees', tone: 'muted' },
        { label: 'Overtime', value: t.ot + 'h', sub: '1.5× after 40', tone: 'amber' },
        { label: 'Gross pay', value: this.fmtMoney(t.gross, { compact: true }), sub: 'before deductions', tone: 'muted' },
        { label: 'Deductions', value: this.fmtMoney(t.ded, { compact: true }), sub: '~18% withholding', tone: 'red' },
        { label: 'Net pay', value: this.fmtMoney(t.net, { compact: true }), sub: 'this cycle', tone: 'green' },
      ], payApprove: () => this.toast('Payroll approved & payment scheduled'), payExport: () => this.toast('Exported payroll to Google Sheets'), payBulk: () => this.openForm('bulk', 'pr1'),
    }
  }

  opsVals() {
    const projName = (id) => { const p = this.db.projects.find((x) => x.id === id); return p ? p.name.split('—')[0].trim() : '—' }
    const coSC = { Approved: 'green', Sent: 'blue', Draft: 'default', Rejected: 'red', Paid: 'purple' }
    const coRows = this.allCOs().map((co) => ({ id: co.id, title: co.title, desc: co.desc, project: projName(co.projectId), requestedBy: co.requestedBy, status: co.status, statusColor: coSC[co.status] || 'default', amount: '+' + this.fmtMoney(co.amount), profit: '+' + this.fmtMoney(co.amount - co.costImpact), date: this.fmtDate(co.date), onOpen: () => this.openProject(co.projectId) }))
    const expRows = this.allExpenses().map((e) => ({ id: e.id, title: e.title, category: e.category, vendor: e.vendor, project: projName(e.projectId), date: this.fmtDate(e.date), amount: this.fmtMoney(e.amount, { dp: 2 }), status: e.status, statusColor: e.status === 'Paid' ? 'green' : 'amber', onOpen: () => this.openProject(e.projectId) }))
    const tlRows = this.allTimeLogs().map((l) => { const p = this.db.painters.find((x) => x.id === l.painterId); return { id: l.id, name: p.name, initials: this.initials(p.name), avatarStyle: this.miniAvatar(p, 22), project: projName(l.projectId), date: this.fmtDate(l.date), reg: String(l.reg), ot: l.ot ? String(l.ot) : '—', notes: l.notes || '—', status: l.status, statusColor: l.status === 'Approved' ? 'green' : l.status === 'Submitted' ? 'blue' : 'default', onOpen: () => this.openPainter(l.painterId) } })
    const addrRows = this.db.projects.map((p) => { const fin = this.projectFinancials(p.id); const c = this.colorFor(p.color); return { id: p.id, address: p.address.split(',')[0], city: p.address.split(',').slice(1).join(',').trim(), name: p.name, color: c.solid, revenue: this.fmtMoney(fin.revenue, { compact: true }), status: p.status, statusColor: this.statusColor(p.status), onOpen: () => this.openProject(p.id) } })
    const coApproved = this.allCOs().filter((c) => c.status === 'Approved').reduce((s, c) => s + c.amount, 0)
    const coPending = this.allCOs().filter((c) => c.status === 'Sent' || c.status === 'Draft').reduce((s, c) => s + c.amount, 0)
    const expTotal = this.allExpenses().reduce((s, e) => s + e.amount, 0)
    const expUnpaid = this.allExpenses().filter((e) => e.status === 'Unpaid').reduce((s, e) => s + e.amount, 0)
    return {
      coRows, expRows, tlRows, addrRows,
      coApprovedS: this.fmtMoney(coApproved), coPendingS: this.fmtMoney(coPending),
      expTotalS: this.fmtMoney(expTotal, { dp: 0 }), expUnpaidS: this.fmtMoney(expUnpaid, { dp: 0 }),
      addCOTop: () => this.openForm('co', this.db.projects[0].id), addExpenseTop: () => this.openForm('expense', this.db.projects[0].id), logHoursTop: () => this.openForm('bulk', 'pr1'),
    }
  }

  toggleConnection(id, name) { const c = Object.assign({}, this.state.connections); c[id] = !c[id]; this.setState({ connections: c }); this.toast((c[id] ? 'Connected ' : 'Disconnected ') + name) }

  integrationsVals() {
    if (this.state.view !== 'integrations') return {}
    const conns = this.state.connections
    const defs = [
      { id: 'sheets', name: 'Google Sheets', cat: 'Spreadsheets', glyph: 'sheet', color: '#22c55e', desc: 'Export payroll, expenses and P&L to live spreadsheets — formulas update on every sync.', caps: ['Payroll export', 'Expenses', 'P&L'] },
      { id: 'drive', name: 'Google Drive', cat: 'File storage', glyph: 'drive', color: '#f5b400', desc: 'Store receipts, job-site photos and signed contracts filed automatically by project.', caps: ['Receipts', 'Photos', 'Contracts'] },
      { id: 'calendar', name: 'Google Calendar', cat: 'Scheduling', glyph: 'calendar', color: '#3b82f6', desc: 'Push the Gantt schedule and milestones to each crew’s calendar with reminders.', caps: ['Schedule', 'Milestones', 'Reminders'] },
      { id: 'gmail', name: 'Gmail', cat: 'Email', glyph: 'mail', color: '#ef4444', desc: 'Send change orders and invoices to clients without leaving Maka OS.', caps: ['Change orders', 'Invoices'] },
      { id: 'claude', name: 'Claude', cat: 'AI assistant', glyph: 'sparkle', color: '#d97757', desc: 'Ask questions and generate summaries across every project, painter and number.', caps: ['Insights', 'Drafting', 'Summaries'] },
      { id: 'quickbooks', name: 'QuickBooks', cat: 'Accounting', glyph: 'dollar', color: '#2ca01c', desc: 'Two-way sync of invoices, expenses and profit straight into your books.', caps: ['Invoices', 'Expenses', 'Books'] },
      { id: 'slack', name: 'Slack', cat: 'Comms', glyph: 'chat', color: '#a855f7', desc: 'Notify crews about schedule changes, approvals and at-risk jobs in real time.', caps: ['Crew alerts', 'Approvals'] },
    ]
    const btnBase = { display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '6px', padding: '5px 12px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }
    const cards = defs.map((d) => {
      const on = !!conns[d.id]
      return {
        id: d.id, name: d.name, cat: d.cat, desc: d.desc, caps: d.caps, icon: this.ic(d.glyph, 19, d.color),
        logoStyle: { width: '38px', height: '38px', borderRadius: '10px', background: d.color + '22', border: '1px solid ' + d.color + '55', display: 'grid', placeItems: 'center', flexShrink: 0 },
        ledStatus: on ? 'ok' : 'idle',
        statusText: on ? 'Connected · synced 2m ago' : 'Not connected',
        statusStyle: { fontSize: '10.5px', fontWeight: 700, color: on ? 'var(--green)' : 'var(--faint)', fontFamily: 'var(--font-mono)' },
        capStyle: { background: 'var(--inset)', border: '1px solid var(--line-soft)', borderRadius: '5px', padding: '2px 7px', fontSize: '10px', color: 'var(--muted)', fontWeight: 600 },
        cardStyle: { background: 'var(--panel)', border: '1px solid var(--line)', borderTop: '3px solid ' + (on ? d.color : 'var(--line)'), borderRadius: '9px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '11px' },
        actionLabel: on ? 'Sync now' : 'Learn more',
        onAction: () => this.toast(on ? 'Synced ' + d.name + ' just now' : d.name + ' — opening setup'),
        toggleLabel: on ? 'Disconnect' : 'Connect',
        toggleStyle: on ? Object.assign({}, btnBase, { background: 'transparent', color: 'var(--muted)', border: '1px solid var(--line)' }) : Object.assign({}, btnBase, { background: 'var(--blue)', color: '#fff', border: '1px solid transparent' }),
        onToggle: () => this.toggleConnection(d.id, d.name),
      }
    })
    const connectedCount = defs.filter((d) => conns[d.id]).length
    return {
      integrationCards: cards, intConnected: String(connectedCount), intTotal: String(defs.length),
      intActivity: [
        { text: 'Exported weekly payroll to Google Sheets', time: '2m ago' },
        { text: 'Saved 3 receipts from Riverside to Drive', time: '1h ago' },
        { text: 'Claude summarized Atlas Tower margin risk', time: '3h ago' },
        { text: 'Synced May schedule to crew calendars', time: 'Today 7:02' },
        { text: 'Emailed CO #4 to Priya Shah', time: 'Yesterday' },
      ],
    }
  }

  openPopover(b, e) { this.setState({ popover: { blockId: b.id, x: e.clientX, y: e.clientY } }) }

  scheduleVals() {
    if (this.state.view !== 'schedule') return {}
    const zoom = this.state.zoom
    const groupBy = this.state.groupBy
    const DAY_W = zoom === 'day' ? 46 : zoom === 'week' ? 30 : 15
    const today = this.db.today
    const start = this.addDays(today, -14)
    const end = this.addDays(today, zoom === 'day' ? 16 : zoom === 'week' ? 35 : 75)
    const totalDays = this.dayDiff(start, end) + 1
    const xFor = (d) => Math.max(0, Math.min(totalDays, this.dayDiff(start, d))) * DAY_W
    const wFor = (s, e) => Math.max(DAY_W, (this.dayDiff(s, e) + 1) * DAY_W)
    const days = []
    for (let i = 0; i < totalDays; i++) {
      const d = this.addDays(start, i)
      const dow = d.getDay()
      const wknd = dow === 0 || dow === 6
      const isT = this.iso(d) === this.iso(today)
      days.push({
        dl: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dow], num: String(d.getDate()),
        cellStyle: { width: DAY_W + 'px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--line-soft)', background: isT ? 'var(--blue-soft)' : wknd ? 'rgba(148,163,184,.05)' : 'transparent', flexShrink: 0 },
        colStyle: { position: 'absolute', top: 0, bottom: 0, left: i * DAY_W + 'px', width: DAY_W + 'px', borderRight: '1px solid var(--line-soft)', background: wknd ? 'rgba(148,163,184,.035)' : 'transparent', pointerEvents: 'none' },
      })
    }
    const months = []
    let cur = null
    for (let i = 0; i < totalDays; i++) { const d = this.addDays(start, i); const key = d.getFullYear() + '-' + d.getMonth(); if (!cur || cur.key !== key) { cur = { key, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), span: 1 }; months.push(cur) } else cur.span++ }
    const monthCols = months.map((m) => ({ label: m.label, style: { width: m.span * DAY_W + 'px', display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '10.5px', fontWeight: 700, color: 'var(--muted)', borderRight: '1px solid var(--line-soft)', whiteSpace: 'nowrap', flexShrink: 0 } }))
    const conflict = new Set()
    const byP = {}
    this.db.blocks.forEach((b) => { (byP[b.painterId] || (byP[b.painterId] = [])).push(b) })
    Object.values(byP).forEach((list) => { for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { if (list[i].end >= list[j].start && list[j].end >= list[i].start) { conflict.add(list[i].id); conflict.add(list[j].id) } } })
    const mkBar = (b, c, label) => ({
      id: b.id,
      style: { position: 'absolute', left: xFor(b.start) + 'px', width: wFor(b.start, b.end) + 'px', top: '6px', bottom: '6px', borderRadius: '6px', background: c.soft, border: '1px solid ' + (conflict.has(b.id) ? 'var(--red)' : c.line), display: 'flex', alignItems: 'center', gap: '5px', padding: '0 8px', cursor: 'pointer', overflow: 'hidden' },
      progStyle: { position: 'absolute', left: 0, top: 0, bottom: 0, width: b.progress * 100 + '%', background: 'rgba(255,255,255,.06)', borderRadius: '6px 0 0 6px' },
      textStyle: { position: 'relative', zIndex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '11px', fontWeight: 600, color: c.text },
      label, conflict: conflict.has(b.id), onClick: (e) => this.openPopover(b, e),
    })
    let rows
    if (groupBy === 'project') {
      rows = this.db.projects.map((p) => {
        const c = this.colorFor(p.color)
        const bars = this.db.blocks.filter((b) => b.projectId === p.id).map((b) => { const pa = this.db.painters.find((x) => x.id === b.painterId); return mkBar(b, c, pa.name.split(' ')[0] + ' · ' + Math.round(b.progress * 100) + '%') })
        const ms = this.db.milestones.filter((m) => m.projectId === p.id).map((m) => { const col = { milestone: 'var(--amber)', deadline: 'var(--red)', change: 'var(--purple)', weather: 'var(--cyan)' }[m.type] || 'var(--amber)'; return { title: m.label, style: { position: 'absolute', left: xFor(m.date) + DAY_W / 2 + 'px', top: '50%', width: '10px', height: '10px', transform: 'translate(-50%,-50%) rotate(45deg)', background: 'var(--panel)', border: '2px solid ' + col, zIndex: 5 } } })
        return { id: p.id, label: p.name, sub: p.address.split(',')[0], swatchStyle: { width: '8px', height: '26px', borderRadius: '3px', background: c.solid, flexShrink: 0 }, bars, milestones: ms, onOpen: () => this.openProject(p.id) }
      })
    } else {
      rows = this.db.painters.map((p) => {
        const c = this.colorFor(p.color)
        const bars = this.db.blocks.filter((b) => b.painterId === p.id).map((b) => { const pr = this.db.projects.find((x) => x.id === b.projectId); return mkBar(b, this.colorFor(pr.color), pr.name.split('—')[0].trim() + ' · ' + Math.round(b.progress * 100) + '%') })
        return { id: p.id, label: p.name, sub: p.role + ' · ' + p.crew, swatchStyle: { width: '8px', height: '26px', borderRadius: '3px', background: c.solid, flexShrink: 0 }, bars, milestones: [], onOpen: () => this.openPainter(p.id) }
      })
    }
    return {
      schDays: days, schMonths: monthCols, schRows: rows,
      schTotalWidth: { width: totalDays * DAY_W + 'px' },
      schTodayStyle: { position: 'absolute', top: 0, bottom: 0, left: xFor(today) + 'px', width: '2px', background: 'var(--blue)', zIndex: 4, boxShadow: '0 0 8px var(--blue)' },
      schLeftHeader: groupBy === 'project' ? 'Projects' : 'Painters',
      schDateLabel: this.fmtDate(start) + ' – ' + this.fmtDate(end),
      schZoomTabs: ['day', 'week', 'month'].map((z) => ({ label: z.charAt(0).toUpperCase() + z.slice(1), style: this.segBtn(zoom === z), onClick: () => this.setState({ zoom: z }) })),
      schGroupTabs: ['project', 'painter'].map((g) => ({ label: 'By ' + g, style: this.segBtn(groupBy === g), onClick: () => this.setState({ groupBy: g }) })),
      schAdd: () => this.toast('Add schedule block — coming soon'),
    }
  }

  spotResults(q) {
    const ql = (q || '').toLowerCase()
    const out = []
    if (!q) return out
    this.db.projects.forEach((p) => { if (p.name.toLowerCase().includes(ql) || p.address.toLowerCase().includes(ql)) out.push({ kind: 'Project', icon: this.ic('folder', 15), title: p.name, sub: p.address.split(',')[0], onPick: () => { this._spotQ = ''; this.openProject(p.id) } }) })
    this.db.painters.forEach((p) => { if (p.name.toLowerCase().includes(ql) || p.role.toLowerCase().includes(ql)) out.push({ kind: 'Painter', icon: this.ic('user', 15), title: p.name, sub: p.role + ' · ' + p.crew, onPick: () => { this._spotQ = ''; this.openPainter(p.id) } }) })
    this.allCOs().forEach((co) => { if (co.title.toLowerCase().includes(ql)) out.push({ kind: 'Change order', icon: this.ic('tag', 15), title: co.title, sub: this.fmtMoney(co.amount), onPick: () => { this._spotQ = ''; this.openProject(co.projectId) } }) })
    this.allExpenses().forEach((e) => { if (e.title.toLowerCase().includes(ql) || e.vendor.toLowerCase().includes(ql)) out.push({ kind: 'Expense', icon: this.ic('dollar', 15), title: e.title, sub: e.vendor + ' · ' + this.fmtMoney(e.amount), onPick: () => { this._spotQ = ''; this.openProject(e.projectId) } }) })
    return out.slice(0, 10)
  }

  drawerTabStyle(active) { return { padding: '9px 12px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', color: active ? 'var(--text)' : 'var(--muted)', borderBottom: '2px solid ' + (active ? 'var(--blue)' : 'transparent'), marginBottom: '-1px' } }

  projDrawerData(p) {
    const fin = this.projectFinancials(p.id)
    const c = this.colorFor(p.color)
    const total = Math.max(fin.totalCost + Math.max(0, fin.profit), fin.revenue) || 1
    const seg = (v, bg) => ({ width: Math.max(0, v) / total * 100 + '%', background: bg, height: '100%' })
    const blocks = this.db.blocks.filter((b) => b.projectId === p.id)
    const painterIds = [...new Set(blocks.map((b) => b.painterId))]
    const logs = this.allTimeLogs().filter((l) => l.projectId === p.id)
    const cos = this.allCOs().filter((x) => x.projectId === p.id)
    const exp = this.allExpenses().filter((e) => e.projectId === p.id)
    const client = this.db.clients.find((cl) => cl.id === p.client)
    const tab = this.state.drawerTab
    const coSC = { Approved: 'green', Sent: 'blue', Draft: 'default', Rejected: 'red', Paid: 'purple' }
    const healthRow = (label, pct, target) => { const v = Math.min(100, Math.max(0, Math.round(pct))); const ok = v >= target; return { label, valText: v + '%', valStyle: { color: ok ? 'var(--green)' : 'var(--amber)', fontFamily: 'var(--font-mono)' }, fillStyle: { width: v + '%', height: '100%', background: ok ? 'var(--green)' : 'var(--amber)', borderRadius: '999px' } } }
    return {
      name: p.name, address: p.address, status: p.status, statusColor: this.statusColor(p.status),
      tabs: ['overview', 'painters', 'change orders', 'expenses', 'activity'].map((t) => ({ label: t.replace(/^./, (ch) => ch.toUpperCase()), onClick: () => this.setState({ drawerTab: t }), style: this.drawerTabStyle(tab === t) })),
      isOverview: tab === 'overview', isPaintersTab: tab === 'painters', isCOTab: tab === 'change orders', isExpTab: tab === 'expenses', isActTab: tab === 'activity',
      stats: [
        { label: 'Contract', value: this.fmtMoney(fin.contract, { compact: true }), valStyle: { fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-mono)' } },
        { label: 'Approved CO', value: this.fmtMoney(fin.approvedCO, { compact: true }), valStyle: { fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-mono)' } },
        { label: 'Revenue', value: this.fmtMoney(fin.revenue, { compact: true }), valStyle: { fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-mono)' } },
        { label: 'Margin', value: (fin.margin * 100).toFixed(1) + '%', valStyle: { fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: fin.margin < 0.15 ? 'var(--red)' : 'var(--green)' } },
      ],
      plSegs: [seg(fin.laborCost, '#2f82ff'), seg(fin.materialCost, '#ffac18'), seg(fin.otherCost, '#a855f7'), seg(Math.max(0, fin.profit), '#20e070')],
      plKvs: [{ l: 'Contract value', v: this.fmtMoney(fin.contract) }, { l: 'Labor cost', v: this.fmtMoney(fin.laborCost, { dp: 0 }) }, { l: 'Approved CO', v: this.fmtMoney(fin.approvedCO) }, { l: 'Material cost', v: this.fmtMoney(fin.materialCost, { dp: 0 }) }, { l: 'Pending CO', v: this.fmtMoney(fin.pendingCO) }, { l: 'Other / equip', v: this.fmtMoney(fin.otherCost, { dp: 0 }) }],
      profit: this.fmtMoney(fin.profit), profitStyle: { fontSize: '23px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: fin.profit >= 0 ? 'var(--green)' : 'var(--red)' },
      forecast: this.fmtMoney(fin.forecastProfit), forecastStyle: { fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: fin.forecastProfit >= 0 ? 'var(--green)' : 'var(--red)' },
      plPillText: fin.margin < 0.15 ? 'Margin below target' : 'On track', plPillColor: fin.margin < 0.15 ? 'amber' : 'green',
      health: [healthRow('Schedule', p.progress * 100, 70), healthRow('Budget', (1 - fin.totalCost / fin.revenue) * 100 + 50, 75), healthRow('Crew load', blocks.length * 12, 70), healthRow('Quality', p.health, 80)],
      clientName: client.name, clientSub: client.contact + ' · ' + client.email,
      painters: painterIds.map((id) => { const pa = this.db.painters.find((x) => x.id === id); const myL = logs.filter((l) => l.painterId === id); const h = myL.reduce((s, l) => s + l.reg + l.ot, 0); const myB = blocks.filter((b) => b.painterId === id); const minD = myB.length ? new Date(Math.min(...myB.map((b) => +b.start))) : null; const maxD = myB.length ? new Date(Math.max(...myB.map((b) => +b.end))) : null; const rate = pa.pay.type === 'Hourly' ? pa.pay.rate : pa.pay.type === 'Per Day' ? pa.pay.rate / 8 : 40; return { id, name: pa.name, initials: this.initials(pa.name), avatarStyle: this.miniAvatar(pa, 24), crew: pa.crew, dates: minD && maxD ? this.fmtDate(minD) + ' – ' + this.fmtDate(maxD) : '—', hours: h + 'h', cost: this.fmtMoney(h * rate), onOpen: () => this.openPainter(id) } }),
      cos: cos.map((co) => ({ title: co.title, desc: co.desc, status: co.status, statusColor: coSC[co.status] || 'default', meta: 'By ' + co.requestedBy + ' · ' + this.fmtDate(co.date), amount: '+' + this.fmtMoney(co.amount), profit: 'profit +' + this.fmtMoney(co.amount - co.costImpact) })),
      exps: exp.map((e) => ({ title: e.title, category: e.category, vendor: e.vendor, date: this.fmtDate(e.date), amount: this.fmtMoney(e.amount, { dp: 2 }), status: e.status, statusColor: e.status === 'Paid' ? 'green' : 'amber' })),
      activity: this.db.activity.filter((a) => a.proj === p.id).map((a) => ({ time: a.t, text: a.text })),
      hasActivity: this.db.activity.filter((a) => a.proj === p.id).length > 0,
      logHours: () => this.openForm('bulk', p.id), addExpense: () => this.openForm('expense', p.id), addCO: () => this.openForm('co', p.id), openClientEmail: () => this.toast('Drafting email to ' + client.contact + ' via Gmail'),
    }
  }

  paintDrawerData(p) {
    const stats = this.painterStats(p.id)
    const c = this.colorFor(p.color)
    const ratePer = p.pay.type === 'Hourly' ? '/hr' : p.pay.type === 'Per Day' ? '/day' : p.pay.period === 'monthly' ? '/mo' : '/wk'
    return {
      name: p.name, sub: p.role + ' · ' + p.crew, initials: this.initials(p.name), bigAvatar: { width: '48px', height: '48px', borderRadius: '50%', background: c.solid, color: '#06080d', fontSize: '18px', fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 },
      phone: p.phone, since: p.start, avail: p.avail, availColor: p.avail === 'available' ? 'green' : p.avail === 'busy' ? 'amber' : 'default',
      stats: [{ label: 'Pay type', value: p.pay.type }, { label: 'Default rate', value: this.fmtMoney(p.pay.rate) + ratePer }, { label: 'Reg hours', value: stats.totalReg + 'h' }, { label: 'Overtime', value: stats.totalOT + 'h' }],
      projects: stats.projIds.map((pid) => { const proj = this.db.projects.find((x) => x.id === pid); const cc = this.colorFor(proj.color); const myL = this.allTimeLogs().filter((l) => l.projectId === pid && l.painterId === p.id); const h = myL.reduce((s, l) => s + l.reg + l.ot, 0); return { id: pid, name: proj.name, addr: proj.address.split(',')[0], swatch: { width: '6px', height: '30px', borderRadius: '3px', background: cc.solid, flexShrink: 0 }, hours: h + 'h', cost: this.fmtMoney(h * (p.pay.type === 'Hourly' ? p.pay.rate : 35)), onOpen: () => this.openProject(pid) } }),
      upcoming: stats.upcoming.map((b) => { const proj = this.db.projects.find((x) => x.id === b.projectId); return { name: proj.name, meta: this.fmtDate(b.start) + ' – ' + this.fmtDate(b.end) + ' · ' + b.hoursPerDay + 'h/day' } }),
      hasUpcoming: stats.upcoming.length > 0,
      logs: this.allTimeLogs().filter((l) => l.painterId === p.id).slice(0, 8).map((l) => { const proj = this.db.projects.find((x) => x.id === l.projectId); return { date: this.fmtDate(l.date), project: proj.name.split('—')[0].trim(), reg: String(l.reg), ot: String(l.ot), status: l.status, statusColor: l.status === 'Approved' ? 'green' : l.status === 'Submitted' ? 'blue' : 'default' } }),
      logHours: () => this.openForm('bulk', 'pr1'), assign: () => this.toast('Assign ' + p.name + ' to a project'),
    }
  }

  overlayVals() {
    const out = { drawerOpen: false, spotlightOpen: this.state.spotlight, popoverOpen: false, formOpen: false }
    out.stop = (e) => { if (e && e.stopPropagation) e.stopPropagation() }
    out.onSpotInput = (e) => { this._spotQ = e.target.value; this.forceUpdate() }
    out.spotResults = this.spotResults(this._spotQ || '')
    out.spotHasResults = out.spotResults.length > 0
    out.closeSpotlight = () => { this._spotQ = ''; this.setState({ spotlight: false }) }
    out.spotInputRef = (el) => { if (el) setTimeout(() => { try { el.focus() } catch (e) {} }, 10) }
    if (this.state.popover) {
      const b = this.db.blocks.find((x) => x.id === this.state.popover.blockId)
      if (b) {
        const proj = this.db.projects.find((p) => p.id === b.projectId)
        const pa = this.db.painters.find((p) => p.id === b.painterId)
        const c = this.colorFor(proj.color)
        out.popoverOpen = true
        out.closePopover = () => this.setState({ popover: null })
        out.popoverStyle = { position: 'fixed', top: Math.min(window.innerHeight - 310, this.state.popover.y + 8) + 'px', left: Math.min(window.innerWidth - 344, this.state.popover.x + 8) + 'px', width: '322px', zIndex: 120 }
        out.pop = {
          projName: proj.name, addr: proj.address.split(',')[0], swatch: { width: '6px', height: '24px', borderRadius: '3px', background: c.solid, flexShrink: 0 },
          kvs: [{ l: 'Painter', v: pa.name }, { l: 'Crew', v: pa.crew }, { l: 'Start', v: this.fmtDate(b.start) }, { l: 'End', v: this.fmtDate(b.end) }, { l: 'Hours/day', v: b.hoursPerDay + 'h' }, { l: 'Progress', v: Math.round(b.progress * 100) + '%' }],
          openProj: () => { this.setState({ popover: null }); this.openProject(proj.id) }, openPainter: () => { this.setState({ popover: null }); this.openPainter(pa.id) },
        }
      }
    }
    if (this.state.form) {
      const f = this.state.form
      const proj = this.db.projects.find((p) => p.id === f.projectId) || this.db.projects[0]
      out.formOpen = true
      out.formType = f.type
      out.formIsCO = f.type === 'co'
      out.formIsExpense = f.type === 'expense'
      out.formIsBulk = f.type === 'bulk'
      out.formTitle = { co: 'New change order', expense: 'Add expense', bulk: 'Bulk log hours' }[f.type]
      out.formSub = proj.name
      out.formProjects = this.db.projects.map((p) => ({ id: p.id, name: p.name, sel: p.id === proj.id }))
      out.formPainters = this.db.painters.map((p) => ({ id: p.id, name: p.name, initials: this.initials(p.name), avatarStyle: this.miniAvatar(p, 22), crew: p.crew, defaultSel: ['p1', 'p2', 'p6'].includes(p.id) }))
      out.closeFormX = () => this.setState({ form: null })
      out.submitForm = () => this.closeForm({ co: 'Change order sent to client', expense: 'Expense added', bulk: 'Hours logged for selected employees' }[f.type])
      out.formPrimary = { co: 'Send to client', expense: 'Save expense', bulk: 'Submit entries' }[f.type]
    }
    const dr = this.state.drawer
    if (dr && dr.type === 'project') { const p = this.db.projects.find((x) => x.id === dr.id); if (p) { out.drawerOpen = true; out.isProjDrawer = true; out.projD = this.projDrawerData(p); out.closeDrawerX = () => this.setState({ drawer: null }) } }
    if (dr && dr.type === 'painter') { const p = this.db.painters.find((x) => x.id === dr.id); if (p) { out.drawerOpen = true; out.isPaintDrawer = true; out.paintD = this.paintDrawerData(p); out.closeDrawerX = () => this.setState({ drawer: null }) } }
    return out
  }

  render() {
    const v = this.renderVals()
    return (
      <div style={css('display:grid;grid-template-columns:238px 1fr;height:100vh;width:100vw;background:var(--bg);color:var(--text);font-family:var(--font-ui);font-size:13px;overflow:hidden')}>
        <Sidebar v={v} />
        <main style={css('display:flex;flex-direction:column;min-width:0;min-height:0;position:relative')}>
          <Topbar v={v} />
          {v.showBanner && <SafetyBanner v={v} />}
          <section style={css('flex:1;overflow:auto;min-height:0;position:relative')} data-screen-label={v.crumb.label}>
            {v.isHome && <HomeScreen v={v} />}
            {v.isSchedule && <ScheduleScreen v={v} />}
            {v.isProjects && <ProjectsScreen v={v} />}
            {v.isPainters && <PaintersScreen v={v} />}
            {v.isMacPainters && <MacPaintersScreen />}
            {v.isReports && <ReportsScreen v={v} />}
            {v.isPayroll && <PayrollScreen v={v} />}
            {v.isChangeOrders && <ChangeOrdersScreen v={v} />}
            {v.isExpenses && <ExpensesScreen v={v} />}
            {v.isTimeLogs && <TimeLogsScreen v={v} />}
            {v.isAddresses && <AddressesScreen v={v} />}
            {v.isIntegrations && <IntegrationsScreen v={v} />}
            {v.isAssistant && <AssistantScreen v={v} />}
          </section>
        </main>

        {v.spotlightOpen && <Spotlight v={v} />}
        {v.popoverOpen && <Popover v={v} />}
        {v.drawerOpen && <DrawerHost v={v} />}
        {v.formOpen && <FormDrawer v={v} />}
        {v.toast && <ToastBar v={v} />}
      </div>
    )
  }
}
