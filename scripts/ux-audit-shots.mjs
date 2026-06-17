import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const OUT = 'audit-screenshots'
mkdirSync(OUT, { recursive: true })

const breakpoints = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
]

const routes = [
  { slug: 'home', path: '/' },
  { slug: 'search', path: '/search' },
  { slug: 'seasonal', path: '/seasonal' },
  { slug: 'insights', path: '/insights' },
  { slug: 'watchlist', path: '/watchlist' },
  { slug: 'settings', path: '/settings' },
  { slug: 'produce-detail', path: '/produce/' + encodeURIComponent('高麗菜') },
  { slug: 'produce-category', path: '/produce/category/vegetable' },
]

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0
      const step = 400
      const timer = setInterval(() => {
        window.scrollBy(0, step)
        total += step
        if (total >= document.body.scrollHeight + 1000) {
          clearInterval(timer)
          resolve()
        }
      }, 120)
    })
    window.scrollTo(0, 0)
  })
}

const browser = await chromium.launch()
for (const bp of breakpoints) {
  const ctx = await browser.newContext({
    viewport: { width: bp.width, height: bp.height },
    deviceScaleFactor: 1,
  })
  // Skip onboarding modal so it doesn't block content
  await ctx.addInitScript(() => {
    try { localStorage.setItem('veggieprice_onboarding_seen', '1') } catch {}
  })
  const page = await ctx.newPage()
  for (const r of routes) {
    try {
      await page.goto(BASE + r.path, { waitUntil: 'networkidle', timeout: 25000 })
    } catch {
      await page.goto(BASE + r.path, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {})
    }
    await page.waitForTimeout(1500)
    await autoScroll(page)
    await page.waitForTimeout(1500)
    const file = `${OUT}/${r.slug}-${bp.name}.png`
    await page.screenshot({ path: file, fullPage: true }).catch((e) => console.log('shot fail', file, e.message))
    console.log('saved', file)
  }
  await ctx.close()
}
await browser.close()
console.log('DONE')
