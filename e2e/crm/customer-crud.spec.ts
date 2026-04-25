import { test, expect } from '@playwright/test'
import { frappeProxy } from '../_helpers/frappe-proxy'
import { uniqueSuffix, todayISO } from '../_helpers/utils'

test('Create a new customer -> appears in customers list', async ({ page }) => {
  test.setTimeout(3 * 60_000)

  const suffix = uniqueSuffix()
  const customerName = `PW Customer ${suffix}`

  // Use the authenticated browser request context (request fixture is unauthenticated).
  await page.goto('/dashboard')
  await page.waitForLoadState('domcontentloaded')

  // If NEXUS_FAST_LOGIN=1, tenant_api_key cookies may not exist, and /api/proxy will 401.
  // Skip these API-level CRUD tests unless proxy auth is available.
  const probe = await frappeProxy<any>(page.request, 'frappe.client.get_list', {
    method: 'POST',
    body: { doctype: 'Customer', fields: JSON.stringify(['name']), limit_page_length: 1 },
  })
  if (probe.status === 401) {
    test.skip(true, 'Proxy auth unavailable (set ERP_API_KEY/ERP_API_SECRET or disable NEXUS_FAST_LOGIN)')
    return
  }

  const create = await frappeProxy<any>(page.request, 'frappe.client.insert', {
    method: 'POST',
    body: {
      doc: {
        doctype: 'Customer',
        customer_name: customerName,
        customer_type: 'Company',
      },
    },
  })

  if (create.status === 401) {
    test.skip(true, 'Proxy auth unavailable (set ERP_API_KEY/ERP_API_SECRET or disable NEXUS_FAST_LOGIN)')
    return
  }
  expect(create.status).toBe(200)

  await page.goto('/crm/customers')
  await page.waitForLoadState('domcontentloaded')

  await expect(page.getByText(customerName, { exact: false })).toBeVisible({ timeout: 60_000 })
})

test('Delete customer with linked transactions -> blocked (referential integrity)', async ({ page }) => {
  test.setTimeout(3 * 60_000)

  const suffix = uniqueSuffix()
  const customerName = `PW Locked Customer ${suffix}`

  await page.goto('/dashboard')
  await page.waitForLoadState('domcontentloaded')

  const probe = await frappeProxy<any>(page.request, 'frappe.client.get_list', {
    method: 'POST',
    body: { doctype: 'Customer', fields: JSON.stringify(['name']), limit_page_length: 1 },
  })
  if (probe.status === 401) {
    test.skip(true, 'Proxy auth unavailable (set ERP_API_KEY/ERP_API_SECRET or disable NEXUS_FAST_LOGIN)')
    return
  }

  // 1) Create customer
  const createCustomer = await frappeProxy<any>(page.request, 'frappe.client.insert', {
    method: 'POST',
    body: {
      doc: { doctype: 'Customer', customer_name: customerName, customer_type: 'Company' },
    },
  })
  if (createCustomer.status === 401) {
    test.skip(true, 'Proxy auth unavailable (set ERP_API_KEY/ERP_API_SECRET or disable NEXUS_FAST_LOGIN)')
    return
  }
  expect(createCustomer.status).toBe(200)
  const customerId = (createCustomer.data as any)?.message?.name || (createCustomer.data as any)?.name
  expect(customerId).toBeTruthy()

  // 2) Create a Sales Order linked to the customer (draft is enough to link)
  const itemCode = process.env.TEST_ITEM_CODE || process.env.TEST_PURCHASE_ITEM_CODE
  test.skip(!itemCode, 'Set TEST_ITEM_CODE (or TEST_PURCHASE_ITEM_CODE) to create a linked sales order')

  const so = await frappeProxy<any>(page.request, 'frappe.client.insert', {
    method: 'POST',
    body: {
      doc: {
        doctype: 'Sales Order',
        customer: String(customerId),
        transaction_date: todayISO(),
        delivery_date: todayISO(),
        items: [{ item_code: itemCode, qty: 1, rate: 10, delivery_date: todayISO() }],
      },
    },
  })
  expect(so.status).toBe(200)

  // 3) Attempt to delete customer -> should fail
  const del = await frappeProxy<any>(page.request, 'frappe.client.delete', {
    method: 'POST',
    body: { doctype: 'Customer', name: String(customerId) },
  })

  // Frappe typically returns 4xx with message about linked documents.
  expect(del.status).toBeGreaterThanOrEqual(400)
})

