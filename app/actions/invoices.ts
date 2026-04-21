'use server'

import { frappeRequest, getTenantContext } from "@/app/lib/api"
import { revalidatePath } from "next/cache"
import { canCreateInvoice, incrementUsage } from "./usage-limits"
import { headers } from "next/headers"
import { checkSalesOrderInvoiceEligibility, refreshSalesOrderStatus } from "./sales-orders"

export interface Brand {
  name: string
  brand: string
  description?: string
}

export interface Invoice {
  name: string
  customer_name: string
  grand_total: number
  status: string
  due_date: string
  currency: string
  docstatus?: number
  company: string
  total_taxes_and_charges?: number
  net_total?: number
  posting_date?: string
  place_of_supply?: string
  items?: any[]
  taxes?: any[]
  sales_order?: string // Link to source SO
}

export interface PaymentEntry {
  name: string
  docstatus?: number
  party_name: string
  payment_type: string
  mode_of_payment?: string
  posting_date: string
  party_type: string
  paid_amount?: number
  received_amount?: number
  difference_amount?: number
  reference_no?: string
  reference_date?: string
  references?: any[]
  paid_from?: string
  paid_to?: string
  paid_from_account_currency?: string
  creation?: string
  modified?: string
  owner?: string
}

async function getProvisioningCatalogDefaults() {
  try {
    const context = await getTenantContext()
    if (!context.isTenant || !context.subdomain) {
      return null
    }

    const { getTenantCatalogDefaults } = await import('@/lib/provisioning-client')
    const response = await getTenantCatalogDefaults(context.subdomain)
    return response.defaults
  } catch {
    return null
  }
}

async function createItemViaProvisioning(itemData: Record<string, unknown>) {
  try {
    const context = await getTenantContext()
    if (!context.isTenant || !context.subdomain) {
      return { item: null, error: 'Not in tenant context' }
    }

    const { createTenantItemWithDefaults } = await import('@/lib/provisioning-client')
    const response = await createTenantItemWithDefaults(context.subdomain, itemData)
    return { item: response.item, error: null as string | null }
  } catch (error: any) {
    return { item: null, error: error?.message || 'Provisioning fallback unavailable' }
  }
}

// GET BRANDS
export async function getBrands() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Brand',
        fields: '["name", "brand", "description"]',
        order_by: 'brand asc',
        limit_page_length: 100
      }
    )
    return response as Brand[]
  } catch (error) {
    console.error("Failed to fetch brands:", error)
    return []
  }
}

// CREATE BRAND
export async function createBrand(brandName: string) {
  try {
    const brandData = {
      doctype: 'Brand',
      brand: brandName,
      description: `Brand created from catalogue: ${brandName}`
    }

    const result = await frappeRequest('frappe.client.insert', 'POST', { doc: brandData })
    return { success: true, brand: result }
  } catch (error: any) {
    console.error("Failed to create brand:", error)
    return { success: false, error: error.message || 'Failed to create brand' }
  }
}

// CREATE/UPDATE ITEM
export async function createItem(formData: FormData) {
  try {
    const requestedGroup = (formData.get('item_group') as string) || ''
    if (!requestedGroup.trim()) {
      return { success: false, error: 'Item Group is required.' }
    }
    const requestedUom = ((formData.get('stock_uom') as string) || '').trim()

    let resolvedGroup = requestedGroup
    let resolvedUom = requestedUom
    let groupResolved = false
    let uomResolved = false

    // Best-effort: validate links and fallback to first accessible values.
    try {
      const groupByName = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Item Group',
        filters: `[["name", "=", "${requestedGroup}"]]`,
        fields: '["name"]',
        limit_page_length: 1
      }) as Array<{ name: string }>

      const groupByTitle = groupByName.length > 0
        ? groupByName
        : await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Item Group',
          filters: `[["item_group_name", "=", "${requestedGroup}"]]`,
          fields: '["name"]',
          limit_page_length: 1
        }) as Array<{ name: string }>

      if (groupByTitle.length > 0) {
        resolvedGroup = groupByTitle[0].name
        groupResolved = true
      } else {
        const fallbackGroup = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Item Group',
          filters: '[["is_group", "=", 0]]',
          fields: '["name"]',
          limit_page_length: 1,
          order_by: 'name asc'
        }) as Array<{ name: string }>
        if (fallbackGroup.length > 0) {
          resolvedGroup = fallbackGroup[0].name
          groupResolved = true
        }
      }
    } catch {
      // Ignore permission-related lookup failures; insert may still succeed.
    }

    if (requestedUom) {
      try {
        const uom = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'UOM',
          filters: `[["name", "=", "${requestedUom}"]]`,
          fields: '["name"]',
          limit_page_length: 1
        }) as Array<{ name: string }>
        if (uom.length > 0) {
          resolvedUom = uom[0].name
          uomResolved = true
        }
      } catch {
        // Ignore permission-related lookup failures; provisioning fallback below handles it.
      }
    }

    if (!uomResolved) {
      try {
        const fallbackUom = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'UOM',
          fields: '["name"]',
          limit_page_length: 1,
          order_by: 'name asc'
        }) as Array<{ name: string }>
        if (fallbackUom.length > 0) {
          resolvedUom = fallbackUom[0].name
          uomResolved = true
        }
      } catch {
        // Ignore permission-related lookup failures; provisioning fallback below handles it.
      }
    }

    if (!groupResolved || !uomResolved) {
      const provisioningDefaults = await getProvisioningCatalogDefaults()
      if (!groupResolved && provisioningDefaults?.item_group) {
        resolvedGroup = provisioningDefaults.item_group
        groupResolved = true
      }
      if (!uomResolved && provisioningDefaults?.stock_uom) {
        resolvedUom = provisioningDefaults.stock_uom
        uomResolved = true
      }
    }

    if (!resolvedUom.trim()) {
      return { success: false, error: 'No Unit of Measure found in ERPNext. Please configure UOM masters first.' }
    }

    const itemData: any = {
      doctype: 'Item',
      item_code: formData.get('item_code') as string,
      item_name: formData.get('item_name') as string,
      item_group: resolvedGroup,
      description: formData.get('description') as string,
      standard_rate: parseFloat(formData.get('standard_rate') as string),
      is_stock_item: formData.get('is_stock_item') === '1' ? 1 : 0,
      stock_uom: resolvedUom,
    }

    // Add optional fields if provided
    const brand = formData.get('brand') as string
    const manufacturer = formData.get('manufacturer') as string
    const openingStock = formData.get('opening_stock') as string
    const reorderLevel = formData.get('reorder_level') as string
    const openingStockQty = openingStock ? parseFloat(openingStock) : 0

    if (brand) itemData.brand = brand
    if (manufacturer) itemData.manufacturer = manufacturer
    // Do NOT include opening_stock in the Item doc itself.
    // ERPNext v15 auto-generates a Stock Entry when this field is set during
    // insert, but omits stock_entry_type on that internal doc, causing a
    // MandatoryError. We instead create a separate Opening Stock entry below.
    if (reorderLevel) itemData.reorder_level = parseFloat(reorderLevel)

    try {
      await frappeRequest('frappe.client.insert', 'POST', { doc: itemData })
    } catch (error: any) {
      // Some tenants have unexpected/missing Item Group or UOM links — try provisioning fallback.
      const message = String(error?.message || '')
      const provisioningResult = await createItemViaProvisioning(itemData)

      if (!provisioningResult.item?.name) {
        const isPermissionError =
          message.includes('Insufficient Permission') ||
          message.includes('does not have access to this document') ||
          message.includes('PermissionError')

        if (
          message.includes('Default Unit of Measure') ||
          message.includes('Could not find UOM') ||
          message.includes('Could not find Item Group') ||
          message.includes('No permission for UOM')
        ) {
          if (provisioningResult.error) {
            return {
              success: false,
              error: `ERP fallback unavailable while resolving Item Group/UOM. ${provisioningResult.error}`
            }
          }

          let fallbackGroup = itemData.item_group
          let fallbackUom = itemData.stock_uom

          const provisioningDefaults = await getProvisioningCatalogDefaults()
          if (provisioningDefaults?.item_group) fallbackGroup = provisioningDefaults.item_group
          if (provisioningDefaults?.stock_uom) fallbackUom = provisioningDefaults.stock_uom

          try {
            const groups = await frappeRequest('frappe.client.get_list', 'GET', {
              doctype: 'Item Group',
              filters: '[["is_group", "=", 0]]',
              fields: '["name"]',
              limit_page_length: 1,
              order_by: 'name asc'
            }) as Array<{ name: string }>
            if (groups.length > 0) fallbackGroup = groups[0].name
          } catch { }

          try {
            const uoms = await frappeRequest('frappe.client.get_list', 'GET', {
              doctype: 'UOM',
              fields: '["name"]',
              limit_page_length: 1,
              order_by: 'name asc'
            }) as Array<{ name: string }>
            if (uoms.length > 0) fallbackUom = uoms[0].name
          } catch { }

          if (!fallbackUom) {
            return {
              success: false,
              error: `Unable to resolve Item Group/UOM from ERP defaults. ${provisioningResult.error || ''}`.trim()
            }
          }

          const originalUom = String(itemData.stock_uom || '').trim()
          if (String(fallbackUom || '').trim() === originalUom) {
            return {
              success: false,
              error: 'Unable to resolve a valid UOM from ERP defaults. Please restart provisioning-service and verify catalog-defaults endpoint.'
            }
          }

          const retriedItem = { ...itemData, item_group: fallbackGroup, stock_uom: fallbackUom }
          await frappeRequest('frappe.client.insert', 'POST', { doc: retriedItem })
        } else if (isPermissionError) {
          return {
            success: false,
            error: provisioningResult.error
              ? `Your ERP user does not have permission to create Items, and the provisioning fallback is unavailable: ${provisioningResult.error}`
              : 'Your ERP user does not have permission to create Items. Ask your workspace admin to grant Item create permission.'
          }
        } else {
          throw error
        }
      }
    }

    // Create a separate Opening Stock entry if the user specified a non-zero qty.
    // ERPNext v15 requires stock_entry_type on the auto-generated Stock Entry when
    // opening_stock is set on the Item doc, causing a MandatoryError — so we
    // handle it explicitly here instead.
    if (openingStockQty > 0 && itemData.is_stock_item === 1) {
      try {
        const companies = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Company',
          fields: '["name"]',
          limit_page_length: 1,
        }) as Array<{ name: string }>
        const company = companies[0]?.name || ''

        // default_warehouse is not permitted in get_list; always resolve via Warehouse doctype
        let warehouse = ''
        if (true) {
          const warehouses = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Warehouse',
            filters: `[["company", "=", "${company}"], ["is_group", "=", 0]]`,
            fields: '["name"]',
            limit_page_length: 1,
            order_by: 'name asc',
          }) as Array<{ name: string }>
          warehouse = warehouses[0]?.name || ''
        }

        if (company && warehouse) {
          // ERPNext v15 validation runs before stock_entry_type → purpose is
          // auto-populated, so we set `purpose` explicitly. For Material Receipt
          // s_warehouse must be empty and t_warehouse is required per row.
          await frappeRequest('frappe.client.insert', 'POST', {
            doc: {
              doctype: 'Stock Entry',
              stock_entry_type: 'Material Receipt',
              purpose: 'Material Receipt',
              company,
              to_warehouse: warehouse,
              items: [{
                doctype: 'Stock Entry Detail',
                item_code: itemData.item_code,
                qty: openingStockQty,
                uom: itemData.stock_uom,
                stock_uom: itemData.stock_uom,
                conversion_factor: 1,
                t_warehouse: warehouse,
                basic_rate: itemData.standard_rate || 0,
                allow_zero_valuation_rate: 1,
              }],
            }
          })
        }
      } catch (stockErr: any) {
        // Non-fatal: item was created, opening stock entry failed. Log and continue.
        console.warn(`[createItem] Opening stock entry failed for ${itemData.item_code}:`, stockErr?.message)
      }
    }

    revalidatePath('/catalogue')
    return { success: true }
  } catch (error: any) {
    console.error("Failed to create item:", error)
    return { success: false, error: error.message || 'Failed to create item' }
  }
}

export async function updateItem(itemCode: string, formData: FormData) {
  try {
    const updateData: any = {
      item_name: formData.get('item_name') as string,
      item_group: formData.get('item_group') as string,
      description: formData.get('description') as string,
      standard_rate: parseFloat(formData.get('standard_rate') as string),
      is_stock_item: formData.get('is_stock_item') === '1' ? 1 : 0,
    }

    // Add optional fields if provided
    const brand = formData.get('brand') as string
    const manufacturer = formData.get('manufacturer') as string
    const reorderLevel = formData.get('reorder_level') as string

    if (brand) updateData.brand = brand
    if (manufacturer) updateData.manufacturer = manufacturer
    if (reorderLevel) updateData.reorder_level = parseFloat(reorderLevel)

    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Item',
      name: itemCode,
      fieldname: updateData
    })

    revalidatePath('/catalogue')
    return { success: true }
  } catch (error: any) {
    console.error("Failed to update item:", error)
    return { success: false, error: error.message || 'Failed to update item' }
  }
}

// 1. READ: Fetch list of invoices
export async function getInvoices() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Sales Invoice',
        fields: '["name", "customer_name", "grand_total", "status", "due_date", "currency", "docstatus"]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as Invoice[]
  } catch (error) {
    console.error("Failed to fetch invoices:", error)
    return []
  }
}

// 1.5 READ: Get Sales Orders Ready for Invoice (for pane display)
export async function getSalesOrdersReadyForInvoicePane() {
  try {

    const soList = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Sales Order',
      filters: JSON.stringify([
        ['docstatus', '=', '1'], // Submitted only
        ['per_billed', '<', '100'], // Not fully billed
        ['status', 'not in', ['Draft', 'Cancelled']]
      ]),
      fields: JSON.stringify([
        'name',
        'customer',
        'customer_name',
        'status',
        'delivery_status',
        'per_billed',
        'per_delivered',
        'grand_total',
        'currency',
        'transaction_date'
      ]),
      limit_page_length: 100,
      order_by: 'transaction_date desc'
    }) as any[]

    // Enrich with eligibility data
    const enrichedList = await Promise.all(
      soList.map(async (so: any) => {
        const eligibility = await checkSalesOrderInvoiceEligibility(so.name)
        return {
          ...so,
          eligible: eligibility.eligible,
          canPartiallyBill: eligibility.canPartiallyBill,
          reason: eligibility.reason,
          recommendations: eligibility.recommendations
        }
      })
    )

    return enrichedList

  } catch (error: any) {
    console.error('[getSalesOrdersReadyForInvoicePane] Error:', error)
    return []
  }
}

// 2. READ: Get single invoice
export async function getInvoice(invoiceId: string) {
  try {
    const invoice = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Invoice',
      name: invoiceId
    })
    return invoice
  } catch (error: any) {
    console.error("Failed to fetch invoice:", error)
    return null
  }
}

// --- HELPER: Create Tax Account if it doesn't exist ---
async function createTaxAccount(accountName: string, company: string) {
  try {
    // First, find the parent account (Duties and Taxes)
    const parentAccounts = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Account',
      filters: `[["account_name", "like", "%Duties and Taxes%"], ["is_group", "=", 1], ["company", "=", "${company}"]]`,
      fields: '["name"]',
      limit_page_length: 1
    }) as any[];

    const parentAccount = parentAccounts[0]?.name || `Duties and Taxes - ${company}`;

    // Create the tax account
    const newAccount = await frappeRequest('frappe.client.insert', 'POST', {
      doc: {
        doctype: 'Account',
        account_name: accountName,
        company: company,
        parent_account: parentAccount,
        account_type: 'Tax',
        is_group: 0
      }
    }) as { name: string };

    return newAccount.name;
  } catch (error) {
    console.error(`Failed to create tax account ${accountName}:`, error);
    return null;
  }
}

// --- HELPER: Find or Create Tax Accounts ---
async function getTaxAccount(search: string, company: string) {
  try {
    const accounts = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Account',
      filters: `[["account_name", "like", "%${search}%"], ["is_group", "=", 0], ["company", "=", "${company}"]]`,
      limit_page_length: 1
    }) as any[];

    if (accounts && accounts.length > 0) {
      return accounts[0]?.name;
    }

    // If not found, create it
    return await createTaxAccount(search, company);
  } catch (e) {
    console.error(`Error finding tax account ${search}:`, e);
    return null;
  }
}

// --- HELPER: Ensure Tax Template Exists ---
async function ensureTaxTemplate(templateName: string) {
  if (!templateName) return null;
  try {
    await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Taxes and Charges Template',
      name: templateName
    });
    return templateName;
  } catch (e) {
    try {
      // Get company first
      const companies = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Company',
        fields: '["name"]',
        limit_page_length: 1
      }) as any[];
      const companyName = companies[0]?.name;
      if (!companyName) throw new Error('No company found');

      // Dynamically find valid accounts for this company
      const cgstAcc = await getTaxAccount('CGST', companyName) || await getTaxAccount('Tax', companyName) || 'CGST';
      const sgstAcc = await getTaxAccount('SGST', companyName) || await getTaxAccount('Tax', companyName) || 'SGST';
      const igstAcc = await getTaxAccount('IGST', companyName) || await getTaxAccount('Tax', companyName) || 'IGST';

      // Define rows based on template name
      let taxes = [];
      if (templateName.includes('Out of State')) {
        taxes.push({
          charge_type: "On Net Total",
          account_head: igstAcc,
          description: "IGST",
          rate: 18
        });
      } else {
        taxes.push({
          charge_type: "On Net Total",
          account_head: cgstAcc,
          description: "CGST",
          rate: 9
        },
          {
            charge_type: "On Net Total",
            account_head: sgstAcc,
            description: "SGST",
            rate: 9
          });
      }

      await frappeRequest('frappe.client.insert', 'POST', {
        doc: {
          doctype: 'Sales Taxes and Charges Template',
          title: templateName,
          is_default: 1,
          taxes: taxes
        }
      });
      return templateName;
    } catch (createError) {
      console.error(`Failed to auto-create Tax Template ${templateName}.`, createError);
      return null;
    }
  }
}

// 2. CREATE: Create a new Invoice with Tax Template Support and Rental Data
export async function createInvoice(data: any) {
  // Check usage limits first
  const headersList = await headers()
  const subdomain = headersList.get('X-Subdomain')

  if (subdomain) {
    const usageCheck = await canCreateInvoice(subdomain)
    if (!usageCheck.allowed) {
      return {
        error: usageCheck.message || 'Invoice limit reached',
        limitReached: true,
        currentUsage: usageCheck.current,
        limit: usageCheck.limit
      }
    }
  }

  // Validate Sales Order if provided (implementing "ready for quotation" workflow for invoices)
  if (data.sales_order) {
    try {

      const salesOrder = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Sales Order',
        name: data.sales_order
      }) as any

      if (!salesOrder) {
        return { error: 'Linked Sales Order not found' }
      }

      // Validate Sales Order is submitted
      if (salesOrder.docstatus !== 1) {
        return {
          error: 'Cannot create invoice from draft Sales Order. Please submit the sales order first.',
          needsSubmission: true
        }
      }

      // Validate Sales Order status
      const invalidStatuses = ['Draft', 'Cancelled', 'On Hold']
      if (invalidStatuses.includes(salesOrder.status)) {
        return {
          error: `Cannot create invoice from Sales Order with status "${salesOrder.status}". Sales Order must be ready for invoicing.`,
          invalidStatus: true,
          currentStatus: salesOrder.status
        }
      }

      if (salesOrder.per_billed >= 100) {
        return {
          error: 'This Sales Order is already fully billed. Cannot create additional invoices.',
          alreadyFullyBilled: true,
          perBilled: salesOrder.per_billed
        }
      }

    } catch (validationError: any) {
      console.error('[createInvoice] Sales order validation error:', validationError)
      return { error: `Sales Order validation failed: ${validationError.message}` }
    }
  }

  // Process items to preserve rental data if coming from Sales Order
  const processedItems = (data.items || []).map((item: any) => {
    const baseItem: any = {
      item_code: item.item_code || 'Service',
      description: item.description,
      qty: parseFloat(item.qty),
      rate: parseFloat(item.rate),
      // Carry forward discounts so invoice matches SO/Quotation line pricing.
      discount_percentage: Number(item.discount_percentage ?? 0) || 0,
      gst_hsn_code: item.hsn_sac,
      uom: item.uom || "Nos"
    }

    // Preserve rental data if present
    if (item.custom_rental_data || item.custom_is_rental) {
      baseItem.custom_rental_data = item.custom_rental_data
      baseItem.custom_is_rental = item.custom_is_rental
      baseItem.custom_rental_type = item.custom_rental_type
      baseItem.custom_rental_duration = item.custom_rental_duration
      baseItem.custom_rental_start_date = item.custom_rental_start_date
      baseItem.custom_rental_end_date = item.custom_rental_end_date
      baseItem.custom_rental_start_time = item.custom_rental_start_time
      baseItem.custom_rental_end_time = item.custom_rental_end_time
      baseItem.custom_operator_included = item.custom_operator_included

      // Preserve all pricing components for invoice
      baseItem.custom_base_rental_cost = item.custom_base_rental_cost
      baseItem.custom_accommodation_charges = item.custom_accommodation_charges
      baseItem.custom_usage_charges = item.custom_usage_charges
      baseItem.custom_fuel_charges = item.custom_fuel_charges
      baseItem.custom_elongation_charges = item.custom_elongation_charges
      baseItem.custom_risk_charges = item.custom_risk_charges
      baseItem.custom_commercial_charges = item.custom_commercial_charges
      baseItem.custom_incidental_charges = item.custom_incidental_charges
      baseItem.custom_other_charges = item.custom_other_charges
      baseItem.custom_total_rental_cost = item.custom_total_rental_cost
    }

    return baseItem
  })

  const invoiceDoc: any = {
    doctype: 'Sales Invoice',
    customer: data.customer,
    posting_date: data.posting_date,
    due_date: data.due_date,
    items: processedItems,
    docstatus: 0 // Draft mode
  }

  // Add optional fields if provided
  if (data.place_of_supply) {
    invoiceDoc.place_of_supply = data.place_of_supply
  }

  if (data.company) {
    invoiceDoc.company = data.company
  }

  // Link to Sales Order if provided (preserves rental context)
  if (data.sales_order) {
    invoiceDoc.sales_order = data.sales_order
  }

  // If tax template is specified, fetch and add tax rows
  if (data.taxes_and_charges) {
    invoiceDoc.taxes_and_charges = data.taxes_and_charges

    try {
      // Fetch the tax template to get the tax rows
      const taxTemplate = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Sales Taxes and Charges Template',
        name: data.taxes_and_charges
      }) as { taxes?: any[] }

      // Add the tax rows to the invoice
      if (taxTemplate.taxes && taxTemplate.taxes.length > 0) {
        invoiceDoc.taxes = taxTemplate.taxes.map((tax: any, idx: number) => ({
          idx: idx + 1,
          doctype: 'Sales Taxes and Charges',
          charge_type: tax.charge_type,
          account_head: tax.account_head,
          description: tax.description,
          rate: tax.rate
        }))
      }
    } catch (taxError) {
      console.error("Error fetching tax template:", taxError)
      // Continue without taxes if template fetch fails
    }
  }

  try {
    const newDoc = await frappeRequest('frappe.client.insert', 'POST', {
      doc: invoiceDoc
    }) as { name: string }

    // Increment usage counter
    if (subdomain) {
      await incrementUsage(subdomain, 'usage_invoices')
    }

    // Refresh the linked Sales Order status from ERPNext (do not set status manually)
    if (data.sales_order) {
      try {
        await refreshSalesOrderStatus(data.sales_order)
        revalidatePath('/sales-orders')
        revalidatePath(`/sales-orders/${data.sales_order}`)
      } catch (statusError) {
        console.error("Error refreshing Sales Order status:", statusError)
      }
    }

    revalidatePath('/invoices')
    return { success: true, name: newDoc.name }
  } catch (error: any) {
    console.error("Create invoice error:", error)
    return { error: error.message || 'Failed to create invoice' }
  }
}

// 3. SUBMIT
export async function submitInvoice(id: string) {
  try {
    // First, fetch the latest version of the document to get the current modified timestamp
    const latestDoc = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Invoice',
      name: id
    })

    // Now submit with the latest document data (including modified timestamp)
    await frappeRequest('frappe.client.submit', 'POST', {
      doc: latestDoc
    })

    revalidatePath(`/invoices/${id}`)
    revalidatePath('/invoices')
    return { success: true }
  } catch (error: any) {
    const message = String(error?.message || '')
    if (message.includes('not in any active Fiscal Year')) {
      try {
        const { getTenant } = await import('@/lib/tenant')
        const { ensureSellingPriceList } = await import('@/lib/tenant-bootstrap')
        const subdomain = await getTenant()
        if (subdomain && subdomain !== 'master') {
          await ensureSellingPriceList(subdomain, 'INR')
          const refreshed = await frappeRequest('frappe.client.get', 'GET', {
            doctype: 'Sales Invoice',
            name: id,
          }) as any
          await frappeRequest('frappe.client.submit', 'POST', { doc: refreshed })
          revalidatePath(`/invoices/${id}`)
          revalidatePath('/invoices')
          return { success: true }
        }
      } catch {
        // fall through
      }
    }
    console.error("Submit error:", error)
    return { error: error.message || 'Failed to submit invoice' }
  }
}

// 4. CANCEL
export async function cancelInvoice(id: string) {
  try {
    await frappeRequest('frappe.client.cancel', 'POST', {
      doctype: 'Sales Invoice',
      name: id
    })

    revalidatePath(`/invoices/${id}`)
    revalidatePath('/invoices')
    return { success: true }
  } catch (error: any) {
    console.error("Cancel error:", error)
    return { error: error.message || 'Failed to cancel invoice' }
  }
}

// UPDATE INVOICE STATUS
export async function updateInvoiceStatus(id: string, status: string) {
  try {
    // Fetch the current invoice first
    const invoice = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Invoice',
      name: id
    })

    // Update the status field
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Sales Invoice',
      name: id,
      fieldname: 'status',
      value: status
    })

    revalidatePath(`/invoices/${id}`)
    revalidatePath('/invoices')
    return { success: true }
  } catch (error: any) {
    console.error("Update status error:", error)
    return { error: error.message || 'Failed to update invoice status' }
  }
}

// 5. SEARCH CUSTOMERS
export async function searchCustomers(query: string) {
  try {
    const customers = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Customer',
      filters: `[["customer_name", "like", "%${query}%"]]`,
      fields: '["name", "customer_name"]',
      limit_page_length: 10
    })
    return customers as { name: string, customer_name: string }[]
  } catch (error) {
    return []
  }
}

// 6. SEARCH ITEMS
export async function searchItems(query: string, itemGroup?: string) {
  try {
    let filters: string

    // If no query, get all items
    if (!query || query.trim() === '') {
      if (itemGroup && itemGroup !== 'All') {
        filters = `[["item_group", "=", "${itemGroup}"]]`
      } else {
        filters = '[]' // Get all items
      }
    } else {
      // Add item group filter if specified
      if (itemGroup && itemGroup !== 'All') {
        filters = `[["item_code", "like", "%${query}%"], ["item_group", "=", "${itemGroup}"]]`
      } else {
        filters = `[["item_code", "like", "%${query}%"]]`
      }
    }


    const items = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Item',
      filters: filters,
      fields: '["item_code", "item_name", "description", "item_group", "standard_rate", "is_stock_item"]',
      limit_page_length: 500,
      order_by: 'item_group asc, item_code asc'
    }) as any[]


    // Fetch actual stock quantities from Bin doctype for stock items
    // actual_qty is not a stored field on Item — it's aggregated from Bin
    const stockItemCodes = items
      .filter((item: any) => item.is_stock_item)
      .map((item: any) => item.item_code)

    const stockQtyMap: Record<string, number> = {}

    if (stockItemCodes.length > 0) {
      try {
        const binRecords = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Bin',
          filters: JSON.stringify([['item_code', 'in', stockItemCodes]]),
          fields: '["item_code", "actual_qty"]',
          limit_page_length: 1000
        }) as any[]

        // Sum actual_qty across all warehouses per item
        for (const bin of binRecords) {
          stockQtyMap[bin.item_code] = (stockQtyMap[bin.item_code] || 0) + (bin.actual_qty || 0)
        }
      } catch (binError) {
      }
    }

    const enhancedItems = items.map((item: any) => {
      if (item.is_stock_item) {
        const stockQty = stockQtyMap[item.item_code] || 0
        return { ...item, stock_qty: stockQty, available: stockQty > 0 }
      }
      return { ...item, stock_qty: null, available: true } // Services always available
    })

    return enhancedItems as ({
      item_code: string
      item_name: string
      description: string
      item_group: string
      standard_rate?: number
      stock_qty: number | null
      available: boolean
    })[]
  } catch (error) {
    console.error('[searchItems] Error:', error)
    return []
  }
}

// Get all item groups
export async function getItemGroups() {
  try {
    const groups = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Item Group',
      filters: '[["is_group", "=", 0]]',
      fields: '["name"]',
      limit_page_length: 0,
      order_by: 'name asc'
    }) as any[]
    return groups.map((g: any) => g.name) as string[]
  } catch (error) {
    return []
  }
}

export async function getUOMs() {
  try {
    const uoms = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'UOM',
      fields: '["name"]',
      limit_page_length: 0,
      order_by: 'name asc'
    }) as any[]
    return uoms.map((u: any) => u.name) as string[]
  } catch (error) {
    return []
  }
}

// Ensure required Item Groups exist in ERPNext
export async function ensureItemGroups() {
  try {
    // Item Group writes require System Manager — which regular tenant users don't have.
    // Delegate to the provisioning service which runs with ignore_permissions=True.
    const context = await getTenantContext()
    if (!context.isTenant || !context.subdomain) {
      return { success: true } // Not in a tenant context, skip
    }

    const { seedTenantDefaults } = await import('@/lib/provisioning-client')
    await seedTenantDefaults(context.subdomain)
    return { success: true }
  } catch (error) {
    // Non-fatal: if the provisioning service is unavailable, log and continue.
    // The dropdown will show empty and the user can retry later.
    console.error('Failed to ensure item groups:', error)
    return { success: false }
  }
}



// Get item with stock and pricing info
export async function getItemDetails(itemCode: string) {
  try {
    const item = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Item',
      name: itemCode
    }) as any

    // Use actual_qty from item record directly (no separate Bin query needed)
    const stockQty = item.actual_qty || 0

    // Get latest price from Item Price
    let price = item.standard_rate || 0
    try {
      const priceList = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Item Price',
        filters: `{"item_code": "${itemCode}"}`,
        fields: '["price_list_rate"]',
        order_by: 'modified desc',
        limit_page_length: 1
      }) as any[];
      if (priceList.length > 0) {
        price = priceList[0].price_list_rate
      }
    } catch (e) {
      // No price list
    }

    return {
      ...item,
      stock_qty: stockQty,
      current_price: price,
      available: stockQty > 0 || !item.is_stock_item
    }
  } catch (error) {
    return null
  }
}

// 7. GET COMPANY DETAILS
export async function getCompanyDetails() {
  try {
    // Get list of companies and use the first one as default
    const companies = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Company',
      fields: '["name", "company_name", "tax_id"]',
      limit_page_length: 1
    }) as any[];

    if (!companies || companies.length === 0) return null;

    const company = companies[0];
    return { name: company.company_name || company.name, gstin: company.tax_id }
  } catch (e) {
    console.error('Failed to fetch company details:', e);
    return null
  }
}

// 8. GET BANK DETAILS
export async function getBankDetails() {
  try {
    // Get first company
    const companies = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Company',
      fields: '["name"]',
      limit_page_length: 1
    }) as any[];

    if (!companies || companies.length === 0) return null;
    const companyName = companies[0].name;

    const banks = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Bank Account',
      filters: `[["company", "=", "${companyName}"], ["is_default", "=", 1]]`,
      fields: '["bank", "bank_account_no", "branch_code"]',
      limit_page_length: 1
    }) as any[]

    return banks[0] || null
  } catch (e) {
    return null
  }
}

// 9. GET CUSTOMER DETAILS
export async function getCustomerDetails(customerId: string) {
  try {
    const customer = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Customer',
      name: customerId
    }) as any

    let addressDisplay = ""
    if (customer.customer_primary_address) {
      try {
        const address = await frappeRequest('frappe.client.get', 'GET', {
          doctype: 'Address',
          name: customer.customer_primary_address
        }) as any
        addressDisplay = [address.address_line1, address.city, address.state].filter(Boolean).join(', ')
      } catch (addrError) { }
    }

    return { tax_id: customer.tax_id, primary_address: addressDisplay }
  } catch (e) {
    return null
  }
}

// 10. DELETE INVOICE
export async function deleteInvoice(id: string) {
  try {
    const invoice = await frappeRequest('frappe.client.get', 'GET', { doctype: 'Sales Invoice', name: id }) as { docstatus: number }
    if (invoice.docstatus === 1) throw new Error("Cannot delete Submitted invoice")

    await frappeRequest('frappe.client.delete', 'POST', { doctype: 'Sales Invoice', name: id })

    revalidatePath('/invoices')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete invoice' }
  }
}

// 11. GET TAX TEMPLATES (New Helper)
export async function getTaxTemplates() {
  try {
    const templates = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Sales Taxes and Charges Template',
      fields: '["name", "title"]',
      filters: '[["disabled", "=", 0]]'
    })
    return templates as { name: string, title: string }[]
  } catch (error) {
    return []
  }
}

// 12. CREATE PAYMENT ENTRY
export async function createPaymentEntry(data: {
  invoiceName: string
  paymentAmount: number
  paymentDate: string
  modeOfPayment?: string
  referenceNo?: string
  referenceDate?: string
}) {
  try {
    // Fetch the invoice to get necessary details
    const invoice = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Invoice',
      name: data.invoiceName
    }) as any

    if (invoice.docstatus !== 1) {
      throw new Error('Invoice must be submitted before creating payment entry')
    }

    // Get company default cash/bank account
    const company = invoice.company
    const currency = invoice.currency || 'INR'

    // Try to find a default bank account for the company
    let paidToAccount = null
    try {
      const bankAccounts = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Bank Account',
        filters: `[["company", "=", "${company}"], ["is_default", "=", 1]]`,
        fields: '["account"]',
        limit_page_length: 1
      }) as any[]
      paidToAccount = bankAccounts[0]?.account
    } catch (e) {
    }

    // If no bank account, try to find default cash account
    if (!paidToAccount) {
      try {
        const cashAccounts = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Account',
          filters: `[["account_type", "=", "Cash"], ["company", "=", "${company}"], ["is_group", "=", 0]]`,
          fields: '["name"]',
          limit_page_length: 1
        }) as any[]
        paidToAccount = cashAccounts[0]?.name
      } catch (e) {
        throw new Error('No default payment account found for company')
      }
    }

    // Create Payment Entry
    const paymentEntry = await frappeRequest('frappe.client.insert', 'POST', {
      doc: {
        doctype: 'Payment Entry',
        payment_type: 'Receive',
        posting_date: data.paymentDate,
        party_type: 'Customer',
        party: invoice.customer,
        company: company,
        paid_amount: data.paymentAmount,
        received_amount: data.paymentAmount,
        paid_to: paidToAccount,
        paid_from: invoice.debit_to,
        paid_to_account_currency: currency,
        paid_from_account_currency: currency,
        mode_of_payment: data.modeOfPayment || 'Cash',
        reference_no: data.referenceNo || '',
        reference_date: data.referenceDate || data.paymentDate,
        references: [
          {
            reference_doctype: 'Sales Invoice',
            reference_name: data.invoiceName,
            allocated_amount: data.paymentAmount,
            outstanding_amount: invoice.outstanding_amount || invoice.grand_total
          }
        ]
      }
    }) as { name: string }

    // Submit the payment entry
    await frappeRequest('frappe.client.submit', 'POST', {
      doc: paymentEntry
    })

    revalidatePath(`/invoices/${data.invoiceName}`)
    revalidatePath('/invoices')

    return { success: true, paymentEntry: paymentEntry.name }
  } catch (error: any) {
    console.error('Create payment entry error:', error)
    return { error: error.message || 'Failed to create payment entry' }
  }
}

// 13. GET ALL PAYMENT ENTRIES
export async function getPaymentEntries() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Payment Entry',
        fields: '["name", "posting_date", "party_name", "party_type", "paid_amount", "payment_type", "mode_of_payment", "reference_no", "reference_date", "docstatus"]',
        order_by: 'posting_date desc',
        limit_page_length: 100
      }
    )
    return response as any[]
  } catch (error) {
    console.error('Failed to fetch payment entries:', error)
    return []
  }
}

// 14. GET SINGLE PAYMENT ENTRY
export async function getPaymentEntry(id: string): Promise<PaymentEntry | null> {
  try {
    const payment = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Payment Entry',
      name: id
    }) as PaymentEntry
    return payment
  } catch (error) {
    console.error('Failed to fetch payment entry:', error)
    return null
  }
}

// 15. CREATE INVOICE FROM SALES ORDER (Ready for Quotation workflow)
export async function createInvoiceFromOrder(salesOrderId: string, postingDate?: string, dueDate?: string) {
  try {

    // 1. Fetch and validate Sales Order
    const salesOrder = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: salesOrderId
    }) as any

    if (!salesOrder) {
      return { error: 'Sales Order not found' }
    }


    // 2. Validate Sales Order is submitted (not draft)
    if (salesOrder.docstatus !== 1) {
      return {
        error: 'Sales Order must be submitted before creating an invoice. Please submit the sales order first.',
        needsSubmission: true
      }
    }

    // 3. Validate Sales Order status is appropriate for invoicing
    const invalidStatuses = ['Draft', 'Cancelled', 'On Hold']
    if (invalidStatuses.includes(salesOrder.status)) {
      return {
        error: `Cannot create invoice from Sales Order with status "${salesOrder.status}". Sales Order must be in "To Deliver and Bill", "To Bill", or "Completed" status.`,
        invalidStatus: true,
        currentStatus: salesOrder.status
      }
    }

    // 4. Check if already fully billed
    if (salesOrder.per_billed >= 100) {
      return {
        error: 'This Sales Order is already fully billed (100% billed). Cannot create additional invoices.',
        alreadyFullyBilled: true,
        perBilled: salesOrder.per_billed
      }
    }

    // 5. Check delivery status for orders that need delivery
    if (salesOrder.delivery_status === 'Not Delivered' && salesOrder.status === 'To Deliver and Bill') {
      return {
        error: 'Sales Order items must be delivered before invoicing. Please create a Delivery Note first.',
        needsDelivery: true,
        deliveryStatus: salesOrder.delivery_status
      }
    }


    // 6. Use ERPNext's built-in method to create sales invoice from sales order
    const invoiceDraft = await frappeRequest(
      'erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice',
      'POST',
      { source_name: salesOrderId }
    ) as any

    if (!invoiceDraft || !invoiceDraft.message) {
      return { error: 'Failed to generate invoice draft from Sales Order' }
    }

    const invoiceDoc = invoiceDraft.message

    // 7. Override dates if provided
    if (postingDate) {
      invoiceDoc.posting_date = postingDate
    }
    if (dueDate) {
      invoiceDoc.due_date = dueDate
    }

    // 8. Ensure invoice is created as draft (docstatus = 0)
    invoiceDoc.docstatus = 0


    // 9. Save the invoice
    const savedInvoice = await frappeRequest('frappe.client.insert', 'POST', {
      doc: invoiceDoc
    }) as { name?: string }

    if (!savedInvoice || !savedInvoice.name) {
      return { error: 'Failed to save invoice' }
    }

    const invoiceId = savedInvoice.name

    // 10. Update Sales Order status based on billing progress
    try {
      const updatedSalesOrder = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Sales Order',
        name: salesOrderId
      }) as any

      // ERPNext automatically updates per_billed, but we can ensure status is correct
      if (updatedSalesOrder.per_billed >= 100) {
        await frappeRequest('frappe.client.set_value', 'POST', {
          doctype: 'Sales Order',
          name: salesOrderId,
          fieldname: 'status',
          value: 'Completed'
        })
      } else {
        // Keep as "To Bill and Deliver" or "To Bill" based on delivery status
        const newStatus = updatedSalesOrder.delivery_status === 'Fully Delivered' ? 'To Bill' : 'To Deliver and Bill'
        await frappeRequest('frappe.client.set_value', 'POST', {
          doctype: 'Sales Order',
          name: salesOrderId,
          fieldname: 'status',
          value: newStatus
        })
      }

    } catch (statusError) {
      console.error('[createInvoiceFromOrder] Error updating Sales Order status:', statusError)
      // Don't fail the invoice creation if status update fails
    }

    // 11. Revalidate paths
    revalidatePath('/invoices')
    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath('/sales-orders')
    revalidatePath(`/sales-orders/${salesOrderId}`)

    return {
      success: true,
      invoiceId,
      invoice: savedInvoice,
      salesOrderUpdated: true
    }

  } catch (error: any) {
    console.error('[createInvoiceFromOrder] Error during invoice creation:', {
      message: error.message,
      stack: error.stack,
      fullError: error
    })
    return {
      error: error.message || 'Failed to create invoice from sales order'
    }
  }
}
/**
 * PRODUCTION-GRADE: Create Invoice from Sales Order with Full Workflow
 * This replaces the manual "New Invoice" button for SO-linked invoices
 * Uses the "Ready for Invoice" pane pattern
 */
export async function createInvoiceFromSalesOrderProdReady(
  salesOrderId: string,
  options?: {
    postingDate?: string
    dueDate?: string
    description?: string
  }
): Promise<{
  success?: boolean
  invoiceName?: string
  message?: string
  error?: string
  validation?: {
    passed: boolean
    issues: string[]
    recommendations?: string[]
  }
  invoiceEligibility?: {
    status: string
    delivery_status: string
    per_billed: number
    per_delivered: number
  }
}> {
  try {
    const headersList = await headers()
    const subdomain = headersList.get('X-Subdomain')


    // 1. Check usage limits
    if (subdomain) {
      const usageCheck = await canCreateInvoice(subdomain)
      if (!usageCheck.allowed) {
        return {
          error: usageCheck.message || 'Invoice limit reached',
          validation: {
            passed: false,
            issues: ['Invoice creation limit reached for this workspace']
          }
        }
      }
    }

    // 2. Check eligibility with detailed validation
    const eligibility = await checkSalesOrderInvoiceEligibility(salesOrderId)

    if (!eligibility.eligible) {
      return {
        error: eligibility.reason,
        validation: {
          passed: false,
          issues: eligibility.recommendations || [],
          recommendations: eligibility.recommendations
        },
        invoiceEligibility: eligibility.data
      }
    }

    // 3. Fetch Sales Order data
    const so = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: salesOrderId
    }) as any

    if (!so) {
      return {
        error: 'Sales Order not found',
        validation: { passed: false, issues: ['Sales Order was deleted'] }
      }
    }

    // 4. Generate invoice from SO using ERPNext method
    const invoiceDraft = await frappeRequest(
      'erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice',
      'POST',
      { source_name: salesOrderId }
    ) as any

    if (!invoiceDraft?.message) {
      return {
        error: 'Failed to generate invoice template from Sales Order',
        validation: {
          passed: false,
          issues: ['ERPNext template generation failed']
        }
      }
    }

    let invoiceDoc = invoiceDraft.message

    // 5. Apply custom data
    if (options?.postingDate) {
      invoiceDoc.posting_date = options.postingDate
    }
    if (options?.dueDate) {
      invoiceDoc.due_date = options.dueDate
    }
    if (options?.description) {
      invoiceDoc.remarks = options.description
    }

    invoiceDoc.docstatus = 0 // Draft


    // 6. Save invoice
    const savedInvoice = await frappeRequest('frappe.client.insert', 'POST', {
      doc: invoiceDoc
    }) as any

    if (!savedInvoice?.name) {
      return {
        error: 'Failed to save invoice to database',
        validation: {
          passed: false,
          issues: ['Database insertion failed']
        }
      }
    }

    const invoiceName = savedInvoice.name

    // 7. Increment usage
    if (subdomain) {
      try {
        await incrementUsage(subdomain, 'usage_invoices')
      } catch (usageError) {
        console.error('[createInvoiceFromSalesOrderProdReady] Warning - could not increment usage:', usageError)
      }
    }

    // 8. Refresh SO status (ERPNext updates per_billed automatically)
    try {
      await refreshSalesOrderStatus(salesOrderId)
    } catch (statusError) {
      console.error('[createInvoiceFromSalesOrderProdReady] Warning - status refresh failed:', statusError)
    }

    // 9. Invalidate caches
    revalidatePath('/invoices')
    revalidatePath(`/invoices/${invoiceName}`)
    revalidatePath('/sales-orders')
    revalidatePath(`/sales-orders/${salesOrderId}`)


    return {
      success: true,
      invoiceName,
      message: `Invoice ${invoiceName} created successfully from Sales Order ${salesOrderId}. You can now review and submit it.`,
      validation: { passed: true, issues: [] }
    }

  } catch (error: any) {
    console.error('[createInvoiceFromSalesOrderProdReady] Fatal error:', error)
    return {
      error: error.message || 'Unexpected error during invoice creation',
      validation: {
        passed: false,
        issues: [error.message || 'Unknown error occurred']
      }
    }
  }
}

