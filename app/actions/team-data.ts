'use server'

import { unstable_cache } from 'next/cache'
import { headers } from 'next/headers'
import { frappeRequest } from '@/app/lib/api'
import { mapWithConcurrency } from '@/lib/performance/map-with-concurrency'
import { getUserRolesForUser } from '@/app/actions/user-roles'
import { getAccessibleModules, getPrimaryRole } from '@/lib/role-permissions'
import { PLAN_FEATURES, type SubscriptionPlan } from '@/types/tenant'

const ROLE_LOOKUP_CONCURRENCY = 6

export type TeamMemberRow = {
  name: string
  email: string
  first_name?: string
  last_name?: string
  enabled?: number
  creation?: string
  last_login?: string
  user_type?: string
  role_profile_name?: string
  primary_role?: string | null
  actual_roles?: string[]
  modules_count?: number
  has_broken_roles?: boolean
}

async function resolveTenantId(): Promise<string> {
  const headerStore = await headers()
  return headerStore.get('x-tenant-id') || headerStore.get('X-Subdomain') || 'default'
}

export const getCachedTeamRoles = unstable_cache(
  async (tenantId: string) => {
    void tenantId
    const roles = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Role',
      fields: '["name"]',
      limit_page_length: 100,
    }).catch(() => [])
    return roles as { name: string }[]
  },
  ['tenant-roles'],
  { revalidate: 60, tags: ['teams-settings'] }
)

export const getCachedPlanLimits = unstable_cache(
  async (tenantId: string) => {
    const plan = 'enterprise' as SubscriptionPlan
    void tenantId
    return PLAN_FEATURES[plan]
  },
  ['tenant-plan-limits'],
  { revalidate: 60, tags: ['teams-settings'] }
)

async function enrichMember(u: Record<string, unknown>): Promise<TeamMemberRow> {
  const email = String(u.name || u.email || '')
  const actualRoles = await getUserRolesForUser(email)
  let primaryRole: string | null = null
  if (actualRoles.length > 0) {
    primaryRole = getPrimaryRole(actualRoles)
  }
  const accessibleModules = getAccessibleModules(actualRoles)
  return {
    ...(u as TeamMemberRow),
    email,
    primary_role: primaryRole,
    actual_roles: actualRoles,
    modules_count: accessibleModules.length,
    has_broken_roles: actualRoles.length === 0,
  }
}

export async function fetchTeamMembersList(): Promise<TeamMemberRow[]> {
  const users = (await frappeRequest('frappe.client.get_list', 'GET', {
    doctype: 'User',
    filters: `[["enabled", "=", 1], ["name", "!=", "Administrator"], ["name", "!=", "Guest"]]`,
    fields:
      '["name", "email", "first_name", "last_name", "enabled", "creation", "last_login", "user_type", "role_profile_name"]',
    limit_page_length: 100,
  })) as Record<string, unknown>[]

  if (!users?.length) return []
  return mapWithConcurrency(users, ROLE_LOOKUP_CONCURRENCY, enrichMember)
}

export async function getTeamPageData(): Promise<{
  members: TeamMemberRow[]
  roles: { name: string }[]
  planLimits: (typeof PLAN_FEATURES)[SubscriptionPlan]
}> {
  const tenantId = await resolveTenantId()
  const [members, roles, planLimits] = await Promise.all([
    fetchTeamMembersList(),
    getCachedTeamRoles(tenantId),
    getCachedPlanLimits(tenantId),
  ])
  return { members, roles, planLimits }
}
