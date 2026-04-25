import { test, expect } from '@playwright/test'
import { uniqueSuffix } from '../_helpers/utils'

test('Edit an existing item price -> persists on reload', async ({ page }) => {
  test.setTimeout(3 * 60_000)

  const suffix = uniqueSuffix()
  const itemCode = `PW-EDIT-${suffix}`.toUpperCase()
  const itemName = `Editable Item ${suffix}`

  await page.goto('/catalogue')
  await page.waitForLoadState('domcontentloaded')

  // Create an item we can safely edit
  await page.getByRole('button', { name: /add new item/i }).click()
  await page.getByLabel(/item code/i).fill(itemCode)
  await page.getByLabel(/item name/i).fill(itemName)
  await page.getByLabel(/rate/i).fill('500')
  await page.getByRole('button', { name: /create item/i }).click()

  // Find card and click its Edit button (card footer button labeled "Edit")
  const search = page.locator('input[placeholder="Ask AI anything..."]')
  await search.fill(itemCode)
  await expect(page.getByText(itemCode)).toBeVisible({ timeout: 60_000 })

  await page.getByRole('button', { name: /^edit$/i }).first().click()

  // Edit dialog
  const newRate = '777'
  await page.getByLabel(/rate/i).fill(newRate)
  await page.getByRole('button', { name: /save changes/i }).click()

  // Reload and ensure price is visible on the card
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await search.fill(itemCode)

  await expect(page.getByText(`₹${Number(newRate).toLocaleString('en-IN')}`)).toBeVisible({
    timeout: 60_000,
  })
})

