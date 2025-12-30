'use server'

/**
 * Setup script to create custom ERPNext doctypes for subscription management
 * Run this once to initialize the organization and subscription system
 */

import { frappeRequest } from '@/app/lib/api'

export async function setupERPNextDoctypes() {
  try {
    // 1. Create Organization DocType
    const orgDoctype = await frappeRequest('frappe.client.insert', 'POST', {
      doc: {
        doctype: 'DocType',
        name: 'Organization',
        module: 'Custom',
        custom: 1,
        is_submittable: 0,
        track_changes: 1,
        fields: [
          {
            fieldname: 'organization_name',
            label: 'Organization Name',
            fieldtype: 'Data',
            reqd: 1,
            in_list_view: 1
          },
          {
            fieldname: 'slug',
            label: 'Slug',
            fieldtype: 'Data',
            reqd: 1,
            unique: 1,
            in_list_view: 1
          },
          {
            fieldname: 'subscription_section',
            label: 'Subscription Details',
            fieldtype: 'Section Break'
          },
          {
            fieldname: 'subscription_plan',
            label: 'Subscription Plan',
            fieldtype: 'Select',
            options: 'free\npro\nenterprise',
            default: 'free',
            reqd: 1,
            in_list_view: 1
          },
          {
            fieldname: 'subscription_status',
            label: 'Subscription Status',
            fieldtype: 'Select',
            options: 'active\ntrial\ncancelled\nexpired',
            default: 'trial',
            reqd: 1,
            in_list_view: 1
          },
          {
            fieldname: 'trial_end',
            label: 'Trial End Date',
            fieldtype: 'Datetime'
          },
          {
            fieldname: 'current_period_start',
            label: 'Current Period Start',
            fieldtype: 'Datetime'
          },
          {
            fieldname: 'current_period_end',
            label: 'Current Period End',
            fieldtype: 'Datetime'
          },
          {
            fieldname: 'usage_section',
            label: 'Usage Statistics',
            fieldtype: 'Section Break'
          },
          {
            fieldname: 'usage_users',
            label: 'Users Count',
            fieldtype: 'Int',
            default: 0
          },
          {
            fieldname: 'usage_leads',
            label: 'Leads Count',
            fieldtype: 'Int',
            default: 0
          },
          {
            fieldname: 'usage_projects',
            label: 'Projects Count',
            fieldtype: 'Int',
            default: 0
          },
          {
            fieldname: 'usage_invoices',
            label: 'Invoices Count',
            fieldtype: 'Int',
            default: 0
          },
          {
            fieldname: 'usage_storage',
            label: 'Storage Used (MB)',
            fieldtype: 'Int',
            default: 0
          },
          {
            fieldname: 'owner_section',
            label: 'Owner Details',
            fieldtype: 'Section Break'
          },
          {
            fieldname: 'owner_email',
            label: 'Owner Email',
            fieldtype: 'Data',
            reqd: 1,
            options: 'Email'
          }
        ],
        permissions: [
          {
            role: 'System Manager',
            read: 1,
            write: 1,
            create: 1,
            delete: 1
          }
        ]
      }
    })

    // 2. Create Organization Member DocType
    const memberDoctype = await frappeRequest('frappe.client.insert', 'POST', {
      doc: {
        doctype: 'DocType',
        name: 'Organization Member',
        module: 'Custom',
        custom: 1,
        is_submittable: 0,
        track_changes: 1,
        fields: [
          {
            fieldname: 'member_name',
            label: 'Member Name',
            fieldtype: 'Data',
            reqd: 1,
            in_list_view: 1
          },
          {
            fieldname: 'email',
            label: 'Email',
            fieldtype: 'Data',
            options: 'Email',
            reqd: 1,
            in_list_view: 1
          },
          {
            fieldname: 'role',
            label: 'Role',
            fieldtype: 'Select',
            options: 'owner\nadmin\nmember',
            default: 'member',
            reqd: 1,
            in_list_view: 1
          },
          {
            fieldname: 'organization_slug',
            label: 'Organization',
            fieldtype: 'Data',
            reqd: 1,
            in_list_view: 1
          },
          {
            fieldname: 'status',
            label: 'Status',
            fieldtype: 'Select',
            options: 'active\ninvited\ninactive',
            default: 'active'
          }
        ],
        permissions: [
          {
            role: 'System Manager',
            read: 1,
            write: 1,
            create: 1,
            delete: 1
          }
        ]
      }
    })

    return {
      success: true,
      message: 'Custom doctypes created successfully',
      doctypes: { organization: orgDoctype, member: memberDoctype }
    }
  } catch (error: any) {
    console.error('Setup error:', error)
    return {
      success: false,
      error: error.message,
      message: 'Failed to create custom doctypes. They may already exist.'
    }
  }
}

// Add organization context to existing custom fields
export async function linkOrganizationToExistingDocs() {
  const doctypes = ['Lead', 'Quotation', 'Sales Order', 'Sales Invoice', 'Project']

  try {
    for (const doctype of doctypes) {
      await frappeRequest('frappe.client.insert', 'POST', {
        doc: {
          doctype: 'Custom Field',
          dt: doctype,
          fieldname: 'organization_slug',
          label: 'Organization',
          fieldtype: 'Data',
          insert_after: 'naming_series'
        }
      })
    }

    return { success: true, message: 'Organization field added to all documents' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
