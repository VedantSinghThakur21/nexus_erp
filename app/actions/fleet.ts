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
        item_group: 'All Item Groups',
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

  await ensureMasterData('Customer', customer, { customer_name: customer, customer_group: 'All Customer Groups', customer_type: 'Company' });

  try {
    const bookingDoc = {
        doctype: 'Sales Order',
        customer: customer,
        transaction_date: new Date().toISOString().split('T')[0],
        delivery_date: startDate, 
        po_no: `RENT-${assetId}`, 
        
        items: [{
            item_code: itemCode, 
            description: `Rental of ${assetId} from ${startDate} to ${endDate}`,
            qty: 1,
            rate: rate,
            delivery_date: endDate 
        }],
        
        status: 'Draft'
    }

    await frappeRequest('frappe.client.insert', 'POST', { doc: bookingDoc })
    revalidatePath(`/fleet/${assetId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Booking error:", error)
    return { error: error.message || 'Booking failed' }
  }
}
