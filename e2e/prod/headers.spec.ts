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

test('security headers are present on /dashboard', async ({ request, baseURL }) => {
  expect(baseURL, 'Playwright baseURL must be set').toBeTruthy()
  const resp = await request.get(`${baseURL}/dashboard`, { maxRedirects: 5 })
  // Depending on auth, may be 200 or redirect; headers should still apply.
  expect([200, 302, 307, 308]).toContain(resp.status())
  const headers = resp.headers()
  expect(headers['referrer-policy']).toBeTruthy()
  expect(Boolean(headers['x-frame-options'] || headers['content-security-policy'])).toBe(true)
})

test('security headers are present on /api/health (if exists)', async ({ request, baseURL }) => {
  expect(baseURL, 'Playwright baseURL must be set').toBeTruthy()
  const resp = await request.get(`${baseURL}/api/health`, { maxRedirects: 0 }).catch(() => null)
  test.skip(!resp, 'health endpoint not reachable')
  if (!resp) return

  // If endpoint doesn't exist, skip; otherwise check baseline headers.
  if (resp.status() === 404) test.skip(true, '/api/health not implemented')

  const headers = resp.headers()
  expect(headers['referrer-policy']).toBeTruthy()
})

