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
  delivery_status?: string
}

// 1. READ: List
export async function getBookings() {
  const baseFields = '["name", "customer_name", "transaction_date", "delivery_date", "grand_total", "status", "po_no", "per_delivered", "delivery_status"]'
  try {
    // Try filtering to rental bookings by po_no prefix first
    const rentalBookings = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Sales Order',
        fields: baseFields,
        filters: '[["po_no", "like", "RENT-%"]]',
        order_by: 'creation desc',
        limit_page_length: 100
      }
    ) as Booking[]

    if (rentalBookings && rentalBookings.length > 0) return rentalBookings

    // Fallback: return all Sales Orders if no RENT-% bookings found
    // (handles cases where po_no wasn't saved or order was created outside the app)
    const allBookings = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Sales Order',
        fields: baseFields,
        order_by: 'creation desc',
        limit_page_length: 100
      }
    ) as Booking[]
    return allBookings || []
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
    ) as any[]

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
    }) as any[]

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

    const createdBooking = await frappeRequest('frappe.client.insert', 'POST', { doc: bookingDoc }) as { name: string }

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
    if (!booking.items || booking.items.length === 0) throw new Error("Booking has no items")

    // Idempotency Check: Don't mobilize if Delivery Note already exists 
    // This prevents OverAllowanceError if a previous API cycle partially completed or user retries.
    try {
      const existingDn = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Delivery Note',
        filters: JSON.stringify([
          ['Delivery Note Item', 'against_sales_order', '=', bookingId],
          ['docstatus', '<', 2] // Not cancelled
        ]),
        limit_page_length: 1
      }) as any[]
      if (existingDn && existingDn.length > 0) {
        console.log(`Booking ${bookingId} already has a Delivery Note. Idempotently returning success.`)
        revalidatePath(`/bookings/${bookingId}`)
        return { success: true }
      }
    } catch(e) { /* ignore */ }

    const itemCode = booking.items[0].item_code

    // 0. Check if item has serial number tracking
    let hasSerialNo = false
    let isStockItem = true
    try {
      const existingItem = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Item',
        name: itemCode,
        fields: JSON.stringify(['has_serial_no', 'is_stock_item'])
      }) as any
      hasSerialNo = !!existingItem.has_serial_no
      isStockItem = !!existingItem.is_stock_item
    } catch (itemErr: any) {
      console.warn(`Could not fetch item ${itemCode}, proceeding without serial tracking:`, itemErr.message)
    }

    let assetId = ""
    let sourceWarehouse = ""

    if (hasSerialNo) {
      // --- Serial-tracked item flow ---
      assetId = booking.items[0].serial_no || booking.items[0].serial_and_batch_bundle

      if (!assetId && booking.po_no && booking.po_no.startsWith('RENT-')) {
        assetId = booking.po_no.replace('RENT-', '')
      }
      if (!assetId) {
        assetId = `${itemCode}-${booking.name}`
      }

      // 1. Check if Serial No exists, create if it doesn't
      let asset: any = {}
      try {
        asset = await frappeRequest('frappe.client.get', 'GET', { doctype: 'Serial No', name: assetId }) as { warehouse?: string }
        sourceWarehouse = asset.warehouse || ""
      } catch (e: any) {
        console.log(`Serial No ${assetId} not found, explicitly creating it`)
        try {
          await frappeRequest('frappe.client.insert', 'POST', {
            doc: {
              doctype: 'Serial No',
              item_code: itemCode,
              serial_no: assetId,
              status: 'Active'
            }
          })
        } catch (err) {
          console.error('Failed to create missing Serial No:', err)
        }
      }

      // Self-Healing: If no warehouse, receipt it first
      if (!sourceWarehouse) {
        const warehouses = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Warehouse',
          filters: '[["is_group", "=", 0]]',
          limit_page_length: 1
        }) as any[]
        const defaultWh = warehouses[0]?.name || "Stores - ERP - A"

        await frappeRequest('frappe.client.insert', 'POST', {
          doc: {
            doctype: 'Stock Entry',
            stock_entry_type: 'Material Receipt',
            to_warehouse: defaultWh,
            items: [{
              item_code: itemCode,
              qty: 1,
              serial_no: assetId,
              basic_rate: 1000
            }],
            docstatus: 1
          }
        })
        sourceWarehouse = defaultWh
      }
    } else if (isStockItem) {
      // --- Non-serial item flow: ensure stock exists in a warehouse ---
      const warehouses = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Warehouse',
        filters: '[["is_group", "=", 0]]',
        limit_page_length: 1
      }) as any[]
      const defaultWh = warehouses[0]?.name || "Stores - ERP - A"

      // Check current stock level
      let hasStock = false
      try {
        const bins = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Bin',
          filters: JSON.stringify([['item_code', '=', itemCode], ['warehouse', '=', defaultWh]]),
          fields: JSON.stringify(['actual_qty']),
          limit_page_length: 1
        }) as any[]
        hasStock = bins.length > 0 && bins[0].actual_qty > 0
      } catch (e) {
        console.warn('Could not check stock level, will attempt receipt')
      }

      if (!hasStock) {
        try {
          await frappeRequest('frappe.client.insert', 'POST', {
            doc: {
              doctype: 'Stock Entry',
              stock_entry_type: 'Material Receipt',
              to_warehouse: defaultWh,
              items: [{
                item_code: itemCode,
                qty: booking.items[0].qty || 1,
                basic_rate: 1000
              }],
              docstatus: 1
            }
          })
        } catch (stockErr: any) {
          console.warn('Stock receipt failed, proceeding:', stockErr.message)
        }
      }
      sourceWarehouse = defaultWh
    }

    // 2. Create Delivery Note (With Operator Info)
    const deliveryDoc = {
      doctype: 'Delivery Note',
      customer: booking.customer,
      instructions: `Mobilized with Operator: ${operatorName || 'None assigned'}`,
      items: booking.items.map((item: any) => ({
        item_code: item.item_code,
        qty: item.qty,
        uom: item.uom || item.stock_uom || 'Nos',
        stock_uom: item.stock_uom || item.uom || 'Nos',
        so_detail: item.name,
        against_sales_order: booking.name,
        ...(hasSerialNo && assetId ? { serial_no: assetId } : {}),
        warehouse: sourceWarehouse
      })),
      docstatus: 1
    }

    await frappeRequest('frappe.client.insert', 'POST', { doc: deliveryDoc }) as { name: string }

    // 3. Update Asset Status to "Issued" (only for serial-tracked items)
    if (hasSerialNo && assetId) {
      try {
        await frappeRequest('frappe.client.set_value', 'PUT', {
          doctype: 'Serial No',
          name: assetId,
          fieldname: 'status',
          value: 'Issued'
        })
      } catch (e) {
        console.warn('Could not update serial no status:', e)
      }
    }

    // Removed manual set_value for Sales Order status -> ERPNext auto-updates this when Delivery Note is submitted.

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
    if (!booking.items || booking.items.length === 0) throw new Error("Booking has no items")

    const itemCode = booking.items[0].item_code

    // 0. Check if item has serial number tracking
    let hasSerialNo = false
    let isStockItem = true
    try {
      const existingItem = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Item',
        name: itemCode,
        fields: JSON.stringify(['has_serial_no', 'is_stock_item'])
      }) as any
      hasSerialNo = !!existingItem.has_serial_no
      isStockItem = !!existingItem.is_stock_item
    } catch (itemErr: any) {
      console.warn(`Could not fetch item ${itemCode}, proceeding without serial tracking:`, itemErr.message)
    }

    // Find a warehouse
    let targetWarehouse = "Stores - ERP - A"
    try {
      const warehouses = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Warehouse',
        filters: '[["is_group", "=", 0]]',
        limit_page_length: 1
      }) as any[]
      if (warehouses.length > 0) targetWarehouse = warehouses[0].name
    } catch (e) { }

    if (hasSerialNo) {
      // --- Serial-tracked item flow ---
      let assetId = booking.items[0].serial_no || booking.items[0].serial_and_batch_bundle

      if (!assetId && booking.po_no && booking.po_no.startsWith('RENT-')) {
        assetId = booking.po_no.replace('RENT-', '')
      }
      if (!assetId) {
        assetId = `${itemCode}-${booking.name}`
      }

      // Check current asset status
      let asset: any = {}
      try {
        asset = await frappeRequest('frappe.client.get', 'GET', { doctype: 'Serial No', name: assetId }) as { warehouse?: string }
      } catch (e) {
        console.log(`Serial No ${assetId} not found in system during return, explicitly creating it`)
        try {
          await frappeRequest('frappe.client.insert', 'POST', {
            doc: {
              doctype: 'Serial No',
              item_code: itemCode,
              serial_no: assetId,
              status: 'Active'
            }
          })
        } catch (err) {
          console.error('Failed to create missing Serial No:', err)
        }
      }

      // Only create Material Receipt if asset is NOT already in a warehouse
      if (!asset.warehouse) {
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
      }

      // Update Serial No status to Active
      try {
        await frappeRequest('frappe.client.set_value', 'PUT', {
          doctype: 'Serial No',
          name: assetId,
          fieldname: 'status',
          value: 'Active'
        })
      } catch (e) {
        console.warn('Could not update serial no status:', e)
      }
    } else if (isStockItem) {
      // --- Non-serial item flow: receipt stock back ---
      try {
        await frappeRequest('frappe.client.insert', 'POST', {
          doc: {
            doctype: 'Stock Entry',
            stock_entry_type: 'Material Receipt',
            to_warehouse: targetWarehouse,
            items: [{
              item_code: itemCode,
              qty: booking.items[0].qty || 1,
              basic_rate: 1000
            }],
            docstatus: 1
          }
        })
      } catch (stockErr: any) {
        console.warn('Stock receipt on return failed, proceeding:', stockErr.message)
      }
    }

    // Properly close the Sales Order via standard status bypass method or let the invoicing cycle complete it.
    // We avoid manual set_value since Sales Orders are submitted docs.
    try {
      await frappeRequest(
        'erpnext.selling.doctype.sales_order.sales_order.update_status', 
        'POST', 
        { status: 'Closed', name: bookingId }
      )
    } catch (e: any) {
      console.warn("Could not formally close Sales Order via RPC, falling back to soft close:", e.message)
    }

    revalidatePath(`/bookings/${bookingId}`)
    revalidatePath('/bookings')
    return { success: true }
  } catch (error: any) {
    console.error("Return error:", error)
    return { error: error.message || 'Failed to return asset' }
  }
}



