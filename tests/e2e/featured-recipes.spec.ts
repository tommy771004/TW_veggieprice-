import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// First E2E in the repo. Covers the 今日精選食譜 section's user-facing behavior:
// the section renders, its own category tabs switch the featured set, 換一批 and
// 查看更多 work, and tapping a card opens the recipe detail overlay. The section's
// data is statically bundled, so these assertions do not depend on the MOA price
// feed being reachable — we wait on the section's own testid, not the whole page.

// A fresh browser context has empty localStorage, so the first-visit onboarding
// modal (a full-screen overlay) would otherwise cover the page and intercept every
// click. Mark it as already seen before any page script runs.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('veggieprice_onboarding_seen', '1')
    } catch {
      /* ignore storage errors */
    }
  })
})

async function gotoRecipes(page: Page) {
  await page.goto('/')
  const section = page.getByTestId('featured-recipes')
  await section.scrollIntoViewIfNeeded()
  await expect(section).toBeVisible()
  return section
}

async function cardTitles(page: Page) {
  return page.getByTestId('recipe-card').locator('h3').allTextContents()
}

/**
 * The section is a dynamically-imported client component, so there is a window
 * where its SSR markup is present but not yet hydrated and clicks are dropped.
 * Retry the action until it actually takes effect (handlers attached). The tab
 * / card / view-more handlers are idempotent enough for this to be safe.
 */
async function retryUntilInteractive(action: () => Promise<void>) {
  await expect(action).toPass({ timeout: 15000 })
}

test('renders the section with a heading, tabs and 5 daily recipe cards', async ({ page }) => {
  await gotoRecipes(page)

  await expect(page.getByRole('heading', { name: '今日精選食譜' })).toBeVisible()
  await expect(page.getByTestId('recipe-tab-vegetable')).toBeVisible()
  await expect(page.getByTestId('recipe-tab-fruit')).toBeVisible()
  await expect(page.getByTestId('recipe-tab-meat')).toBeVisible()
  await expect(page.getByTestId('recipe-tab-seafood')).toBeVisible()
  await expect(page.getByTestId('recipe-card')).toHaveCount(5)
})

test('switching category tabs swaps the featured recipes', async ({ page }) => {
  await gotoRecipes(page)

  const vegetableTitles = await cardTitles(page)

  await retryUntilInteractive(async () => {
    await page.getByTestId('recipe-tab-fruit').click()
    await expect(page.getByTestId('recipe-tab-fruit')).toHaveAttribute('aria-pressed', 'true')
  })

  await expect(page.getByTestId('recipe-card')).toHaveCount(5)
  const fruitTitles = await cardTitles(page)
  // fruit and vegetable recipes are disjoint, so the featured set must change
  expect(fruitTitles).not.toEqual(vegetableTitles)
})

test('查看更多 reveals more recipes and then disappears at the end', async ({ page }) => {
  await gotoRecipes(page)

  const cards = page.getByTestId('recipe-card')
  const viewMore = page.getByTestId('recipe-view-more')

  await expect(cards).toHaveCount(5)

  // First reveal doubles as the hydration gate.
  await retryUntilInteractive(async () => {
    await viewMore.click()
    await expect(cards).not.toHaveCount(5)
  })

  // Keep revealing in +5 steps until everything in the category is shown.
  for (let i = 0; i < 10 && (await viewMore.isVisible()); i++) {
    const before = await cards.count()
    await viewMore.click()
    await expect(cards).not.toHaveCount(before)
  }

  await expect(viewMore).toBeHidden()
  expect(await cards.count()).toBeGreaterThan(5)
})

test('換一批 resets the list back to 5', async ({ page }) => {
  await gotoRecipes(page)

  await retryUntilInteractive(async () => {
    await page.getByTestId('recipe-view-more').click()
    await expect(page.getByTestId('recipe-card')).not.toHaveCount(5)
  })

  await page.getByTestId('recipe-shuffle').click()
  await expect(page.getByTestId('recipe-card')).toHaveCount(5)
})

test('tapping a card opens the recipe detail overlay and it can be closed', async ({ page }) => {
  await gotoRecipes(page)

  const sheet = page.getByTestId('recipe-sheet')
  await retryUntilInteractive(async () => {
    await page.getByTestId('recipe-card').first().click()
    await expect(sheet).toBeVisible()
  })

  await expect(sheet.getByTestId('recipe-ingredients')).toBeVisible()
  await expect(sheet.getByTestId('recipe-steps')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
})

test('an ingredient link leads to the price search', async ({ page }) => {
  await gotoRecipes(page)

  const sheet = page.getByTestId('recipe-sheet')
  await retryUntilInteractive(async () => {
    await page.getByTestId('recipe-card').first().click()
    await expect(sheet).toBeVisible()
  })

  await page.getByTestId('recipe-ingredient-link').first().click()
  await expect(page).toHaveURL(/\/search\?q=/)
})
