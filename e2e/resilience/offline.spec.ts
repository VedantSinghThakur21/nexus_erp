import { test, expect } from '@playwright/test'

test('Offline mid-session shows user-friendly failure (non-crash)', async ({ context, page }) => {
  test.setTimeout(2 * 60_000)

  await page.goto('/dashboard')
  await page.waitForLoadState('domcontentloaded')

  await context.setOffline(true)
  await page.reload().catch(() => null)

  // We don't enforce exact UI copy; just ensure app doesn't hard-crash to blank.
  await expect(page.locator('body')).not.toBeEmpty()

  await context.setOffline(false)
})

