import { test, expect } from '@playwright/test'

test('unauthenticated dashboard redirects to login', async ({ browser, baseURL }) => {
  test.setTimeout(2 * 60_000)
  expect(baseURL, 'Playwright baseURL must be set').toBeTruthy()

  // prod-smoke project uses a logged-in storageState; create a fresh context for unauth.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await expect(page).toHaveURL(/\/login(\b|\/|\?)/)

  await context.close()
})

test('authenticated dashboard is reachable', async ({ page }) => {
  test.setTimeout(2 * 60_000)
  // This test relies on prod-smoke storageState.
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForLoadState('domcontentloaded')
  await expect(page).toHaveURL(/\/dashboard(\b|\/|\?)/)
})

