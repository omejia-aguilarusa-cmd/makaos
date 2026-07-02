// Maka OS UI sweep — visits every screen, exercises key interactions, and
// reports console errors / broken features. Run: node scripts/ui-sweep.mjs
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:4173'
const SHOT = '/tmp/claude-0/-home-user-makaos/9f8cd4b0-a0ab-5b0a-afd0-af2e91c9d5f5/scratchpad/shots'
import { mkdirSync } from 'fs'
mkdirSync(SHOT, { recursive: true })

const findings = []
const note = (sev, what) => { findings.push({ sev, what }); console.log(`[${sev}] ${what}`) }

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

page.on('pageerror', (err) => note('JS-ERROR', 'pageerror: ' + err.message))
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    const t = msg.text()
    if (t.includes('/api/')) return // expected: no serverless backend under vite preview
    note('CONSOLE-ERROR', t.slice(0, 300))
  }
})

const nav = (label) => page.locator('aside').getByText(label, { exact: true }).first()
const go = async (label) => { await nav(label).click(); await page.waitForTimeout(400) }
const shot = (name) => page.screenshot({ path: `${SHOT}/${name}.png` })

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

// ---- 1. every nav view renders -------------------------------------------
const views = ['Dashboard', 'Schedule', 'Projects', 'Painters', 'Payroll', 'Reports', 'Change orders', 'Expenses', 'Time logs', 'Addresses', 'Integrations', 'Assistant']
for (const vw of views) {
  try {
    await go(vw)
    const body = await page.locator('main section').innerText().catch(() => '')
    if (!body || body.trim().length < 10) note('BROKEN', `view "${vw}" renders empty`)
    await shot('view-' + vw.replace(/\s+/g, '-').toLowerCase())
  } catch (e) { note('BROKEN', `cannot open view "${vw}": ${e.message.slice(0, 120)}`) }
}

// ---- 2. theme toggle -------------------------------------------------------
await go('Dashboard')
const themeBtn = page.locator('header button[title*="mode"]')
if (await themeBtn.count() === 0) note('BROKEN', 'theme toggle button not found')
else {
  await themeBtn.click(); await page.waitForTimeout(300)
  const t = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  if (t !== 'light') note('BROKEN', 'theme toggle did not switch to light (data-theme=' + t + ')')
  await shot('light-dashboard')
  await go('Schedule'); await shot('light-schedule')
  await go('Projects'); await shot('light-projects')
  await themeBtn.click(); await page.waitForTimeout(200)
}

// ---- 3. Gantt interactions -------------------------------------------------
await go('Schedule'); await page.waitForTimeout(400)
const ganttRows = await page.locator('main section >> text=/\\d+ projects/').count()
if (!ganttRows) note('BROKEN', 'Gantt header row-count label missing (Gantt may not be default)')
for (const z of ['Day', 'Month', 'Week']) {
  await page.getByRole('button', { name: z, exact: true }).first().click().catch(() => note('BROKEN', 'Gantt zoom button ' + z + ' missing'))
  await page.waitForTimeout(150)
}
// drag an actual bar to create a plan
const bar = page.locator('div[title*="drag to create a plan"]').first()
if (await bar.count() === 0) note('WARN', 'no unplanned bar found to drag (may all be planned)')
else {
  const bb = await bar.boundingBox()
  if (bb) {
    await page.mouse.move(bb.x + Math.min(30, bb.width / 2), bb.y + bb.height / 2)
    await page.mouse.down()
    await page.mouse.move(bb.x + Math.min(30, bb.width / 2) + 40, bb.y + bb.height / 2, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(400)
    const saved = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('makaos.edits.v1') || '{}'); return Object.keys(s.schedule || {}).length })
    if (!saved) note('BROKEN', 'Gantt drag did not persist a plan to the schedule overlay')
    else console.log('  gantt drag persisted plans:', saved)
    await shot('gantt-after-drag')
  }
}
// click a project name → daily painters drawer
await page.locator('main section span[title^="View daily painters"]').first().click()
await page.waitForTimeout(400)
if (await page.getByText('Planned start', { exact: true }).count() === 0) note('BROKEN', 'Gantt project-name click did not open the daily painters drawer')
await page.keyboard.press('Escape'); await page.waitForTimeout(200)

// ---- 4. Projects: card -> drawer -> tabs -> edit ---------------------------
await go('Projects'); await page.waitForTimeout(400)
const card = page.locator('main section div[style*="cursor: pointer"]').filter({ hasText: 'Revenue' }).first()
if (await card.count() === 0) note('BROKEN', 'no project cards on Projects')
else {
  await card.click(); await page.waitForTimeout(400)
  const drawer = page.locator('aside[aria-modal="true"]')
  for (const tab of ['Painters', 'Change orders', 'Expenses', 'Timeline', 'Activity', 'Overview']) {
    const t = drawer.getByText(tab, { exact: true }).first()
    if (await t.count() === 0) note('BROKEN', 'project drawer tab missing: ' + tab)
    else { await t.click().catch(() => note('BROKEN', 'project drawer tab unclickable: ' + tab)); await page.waitForTimeout(150) }
  }
  await drawer.getByText('Edit details', { exact: true }).click().catch(() => note('BROKEN', 'Edit details button missing in project drawer'))
  await page.waitForTimeout(200)
  await shot('project-drawer')
  await page.keyboard.press('Escape'); await page.waitForTimeout(200)
}

// ---- 5. Payroll: row -> drawer -> receipt -----------------------------------
await go('Payroll'); await page.waitForTimeout(400)
await page.locator('main section tbody tr').first().click(); await page.waitForTimeout(400)
const drawerOpen = await page.locator('aside[role="dialog"], aside').filter({ hasText: 'Receipt' }).count()
if (!drawerOpen) note('BROKEN', 'Payroll row click did not open drawer with Receipt button')
else {
  await page.getByText('🧾 Receipt', { exact: false }).first().click().catch(() => {})
  await page.waitForTimeout(400)
  await shot('receipt')
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
}

// ---- 6. Reports: View opens preview modal -----------------------------------
await go('Reports'); await page.waitForTimeout(300)
await page.getByRole('button', { name: 'View', exact: true }).first().click()
await page.waitForTimeout(400)
if (await page.getByText(/rows · showing first/).count() === 0) note('BROKEN', 'Reports View did not open the preview modal')
await page.keyboard.press('Escape'); await page.waitForTimeout(200)

// ---- 7. Time logs: add form + sheets chip -----------------------------------
await go('Time logs'); await page.waitForTimeout(300)
await page.getByRole('button', { name: '+ Add time log' }).click()
await page.waitForTimeout(200)
if (await page.getByText('New time log', { exact: true }).count() === 0) note('BROKEN', 'Add time log form did not open')
const chip = page.locator('button', { hasText: 'Sheets' }).first()
if (await chip.count() === 0) note('BROKEN', 'Sheets sync chip missing on Time logs')

// ---- 8. Expenses: add + persists --------------------------------------------
await go('Expenses'); await page.waitForTimeout(300)
await page.getByRole('button', { name: '+ Add expense' }).first().click(); await page.waitForTimeout(300)
await page.getByPlaceholder('Sherwin-Williams — premium primer').fill('UI sweep test expense')
await page.locator('div[role="dialog"] input[inputmode="decimal"]').first().fill('123')
await page.locator('div[role="dialog"]').getByRole('button', { name: 'Save', exact: true }).click()
await page.waitForTimeout(300)
if (await page.getByText('UI sweep test expense').count() === 0) note('BROKEN', 'saved expense does not appear in the table')

// ---- 9. Spotlight ------------------------------------------------------------
await page.keyboard.press('Control+k'); await page.waitForTimeout(300)
const spot = page.getByPlaceholder(/Search/i).last()
if (await spot.count() === 0) note('BROKEN', 'Spotlight did not open on Ctrl+K')
else {
  await spot.fill('delmont'); await page.waitForTimeout(300)
  if (await page.getByText('432 Delmont', { exact: false }).count() === 0) note('BROKEN', 'Spotlight found no results for "delmont"')
  await page.keyboard.press('Escape')
}

// ---- 10. Assistant sends + replies -------------------------------------------
await go('Assistant'); await page.waitForTimeout(300)
const ta = page.locator('textarea')
await ta.fill('Who has the most hours?')
await ta.press('Enter')
await page.waitForTimeout(1200)
const msgs = await page.locator('main section').innerText()
if (!/most hours/.test(msgs) || msgs.trim().length < 80) note('BROKEN', 'Assistant did not reply to a chat message')
await shot('assistant')

console.log('\n=== SWEEP DONE ===')
console.log(JSON.stringify(findings, null, 1))
await browser.close()
