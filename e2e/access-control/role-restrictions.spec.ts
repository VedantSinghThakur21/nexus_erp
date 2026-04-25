import { test, expect } from '@playwright/test'

test('Non-admin direct URL to admin page is blocked', async ({ page }) => {
  await page.goto('/admin-tenants')
  // App may redirect to /access-denied or /dashboard?error=access_denied
  await expect(page).not.toHaveURL(/\/admin-tenants(\b|\/|\?)/)
  await expect(page).toHaveURL(/\/(access-denied|dashboard)(\b|\/|\?)/)
})

test('Read-only user cannot see create actions (catalogue)', async ({ browser }) => {
  const email = process.env.TEST_READONLY_EMAIL
  const password = process.env.TEST_READONLY_PASSWORD
  test.skip(!email || !password, 'Set TEST_READONLY_EMAIL and TEST_READONLY_PASSWORD to run role UI checks')

  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()

  await page.goto('/login')
  await page.fill('#email', email!)
  await page.fill('#password', password!)
  await page.click('button[type="submit"]')

  // Wait until login completes (either dashboard or change-password)
  await expect(page).toHaveURL(/\/(dashboard|change-password)(\b|\/|\?)/, { timeout: 180_000 })

  await page.goto('/catalogue')
  await page.waitForLoadState('domcontentloaded')

  // For read-only roles, create should be hidden or disabled.
  const addNewItem = page.getByRole('button', { name: /add new item/i })
  await expect(addNewItem).toBeHidden()

  await context.close()
})

