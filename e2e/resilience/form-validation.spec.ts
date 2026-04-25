import { test, expect } from '@playwright/test'

test('Submit create-item form with empty required fields -> validation blocks', async ({ page }) => {
  await page.goto('/catalogue')
  await page.waitForLoadState('domcontentloaded')

  await page.getByRole('button', { name: /add new item/i }).click()

  // Click submit without filling
  await page.getByRole('button', { name: /create item/i }).click()

  // Native HTML required fields should be invalid
  await expect(page.locator('#item_code:invalid')).toHaveCount(1)
  await expect(page.locator('#item_name:invalid')).toHaveCount(1)
  await expect(page.locator('#standard_rate:invalid')).toHaveCount(1)
})

