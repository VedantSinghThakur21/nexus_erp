'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface Asset {
  name: string // Serial No
  item_code: string
  item_name: string
  status: string
  warehouse: string
  purchase_date?: string
  warranty_expiry_date?: string
  asset_value?: number
  brand?: string
  details?: string
}

// 1. READ: Get All Machines
export async function getFleet() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'Serial No',
        fields: '["name", "item_code", "item_name", "status", "warehouse"]',
        filters: '[["status", "!=", "Scrapped"]]',
        order_by: 'creation desc',
        limit_page_length: 100
      }
    )
    return response as Asset[]
  } catch (error) {
    console.error("Failed to fetch fleet:", error)
    return []
  }
}

// 2. READ: Get Single Machine
export async function getAsset(id: string) {
  const name = decodeURIComponent(id)
  try {
    const asset = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Serial No',
      name: name
    })
    return asset as Asset
  } catch (error) {
    console.error("Error fetching asset:", error)
    return null
  }
}

// 2b. READ: Get Customer's Booking History
export async function getCustomerBookingHistory(customerId: string) {
  try {
    const bookings = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Sales Order',
      fields: '["name", "transaction_date", "delivery_date", "grand_total", "status", "po_no", "per_delivered"]',
      filters: `[["customer", "=", "${customerId}"], ["po_no", "like", "RENT-%"]]`,
      order_by: 'transaction_date desc',
      limit_page_length: 20
    })
    
    return bookings.map((booking: any) => ({
      ...booking,
      equipment: booking.po_no?.replace('RENT-', '') || 'Unknown'
    }))
  } catch (error) {
    console.error('Failed to fetch customer booking history:', error)
    return []
  }
}

// 2c. READ: Get Equipment's Booking History
export async function getEquipmentBookingHistory(equipmentId: string) {
  try {
    const bookings = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Sales Order',
      fields: '["name", "customer", "customer_name", "transaction_date", "delivery_date", "grand_total", "status", "per_delivered"]',
      filters: `[["po_no", "=", "RENT-${equipmentId}"]]`,
      order_by: 'transaction_date desc',
      limit_page_length: 10
    })
    
    return bookings
  } catch (error) {
    console.error('Failed to fetch equipment booking history:', error)
    return []
  }
}

// --- HELPER: Smart Auto-Creation ---
async function ensureMasterData(doctype: string, name: string, extraFields: any = {}): Promise<string> {
  if (!name) return "";
  
  try {
    // Try to get existing record
    await frappeRequest('frappe.client.get', 'GET', { doctype, name });
    return name;
  } catch (e) {
    // Try fuzzy match for existing record (e.g., "Stores - ERP - A")
    try {
        const list = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype,
            filters: `[["name", "like", "${name}%"]]`,
            fields: '["name"]',
            limit_page_length: 1
        });
        if (list && list.length > 0) {
            return list[0].name;
        }
    } catch (searchErr) {}

    console.log(`Creating missing ${doctype}: ${name}`);
    try {
        let finalFields = { ...extraFields };
        
        // Special logic for Warehouse parent
        if (doctype === 'Warehouse' && !finalFields.parent_warehouse) {
            const roots = await frappeRequest('frappe.client.get_list', 'GET', {
                doctype: 'Warehouse',
                filters: '[["is_group", "=", 1], ["parent_warehouse", "=", ""]]',
                limit_page_length: 1
            });
            
            if (roots && roots.length > 0) {
                finalFields.parent_warehouse = roots[0].name;
            } else {
                const anyGroup = await frappeRequest('frappe.client.get_list', 'GET', {
                    doctype: 'Warehouse',
                    filters: '[["is_group", "=", 1]]',
                    limit_page_length: 1
                });
                if (anyGroup && anyGroup.length > 0) finalFields.parent_warehouse = anyGroup[0].name;
            }
        }

        const newDoc = await frappeRequest('frappe.client.insert', 'POST', {
            doc: { 
                doctype, 
                [doctype === 'Brand' ? 'brand' : 'warehouse_name']: name, 
                ...finalFields 
            }
        });
        return newDoc.name;

    } catch (createError: any) {
        // Handle race condition where it exists but wasn't found initially
        if (createError.message && createError.message.includes("already exists")) {
            const list = await frappeRequest('frappe.client.get_list', 'GET', {
                doctype,
                filters: `[["name", "like", "${name}%"]]`,
                fields: '["name"]',
                limit_page_length: 1
            });
            if (list && list.length > 0) return list[0].name;
        }
        return name; // Fallback
    }
  }
}

// 3. CREATE: Add New Machine (Updated Workflow)
export async function createMachine(formData: FormData) {
  const brandName = formData.get('brand') as string;
  const warehouseName = formData.get('warehouse') as string;
  const itemCode = formData.get('item_code') as string;
  const serialNo = formData.get('serial_no') as string;

  try {
    // 1. Ensure Dependencies Exist
    const finalBrand = await ensureMasterData('Brand', brandName) || brandName;
    let finalWarehouse = "";
    if (warehouseName) {
        finalWarehouse = await ensureMasterData('Warehouse', warehouseName, { is_group: 0 }) || warehouseName;
    }

    await ensureMasterData('Item', itemCode, {
        item_code: itemCode,
        item_group: 'Heavy Equipment Rental',
        is_stock_item: 1,
        has_serial_no: 1,
        stock_uom: 'Nos',
        valuation_rate: 1000 // Default valuation required for stock entry
    });

    // 2. Create the Serial No Record (WITHOUT Warehouse first)
    // ERPNext prevents setting warehouse directly on Serial No creation
    const machineData = {
        doctype: 'Serial No',
        item_code: itemCode, 
        serial_no: serialNo, 
        status: formData.get('status') || 'Active',
        // warehouse: finalWarehouse, // REMOVED to fix validation error
        
        purchase_date: formData.get('purchase_date'),
        warranty_expiry_date: formData.get('warranty_expiry'),
        brand: finalBrand,
        details: formData.get('description'), 
    }

    await frappeRequest('frappe.client.insert', 'POST', {
      doc: machineData
    })

    // 3. Create Stock Entry to Move Asset into Warehouse (If warehouse provided)
    // This effectively "receives" the machine into the warehouse
    if (finalWarehouse) {
        const stockEntry = {
            doctype: 'Stock Entry',
            stock_entry_type: 'Material Receipt',
            to_warehouse: finalWarehouse,
            items: [{
                item_code: itemCode,
                qty: 1,
                serial_no: serialNo, // Link the specific machine
                basic_rate: 1000 // Valuation rate
            }],
            docstatus: 1 // Submit immediately
        }
        
        try {
            await frappeRequest('frappe.client.insert', 'POST', { doc: stockEntry })
        } catch (stockError: any) {
            console.warn("Stock Entry Warning (Machine Created but not in Stock):", stockError.message);
            // We don't fail the whole request, as the Serial No record exists now
        }
    }
    
    revalidatePath('/fleet')
    return { success: true }
  } catch (error: any) {
    console.error("Create machine error:", error)
    return { error: error.message || 'Failed to create machine' }
  }
}

// 4. BOOKING
export async function bookMachine(formData: FormData) {
  const assetId = formData.get('asset_id') as string
  const customer = formData.get('customer') as string
  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string
  const itemCode = formData.get('item_code') as string
  const rate = parseFloat(formData.get('rate') as string || '0')
  const projectName = formData.get('project_name') as string
  const invoiceRef = formData.get('invoice_ref') as string

  try {
    // Verify customer exists
    const customerDoc = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Customer',
      name: customer
    })

    if (!customerDoc) {
      throw new Error('Customer not found. Please create customer first.')
    }

    // Check for overlapping bookings on the same asset
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
        throw new Error(`Equipment ${assetId} is already booked from ${booking.transaction_date} to ${booking.delivery_date}. Please choose different dates.`)
      }
    }

    // Calculate total days and amount
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const totalAmount = days * rate

    // Generate unique PO number with timestamp to avoid duplicates
    const timestamp = Date.now()
    const uniquePO = `RENT-${assetId}-${timestamp}`

    const bookingDoc = {
        doctype: 'Sales Order',
        customer: customer,
        transaction_date: new Date().toISOString().split('T')[0],
        delivery_date: startDate, 
        po_no: uniquePO,
        project: projectName || undefined,
        
        items: [{
            item_code: itemCode, 
            description: `Rental of ${assetId} from ${startDate} to ${endDate} (${days} days)${projectName ? ` - ${projectName}` : ''}`,
            qty: days,
            rate: rate,
            delivery_date: endDate
        }],
        
        // Add invoice reference in custom field or notes
        remarks: invoiceRef ? `Linked to Invoice: ${invoiceRef}` : `Equipment rental booking for ${days} days`,
        status: 'Draft'
    }

    const createdBooking = await frappeRequest('frappe.client.insert', 'POST', { doc: bookingDoc })
    
    revalidatePath(`/fleet/${assetId}`)
    revalidatePath('/bookings')
    return { success: true, bookingId: createdBooking.name }
  } catch (error: any) {
    console.error("Booking error:", error)
    return { error: error.message || 'Booking failed' }
  }
}
