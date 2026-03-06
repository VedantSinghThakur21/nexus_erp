'use server'

import { frappeRequest } from "@/app/lib/api"
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
    const response = await frappeRequest(
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
      const dns = await frappeRequest('frappe.client.get_list', 'GET', {
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
        const stes = await frappeRequest('frappe.client.get_list', 'GET', {
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
        const warehouses = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Warehouse',
          filters: '[["is_group", "=", 0]]',
          fields: JSON.stringify(['name']),
          limit_page_length: 1
        }) as any[]
        const toWarehouse = warehouses[0]?.name || 'Stores - ERP - A'

        const ste = await frappeRequest('frappe.client.insert', 'POST', {
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
    const inspectionDoc: Record<string, any> = {
      doctype: 'Quality Inspection',
      inspection_type: formData.get('type'),
      item_code: machineValue,
      sample_size: 1,
      report_date: new Date().toISOString().split('T')[0],
      status: formData.get('status'),
      remarks: formData.get('notes'),
      inspected_by: currentUser,
    }

    if (referenceType && referenceName) {
      inspectionDoc.reference_type = referenceType
      inspectionDoc.reference_name = referenceName
    }

    await frappeRequest('frappe.client.insert', 'POST', { doc: inspectionDoc })

    revalidatePath('/inspections')
    return { success: true }
  } catch (error: any) {
    console.error("Create inspection error:", error)
    return { error: error.message || 'Failed to create inspection' }
  }
}

// 3. READ: Get Single Inspection
export async function getInspection(id: string): Promise<Inspection | null> {
  try {
    const inspection = await frappeRequest('frappe.client.get', 'GET', {
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
    await frappeRequest('frappe.client.set_value', 'POST', {
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

// 5. GET: Get Inspections for an Asset
export async function getAssetInspections(assetId: string) {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Quality Inspection',
        fields: '["name", "inspection_type", "status", "report_date", "inspected_by", "remarks"]',
        filters: `[["reference_name", "=", "${decodeURIComponent(assetId)}"]]`,
        order_by: 'report_date desc',
        limit_page_length: 20
      }
    )
    return response as Inspection[]
  } catch (error) {
    console.error('Failed to fetch asset inspections:', error)
    return []
  }
}
