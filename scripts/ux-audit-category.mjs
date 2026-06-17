import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3000'
const OUT = 'audit-screenshots'
const bps = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
]
const browser = await chromium.launch()
for (const bp of bps) {
  const ctx = await browser.newContext({ viewport: { width: bp.width, height: bp.height } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/produce/category/vegetable', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/produce-category-${bp.name}.png`, fullPage: true })
  console.log('saved', `${OUT}/produce-category-${bp.name}.png`)
  await ctx.close()
}
await browser.close()
console.log('DONE')
