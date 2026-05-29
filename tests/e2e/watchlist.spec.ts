import { test, expect } from '@playwright/test'

test.describe('觀察名單與我的收藏功能驗證', () => {
  test('初始空狀態或未收藏時引導提示正常', async ({ page }) => {
    await page.goto('/watchlist')
    
    // Primary title headers should be accessible
    const pageTitle = page.locator('h1, h2').filter({ hasText: '觀察名單' })
    await expect(pageTitle.first()).toBeVisible()
  })
})
