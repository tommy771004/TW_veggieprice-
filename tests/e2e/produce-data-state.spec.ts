import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('veggieprice_onboarding_seen', '1'))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/prices/history') {
      await route.fulfill({ json: {
        data: [
          { date: '2026-01-01', label: '1/1', avgPrice: 10, volume: 100 },
          { date: '2026-01-02', label: '1/2', avgPrice: 12, volume: 100 },
          { date: '2026-01-03', label: '1/3', avgPrice: 99, volume: null, isClosed: true },
        ], closedDays: ['2026-01-03'], updatedAt: '2026-01-04T00:00:00Z',
      } })
    } else if (path === '/api/affiliates' || path === '/api/prices/markets') {
      await route.fulfill({ json: [] })
    } else {
      await route.fulfill({ status: 404, json: { error: 'No optional fixture data' } })
    }
  })
  await page.goto('/produce/' + encodeURIComponent('甘藍'))
})

test('headline reports observed price dates, not interpolated days', async ({ page }) => {
  await expect(page.locator('#produce-hero-card')).toContainText('報價日期 2026-01-02')
  await expect(page.locator('#produce-hero-card')).toContainText('漲跌相較 2026-01-01')
  await expect(page.locator('#produce-hero-card')).toContainText('$12.0')
  await expect(page.locator('#produce-hero-card')).not.toContainText('$99')
})

test('watchlist success and storage failure are visible without false state change', async ({ page }) => {
  const button = page.getByRole('button', { name: '加入關注', exact: false })
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status').filter({ hasText: '已關注「甘藍」' })).toBeVisible()
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Test storage quota', 'QuotaExceededError') }
  })
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status').filter({ hasText: '無法儲存關注設定' })).toBeVisible()
})
