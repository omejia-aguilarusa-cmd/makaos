import React from 'react'
import { css } from './lib/css.js'
import { isWebGPUAvailable, loadEngine, streamChat, MODEL_LABEL, MODEL_APPROX_SIZE } from './lib/localAI.js'
import { Sidebar, Topbar, ToastBar } from './ui/Shell.jsx'
import DashboardScreen from './screens/DashboardScreen.jsx'
import ScheduleScreen from './screens/ScheduleScreen.jsx'
import ProjectsScreen from './screens/ProjectsScreen.jsx'
import PayrollScreen from './screens/PayrollScreen.jsx'
import TimeLogsScreen from './screens/TimeLogsScreen.jsx'
import IntegrationsScreen from './screens/IntegrationsScreen.jsx'
import AssistantScreen from './screens/AssistantScreen.jsx'
import { MAC_PAINTERS } from './lib/macPainters.js'
import { payroll, money, META, siteCount } from './lib/macPayroll.js'
import { subscribeEdits } from './lib/edits.js'
import Spotlight from './overlays/Spotlight.jsx'

// Maka OS — operations console for a commercial painting contractor.
//
// The controller holds app state (current view, integration connections, the
// copilot chat, the on-device AI engine) and builds the view-models the shell,
// spotlight, integrations and assistant screens render. The data-heavy screens
// (Dashboard, Schedule, Mac Painters, Payroll, Time Logs) read the real merged
// payroll directly from src/lib/macPayroll.js and manage their own local state.

export default class App extends React.Component {
  static defaultProps = { accent: '#2f82ff', safetyBanner: false, defaultView: 'home' }

  constructor(props) {
    super(props)
    this.KEY = 'makaos.dark.v1'
    const s = this.load()
    this.state = {
      view: s.view || (props.defaultView || 'home'),
      connections: s.connections || { sheets: true, drive: true, calendar: false, gmail: false, claude: true, quickbooks: false, slack: false },
      chat: s.chat || [{ role: 'assistant', text: "I'm your Mac Painters copilot. Ask me about hours, wages, who's shared between Darwin and Mauricio, or any painter on the crew." }],
      spotlight: false,
      toast: null, chatBusy: false,
      // On-device AI engine (WebLLM). 'idle' until the user turns it on.
      ai: { status: isWebGPUAvailable() ? 'idle' : 'unsupported', progress: 0, note: '' },
    }
  }

  // ---------- persistence ----------
  load() { try { return JSON.parse(localStorage.getItem(this.KEY)) || {} } catch (e) { return {} } }
  persist() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({
        view: this.state.view, connections: this.state.connections, chat: this.state.chat,
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
      if (e.key === 'Escape') this.setState({ spotlight: false })
    }
    window.addEventListener('keydown', this._key)
    // Re-render the shell (nav badge, subtitles) when the edit overlay changes.
    this._unsubEdits = subscribeEdits(() => this.forceUpdate())
  }
  componentWillUnmount() { window.removeEventListener('keydown', this._key); if (this._unsubEdits) this._unsubEdits() }

  // ---------- icons ----------
  ic(name, size, color) {
    const defs = {
      home: [['path', { d: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z' }]],
      folder: [['path', { d: 'M3.5 7.5a2 2 0 0 1 2-2h3.5l2 2h7.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z' }]],
      gantt: [['rect', { x: 3.5, y: 6, width: 9, height: 3, rx: 1.2 }], ['rect', { x: 7.5, y: 11, width: 11, height: 3, rx: 1.2 }], ['rect', { x: 5.5, y: 16, width: 8, height: 3, rx: 1.2 }]],
      users: [['circle', { cx: 9, cy: 9, r: 3 }], ['path', { d: 'M3.5 19a5.5 5.5 0 0 1 11 0' }], ['circle', { cx: 16, cy: 8, r: 2.4 }], ['path', { d: 'M14.5 13.5A4.5 4.5 0 0 1 20.5 18' }]],
      user: [['circle', { cx: 12, cy: 9, r: 3.5 }], ['path', { d: 'M5 19.5a7 7 0 0 1 14 0' }]],
      wallet: [['rect', { x: 3.5, y: 6.5, width: 17, height: 12, rx: 2.5 }], ['path', { d: 'M16 12.5h2.5' }], ['path', { d: 'M3.5 9.5h13.5a2 2 0 0 1 0 4H3.5' }]],
      pin: [['path', { d: 'M12 2.5c3.5 0 6 2.5 6 6 0 4.5-6 12-6 12s-6-7.5-6-12c0-3.5 2.5-6 6-6z' }], ['circle', { cx: 12, cy: 9, r: 2.2 }]],
      search: [['circle', { cx: 11, cy: 11, r: 6 }], ['path', { d: 'M16 16l4 4' }]],
      close: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
      clock: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M12 7v5l3 2' }]],
      dollar: [['path', { d: 'M12 4v16' }], ['path', { d: 'M16 8a3 3 0 0 0-3-2h-2.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5h-3a3 3 0 0 1-3-2' }]],
      send: [['path', { d: 'M21 4L3 11l7 3 3 7z' }], ['path', { d: 'M10 14l11-10' }]],
      inbox: [['path', { d: 'M4 13l3-8h10l3 8v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z' }], ['path', { d: 'M4 13h5l1 2h4l1-2h5' }]],
      calendar: [['rect', { x: 3.5, y: 5, width: 17, height: 15, rx: 2.5 }], ['path', { d: 'M3.5 9.5h17' }], ['path', { d: 'M8 3v4M16 3v4' }]],
      plug: [['path', { d: 'M9 3v5M15 3v5' }], ['path', { d: 'M7 8h10v3a5 5 0 0 1-10 0z' }], ['path', { d: 'M12 16v5' }]],
      sparkle: [['path', { d: 'M12 3l1.7 4.8L18.5 9.5 13.7 11.2 12 16l-1.7-4.8L5.5 9.5 10.3 7.8z' }], ['path', { d: 'M18 14.5l.8 2.2L21 17.5l-2.2.8L18 20.5l-.8-2.2L15 17.5l2.2-.8z' }]],
      activity: [['path', { d: 'M3 12h4l2.5 7 5-14L17 12h4' }]],
      grid: [['rect', { x: 4, y: 4, width: 7, height: 7, rx: 1.5 }], ['rect', { x: 13, y: 4, width: 7, height: 7, rx: 1.5 }], ['rect', { x: 4, y: 13, width: 7, height: 7, rx: 1.5 }], ['rect', { x: 13, y: 13, width: 7, height: 7, rx: 1.5 }]],
      sheet: [['rect', { x: 4, y: 3.5, width: 16, height: 17, rx: 2 }], ['path', { d: 'M4 9h16M4 14h16M10 3.5v17' }]],
      drive: [['path', { d: 'M9 4h6l5 9H14z' }], ['path', { d: 'M9 4L4 13l3 5 5-9z' }], ['path', { d: 'M7 18h10l3-5H10z' }]],
      mail: [['rect', { x: 3.5, y: 5.5, width: 17, height: 13, rx: 2 }], ['path', { d: 'M4 7.5l8 5.5 8-5.5' }]],
      chat: [['path', { d: 'M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4V6a1 1 0 0 1 1-1z' }]],
    }
    const p = defs[name] || [['circle', { cx: 12, cy: 12, r: 6 }]]
    return React.createElement(
      'svg',
      { width: size || 16, height: size || 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', style: { color: color || 'currentColor', display: 'block' } },
      p.map((t, i) => React.createElement(t[0], Object.assign({ key: i }, t[1]))),
    )
  }

  // ---------- actions ----------
  setView(v) { this.setState({ view: v, spotlight: false }) }
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
    const conns = this.state.connections
    const connectedCount = Object.values(conns).filter(Boolean).length
    const labels = { home: 'Dashboard', schedule: 'Schedule', projects: 'Projects', payroll: 'Payroll', 'time-logs': 'Time Logs', integrations: 'Integrations', assistant: 'Assistant' }
    const subs = {
      home: MAC_PAINTERS.meta.employeeCount + ' painters · Darwin + Mauricio · ' + MAC_PAINTERS.meta.shared + ' shared',
      schedule: 'Work timeline · ' + MAC_PAINTERS.meta.dateMin + ' → ' + MAC_PAINTERS.meta.dateMax,
      projects: siteCount() + ' job sites · ' + MAC_PAINTERS.meta.dateMin + ' → ' + MAC_PAINTERS.meta.dateMax,
      payroll: MAC_PAINTERS.meta.employeeCount + ' employees · Darwin + Mauricio · ' + MAC_PAINTERS.meta.shared + ' shared',
      'time-logs': MAC_PAINTERS.meta.entryCount.toLocaleString('en-US') + ' entries',
      integrations: connectedCount + ' of 7 connected',
    }
    return {
      navMain: [
        this.navItem('home', 'Dashboard', 'home'),
        this.navItem('schedule', 'Schedule', 'gantt'),
        this.navItem('projects', 'Projects', 'folder', siteCount()),
        this.navItem('payroll', 'Payroll', 'wallet', MAC_PAINTERS.meta.employeeCount),
        this.navItem('time-logs', 'Time logs', 'clock'),
      ],
      navWork: [
        Object.assign(this.navItem('integrations', 'Integrations', 'plug'), { hasDot: connectedCount > 0 }),
        Object.assign(this.navItem('assistant', 'Assistant', 'sparkle'), { hasDot: !!conns.claude }),
      ],
      crumb: { label: labels[v] || 'Mac Painters', sub: subs[v] || '' },
      isHome: v === 'home', isSchedule: v === 'schedule', isProjects: v === 'projects', isPayroll: v === 'payroll', isTimeLogs: v === 'time-logs', isIntegrations: v === 'integrations', isAssistant: v === 'assistant',
      connectedCount, syncSummary: MAC_PAINTERS.meta.employeeCount + ' painters · ' + MAC_PAINTERS.meta.entryCount.toLocaleString('en-US') + ' entries', syncTime: 'imported',
      icSearch: this.ic('search', 14), icGrid: this.ic('grid', 14), icSparkle: this.ic('sparkle', 14), icInbox: this.ic('inbox', 16), icActivity: this.ic('activity', 14), icPin: this.ic('pin', 16), icGridBig: this.ic('grid', 20), icClose: this.ic('close', 15),
      openSpotlight: () => this.setState({ spotlight: true }),
      openAssistant: () => this.setView('assistant'),
      goIntegrations: () => this.setView('integrations'),
      toast: this.state.toast,
    }
  }

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
    const a = payroll('both', META.dateMin, META.dateMax, {})
    const dar = payroll('darwin', META.dateMin, META.dateMax, {})
    const mau = payroll('mauricio', META.dateMin, META.dateMax, {})
    const top = [...a.rows].sort((x, y) => y.hours - x.hours).slice(0, 10)
    const L = []
    L.push('You are the Mac Painters operations copilot. Mac Painters is ONE painting company run by two partners — Darwin and Mauricio — who share and borrow painters across jobs. Answer ONLY from the data below, concise and operator-to-operator, with specific hours and $. No markdown headers.')
    L.push('PERIOD: ' + META.dateMin + ' to ' + META.dateMax + '. The operator is Oscar Mejia, Business Manager.')
    L.push('TOTALS: ' + a.rows.length + ' painters logged (' + a.totals.shared + ' worked for both partners), ' + Math.round(a.totals.hours) + ' hours, wages ' + money(a.totals.wages) + ', subcontractor contract billing ' + money(a.totals.billing) + '.')
    L.push('DARWIN: ' + dar.rows.length + ' painters, ' + Math.round(dar.totals.hours) + 'h, wages ' + money(dar.totals.wages) + ', billing ' + money(dar.totals.billing) + '.')
    L.push('MAURICIO: ' + mau.rows.length + ' painters, ' + Math.round(mau.totals.hours) + 'h, wages ' + money(mau.totals.wages) + ', billing ' + money(mau.totals.billing) + '.')
    L.push('TOP PAINTERS BY HOURS: ' + top.map((r) => r.name + ' (' + Math.round(r.hours) + 'h, ' + r.payType + (r.rate != null ? ' $' + r.rate : '') + ', ' + r.teamsIn.join('+') + ')').join('; ') + '.')
    L.push('"Wages" = hourly/per-day/fixed labor; "contract billing" = whole-job values logged under subcontractors (not hourly pay).')
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
    const a = payroll('both', META.dateMin, META.dateMax, {})
    const byHours = [...a.rows].sort((x, y) => y.hours - x.hours)
    const tn = (t) => (t === 'darwin' ? 'Darwin' : 'Mauricio')
    if (ql.includes('most') || ql.includes('top') || ql.includes('hardest') || (ql.includes('hours') && !ql.includes('how many'))) {
      const t = byHours[0]
      return t.name + ' has the most hours — ' + Math.round(t.hours) + 'h (' + t.payType + (t.rate != null ? ' at $' + t.rate : '') + '), working for ' + t.teamsIn.map(tn).join(' and ') + '. Next: ' + byHours.slice(1, 4).map((r) => r.name + ' (' + Math.round(r.hours) + 'h)').join(', ') + '.'
    }
    if (ql.includes('shared') || ql.includes('borrow') || ql.includes('both')) {
      const sh = byHours.filter((r) => r.teamsIn.length > 1)
      return sh.length + ' painters worked for both Darwin and Mauricio — the shared/borrowed crew. By hours: ' + sh.slice(0, 6).map((r) => r.name).join(', ') + '.'
    }
    if (ql.includes('contract') || ql.includes('subcontract') || ql.includes('billing')) {
      const c = a.rows.filter((r) => r.category === 'contract').sort((x, y) => y.total - x.total)
      return 'Contract billing totals ' + money(a.totals.billing) + ' across ' + c.length + ' subcontractors — biggest: ' + c.slice(0, 4).map((r) => r.name + ' (' + money(r.total) + ')').join(', ') + '. These are whole-job values, not hourly wages.'
    }
    if (ql.includes('darwin') || ql.includes('mauricio')) {
      const team = ql.includes('darwin') ? 'darwin' : 'mauricio'
      const r = payroll(team, META.dateMin, META.dateMax, {})
      return tn(team) + ' has ' + r.rows.length + ' painters logged, ' + Math.round(r.totals.hours) + ' hours, wages ' + money(r.totals.wages) + ' and contract billing ' + money(r.totals.billing) + '. Top by hours: ' + [...r.rows].sort((x, y) => y.hours - x.hours).slice(0, 3).map((x) => x.name).join(', ') + '.'
    }
    if (ql.includes('wage') || ql.includes('pay') || ql.includes('payroll') || ql.includes('how much')) {
      const dar = payroll('darwin', META.dateMin, META.dateMax, {}), mau = payroll('mauricio', META.dateMin, META.dateMax, {})
      return 'Across both partners, wage crew earned ' + money(a.totals.wages) + ' over ' + Math.round(a.totals.hours) + ' hours, plus ' + money(a.totals.billing) + ' in subcontractor contract billing. Darwin wages ' + money(dar.totals.wages) + ', Mauricio wages ' + money(mau.totals.wages) + '. Use the Payroll screen to scope a team + pay period.'
    }
    for (const r of byHours) {
      const first = r.name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')
      if (first.length > 2 && ql.includes(first)) {
        return r.name + ' — ' + r.role + ', ' + r.payType + (r.rate != null ? ' at $' + r.rate : '') + ', worked for ' + r.teamsIn.map(tn).join(' and ') + '. ' + Math.round(r.hours) + ' hours across ' + r.n + ' entries' + (r.category === 'wage' ? ', est. wages ' + money(r.est) : ', contract billing ' + money(r.total)) + '.'
      }
    }
    return 'I read the merged Mac Painters payroll — ' + a.rows.length + ' painters, ' + Math.round(a.totals.hours) + ' hours, ' + a.totals.shared + ' shared between Darwin and Mauricio. Try: "who has the most hours?", "how much in wages?", "who is shared?", or ask about a painter by name.'
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
        { text: 'Who has the most hours?', onClick: () => this.sendChat('Who has the most hours?') },
        { text: 'Total wages?', onClick: () => this.sendChat('How much did we pay in wages?') },
        { text: 'Who is shared?', onClick: () => this.sendChat('Which painters are shared between Darwin and Mauricio?') },
        { text: 'Contract billing?', onClick: () => this.sendChat('How much contract billing, and who?') },
      ],
      chatInputRef: (el) => { this._chatEl = el }, chatScrollRef: (el) => { this._chatScroll = el },
      onChatKey: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const v = this._chatEl ? this._chatEl.value : ''; if (this._chatEl) this._chatEl.value = ''; this.sendChat(v) } },
      chatSend: () => { const v = this._chatEl ? this._chatEl.value : ''; if (this._chatEl) this._chatEl.value = ''; this.sendChat(v) },
    }
  }

  renderVals() {
    const builders = ['shellVals', 'integrationsVals', 'assistantVals', 'overlayVals']
    let o = {}
    for (const b of builders) { if (typeof this[b] === 'function') { try { o = Object.assign(o, this[b]() || {}) } catch (e) { console.error('builder', b, e) } } }
    return o
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
    // Static sample feed for the demo workspace. Gated by intHasActivity so the
    // screen can show an empty state when there's nothing to show.
    const intActivity = [
      { text: 'Exported weekly payroll to Google Sheets', time: '2m ago' },
      { text: 'Saved 3 receipts from Riverside to Drive', time: '1h ago' },
      { text: 'Claude summarized Atlas Tower margin risk', time: '3h ago' },
      { text: 'Synced May schedule to crew calendars', time: 'Today 7:02' },
      { text: 'Emailed CO #4 to Priya Shah', time: 'Yesterday' },
    ]
    return {
      integrationCards: cards, intConnected: String(connectedCount), intTotal: String(defs.length),
      intActivity, intHasActivity: intActivity.length > 0,
    }
  }

  spotResults(q) {
    const ql = (q || '').toLowerCase().trim()
    const out = []
    if (!ql) return out
    const tn = (t) => (t === 'darwin' ? 'Darwin' : 'Mauricio')
    for (const e of MAC_PAINTERS.employees) {
      if (e.name.toLowerCase().includes(ql) || (e.variants || []).some((v) => v.toLowerCase().includes(ql)) || (e.role || '').toLowerCase().includes(ql)) {
        out.push({ kind: 'Painter', icon: this.ic('user', 15), title: e.name + (e.you ? ' (You)' : ''), sub: (e.role || '') + ' · ' + (e.teams || []).map(tn).join(' + '), onPick: () => { this._spotQ = ''; this.setView('payroll') } })
      }
    }
    return out.slice(0, 10)
  }

  overlayVals() {
    const out = { spotlightOpen: this.state.spotlight }
    out.stop = (e) => { if (e && e.stopPropagation) e.stopPropagation() }
    out.onSpotInput = (e) => { this._spotQ = e.target.value; this.forceUpdate() }
    out.spotResults = this.spotResults(this._spotQ || '')
    out.spotHasResults = out.spotResults.length > 0
    out.closeSpotlight = () => { this._spotQ = ''; this.setState({ spotlight: false }) }
    out.spotInputRef = (el) => { if (el) setTimeout(() => { try { el.focus() } catch (e) {} }, 10) }
    return out
  }

  render() {
    const v = this.renderVals()
    return (
      <div style={css('display:grid;grid-template-columns:238px 1fr;height:100vh;width:100vw;background:var(--bg);color:var(--text);font-family:var(--font-ui);font-size:13px;overflow:hidden')}>
        <Sidebar v={v} />
        <main style={css('display:flex;flex-direction:column;min-width:0;min-height:0;position:relative')}>
          <Topbar v={v} />
          <section style={css('flex:1;overflow:auto;min-height:0;position:relative')} data-screen-label={v.crumb.label}>
            {v.isHome && <DashboardScreen onGo={(view) => this.setView(view)} />}
            {v.isSchedule && <ScheduleScreen />}
            {v.isProjects && <ProjectsScreen />}
            {v.isPayroll && <PayrollScreen />}
            {v.isTimeLogs && <TimeLogsScreen />}
            {v.isIntegrations && <IntegrationsScreen v={v} />}
            {v.isAssistant && <AssistantScreen v={v} />}
          </section>
        </main>

        {v.spotlightOpen && <Spotlight v={v} />}
        {v.toast && <ToastBar v={v} />}
      </div>
    )
  }
}
