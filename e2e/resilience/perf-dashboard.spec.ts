import { test, expect } from '@playwright/test'

test('Dashboard load performance under threshold (warn-only)', async ({ page }) => {
  const thresholdMs = Number(process.env.DASHBOARD_LOAD_THRESHOLD_MS || '3000')

  const start = Date.now()
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  const elapsed = Date.now() - start

  // Warn-only: don't fail prod deploys on transient latency.
  // In CI you can set STRICT_PERF=1 to enforce.
  if (process.env.STRICT_PERF === '1') {
    expect(elapsed).toBeLessThan(thresholdMs)
  } else {
    console.log(`[perf] dashboard domcontentloaded in ${elapsed}ms (threshold ${thresholdMs}ms)`)
  }
})

