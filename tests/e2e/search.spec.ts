import { test, expect } from '@playwright/test'

test.describe('作物批發市場行情搜尋功能驗證', () => {
  test('搜尋輸入框與交互查詢流程正常', async ({ page }) => {
    await page.goto('/search')
    
    // Ensure search input is interactive and accepts crop inquiries
    const searchInput = page.locator('input[placeholder*="搜尋"]').first()
    await expect(searchInput).toBeVisible()
    
    await searchInput.fill('高麗菜')
    await expect(searchInput).toHaveValue('高麗菜')
  })
})
