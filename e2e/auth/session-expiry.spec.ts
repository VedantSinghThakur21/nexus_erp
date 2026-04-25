import { test, expect } from '@playwright/test'

test('Clearing session cookie mid-session redirects to login', async ({ page, context }) => {
  test.setTimeout(2 * 60_000)

  await page.goto('/dashboard')
  await page.waitForLoadState('domcontentloaded')

  // Clear auth cookies (best-effort). Your app uses sid + user_type and tenant cookies.
  const cookies = await context.cookies()
  const toClear = cookies.filter((c) =>
    ['sid', 'user_type', 'user_email', 'tenant_subdomain', 'tenant_api_key', 'tenant_api_secret'].includes(
      c.name,
    ),
  )

  if (toClear.length > 0) {
    await context.clearCookies()
  }

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login(\b|\/|\?)/, { timeout: 30_000 })
})

