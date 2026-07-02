import { chromium } from 'playwright-core'
const SHOT='/tmp/claude-0/-home-user-makaos/9f8cd4b0-a0ab-5b0a-afd0-af2e91c9d5f5/scratchpad/shots'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:4173', { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
await p.locator('header button[title*="mode"]').click(); await p.waitForTimeout(400)
const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor)
console.log('body bg after toggle:', bg, '(want light ~ rgb(238,241,246))')
await p.screenshot({ path: SHOT + '/light2-dashboard.png' })
await p.locator('aside').getByText('Schedule', { exact: true }).click(); await p.waitForTimeout(500)
await p.screenshot({ path: SHOT + '/light2-schedule.png' })
await p.locator('aside').getByText('Payroll', { exact: true }).click(); await p.waitForTimeout(500)
await p.screenshot({ path: SHOT + '/light2-payroll.png' })
await p.locator('aside').getByText('Integrations', { exact: true }).click(); await p.waitForTimeout(500)
await p.screenshot({ path: SHOT + '/light2-integrations.png' })
// notifications bell
await p.locator('header button[title="Notifications"]').click(); await p.waitForTimeout(300)
await p.screenshot({ path: SHOT + '/notif-popover.png' })
await b.close()
