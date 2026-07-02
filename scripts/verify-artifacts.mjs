import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' })
const p = await b.newPage()
const misses = []
p.on('response', (r) => { if (r.status() === 404) misses.push(r.url()) })
await p.goto('http://localhost:4173', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200)
console.log('404 urls:', JSON.stringify(misses))
// drawer tab check with count-tolerant matcher
await p.locator('aside').getByText('Projects', { exact: true }).first().click(); await p.waitForTimeout(400)
await p.locator('main section div[style*="cursor: pointer"]').filter({ hasText: 'Revenue' }).first().click(); await p.waitForTimeout(400)
const tabs = await p.locator('aside[aria-modal="true"] div').filter({ hasText: /^Painters\s*\d*$/ }).count()
console.log('Painters tab present (count-tolerant):', tabs > 0)
await b.close()
