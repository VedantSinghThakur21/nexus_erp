'use server'

import { frappeRequest } from '@/app/lib/api'

/**
 * Add usage tracking fields to Tenant DocType
 * This should be run once after creating the Tenant DocType
 */
export async function setupTenantUsageFields() {
  const usageFields = [
    {
      fieldname: 'usage_users',
      label: 'Usage: Users',
      fieldtype: 'Int',
      default: 0,
      description: 'Number of active users in this tenant'
    },
    {
      fieldname: 'usage_leads',
      label: 'Usage: Leads',
      fieldtype: 'Int',
      default: 0,
      description: 'Number of leads created'
    },
    {
      fieldname: 'usage_projects',
      label: 'Usage: Projects',
      fieldtype: 'Int',
      default: 0,
      description: 'Number of projects created'
    },
    {
      fieldname: 'usage_invoices',
      label: 'Usage: Invoices',
      fieldtype: 'Int',
      default: 0,
      description: 'Number of invoices created'
    },
    {
      fieldname: 'usage_storage',
      label: 'Usage: Storage (GB)',
      fieldtype: 'Float',
      default: 0,
      description: 'Storage used in GB'
    }
  ]

  const results = []

  for (const field of usageFields) {
    try {
      // Check if field already exists
      const existing = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Custom Field',
        filters: `[["dt", "=", "Tenant"], ["fieldname", "=", "${field.fieldname}"]]`,
        limit_page_length: 1
      })

      if (existing && existing.length > 0) {
        results.push({
          field: field.fieldname,
          status: 'exists',
          message: 'Field already exists'
        })
        continue
      }

      // Add custom field
      await frappeRequest('frappe.client.insert', 'POST', {
        doc: {
          doctype: 'Custom Field',
          dt: 'Tenant',
          fieldname: field.fieldname,
          label: field.label,
          fieldtype: field.fieldtype,
          default: field.default,
          description: field.description,
          insert_after: 'plan'
        }
      })

      results.push({
        field: field.fieldname,
        status: 'created',
        message: 'Field created successfully'
      })
    } catch (error: any) {
      results.push({
        field: field.fieldname,
        status: 'error',
        message: error.message || 'Failed to create field'
      })
    }
  }

  return {
    success: true,
    results
  }
}
