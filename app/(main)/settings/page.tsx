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

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [profile, team, taxTemplates, company, bankAccounts, fiscalYear] = await Promise.all([
    getProfile().catch(() => null),
    getTeam().catch(() => []),
    getTaxTemplates().catch(() => []),
    getCompany().catch(() => null),
    getBankAccounts().catch(() => []),
    getCurrentFiscalYearInfo().catch(() => null),
  ])

  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') || headersList.get('X-Subdomain') || null
  const isMaster = !tenantId || tenantId === 'master'

  let subscription: { plan: SubscriptionTier; status: string; tenantId: string | null } = {
    plan: 'enterprise',
    status: 'active',
    tenantId: isMaster ? null : tenantId,
  }

  if (!isMaster && tenantId) {
    try {
      const snapshot = await getCachedSubscriptionRead(tenantId)
      if (snapshot.found) {
        subscription = {
          plan: snapshot.synced.plan,
          status: snapshot.synced.status,
          tenantId,
        }
      } else {
        subscription = { plan: 'free', status: 'trial', tenantId }
      }
    } catch (e) {
      console.error('[settings] Failed to read subscription snapshot:', e)
      subscription = { plan: 'free', status: 'trial', tenantId }
    }
  }

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
      }}
    />
  )
}

