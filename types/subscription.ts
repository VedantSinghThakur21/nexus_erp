export type SubscriptionTier = 'free' | 'pro' | 'enterprise'

export interface SubscriptionPlan {
  id: SubscriptionTier
  name: string
  price: number
  currency: string
  interval: 'monthly' | 'yearly'
  features: {
    maxUsers: number
    maxLeads: number
    maxProjects: number
    maxInvoices: number
    maxStorage: number // in MB
    features: string[]
  }
}

export interface Organization {
  name: string
  slug: string
  subscription: {
    plan: SubscriptionTier
    status: 'active' | 'cancelled' | 'expired' | 'trial'
    current_period_start?: string
    current_period_end?: string
    trial_end?: string
  }
  usage: {
    users: number
    leads: number
    projects: number
    invoices: number
    storage: number
  }
  owner: string // email or user ID
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  name: string
  email: string
  role: 'owner' | 'admin' | 'member'
  organization: string // organization slug
  created_at: string
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'INR',
    interval: 'monthly',
    features: {
      maxUsers: 2,
      maxLeads: 50,
      maxProjects: 5,
      maxInvoices: 20,
      maxStorage: 100,
      features: [
        'Basic CRM',
        'Lead Management (up to 50)',
        'Basic Invoicing (up to 20)',
        'Email Support',
        '2 Team Members',
        '100 MB Storage'
      ]
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 2999,
    currency: 'INR',
    interval: 'monthly',
    features: {
      maxUsers: 10,
      maxLeads: 1000,
      maxProjects: 50,
      maxInvoices: 500,
      maxStorage: 5000,
      features: [
        'Advanced CRM',
        'Unlimited Leads (up to 1000)',
        'Unlimited Invoicing (up to 500)',
        'Rental Pricing System',
        'Fleet Management',
        'Booking System',
        'Priority Support',
        '10 Team Members',
        '5 GB Storage'
      ]
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9999,
    currency: 'INR',
    interval: 'monthly',
    features: {
      maxUsers: -1, // unlimited
      maxLeads: -1,
      maxProjects: -1,
      maxInvoices: -1,
      maxStorage: -1,
      features: [
        'Everything in Pro',
        'Unlimited Everything',
        'Advanced Analytics',
        'Custom Integrations',
        'Dedicated Support',
        'Custom Branding',
        'API Access',
        'SLA Guarantee',
        'Unlimited Team Members',
        'Unlimited Storage'
      ]
    }
  }
}

export function canAccessFeature(
  organizationPlan: SubscriptionTier,
  requiredPlan: SubscriptionTier
): boolean {
  const tierOrder: SubscriptionTier[] = ['free', 'pro', 'enterprise']
  const orgIndex = tierOrder.indexOf(organizationPlan)
  const reqIndex = tierOrder.indexOf(requiredPlan)
  return orgIndex >= reqIndex
}

export function hasReachedLimit(
  usage: number,
  limit: number
): boolean {
  if (limit === -1) return false // unlimited
  return usage >= limit
}

export function getUsagePercentage(usage: number, limit: number): number {
  if (limit === -1) return 0
  return Math.min((usage / limit) * 100, 100)
}
