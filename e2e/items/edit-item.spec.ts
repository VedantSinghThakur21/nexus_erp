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
  let createError: string | null = null
  page.once('dialog', async (d) => {
    createError = d.message()
    await d.dismiss()
  })
  await page.getByRole('button', { name: /add new item/i }).click()
  await expect(page.locator('input[name="item_group"]')).toHaveValue(/.+/, { timeout: 60_000 })
  await expect(page.locator('input[name="stock_uom"]')).toHaveValue(/.+/, { timeout: 60_000 })
  await page.getByLabel(/item code/i).fill(itemCode)
  await page.getByLabel(/item name/i).fill(itemName)
  await page.getByLabel(/rate/i).fill('500')
  await page.getByRole('button', { name: /create item/i }).click()
  if (createError) throw new Error(`Item create failed: ${createError}`)

  // Allow backend to persist + list refresh.
  await page.reload()
  await page.waitForLoadState('domcontentloaded')

  // Find card and click its Edit button (card footer button labeled "Edit")
  const search = page.getByPlaceholder(/search items by name, code, or description/i)
  const startedAt = Date.now()
  while (Date.now() - startedAt < 180_000) {
    await search.fill(itemCode)
    await page.waitForTimeout(400)
    if (await page.getByText(itemCode, { exact: false }).count()) break
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
  }
  await expect(page.getByText(itemCode, { exact: false })).toBeVisible({ timeout: 30_000 })

  // With the search applied, there should be a single visible card; click its footer Edit button.
  const editBtn = page.locator('button').filter({ hasText: /\bEdit\b/i }).first()
  await expect(editBtn).toBeVisible({ timeout: 60_000 })
  await editBtn.click()

  // Edit dialog
  const newRate = '777'
  const editDialog = page.getByRole('dialog')
  await expect(editDialog.getByText(/edit item/i)).toBeVisible({ timeout: 30_000 })

  let saveError: string | null = null
  page.once('dialog', async (d) => {
    saveError = d.message()
    await d.dismiss()
  })

  await page.locator('#standard_rate').fill(newRate)
  await editDialog.getByRole('button', { name: /save changes/i }).click()
  if (saveError) throw new Error(`Item update failed: ${saveError}`)

  // Reload and ensure price is visible on the card
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await search.fill(itemCode)

  const card = page.locator('div').filter({ hasText: itemCode }).first()
  const price = card.locator('span.text-xl.font-bold').first()
  await expect(price).toContainText(Number(newRate).toLocaleString('en-IN'), { timeout: 90_000 })
})

