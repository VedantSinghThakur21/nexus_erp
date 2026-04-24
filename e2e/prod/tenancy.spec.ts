import { test, expect } from '@playwright/test'

test('tenant context is present after login', async ({ page, context }) => {
  // Requires prod-smoke storageState.
  await page.goto('/dashboard')
  await page.waitForLoadState('domcontentloaded')

  const cookies = await context.cookies()
  const hasTenantSubdomain = cookies.some((c) => c.name === 'tenant_subdomain' && c.value)
  const hasUserType = cookies.some((c) => c.name === 'user_type' && c.value)

  // At least one should exist in your current auth flow
  expect(hasTenantSubdomain || hasUserType).toBe(true)
})

