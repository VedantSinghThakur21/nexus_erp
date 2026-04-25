import { test, expect } from '@playwright/test'

test('tenant_a cannot access tenant_b resource by ID', async ({ browser }) => {
  const tenantA = process.env.TENANT_A_BASE_URL
  const tenantBResourceUrl = process.env.TENANT_B_RESOURCE_URL

  test.skip(
    !tenantA || !tenantBResourceUrl,
    'Set TENANT_A_BASE_URL and TENANT_B_RESOURCE_URL (full URL to a tenant_b-only record)',
  )

  // Use the default storageState login against tenant_a (tests run with baseURL already),
  // but for a different host we need an isolated context with that baseURL.
  const context = await browser.newContext()
  const page = await context.newPage()

  // Login to tenant_a using env creds (cross-host storageState isn't guaranteed to apply).
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  test.skip(!email || !password, 'Set TEST_USER_EMAIL/TEST_USER_PASSWORD')

  await page.goto(`${tenantA}/login`)
  await page.fill('#email', email!)
  await page.fill('#password', password!)
  await page.click('button[type="submit"]')
  await expect(page).not.toHaveURL(/\/login(\b|\/|\?)/, { timeout: 180_000 })

  // Attempt to access tenant_b resource URL while authenticated as tenant_a
  await page.goto(tenantBResourceUrl!)

  // Should never show tenant_b data. Expect redirect/login/access-denied or 403-like page.
  const url = page.url()
  expect(/access-denied|login|dashboard/.test(url)).toBe(true)

  await context.close()
})

