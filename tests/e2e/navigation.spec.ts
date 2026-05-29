import { test, expect } from '@playwright/test'

test.describe('基礎導航與首頁載入測試', () => {
  test('首頁應能正常顯示看板標題與預載入看板卡片', async ({ page }) => {
    await page.goto('/')
    
    // Check main title existence
    const titleLocator = page.locator('h1')
    await expect(titleLocator).toContainText('台灣蔬果批發行情')

    // Check pre-fetched elements should render quickly
    const marketChip = page.locator('span').filter({ hasText: '台北一' })
    await expect(marketChip.first()).toBeVisible()
  })

  test('行動端底部導覽列包含全套 5 個錨點', async ({ page, isMobile }) => {
    await page.goto('/')
    
    if (isMobile) {
      // Validate all 5 primary bottom navigation tab links exist under mobile viewports
      const navLinks = page.locator('nav').locator('a')
      await expect(navLinks).toHaveCount(5)
      
      const labels = await navLinks.allTextContents()
      expect(labels.map(l => l.replace(/[^首頁搜尋當季關注設定]/g, ''))).toContain('首頁')
    }
  })
})
