'use server'

import { frappeRequest } from '@/app/lib/api'
import { Organization, OrganizationMember, SubscriptionTier } from '@/types/subscription'

// Create Organization in ERPNext as a custom doctype
export async function createOrganization(data: {
  name: string
  slug: string
  ownerEmail: string
  plan?: SubscriptionTier
}) {
  try {
    const organization: Organization = {
      name: data.name,
      slug: data.slug,
      subscription: {
        plan: data.plan || 'free',
        status: 'trial',
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      usage: {
        users: 1,
        leads: 0,
        projects: 0,
        invoices: 0,
        storage: 0
      },
      owner: data.ownerEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const result = await frappeRequest('frappe.client.insert', 'POST', {
      doc: {
        doctype: 'Organization',
        organization_name: organization.name,
        slug: organization.slug,
        subscription_plan: organization.subscription.plan,
        subscription_status: organization.subscription.status,
        trial_end: organization.subscription.trial_end,
        owner_email: organization.owner,
        max_users: 1,
        max_leads: 0,
        max_projects: 0,
        max_invoices: 0,
        max_storage: 0
      }
    })

    return { success: true, organization: result }
  } catch (error: any) {
    console.error('Error creating organization:', error)
    return { success: false, error: error.message }
  }
}

// Get Organization by slug
export async function getOrganization(slug: string) {
  try {
    const result = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Organization',
      filters: JSON.stringify({ slug: slug })
    })
    return result
  } catch (error) {
    console.error('Error fetching organization:', error)
    return null
  }
}

// Add member to organization
export async function addOrganizationMember(data: {
  organizationSlug: string
  email: string
  name: string
  role: 'admin' | 'member'
}) {
  try {
    const org = await getOrganization(data.organizationSlug)
    if (!org) {
      return { success: false, error: 'Organization not found' }
    }

    // Check if organization has reached user limit
    // This would be checked against subscription plan limits

    const member: OrganizationMember = {
      name: data.name,
      email: data.email,
      role: data.role,
      organization: data.organizationSlug,
      created_at: new Date().toISOString()
    }

    const result = await frappeRequest('frappe.client.insert', 'POST', {
      doc: {
        doctype: 'Organization Member',
        member_name: member.name,
        email: member.email,
        role: member.role,
        organization: member.organization
      }
    })

    return { success: true, member: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Update organization subscription
export async function updateSubscription(
  organizationSlug: string,
  newPlan: SubscriptionTier
) {
  try {
    const org = await getOrganization(organizationSlug)
    if (!org) {
      return { success: false, error: 'Organization not found' }
    }

    const result = await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Organization',
      name: org.name,
      fieldname: {
        subscription_plan: newPlan,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      }
    })

    return { success: true, organization: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Track usage
export async function updateUsage(
  organizationSlug: string,
  usageType: 'users' | 'leads' | 'projects' | 'invoices' | 'storage',
  increment: number = 1
) {
  try {
    const org = await getOrganization(organizationSlug)
    if (!org) {
      return { success: false, error: 'Organization not found' }
    }

    const fieldMap = {
      users: 'max_users',
      leads: 'max_leads',
      projects: 'max_projects',
      invoices: 'max_invoices',
      storage: 'max_storage'
    }

    const currentValue = org[fieldMap[usageType]] || 0
    const newValue = currentValue + increment

    const result = await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Organization',
      name: org.name,
      fieldname: {
        [fieldMap[usageType]]: newValue
      }
    })

    return { success: true, usage: newValue }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Check if organization can perform action
export async function canPerformAction(
  organizationSlug: string,
  actionType: 'users' | 'leads' | 'projects' | 'invoices' | 'storage',
  requiredAmount: number = 1
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const org = await getOrganization(organizationSlug)
    if (!org) {
      return { allowed: false, reason: 'Organization not found' }
    }

    const { SUBSCRIPTION_PLANS } = await import('@/types/subscription')
    const plan = SUBSCRIPTION_PLANS[org.subscription_plan as SubscriptionTier]
    
    const limitMap = {
      users: plan.features.maxUsers,
      leads: plan.features.maxLeads,
      projects: plan.features.maxProjects,
      invoices: plan.features.maxInvoices,
      storage: plan.features.maxStorage
    }

    const usageMap = {
      users: org.max_users || 0,
      leads: org.max_leads || 0,
      projects: org.max_projects || 0,
      invoices: org.max_invoices || 0,
      storage: org.max_storage || 0
    }

    const limit = limitMap[actionType]
    const currentUsage = usageMap[actionType]

    if (limit === -1) {
      return { allowed: true } // unlimited
    }

    if (currentUsage + requiredAmount > limit) {
      return {
        allowed: false,
        reason: `You have reached your ${actionType} limit (${limit}). Please upgrade your plan.`
      }
    }

    return { allowed: true }
  } catch (error: any) {
    return { allowed: false, reason: error.message }
  }
}
