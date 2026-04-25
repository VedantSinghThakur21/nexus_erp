import { test, expect } from '@playwright/test'
import { uniqueSuffix } from '../_helpers/utils'

test('Create a new item -> appears in catalogue list', async ({ page }) => {
  test.setTimeout(3 * 60_000)

  const suffix = uniqueSuffix()
  const itemCode = `PW-ITEM-${suffix}`.toUpperCase()
  const itemName = `Playwright Item ${suffix}`

  await page.goto('/catalogue')
  await page.waitForLoadState('domcontentloaded')

  const addNewItem = page.locator('button', { hasText: /add new item/i }).first()
  await expect(addNewItem).toBeVisible({ timeout: 60_000 })
  await addNewItem.click()

  // Wait for required selects to resolve a value (item_group + stock_uom).
  await expect(page.locator('input[name="item_group"]')).toHaveValue(/.+/, { timeout: 60_000 })
  await expect(page.locator('input[name="stock_uom"]')).toHaveValue(/.+/, { timeout: 60_000 })

  await page.getByLabel(/item code/i).fill(itemCode)
  await page.getByLabel(/item name/i).fill(itemName)
  await page.getByLabel(/rate/i).fill('1234')

  const createBtn = page.getByRole('button', { name: /create item/i })
  await expect(createBtn).toBeEnabled()

  let createError: string | null = null
  page.once('dialog', async (d) => {
    createError = d.message()
    await d.dismiss()
  })

  await createBtn.click()

  // Ensure dialog closed (or fail fast on alert error).
  const modal = page.getByRole('dialog')
  await Promise.race([
    modal.waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => null),
    page.waitForEvent('dialog', { timeout: 30_000 }).catch(() => null),
  ])
  if (createError) throw new Error(`Item create failed: ${createError}`)
  await expect(modal).toBeHidden({ timeout: 120_000 })

  await page.reload()
  await page.waitForLoadState('domcontentloaded')

  // Back in the list, search for it
  const search = page.getByPlaceholder(/search items by name, code, or description/i)
  await search.fill(itemCode)

  await expect(page.getByText(itemCode, { exact: false })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('heading', { name: itemName })).toBeVisible()
})

test('Attempt to create duplicate item -> validation error', async ({ page }) => {
  test.setTimeout(3 * 60_000)

  const suffix = uniqueSuffix()
  const itemCode = `PW-DUP-${suffix}`.toUpperCase()

  await page.goto('/catalogue')
  await page.waitForLoadState('domcontentloaded')

  // Create first time
  const addNewItem = page.locator('button', { hasText: /add new item/i }).first()
  await expect(addNewItem).toBeVisible({ timeout: 60_000 })
  await addNewItem.click()
  await expect(page.locator('input[name="item_group"]')).toHaveValue(/.+/, { timeout: 60_000 })
  await expect(page.locator('input[name="stock_uom"]')).toHaveValue(/.+/, { timeout: 60_000 })
  await page.getByLabel(/item code/i).fill(itemCode)
  await page.getByLabel(/item name/i).fill(`Duplicate Target ${suffix}`)
  await page.getByLabel(/rate/i).fill('100')

  let firstCreateError: string | null = null
  page.once('dialog', async (d) => {
    firstCreateError = d.message()
    await d.dismiss()
  })

  await page.getByRole('button', { name: /create item/i }).click()
  const firstModal = page.getByRole('dialog')
  await Promise.race([
    firstModal.waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => null),
    page.waitForEvent('dialog', { timeout: 30_000 }).catch(() => null),
  ])
  if (firstCreateError) throw new Error(`First create failed: ${firstCreateError}`)
  await expect(firstModal).toBeHidden({ timeout: 120_000 })

  // Create second time with same code
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(addNewItem).toBeVisible({ timeout: 60_000 })
  await addNewItem.click({ force: true })
  await expect(page.locator('input[name="item_group"]')).toHaveValue(/.+/, { timeout: 60_000 })
  await expect(page.locator('input[name="stock_uom"]')).toHaveValue(/.+/, { timeout: 60_000 })
  await page.getByLabel(/item code/i).fill(itemCode)
  await page.getByLabel(/item name/i).fill(`Duplicate Target Again ${suffix}`)
  await page.getByLabel(/rate/i).fill('100')

  // The UI uses alert("Error: ...") for failures
  let dialogMessage: string | null = null
  page.once('dialog', async (d) => {
    dialogMessage = d.message()
    await d.dismiss()
  })

  const modal = page.getByRole('dialog')
  // Ensure we can reach the submit button even when modal is scrolled.
  await modal.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  const submitBtn = modal.locator('button[type="submit"]').first()
  await expect(submitBtn).toBeVisible({ timeout: 60_000 })
  if (await submitBtn.isEnabled()) {
    await submitBtn.click()
  }

  // Wait a bit for either alert or dialog close.
  await Promise.race([
    page.waitForEvent('dialog', { timeout: 30_000 }).catch(() => null),
    modal.waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => null),
    expect(submitBtn).not.toHaveText(/creating/i, { timeout: 120_000 }).catch(() => null),
  ])

  if (dialogMessage) {
    expect(dialogMessage.toLowerCase()).toContain('error')
    return
  }

  // If no alert was shown, assert we did NOT create a second record (should remain unique).
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  const search = page.getByPlaceholder(/search items by name, code, or description/i)
  await search.fill(itemCode)
  await expect(page.getByText(itemCode)).toHaveCount(1, { timeout: 60_000 })
})

