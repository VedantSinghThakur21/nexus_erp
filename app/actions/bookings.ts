'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface Booking {
  name: string
  customer: string
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
        limit_page_length: 0
      }
    )
    return response as Booking[]
  } catch (error) {
    console.error("Failed to fetch bookings:", error)
    return []
  }
}

// 1b. Get Customer Booking History
export async function getCustomerBookingHistory(customerName: string) {
  try {
    const bookings = await frappeRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'Sales Order',
        fields: '["name", "transaction_date", "delivery_date", "grand_total", "status", "po_no"]',
        filters: `[["customer_name", "=", "${customerName}"], ["po_no", "like", "RENT-%"]]`,
        order_by: 'creation desc',
        limit_page_length: 10
      }
    ) as any[]
    
    // Calculate total bookings and total spent
    const totalBookings = bookings.length
    const totalSpent = bookings.reduce((sum: number, booking: any) => sum + booking.grand_total, 0)
    const completedBookings = bookings.filter((b: any) => b.status === 'Completed').length
    
    return {
      bookings,
      stats: {
        totalBookings,
        totalSpent,
        completedBookings
      }
    }
  } catch (error) {
    console.error("Failed to fetch customer booking history:", error)
    return {
      bookings: [],
      stats: {
        totalBookings: 0,
        totalSpent: 0,
        completedBookings: 0
      }
    }
  }
}

// 1c. Get Item Rental Analytics
export async function getItemRentalAnalytics(itemCode: string) {
  try {
    // Get all Sales Orders with this item
    const salesOrders = await frappeRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'Sales Order',
        fields: '["name", "customer_name", "transaction_date", "delivery_date", "grand_total", "status"]',
        filters: `[["po_no", "like", "RENT-${itemCode}%"]]`,
        order_by: 'creation desc',
      }
    )
    
    const totalRentals = salesOrders.length
    const totalRevenue = salesOrders.reduce((sum: number, order: any) => sum + order.grand_total, 0)
    const averageRentalDays = salesOrders.reduce((sum: number, order: any) => {
      const start = new Date(order.transaction_date)
      const end = new Date(order.delivery_date)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      return sum + days
    }, 0) / (totalRentals || 1)
    
    return {
      totalRentals,
      totalRevenue,
      averageRentalDays: Math.round(averageRentalDays),
      recentRentals: salesOrders.slice(0, 5)
    }
  } catch (error) {
    console.error("Failed to fetch item rental analytics:", error)
    return {
      totalRentals: 0,
      totalRevenue: 0,
      averageRentalDays: 0,
      recentRentals: []
    }
  }
}

// 1d. CREATE: Book Item/Equipment from Catalogue
export async function createBooking(formData: FormData) {
  const itemCode = formData.get('item_code') as string
  const customer = formData.get('customer') as string
  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string
  const rate = parseFloat(formData.get('rate') as string || '0')
  const projectName = formData.get('project_name') as string

  try {
    // Verify customer exists
    const customerDoc = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Customer',
      name: customer
    })

    if (!customerDoc) {
      throw new Error('Customer not found. Please create customer first.')
    }

    // Check for overlapping bookings on the same item
    const existingBookings = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Sales Order',
      filters: JSON.stringify([
        ['Sales Order Item', 'item_code', '=', itemCode],
        ['status', 'in', ['Draft', 'To Deliver and Bill', 'To Bill', 'To Deliver', 'On Hold']]
      ]),
      fields: JSON.stringify(['name', 'delivery_date', 'transaction_date']),
      limit_page_length: 0
    })

    // Check for date overlaps
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (const booking of existingBookings) {
      const bookingStart = new Date(booking.transaction_date)
      const bookingEnd = new Date(booking.delivery_date)
      
      // Check if dates overlap
      if (start <= bookingEnd && end >= bookingStart) {
        throw new Error(`${itemCode} is already booked from ${booking.transaction_date} to ${booking.delivery_date}. Please choose different dates.`)
      }
    }

    // Calculate total days and amount
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Generate unique PO number with timestamp
    const timestamp = Date.now()
    const uniquePO = `RENT-${itemCode}-${timestamp}`

    const bookingDoc = {
        doctype: 'Sales Order',
        customer: customer,
        transaction_date: startDate,
        delivery_date: endDate, 
        po_no: uniquePO,
        project: projectName || undefined,
        
        items: [{
            item_code: itemCode, 
            description: `Rental of ${itemCode} from ${startDate} to ${endDate} (${days} days)${projectName ? ` - ${projectName}` : ''}`,
            qty: days,
            rate: rate,
            delivery_date: endDate
        }],
        
        remarks: `Equipment rental booking for ${days} days`,
        status: 'Draft'
    }

    const createdBooking = await frappeRequest('frappe.client.insert', 'POST', { doc: bookingDoc })
    
    revalidatePath('/bookings')
    revalidatePath('/catalogue')
    return { success: true, bookingId: createdBooking.name }
  } catch (error: any) {
    console.error("Booking error:", error)
    return { error: error.message || 'Booking failed' }
  }
}

// 2. READ: Single Booking
export async function getBooking(id: string): Promise<Booking | null> {
  try {
    const booking = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: decodeURIComponent(id)
    })
    return booking as Booking
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
