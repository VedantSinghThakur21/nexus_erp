import { test, expect } from '@playwright/test'
import { uniqueSuffix } from '../_helpers/utils'

test('Create a new item -> appears in catalogue list', async ({ page }) => {
  test.setTimeout(3 * 60_000)

  const suffix = uniqueSuffix()
  const itemCode = `PW-ITEM-${suffix}`.toUpperCase()
  const itemName = `Playwright Item ${suffix}`

  await page.goto('/catalogue')
  await page.waitForLoadState('domcontentloaded')

  await page.getByRole('button', { name: /add new item/i }).click()

  await page.getByLabel(/item code/i).fill(itemCode)
  await page.getByLabel(/item name/i).fill(itemName)
  await page.getByLabel(/rate/i).fill('1234')

  await page.getByRole('button', { name: /create item/i }).click()

  // Back in the list, search for it
  const search = page.locator('input[placeholder="Ask AI anything..."]')
  await search.fill(itemCode)

  await expect(page.getByText(itemCode, { exact: false })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(itemName, { exact: false })).toBeVisible()
})

test('Attempt to create duplicate item -> validation error', async ({ page }) => {
  test.setTimeout(3 * 60_000)

  const suffix = uniqueSuffix()
  const itemCode = `PW-DUP-${suffix}`.toUpperCase()

  await page.goto('/catalogue')
  await page.waitForLoadState('domcontentloaded')

  // Create first time
  await page.getByRole('button', { name: /add new item/i }).click()
  await page.getByLabel(/item code/i).fill(itemCode)
  await page.getByLabel(/item name/i).fill(`Duplicate Target ${suffix}`)
  await page.getByLabel(/rate/i).fill('100')
  await page.getByRole('button', { name: /create item/i }).click()

  // Create second time with same code
  await page.getByRole('button', { name: /add new item/i }).click()
  await page.getByLabel(/item code/i).fill(itemCode)
  await page.getByLabel(/item name/i).fill(`Duplicate Target Again ${suffix}`)
  await page.getByLabel(/rate/i).fill('100')

  // The UI uses alert("Error: ...") for failures
  const dialog = page.waitForEvent('dialog')
  await page.getByRole('button', { name: /create item/i }).click()
  const d = await dialog
  expect(d.message().toLowerCase()).toContain('error')
  await d.dismiss()
})

