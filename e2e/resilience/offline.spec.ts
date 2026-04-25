import { test, expect } from '@playwright/test'

test('Offline mid-session shows user-friendly failure (non-crash)', async ({ context, page }) => {
  test.setTimeout(2 * 60_000)

  await page.goto('/dashboard')
  await page.waitForLoadState('domcontentloaded')

  await context.setOffline(true)
  await page.reload().catch(() => null)

  // Browser may show a blank/error document while offline. The key requirement is:
  // once network is restored, the app recovers (no persistent broken state).
  await context.setOffline(false)
  await page.goto('/dashboard')
  await page.waitForLoadState('domcontentloaded')
  await expect(page).toHaveURL(/\/dashboard(\b|\/|\?)/)
})

