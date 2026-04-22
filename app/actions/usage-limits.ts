'use server'

import { masterRequest } from '@/app/lib/api'
import { PLAN_FEATURES, type SubscriptionPlan } from '@/types/tenant'

interface UsageCheck {
  allowed: boolean
  current: number
  limit: number | 'unlimited'
  message?: string
}

/**
 * Get current tenant subscription and usage from master DB
 */
async function getTenantUsage(subdomain: string) {
  try {
    const result = await masterRequest('frappe.client.get_list', 'GET', {
      doctype: 'SaaS Tenant',
      filters: JSON.stringify({ subdomain }),
      fields: JSON.stringify(['plan', 'usage_users', 'usage_leads', 'usage_projects', 'usage_invoices', 'usage_storage']),
      limit_page_length: 1
    }) as any[];
    
    if (result && result.length > 0) {
      return result[0]
    }
    
    return null
  } catch (error) {
    console.error('Failed to get tenant usage:', error)
    return null
  }
}

/**
 * Check if user can create a new lead
 */
export async function canCreateLead(subdomain: string): Promise<UsageCheck> {
  const tenant = await getTenantUsage(subdomain)
  
  if (!tenant) {
    return { allowed: false, current: 0, limit: 0, message: 'Tenant not found' }
  }
  
  const plan = tenant.plan as SubscriptionPlan
  const features = PLAN_FEATURES[plan]
  const current = tenant.usage_leads || 0
  const limit = features.features.leads
  
  if (limit === 'unlimited') {
    return { allowed: true, current, limit }
  }
  
  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      message: `You've reached your limit of ${limit} leads on the ${features.name} plan. Upgrade to create more.`
    }
  }
  
  return { allowed: true, current, limit }
}

/**
 * Check if user can create a new project
 */
export async function canCreateProject(subdomain: string): Promise<UsageCheck> {
  const tenant = await getTenantUsage(subdomain)
  
  if (!tenant) {
    return { allowed: false, current: 0, limit: 0, message: 'Tenant not found' }
  }
  
  const plan = tenant.plan as SubscriptionPlan
  const features = PLAN_FEATURES[plan]
  const current = tenant.usage_projects || 0
  const limit = features.features.projects
  
  if (limit === 'unlimited') {
    return { allowed: true, current, limit }
  }
  
  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      message: `You've reached your limit of ${limit} projects on the ${features.name} plan. Upgrade to create more.`
    }
  }
  
  return { allowed: true, current, limit }
}

/**
 * Check if user can create a new invoice
 */
export async function canCreateInvoice(subdomain: string): Promise<UsageCheck> {
  const tenant = await getTenantUsage(subdomain)
  
  if (!tenant) {
    return { allowed: false, current: 0, limit: 0, message: 'Tenant not found' }
  }
  
  const plan = tenant.plan as SubscriptionPlan
  const features = PLAN_FEATURES[plan]
  const current = tenant.usage_invoices || 0
  const limit = features.features.invoices
  
  if (limit === 'unlimited') {
    return { allowed: true, current, limit }
  }
  
  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      message: `You've reached your limit of ${limit} invoices on the ${features.name} plan. Upgrade to create more.`
    }
  }
  
  return { allowed: true, current, limit }
}

/**
 * Check if user can invite another team member
 */
export async function canInviteUser(subdomain: string): Promise<UsageCheck> {
  const tenant = await getTenantUsage(subdomain)
  
  if (!tenant) {
    return { allowed: false, current: 0, limit: 0, message: 'Tenant not found' }
  }
  
  const plan = tenant.plan as SubscriptionPlan
  const features = PLAN_FEATURES[plan]
  const current = tenant.usage_users || 0
  const limit = features.features.users
  
  if (limit === 'unlimited') {
    return { allowed: true, current, limit }
  }
  
  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      message: `You've reached your limit of ${limit} users on the ${features.name} plan. Upgrade to add more team members.`
    }
  }
  
  return { allowed: true, current, limit }
}

/**
 * Increment usage counter for a specific resource
 */
export async function incrementUsage(
  subdomain: string,
  usageType: 'usage_users' | 'usage_leads' | 'usage_projects' | 'usage_invoices' | 'usage_storage',
  amount: number = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenant = await getTenantUsage(subdomain)
    
    if (!tenant) {
      return { success: false, error: 'Tenant not found' }
    }
    
    const currentValue = tenant[usageType] || 0
    const newValue = currentValue + amount
    
    await masterRequest('frappe.client.set_value', 'POST', {
      doctype: 'SaaS Tenant',
      name: subdomain,
      fieldname: usageType,
      value: newValue
    })
    
    return { success: true }
  } catch (error: any) {
    console.error('Failed to increment usage:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get usage summary for dashboard
 */
export async function getUsageSummary(subdomain: string) {
  const tenant = await getTenantUsage(subdomain)
  
  if (!tenant) {
    return null
  }
  
  const plan = tenant.plan as SubscriptionPlan
  const features = PLAN_FEATURES[plan]
  
  return {
    plan,
    planName: features.name,
    usage: {
      users: {
        current: tenant.usage_users || 0,
        limit: features.features.users
      },
      leads: {
        current: tenant.usage_leads || 0,
        limit: features.features.leads
      },
      projects: {
        current: tenant.usage_projects || 0,
        limit: features.features.projects
      },
      invoices: {
        current: tenant.usage_invoices || 0,
        limit: features.features.invoices
      },
      storage: {
        current: tenant.usage_storage || 0,
        limit: features.features.storage
      }
    }
  }
}


