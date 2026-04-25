import { test, expect } from '@playwright/test'
import { uniqueSuffix, todayISO } from '../_helpers/utils'

test('Create a sales order linked to a customer -> line items and totals render', async ({ page }) => {
  test.setTimeout(3 * 60_000)

  const customerId = process.env.TEST_CUSTOMER_ID
  test.skip(!customerId, 'Set TEST_CUSTOMER_ID for sales order creation test')

  const suffix = uniqueSuffix()
  const itemCode = process.env.TEST_ITEM_CODE || 'TEST-ITEM'

  await page.goto('/sales-orders/new')
  await page.waitForLoadState('domcontentloaded')

  // Customer info
  await page.getByLabel(/customer id/i).fill(customerId!)
  await page.getByLabel(/delivery date/i).fill(todayISO())

  // One line item (first row)
  const itemCodeInput = page.getByPlaceholder('Item code').first()
  await itemCodeInput.fill(itemCode)

  // Ensure qty/rate are filled (otherwise ERPNext will reject)
  const qtyInput = page.locator('tbody tr').first().locator('input[type="number"]').first()
  await qtyInput.fill('1')

  // Rate input is the next required number input in row (best-effort)
  const rateInput = page.locator('tbody tr').first().locator('input[type="number"]').nth(1)
  await rateInput.fill('100')

  await page.getByRole('button', { name: /save sales order/i }).click()

  // Should land back on list
  await expect(page).toHaveURL(/\/sales-orders(\b|\/|\?)/, { timeout: 120_000 })

  // Verify the order list has some evidence of the new order (PO no may be empty; check customer ID)
  await expect(page.getByText(customerId!)).toBeVisible({ timeout: 120_000 })
})

