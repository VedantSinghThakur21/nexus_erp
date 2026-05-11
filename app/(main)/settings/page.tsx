import {
  getBankAccounts,
  getCompany,
  getCurrentFiscalYearInfo,
  getProfile,
  getTaxTemplates,
  getTeam,
} from '@/app/actions/settings'
import { SettingsClient } from './settings-client'

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

  return (
    <SettingsClient
      initial={{
        profile,
        team,
        taxTemplates,
        company,
        bankAccounts,
        fiscalYear,
      }}
    />
  )
}

