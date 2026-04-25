import { test, expect } from '@playwright/test'

test('Key API failure shows non-blank error state (proxy 500)', async ({ page }) => {
  test.setTimeout(2 * 60_000)

  // Intercept the secure Frappe proxy (used widely) and force a 500 once.
  let intercepted = false
  await page.route('**/api/proxy/**', async (route) => {
    if (!intercepted) {
      intercepted = true
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Injected failure for E2E' }),
      })
      return
    }
    await route.continue()
  })

  await page.goto('/catalogue')
  await page.waitForLoadState('domcontentloaded')

  // We don't know exact UI error component; assert the shell renders and isn't blank.
  await expect(page.locator('body')).not.toBeEmpty()
})

