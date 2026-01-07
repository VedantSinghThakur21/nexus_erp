'use server'

import { frappeRequest } from '@/app/lib/api'

interface SetupResult {
  success: boolean
  message: string
  details?: any
}

/**
 * Setup Tenant DocType in the master ERPNext site
 * This creates the custom DocType needed for multi-tenancy
 */
export async function setupTenantDocType(): Promise<SetupResult> {
  try {
    console.log('Starting Tenant DocType setup...')
    
    // 1. Check if Tenant DocType already exists
    const existingDocTypes = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'DocType',
      filters: JSON.stringify({ name: 'Tenant' }),
      fields: JSON.stringify(['name']),
      limit_page_length: 1
    })

    if (existingDocTypes && existingDocTypes.length > 0) {
      return {
        success: true,
        message: 'Tenant DocType already exists',
        details: { doctype: 'Tenant', status: 'exists' }
      }
    }

    // 2. Create Tenant DocType
    console.log('Creating Tenant DocType...')
    
    const tenantDocType = {
      doctype: 'DocType',
      name: 'Tenant',
      module: 'Custom',
      custom: 1,
      istable: 0,
      issingle: 0,
      is_submittable: 0,
      track_changes: 1,
      autoname: 'field:subdomain',
      fields: [
        // Basic Information
        {
          fieldname: 'subdomain',
          label: 'Subdomain',
          fieldtype: 'Data',
          in_list_view: 1,
          reqd: 1,
          unique: 1,
          description: 'URL subdomain for tenant (e.g., "acme" for acme.nexuserp.com)'
        },
        {
          fieldname: 'company_name',
          label: 'Company Name',
          fieldtype: 'Data',
          in_list_view: 1,
          reqd: 1
        },
        {
          fieldname: 'owner_email',
          label: 'Owner Email',
          fieldtype: 'Data',
          in_list_view: 1,
          reqd: 1,
          options: 'Email'
        },
        {
          fieldname: 'owner_name',
          label: 'Owner Name',
          fieldtype: 'Data'
        },
        {
          fieldname: 'section_break_1',
          fieldtype: 'Section Break',
          label: 'Subscription Details'
        },
        {
          fieldname: 'plan',
          label: 'Subscription Plan',
          fieldtype: 'Select',
          options: 'free\npro\nenterprise',
          default: 'free',
          in_list_view: 1,
          reqd: 1
        },
        {
          fieldname: 'status',
          label: 'Status',
          fieldtype: 'Select',
          options: 'pending\ntrial\nactive\nsuspended\ncancelled',
          default: 'pending',
          in_list_view: 1,
          reqd: 1
        },
        {
          fieldname: 'column_break_1',
          fieldtype: 'Column Break'
        },
        {
          fieldname: 'trial_end_date',
          label: 'Trial End Date',
          fieldtype: 'Date'
        },
        {
          fieldname: 'subscription_start',
          label: 'Subscription Start',
          fieldtype: 'Date'
        },
        {
          fieldname: 'subscription_end',
          label: 'Subscription End',
          fieldtype: 'Date'
        },
        {
          fieldname: 'section_break_2',
          fieldtype: 'Section Break',
          label: 'Site Configuration'
        },
        {
          fieldname: 'site_url',
          label: 'Site URL',
          fieldtype: 'Data',
          description: 'Full URL to tenant site (e.g., https://acme.nexuserp.com)'
        },
        {
          fieldname: 'erpnext_site',
          label: 'ERPNext Site Name',
          fieldtype: 'Data',
          description: 'Internal bench site name (e.g., acme.localhost)'
        },
        {
          fieldname: 'column_break_2',
          fieldtype: 'Column Break'
        },
        {
          fieldname: 'site_config',
          label: 'Site Configuration',
          fieldtype: 'Long Text',
          description: 'JSON configuration including API keys'
        },
        {
          fieldname: 'provisioned_at',
          label: 'Provisioned At',
          fieldtype: 'Datetime',
          read_only: 1
        },
        {
          fieldname: 'section_break_3',
          fieldtype: 'Section Break',
          label: 'Usage Tracking'
        },
        {
          fieldname: 'usage_users',
          label: 'Users Count',
          fieldtype: 'Int',
          default: 0,
          description: 'Current number of active users'
        },
        {
          fieldname: 'usage_leads',
          label: 'Leads Count',
          fieldtype: 'Int',
          default: 0,
          description: 'Current number of leads'
        },
        {
          fieldname: 'usage_projects',
          label: 'Projects Count',
          fieldtype: 'Int',
          default: 0,
          description: 'Current number of projects'
        },
        {
          fieldname: 'column_break_3',
          fieldtype: 'Column Break'
        },
        {
          fieldname: 'usage_invoices',
          label: 'Invoices Count',
          fieldtype: 'Int',
          default: 0,
          description: 'Current number of invoices'
        },
        {
          fieldname: 'usage_storage',
          label: 'Storage Used (GB)',
          fieldtype: 'Float',
          default: 0,
          precision: 2,
          description: 'Storage used in gigabytes'
        },
        {
          fieldname: 'last_usage_update',
          label: 'Last Usage Update',
          fieldtype: 'Datetime',
          read_only: 1
        },
        {
          fieldname: 'section_break_4',
          fieldtype: 'Section Break',
          label: 'Notes'
        },
        {
          fieldname: 'notes',
          label: 'Notes',
          fieldtype: 'Text Editor'
        }
      ],
      permissions: [
        {
          role: 'System Manager',
          read: 1,
          write: 1,
          create: 1,
          delete: 1,
          submit: 0,
          cancel: 0,
          amend: 0
        }
      ]
    }

    await frappeRequest('frappe.client.insert', 'POST', {
      doc: tenantDocType
    })

    console.log('Tenant DocType created successfully')

    return {
      success: true,
      message: 'Tenant DocType created successfully! You can now use multi-tenancy features.',
      details: {
        doctype: 'Tenant',
        fields_created: tenantDocType.fields.length,
        status: 'created'
      }
    }

  } catch (error: any) {
    console.error('Setup error:', error)
    return {
      success: false,
      message: `Failed to create Tenant DocType: ${error.message || 'Unknown error'}`,
      details: error
    }
  }
}

/**
 * Verify Tenant DocType setup
 */
export async function verifyTenantSetup(): Promise<SetupResult> {
  try {
    // Check if Tenant DocType exists
    const docTypes = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'DocType',
      filters: JSON.stringify({ name: 'Tenant' }),
      fields: JSON.stringify(['name', 'custom', 'issingle']),
      limit_page_length: 1
    })

    if (!docTypes || docTypes.length === 0) {
      return {
        success: false,
        message: 'Tenant DocType not found. Please run setup first.',
        details: { status: 'not_found' }
      }
    }

    // Check if we can fetch fields
    const fields = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'DocType',
      name: 'Tenant'
    })

    const expectedFields = ['subdomain', 'company_name', 'plan', 'status', 'usage_users', 'usage_leads', 'usage_projects', 'usage_invoices']
    const actualFields = fields.fields ? fields.fields.map((f: any) => f.fieldname) : []
    const missingFields = expectedFields.filter(f => !actualFields.includes(f))

    if (missingFields.length > 0) {
      return {
        success: false,
        message: `Tenant DocType is incomplete. Missing fields: ${missingFields.join(', ')}`,
        details: { missing_fields: missingFields }
      }
    }

    return {
      success: true,
      message: 'Tenant DocType is properly configured',
      details: {
        status: 'verified',
        fields_count: actualFields.length,
        custom: fields.custom
      }
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Verification failed: ${error.message}`,
      details: error
    }
  }
}

/**
 * Create a test tenant for testing purposes
 */
export async function createTestTenant(): Promise<SetupResult> {
  try {
    const testData = {
      doctype: 'Tenant',
      subdomain: 'test-demo',
      company_name: 'Test Company',
      owner_email: 'test@example.com',
      owner_name: 'Test User',
      plan: 'free',
      status: 'active',
      site_url: 'https://test-demo.nexuserp.com',
      erpnext_site: 'test-demo.localhost',
      usage_users: 1,
      usage_leads: 0,
      usage_projects: 0,
      usage_invoices: 0,
      usage_storage: 0
    }

    // Check if test tenant already exists
    const existing = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      filters: JSON.stringify({ subdomain: 'test-demo' }),
      limit_page_length: 1
    })

    if (existing && existing.length > 0) {
      return {
        success: true,
        message: 'Test tenant already exists',
        details: existing[0]
      }
    }

    await frappeRequest('frappe.client.insert', 'POST', {
      doc: testData
    })

    return {
      success: true,
      message: 'Test tenant created successfully',
      details: testData
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to create test tenant: ${error.message}`,
      details: error
    }
  }
}
