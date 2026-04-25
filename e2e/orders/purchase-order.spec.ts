import { test, expect } from '@playwright/test'
import { frappeProxy } from '../_helpers/frappe-proxy'
import { uniqueSuffix, todayISO } from '../_helpers/utils'

test('Create a purchase order -> status Draft (API)', async ({ request }) => {
  test.setTimeout(2 * 60_000)

  const supplier = process.env.TEST_SUPPLIER_NAME
  const itemCode = process.env.TEST_PURCHASE_ITEM_CODE
  test.skip(!supplier || !itemCode, 'Set TEST_SUPPLIER_NAME and TEST_PURCHASE_ITEM_CODE to run purchase order API tests')

  const suffix = uniqueSuffix()

  // Best-effort: pick a warehouse if required
  const whResp = await frappeProxy<any>(request, 'frappe.client.get_list', {
    method: 'POST',
    body: {
      doctype: 'Warehouse',
      filters: JSON.stringify([['is_group', '=', 0]]),
      fields: JSON.stringify(['name']),
      limit_page_length: 1,
    },
  })
  const warehouse = (whResp.data as any)?.message?.[0]?.name

  const poDoc: any = {
    doctype: 'Purchase Order',
    supplier,
    schedule_date: todayISO(),
    transaction_date: todayISO(),
    items: [
      {
        item_code: itemCode,
        qty: 1,
        rate: 10,
        schedule_date: todayISO(),
        ...(warehouse ? { warehouse } : {}),
      },
    ],
    // add a unique title-ish signal to help diagnose
    supplier_name: supplier,
    remarks: `Playwright PO ${suffix}`,
  }

  const create = await frappeProxy<any>(request, 'frappe.client.insert', {
    method: 'POST',
    body: { doc: poDoc },
  })

  expect(create.status).toBe(200)
  const poName = (create.data as any)?.message?.name || (create.data as any)?.name
  expect(poName).toBeTruthy()

  const fetched = await frappeProxy<any>(request, 'frappe.client.get', {
    method: 'GET',
    query: { doctype: 'Purchase Order', name: String(poName) },
  })
  expect(fetched.status).toBe(200)
  const status = (fetched.data as any)?.message?.status
  expect(status).toBe('Draft')
})

test('Submit a purchase order -> status Submitted (API)', async ({ request }) => {
  test.setTimeout(2 * 60_000)

  const supplier = process.env.TEST_SUPPLIER_NAME
  const itemCode = process.env.TEST_PURCHASE_ITEM_CODE
  test.skip(!supplier || !itemCode, 'Set TEST_SUPPLIER_NAME and TEST_PURCHASE_ITEM_CODE to run purchase order API tests')

  // Reuse the create logic from above
  const create = await frappeProxy<any>(request, 'frappe.client.insert', {
    method: 'POST',
    body: {
      doc: {
        doctype: 'Purchase Order',
        supplier,
        schedule_date: todayISO(),
        transaction_date: todayISO(),
        items: [{ item_code: itemCode, qty: 1, rate: 10, schedule_date: todayISO() }],
      },
    },
  })
  expect(create.status).toBe(200)
  const poName = (create.data as any)?.message?.name || (create.data as any)?.name
  expect(poName).toBeTruthy()

  const docResp = await frappeProxy<any>(request, 'frappe.client.get', {
    method: 'GET',
    query: { doctype: 'Purchase Order', name: String(poName) },
  })
  expect(docResp.status).toBe(200)
  const doc = (docResp.data as any)?.message
  expect(doc).toBeTruthy()

  const submit = await frappeProxy<any>(request, 'frappe.client.submit', {
    method: 'POST',
    body: { doc },
  })
  expect([200, 201].includes(submit.status)).toBe(true)

  const fetched = await frappeProxy<any>(request, 'frappe.client.get', {
    method: 'GET',
    query: { doctype: 'Purchase Order', name: String(poName) },
  })
  expect(fetched.status).toBe(200)
  const docstatus = (fetched.data as any)?.message?.docstatus
  expect(docstatus).toBe(1)
})

