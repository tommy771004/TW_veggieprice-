import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const OUT = 'audit-screenshots/after'
mkdirSync(OUT, { recursive: true })

const targets = [
  { slug: 'home', path: '/', bp: 'mobile' },
  { slug: 'watchlist', path: '/watchlist', bp: 'mobile' },
  { slug: 'insights', path: '/insights', bp: 'mobile' },
  { slug: 'insights', path: '/insights', bp: 'desktop' },
  { slug: 'produce-detail', path: '/produce/' + encodeURIComponent('高麗菜'), bp: 'desktop' },
  { slug: 'produce-detail', path: '/produce/' + encodeURIComponent('高麗菜'), bp: 'mobile' },
]
const sizes = { mobile: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } }

const browser = await chromium.launch()
for (const t of targets) {
  const ctx = await browser.newContext({ viewport: sizes[t.bp] })
  await ctx.addInitScript(() => { try { localStorage.setItem('veggieprice_onboarding_seen', '1') } catch {} })
  const page = await ctx.newPage()
  try { await page.goto(BASE + t.path, { waitUntil: 'networkidle', timeout: 25000 }) }
  catch { await page.goto(BASE + t.path, { waitUntil: 'domcontentloaded' }).catch(() => {}) }
  await page.waitForTimeout(2000)
  const file = `${OUT}/${t.slug}-${t.bp}.png`
  await page.screenshot({ path: file, fullPage: true })
  console.log('saved', file)
  await ctx.close()
}
await browser.close()
console.log('DONE')
