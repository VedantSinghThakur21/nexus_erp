'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { Organization, SubscriptionTier } from '@/types/subscription'

interface OrganizationContextType {
  organization: Organization | null
  loading: boolean
  refreshOrganization: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType>({
  organization: null,
  loading: true,
  refreshOrganization: async () => {}
})

export function useOrganization() {
  return useContext(OrganizationContext)
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchOrganization() {
    try {
      const { getCurrentUserOrganization } = await import('@/app/actions/user-auth')
      const org = await getCurrentUserOrganization()
      
      if (org) {
        // Transform to Organization type
        const organization: Organization = {
          name: org.organization_name,
          slug: org.slug,
          subscription: {
            plan: org.subscription_plan as SubscriptionTier,
            status: org.subscription_status,
            current_period_start: org.current_period_start,
            current_period_end: org.current_period_end,
            trial_end: org.trial_end
          },
          usage: {
            users: org.usage_users || 0,
            leads: org.usage_leads || 0,
            projects: org.usage_projects || 0,
            invoices: org.usage_invoices || 0,
            storage: org.usage_storage || 0
          },
          owner: org.owner_email,
          created_at: org.creation,
          updated_at: org.modified
        }
        setOrganization(organization)
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganization()
  }, [])

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        loading,
        refreshOrganization: fetchOrganization
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}
