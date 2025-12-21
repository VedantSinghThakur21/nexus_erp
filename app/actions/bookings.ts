'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface Booking {
  name: string
  customer_name: string
  transaction_date: string
  delivery_date: string
  grand_total: number
  status: string
  po_no: string
  items: any[]
  docstatus: number
  per_delivered: number 
}

// 1. READ: List
export async function getBookings() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'Sales Order',
        fields: '["name", "customer_name", "transaction_date", "delivery_date", "grand_total", "status", "po_no", "per_delivered"]',
        filters: '[["po_no", "like", "RENT-%"]]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as Booking[]
  } catch (error) {
    console.error("Failed to fetch bookings:", error)
    return []
  }
}

// 2. READ: Single Booking
export async function getBooking(id: string) {
  try {
    const booking = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: decodeURIComponent(id)
    })
    return booking
  } catch (error) {
    return null
  }
}

// 3. ACTION: Mobilize (Send to Site with Operator)
export async function mobilizeAsset(formData: FormData) {
  const bookingId = formData.get('booking_id') as string
  const operatorName = formData.get('operator') as string

  try {
    const booking = await getBooking(bookingId)
    if (!booking) throw new Error("Booking not found")

    const assetId = booking.po_no.replace('RENT-', '')

    // 1. Check Asset Status & Location
    let asset = await frappeRequest('frappe.client.get', 'GET', { doctype: 'Serial No', name: assetId })
    let sourceWarehouse = asset.warehouse;

    // Self-Healing Inventory Logic
    if (!sourceWarehouse) {
        const warehouses = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Warehouse', 
            filters: '[["is_group", "=", 0]]', 
            limit_page_length: 1
        });
        const defaultWh = warehouses[0]?.name || "Stores - ERP - A";
        
        await frappeRequest('frappe.client.insert', 'POST', {
            doc: {
                doctype: 'Stock Entry',
                stock_entry_type: 'Material Receipt',
                to_warehouse: defaultWh,
                items: [{
                    item_code: booking.items[0].item_code,
                    qty: 1,
                    serial_no: assetId,
                    basic_rate: 1000
                }],
                docstatus: 1
            }
        });
        sourceWarehouse = defaultWh;
    }

    // 2. Create Delivery Note (With Operator Info)
    const deliveryDoc = {
        doctype: 'Delivery Note',
        customer: booking.customer,
        // We add the operator to the instructions field so it appears on the printed document
        instructions: `Mobilized with Operator: ${operatorName || 'None assigned'}`,
        items: booking.items.map((item: any) => ({
            item_code: item.item_code,
            qty: item.qty,
            so_detail: item.name,
            against_sales_order: booking.name,
            serial_no: assetId,
            warehouse: sourceWarehouse
        })),
        docstatus: 1 // Submit immediately
    }

    await frappeRequest('frappe.client.insert', 'POST', { doc: deliveryDoc })

    // 3. Update Asset Status
    await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Serial No',
        name: assetId,
        fieldname: 'status',
        value: 'Delivered' 
    })

    revalidatePath(`/bookings/${bookingId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Mobilize error:", error)
    return { error: error.message || 'Failed to mobilize asset' }
  }
}

// 4. ACTION: Return Asset
export async function returnAsset(bookingId: string) {
  try {
    const booking = await getBooking(bookingId)
    if (!booking) throw new Error("Booking not found")
    
    if (!booking.po_no || !booking.po_no.startsWith('RENT-')) throw new Error("Invalid Rental Booking ID")
    const assetId = booking.po_no.replace('RENT-', '')

    // Check current asset status
    let asset;
    try {
        asset = await frappeRequest('frappe.client.get', 'GET', { doctype: 'Serial No', name: assetId });
    } catch (e) {
        throw new Error("Asset not found in system");
    }

    // Only create Material Receipt if asset is NOT already in a warehouse
    if (!asset.warehouse) {
        const itemCode = booking.items[0].item_code;
        
        // Find a warehouse to return to
        let targetWarehouse = "Stores - ERP - A";
        try {
            const warehouses = await frappeRequest('frappe.client.get_list', 'GET', {
                doctype: 'Warehouse',
                filters: '[["is_group", "=", 0]]',
                limit_page_length: 1
            })
            if (warehouses.length > 0) targetWarehouse = warehouses[0].name;
        } catch (e) {}

        // Create Material Receipt to add asset back to warehouse
        const stockEntry = {
            doctype: 'Stock Entry',
            stock_entry_type: 'Material Receipt',
            to_warehouse: targetWarehouse,
            items: [{
                item_code: itemCode,
                qty: 1,
                serial_no: assetId,
                basic_rate: 1000
            }],
            docstatus: 1
        }
        
        await frappeRequest('frappe.client.insert', 'POST', { doc: stockEntry })
        
        // Update Serial No with warehouse
        await frappeRequest('frappe.client.set_value', 'POST', {
            doctype: 'Serial No',
            name: assetId,
            fieldname: { warehouse: targetWarehouse }
        })
    }

    // Always update Serial No status to Active
    await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Serial No',
        name: assetId,
        fieldname: 'status',
        value: 'Active'
    })

    // Properly close the Sales Order by updating both status and per_delivered
    // First, fetch the latest sales order document
    const latestBooking = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Sales Order',
        name: bookingId
    })

    // Update the document with completed status
    latestBooking.status = 'Completed'
    latestBooking.per_delivered = 100
    
    // Save the updated document
    await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Sales Order',
        name: bookingId,
        fieldname: {
            status: 'Completed',
            per_delivered: 100
        }
    })

    revalidatePath(`/bookings/${bookingId}`)
    revalidatePath('/bookings')
    return { success: true }
  } catch (error: any) {
    console.error("Return error:", error)
    return { error: error.message || 'Failed to return asset' }
  }
}
