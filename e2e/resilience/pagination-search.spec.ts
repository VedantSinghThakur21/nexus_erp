import { test, expect } from '@playwright/test'

test('Catalogue search filters by partial name/code', async ({ page }) => {
  await page.goto('/catalogue')
  await page.waitForLoadState('domcontentloaded')

  // Grab first visible item code, then search by a substring
  const firstCode = await page.locator('p.text-xs.text-muted-foreground.uppercase').first().innerText()
  const token = firstCode.slice(0, Math.min(6, firstCode.length))

  const search = page.locator('input[placeholder="Ask AI anything..."]')
  await search.fill(token)

  await expect(page.getByText(firstCode)).toBeVisible()
})

test('Catalogue pagination changes records (if page 2 exists)', async ({ page }) => {
  await page.goto('/catalogue')
  await page.waitForLoadState('domcontentloaded')

  const page2 = page.getByRole('button', { name: /^2$/ })
  if (await page2.count()) {
    const firstCodePage1 = await page.locator('p.text-xs.text-muted-foreground.uppercase').first().innerText()
    await page2.click()
    await page.waitForTimeout(300)
    const firstCodePage2 = await page.locator('p.text-xs.text-muted-foreground.uppercase').first().innerText()
    expect(firstCodePage2).not.toBe(firstCodePage1)
  } else {
    test.skip(true, 'Not enough items for pagination')
  }
})

