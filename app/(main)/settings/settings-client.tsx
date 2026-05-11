'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ensureCurrentFiscalYear,
  getCurrentFiscalYearInfo,
  type FiscalYearInfo,
  type getBankAccounts,
  type getCompany,
  type getProfile,
  type getTaxTemplates,
  type getTeam,
} from '@/app/actions/settings'
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from '@/types/subscription'
import { CreateBankAccountDialog } from '@/components/settings/create-bank-account-dialog'
import { CreateTaxTemplateDialog } from '@/components/settings/create-tax-template-dialog'
import { CrmSetupSection } from '@/components/settings/crm-setup-section'
import { EditCompanyDialog } from '@/components/settings/edit-company-dialog'

type User = Awaited<ReturnType<typeof getProfile>>
type TeamUser = Awaited<ReturnType<typeof getTeam>>[number]
type TaxTemplate = Awaited<ReturnType<typeof getTaxTemplates>>[number]
type Company = Awaited<ReturnType<typeof getCompany>>
type BankAccount = Awaited<ReturnType<typeof getBankAccounts>>[number]

export function SettingsClient(props: {
  initial: {
    profile: User | null
    team: TeamUser[]
    taxTemplates: TaxTemplate[]
    company: Company | null
    bankAccounts: BankAccount[]
    fiscalYear: FiscalYearInfo | null
    subscription: { plan: SubscriptionTier; status: string; tenantId: string | null }
    agentic?: { allowed: boolean; reason?: string; plan: string } | null
  }
}) {
  const [profile] = useState<User | null>(props.initial.profile)
  const [team] = useState<TeamUser[]>(props.initial.team)
  const [taxTemplates] = useState<TaxTemplate[]>(props.initial.taxTemplates)
  const [company] = useState<Company | null>(props.initial.company)
  const [bankAccounts] = useState<BankAccount[]>(props.initial.bankAccounts)
  const [fiscalYear, setFiscalYear] = useState<FiscalYearInfo | null>(props.initial.fiscalYear)
  const [fiscalYearLoading, setFiscalYearLoading] = useState(false)
  const [fiscalYearMessage, setFiscalYearMessage] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [subscription, setSubscription] = useState(props.initial.subscription)
  const [agentic] = useState(props.initial.agentic ?? null)
  const [subscriptionBusy, setSubscriptionBusy] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
  }, [])

  const handleEnsureFiscalYear = async () => {
    setFiscalYearLoading(true)
    setFiscalYearMessage(null)
    const res = await ensureCurrentFiscalYear()
    if (res.success) {
      setFiscalYear(res.info ?? null)
      setFiscalYearMessage('Fiscal Year is configured and active.')
    } else {
      setFiscalYearMessage(res.error || 'Failed to configure Fiscal Year.')
    }
    setFiscalYearLoading(false)
  }

  const refreshFiscalYear = async () => {
    try {
      const info = await getCurrentFiscalYearInfo()
      setFiscalYear(info)
    } catch {
      setFiscalYear(null)
    }
  }

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark')
    setIsDark(!isDark)
  }

  const refreshSubscription = async () => {
    if (!subscription.tenantId) return
    setSubscriptionBusy(true)
    try {
      const res = await fetch('/api/subscription/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.plan && data?.status) {
        setSubscription((prev) => ({ ...prev, plan: data.plan, status: data.status }))
      }
    } finally {
      setSubscriptionBusy(false)
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <main className="app-content w-full bg-background">
      <div className="app-container">
        <header className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
              <p className="text-sm text-muted-foreground  mt-1">Manage your organization, profile, and team settings</p>
            </div>
          </div>
        </header>

        <div className="pt-4 w-full space-y-6">
          {/* Subscription */}
          <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <span className="material-symbols-outlined text-slate-400">workspace_premium</span>
                  <h2 className="font-semibold text-base">Subscription</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Current plan: <span className="font-semibold text-foreground">{SUBSCRIPTION_PLANS[subscription.plan].name}</span>{' '}
                  <span className="text-muted-foreground">({subscription.status})</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void refreshSubscription()}
                  disabled={subscriptionBusy || !subscription.tenantId}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {subscriptionBusy ? 'Refreshing…' : 'Refresh'}
                </button>
                <Link
                  href="/settings/billing"
                  className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
                >
                  Manage / Upgrade
                </Link>
              </div>
            </div>
          </section>

          {subscription.tenantId ? (
            <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <span className="material-symbols-outlined text-slate-400">smart_toy</span>
                    <h2 className="font-semibold text-base">AI &amp; automation</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                    When your workspace is entitled, <strong>Agent Inbox</strong> and <strong>AI Agent</strong> appear
                    under <strong>Management</strong> in the left sidebar (same area as Team and Settings). The floating
                    analytics chat (bottom-right) is separate from agent runs.
                  </p>
                  {agentic && !agentic.allowed && agentic.reason ? (
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">{agentic.reason}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {agentic?.allowed ? (
                    <>
                      <Link
                        href="/agent"
                        className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Open Agent Inbox
                      </Link>
                      <Link
                        href="/agents"
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                      >
                        Open AI Agent
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/settings/billing"
                      className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                    >
                      View plans (Pro+)
                    </Link>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 shadow-none">
              <span className="text-slate-400 text-[12px] font-bold tracking-widest uppercase">Team Size</span>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-bold text-foreground leading-none">{team.length}</span>
                <span className="text-emerald-400 text-[12px] flex items-center gap-1 font-medium bg-emerald-400/10 px-2 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[12px]">trending_up</span>+{team.filter((u: any) => u.enabled).length}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[12px] font-bold tracking-widest uppercase">System Health</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-bold text-foreground leading-none">99.8%</span>
                <span className="text-muted-foreground text-[12px]">Uptime</span>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-none">
              <span className="text-slate-400 text-[12px] font-bold tracking-widest uppercase">Security Score</span>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-bold text-foreground leading-none">A+</span>
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full border-2 border-card bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white">
                    MFA
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-card bg-indigo-500 flex items-center justify-center text-[8px] font-bold text-white">
                    SSL
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white mb-6">
                <span className="material-symbols-outlined text-slate-400">palette</span>
                <h2 className="font-semibold text-base">Appearance</h2>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">Theme</h3>
                  <p className="text-sm text-muted-foreground ">Switch between light and dark mode</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                    isDark ? 'bg-primary' : 'bg-slate-200'
                  }`}
                >
                  <span className="sr-only">Toggle theme</span>
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-background shadow-md transition-transform flex items-center justify-center ${
                      isDark ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  >
                    {isDark ? (
                      <span className="material-symbols-outlined text-[16px] text-blue-600">dark_mode</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px] text-amber-500">light_mode</span>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </section>

          <CrmSetupSection />

          <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">My Profile</h2>
              {profile ? (
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600  font-bold text-xl">
                    {getInitials((profile as any).first_name || (profile as any).full_name)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{(profile as any).full_name}</h3>
                    <p className="text-sm text-muted-foreground ">{(profile as any).name}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground ">Please log in to view your profile.</p>
              )}
            </div>
          </section>

          <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <span className="material-symbols-outlined text-slate-400">business</span>
                <h2 className="font-semibold text-base">Company Settings</h2>
              </div>
              {company && <EditCompanyDialog company={{ ...(company as any), company_name: (company as any).company_name ?? '' }} />}
            </div>
          </section>

          <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <span className="material-symbols-outlined text-slate-400">event</span>
                <h2 className="font-semibold text-base">Fiscal Year</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void refreshFiscalYear()}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={handleEnsureFiscalYear}
                  disabled={fiscalYearLoading}
                  className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {fiscalYearLoading ? 'Configuring...' : 'Create / Fix Fiscal Year'}
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">{fiscalYear?.year || 'Not configured'}</p>
              {fiscalYearMessage && <p className="text-[12px] text-muted-foreground mt-2">{fiscalYearMessage}</p>}
            </div>
          </section>

          <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <span className="material-symbols-outlined text-slate-400">account_balance</span>
                <h2 className="font-semibold text-base">Bank Accounts</h2>
              </div>
              <CreateBankAccountDialog />
            </div>
            <div className="px-6 pb-6">
              {bankAccounts.length === 0 ? (
                <div className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl py-12 flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-slate-200  text-6xl mb-4">account_balance</span>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">No bank accounts found</h4>
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400">description</span>
                Tax Templates
              </h2>
              <CreateTaxTemplateDialog />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {taxTemplates.length === 0 ? (
                <div className="col-span-full p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50 dark:bg-background border-slate-200 dark:border-slate-800">
                  <span className="material-symbols-outlined text-6xl text-slate-300  mb-3">description</span>
                  <p className="font-semibold">No tax templates found</p>
                </div>
              ) : null}
            </div>
          </section>

          <div className="h-12"></div>
        </div>
      </div>
    </main>
  )
}

