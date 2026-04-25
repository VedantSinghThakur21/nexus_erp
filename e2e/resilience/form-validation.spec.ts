import { test, expect } from '@playwright/test'

test('Submit create-item form with empty required fields -> validation blocks', async ({ page }) => {
  test.setTimeout(2 * 60_000)
  await page.goto('/catalogue')
  await page.waitForLoadState('domcontentloaded')

  if (page.url().includes('/login') && process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
    await page.fill('#email', process.env.TEST_USER_EMAIL)
    await page.fill('#password', process.env.TEST_USER_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/(dashboard|catalogue)(\b|\/|\?)/, { timeout: 120_000 })
    await page.goto('/catalogue')
    await page.waitForLoadState('domcontentloaded')
  }

  const add = page.getByRole('button', { name: /add new item|create new item/i }).first()
  await expect(add).toBeVisible({ timeout: 60_000 })
  await add.click()

  // Click submit without filling
  await page.getByRole('button', { name: /create item/i }).click()

  // Native HTML required fields should be invalid
  await expect(page.locator('#item_code:invalid')).toHaveCount(1)
  await expect(page.locator('#item_name:invalid')).toHaveCount(1)
  await expect(page.locator('#standard_rate:invalid')).toHaveCount(1)
})

