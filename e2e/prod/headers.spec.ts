import { test, expect } from '@playwright/test'

test('security headers are present on /login', async ({ request, baseURL }) => {
  expect(baseURL, 'Playwright baseURL must be set').toBeTruthy()
  const resp = await request.get(`${baseURL}/login`, { maxRedirects: 5 })
  expect(resp.status()).toBe(200)

  const headers = resp.headers()

  // Required in most production setups
  expect(headers['strict-transport-security']).toBeTruthy()
  expect(headers['referrer-policy']).toBeTruthy()

  // CSP is recommended; if you don't have it yet this test will force you to add it.
  expect(headers['content-security-policy']).toBeTruthy()

  // Clickjacking mitigation: prefer CSP frame-ancestors; XFO is acceptable too.
  expect(Boolean(headers['x-frame-options'] || headers['content-security-policy'])).toBe(true)
})

