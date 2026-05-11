import {
  getBankAccounts,
  getCompany,
  getCurrentFiscalYearInfo,
  getProfile,
  getTaxTemplates,
  getTeam,
} from '@/app/actions/settings'
import { SettingsClient } from './settings-client'
import { headers } from 'next/headers'
import { getCachedSubscriptionRead } from '@/lib/subscription/cached-subscription-read'
import type { SubscriptionTier } from '@/types/subscription'
import { getAgenticEntitlement } from '@/plugins/agentic-ai/entitlements'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') || headersList.get('X-Subdomain') || null
  const isMaster = !tenantId || tenantId === 'master'

  const tenantScoped = !isMaster && !!tenantId

  const [
    profile,
    team,
    taxTemplates,
    company,
    bankAccounts,
    fiscalYear,
    snapshot,
    agenticEntitlement,
  ] = await Promise.all([
    getProfile().catch(() => null),
    getTeam().catch(() => []),
    getTaxTemplates().catch(() => []),
    getCompany().catch(() => null),
    getBankAccounts().catch(() => []),
    getCurrentFiscalYearInfo().catch(() => null),
    tenantScoped
      ? getCachedSubscriptionRead(tenantId!).catch(() => null)
      : Promise.resolve(null),
    tenantScoped
      ? getAgenticEntitlement().catch(() => null)
      : Promise.resolve(null),
  ])

  let subscription: { plan: SubscriptionTier; status: string; tenantId: string | null } = {
    plan: 'enterprise',
    status: 'active',
    tenantId: isMaster ? null : tenantId,
  }

  if (tenantScoped && tenantId) {
    if (snapshot && snapshot.found) {
      subscription = {
        plan: snapshot.synced.plan,
        status: snapshot.synced.status,
        tenantId,
      }
    } else {
      subscription = { plan: 'free', status: 'trial', tenantId }
    }
  }

  const agentic =
    tenantScoped && agenticEntitlement
      ? {
          allowed: agenticEntitlement.allowed,
          reason: agenticEntitlement.reason,
          plan: agenticEntitlement.plan,
        }
      : null

  return (
    <SettingsClient
      initial={{
        profile,
        team,
        taxTemplates,
        company,
        bankAccounts,
        fiscalYear,
        subscription,
        agentic,
      }}
    />
  )
}

