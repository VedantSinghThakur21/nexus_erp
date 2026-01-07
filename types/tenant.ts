/**
 * Multi-Tenant Architecture Types
 * Each tenant gets their own ERPNext site
 */

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled' | 'pending'
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise'

export interface Tenant {
  id: string
  customer_name: string
  company_name: string
  subdomain: string // e.g., "acme" for acme.nexuserp.com
  site_url: string // Full ERPNext site URL
  erpnext_site: string // Bench site name e.g., "acme.localhost"
  plan: SubscriptionPlan
  status: TenantStatus
  owner_email: string
  owner_name: string
  
  // Site Configuration
  site_config: {
    db_name?: string
    db_password?: string
    admin_password?: string
    api_key?: string
    api_secret?: string
  }
  
  // Subscription Details
  subscription: {
    trial_start?: string
    trial_end?: string
    subscription_start?: string
    subscription_end?: string
    stripe_customer_id?: string
    stripe_subscription_id?: string
  }
  
  // Timestamps
  created_at: string
  updated_at: string
  provisioned_at?: string
}

export interface TenantCreateRequest {
  customer_name: string
  company_name: string
  subdomain: string
  owner_email: string
  owner_name: string
  plan: SubscriptionPlan
  admin_password?: string
}

export interface TenantProvisioningResult {
  success: boolean
  tenant?: Tenant
  site_url?: string
  admin_url?: string
  error?: string
}

// Plan Features
export interface PlanFeatures {
  name: string
  price: number
  interval: 'month' | 'year'
  features: {
    users: number | 'unlimited'
    leads: number | 'unlimited'
    projects: number | 'unlimited'
    invoices: number | 'unlimited'
    storage: number | 'unlimited' // in GB
    support: 'email' | 'priority' | '24/7'
    custom_domain: boolean
    api_access: boolean
    advanced_reports: boolean
    integrations: string[]
  }
  modules: string[] // Enabled ERPNext modules
}

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  free: {
    name: 'Free',
    price: 0,
    interval: 'month',
    features: {
      users: 2,
      leads: 50,
      projects: 5,
      invoices: 20,
      storage: 1,
      support: 'email',
      custom_domain: false,
      api_access: false,
      advanced_reports: false,
      integrations: []
    },
    modules: ['CRM', 'Contacts', 'Leads']
  },
  pro: {
    name: 'Pro',
    price: 2999,
    interval: 'month',
    features: {
      users: 10,
      leads: 1000,
      projects: 50,
      invoices: 500,
      storage: 10,
      support: 'priority',
      custom_domain: true,
      api_access: true,
      advanced_reports: true,
      integrations: ['stripe', 'zapier', 'slack']
    },
    modules: ['CRM', 'Sales', 'Buying', 'Stock', 'Accounts', 'Projects']
  },
  enterprise: {
    name: 'Enterprise',
    price: 9999,
    interval: 'month',
    features: {
      users: 'unlimited',
      leads: 'unlimited',
      projects: 'unlimited',
      invoices: 'unlimited',
      storage: 'unlimited',
      support: '24/7',
      custom_domain: true,
      api_access: true,
      advanced_reports: true,
      integrations: ['all']
    },
    modules: [
      'CRM', 'Sales', 'Buying', 'Stock', 'Accounts', 
      'Projects', 'HR', 'Manufacturing', 'Website'
    ]
  }
}
