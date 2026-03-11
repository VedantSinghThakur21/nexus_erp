'use server'

import { tenantAdminRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"
import { cookies } from 'next/headers'

export interface Inspection {
  name: string
  reference_name: string
  inspection_type: string
  status: string
  inspected_by: string
  report_date: string
  remarks?: string
  reference_type?: string
}

// 1. READ: List
export async function getInspections() {
  try {
    const response = await tenantAdminRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'Quality Inspection',
        fields: '["name", "item_code", "reference_name", "reference_type", "inspection_type", "status", "inspected_by", "report_date"]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as Inspection[]
  } catch (error) {
    console.error("Failed to fetch inspections:", error)
    return []
  }
}

// 2. CREATE: New Inspection
export async function createInspection(formData: FormData) {
  try {
    const cookieStore = await cookies()
    const currentUser = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value

    const machineValue = formData.get('machine') as string

    // ERPNext Quality Inspection valid reference_type values:
    // "", "Purchase Receipt", "Purchase Invoice", "Subcontracting Receipt",
    // "Delivery Note", "Sales Invoice", "Stock Entry", "Job Card"
    // Strategy: find the most recent Stock Entry or Delivery Note for this item.
    let referenceType = ''
    let referenceName = ''

    // Step 1: look for a Delivery Note (most relevant for outgoing inspection)
    try {
      const dns = await tenantAdminRequest('frappe.client.get_list', 'GET', {
        doctype: 'Delivery Note',
        fields: JSON.stringify(['name']),
        filters: JSON.stringify([['Delivery Note Item', 'item_code', '=', machineValue]]),
        order_by: 'creation desc',
        limit_page_length: 1
      }) as any[]
      if (dns && dns.length > 0) {
        referenceType = 'Delivery Note'
        referenceName = dns[0].name
      }
    } catch (e) {
      console.warn('Could not look up Delivery Note for item:', machineValue)
    }

    // Step 2: if no Delivery Note, look for a Stock Entry
    if (!referenceName) {
      try {
        const stes = await tenantAdminRequest('frappe.client.get_list', 'GET', {
          doctype: 'Stock Entry',
          fields: JSON.stringify(['name']),
          filters: JSON.stringify([['Stock Entry Detail', 'item_code', '=', machineValue]]),
          order_by: 'creation desc',
          limit_page_length: 1
        }) as any[]
        if (stes && stes.length > 0) {
          referenceType = 'Stock Entry'
          referenceName = stes[0].name
        }
      } catch (e) {
        console.warn('Could not look up Stock Entry for item:', machineValue)
      }
    }

    // Step 3: if still nothing, create a minimal Material Receipt Stock Entry to anchor the inspection
    if (!referenceName) {
      console.log(`No transaction found for ${machineValue}, creating anchor Stock Entry`)
      try {
        const warehouses = await tenantAdminRequest('frappe.client.get_list', 'GET', {
          doctype: 'Warehouse',
          filters: '[["is_group", "=", 0]]',
          fields: JSON.stringify(['name']),
          limit_page_length: 1
        }) as any[]
        const toWarehouse = warehouses[0]?.name || 'Stores - ERP - A'

        const ste = await tenantAdminRequest('frappe.client.insert', 'POST', {
          doc: {
            doctype: 'Stock Entry',
            stock_entry_type: 'Material Receipt',
            to_warehouse: toWarehouse,
            items: [{ item_code: machineValue, qty: 1, basic_rate: 0 }],
            docstatus: 1
          }
        }) as any
        referenceType = 'Stock Entry'
        referenceName = ste.name
      } catch (steErr: any) {
        console.warn('Could not create anchor Stock Entry:', steErr.message)
      }
    }

    // Build doc — only include reference fields when we have a valid pair
    const bookingId = (formData.get('booking_id') as string) || ''
    const userRemarks = (formData.get('notes') as string) || ''
    // Append booking reference to remarks so we can look it up later
    const fullRemarks = bookingId
      ? `${userRemarks}${userRemarks ? '\n' : ''}Booking: ${bookingId}`
      : userRemarks

    const inspectionDoc: Record<string, any> = {
      doctype: 'Quality Inspection',
      inspection_type: formData.get('type'),
      item_code: machineValue,
      sample_size: 1,
      report_date: new Date().toISOString().split('T')[0],
      status: formData.get('status'),
      remarks: fullRemarks || null,
      inspected_by: currentUser,
    }

    if (referenceType && referenceName) {
      inspectionDoc.reference_type = referenceType
      inspectionDoc.reference_name = referenceName
    }

    await tenantAdminRequest('frappe.client.insert', 'POST', { doc: inspectionDoc })

    revalidatePath('/inspections')
    revalidatePath('/bookings')
    if (bookingId) revalidatePath(`/bookings/${bookingId}`)
    return { success: true, bookingId }
  } catch (error: any) {
    console.error("Create inspection error:", error)
    return { error: error.message || 'Failed to create inspection' }
  }
}

// 3. READ: Get Single Inspection
export async function getInspection(id: string): Promise<Inspection | null> {
  try {
    const inspection = await tenantAdminRequest('frappe.client.get', 'GET', {
      doctype: 'Quality Inspection',
      name: decodeURIComponent(id)
    })
    return inspection as Inspection
  } catch (error) {
    console.error("Failed to fetch inspection:", error)
    return null
  }
}

// 4. UPDATE: Update Inspection Status
export async function updateInspection(inspectionId: string, formData: FormData) {
  try {
    await tenantAdminRequest('frappe.client.set_value', 'POST', {
      doctype: 'Quality Inspection',
      name: inspectionId,
      fieldname: {
        status: formData.get('status'),
        remarks: formData.get('remarks')
      }
    })
    revalidatePath(`/inspections/${inspectionId}`)
    revalidatePath('/inspections')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to update inspection' }
  }
}

// 5. GET: Get Inspections for a booking / asset using multiple lookup strategies
export async function getAssetInspections(itemCode: string, salesOrderId?: string) {
  const inspectionFields = JSON.stringify([
    'name', 'item_code', 'inspection_type', 'status',
    'report_date', 'inspected_by', 'remarks', 'reference_type', 'reference_name'
  ])
  const seen = new Set<string>()
  const results: Inspection[] = []

  const absorb = (list: any[]) => {
    for (const i of list || []) {
      if (i?.name && !seen.has(i.name)) { seen.add(i.name); results.push(i as Inspection) }
    }
  }

  // Strategy 1: filter by item_code directly
  if (itemCode) {
    try {
      const code = decodeURIComponent(itemCode)
      absorb(await tenantAdminRequest('frappe.client.get_list', 'GET', {
        doctype: 'Quality Inspection',
        fields: inspectionFields,
        filters: JSON.stringify([['item_code', '=', code]]),
        order_by: 'creation desc',
        limit_page_length: 50
      }) as any[])
    } catch {}
  }

  // Strategy 2: look up Delivery Notes for this Sales Order, then inspections referencing those DNs
  if (salesOrderId) {
    try {
      const dns = await tenantAdminRequest('frappe.client.get_list', 'GET', {
        doctype: 'Delivery Note',
        fields: JSON.stringify(['name']),
        filters: JSON.stringify([['Delivery Note Item', 'against_sales_order', '=', salesOrderId]]),
        order_by: 'creation desc',
        limit_page_length: 10
      }) as any[]

      for (const dn of dns || []) {
        try {
          absorb(await tenantAdminRequest('frappe.client.get_list', 'GET', {
            doctype: 'Quality Inspection',
            fields: inspectionFields,
            filters: JSON.stringify([['reference_name', '=', dn.name]]),
            order_by: 'creation desc',
            limit_page_length: 10
          }) as any[])
        } catch {}
      }
    } catch {}

    // Strategy 3: inspections whose remarks contain the Sales Order ID (set by createInspection)
    try {
      absorb(await tenantAdminRequest('frappe.client.get_list', 'GET', {
        doctype: 'Quality Inspection',
        fields: inspectionFields,
        filters: JSON.stringify([['remarks', 'like', `%${salesOrderId}%`]]),
        order_by: 'creation desc',
        limit_page_length: 20
      }) as any[])
    } catch {}
  }

  return results.sort((a: any, b: any) =>
    (b.report_date || '').localeCompare(a.report_date || '')
  )
}


