import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const OUT = 'audit-screenshots'
mkdirSync(OUT, { recursive: true })

const pages = [
  ['home', '/'],
  ['search', '/search'],
  ['seasonal', '/seasonal'],
  ['insights', '/insights'],
  ['settings', '/settings'],
  ['watchlist', '/watchlist'],
  ['produce-detail', '/produce/' + encodeURIComponent('高麗菜')],
  ['category-hub', '/produce/category/vegetable'],
]

const viewports = [
  ['mobile', 390, 844],
  ['desktop', 1440, 900],
]

const browser = await chromium.launch()
for (const [vname, w, h] of viewports) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  await ctx.addInitScript(() => {
    try { localStorage.setItem('veggieprice_onboarding_seen', '1') } catch {}
  })
  const page = await ctx.newPage()
  for (const [name, path] of pages) {
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 })
    } catch (e) {
      console.log(`WARN goto ${path} (${vname}): ${e.message}`)
    }
    await page.waitForTimeout(2500) // let charts/data settle
    // Scroll through full height to trigger whileInView / IntersectionObserver lazy sections
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.8)
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 250))
      }
      window.scrollTo(0, document.body.scrollHeight)
      await new Promise((r) => setTimeout(r, 600))
      window.scrollTo(0, 0)
      await new Promise((r) => setTimeout(r, 400))
    })
    await page.waitForTimeout(800)
    const file = `${OUT}/${name}-${vname}.png`
    await page.screenshot({ path: file, fullPage: true })
    console.log(`OK ${file}`)
  }
  await ctx.close()
}
await browser.close()
console.log('DONE')
