'use client'

import { useOrganization } from '@/contexts/organization-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, TrendingUp, Users, FileText, Briefcase, Receipt } from 'lucide-react'
import Link from 'next/link'
import { SUBSCRIPTION_PLANS, getUsagePercentage } from '@/types/subscription'

export function SubscriptionBanner() {
  const { organization, loading } = useOrganization()

  if (loading || !organization) return null

  const plan = SUBSCRIPTION_PLANS[organization.subscription.plan]
  const isTrialing = organization.subscription.status === 'trial'
  const trialDaysLeft = organization.subscription.trial_end
    ? Math.ceil((new Date(organization.subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  // Check if nearing any limits
  const leadsPercentage = getUsagePercentage(organization.usage.leads, plan.features.maxLeads)
  const nearingLimit = leadsPercentage >= 80

  if (isTrialing && trialDaysLeft <= 7) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900">
                {trialDaysLeft} days left in your trial
              </p>
              <p className="text-sm text-blue-700">
                Upgrade to {plan.name} to continue using all features
              </p>
            </div>
          </div>
          <Link href="/settings/billing">
            <Button size="sm">Upgrade Now</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (nearingLimit) {
    return (
      <div className="bg-orange-50 border-l-4 border-orange-600 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-900">
                You're nearing your leads limit
              </p>
              <p className="text-sm text-orange-700">
                {organization.usage.leads} / {plan.features.maxLeads} leads used
              </p>
            </div>
          </div>
          <Link href="/settings/billing">
            <Button size="sm" variant="outline">Upgrade Plan</Button>
          </Link>
        </div>
      </div>
    )
  }

  return null
}

export function OrganizationHeader() {
  const { organization, loading } = useOrganization()

  if (loading || !organization) return null

  const plan = SUBSCRIPTION_PLANS[organization.subscription.plan]

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{organization.name}</CardTitle>
            <CardDescription className="mt-1">
              <Badge variant={organization.subscription.status === 'active' ? 'default' : 'secondary'}>
                {plan.name} Plan
              </Badge>
              {organization.subscription.status === 'trial' && (
                <span className="ml-2 text-xs">
                  (Trial ends {new Date(organization.subscription.trial_end!).toLocaleDateString()})
                </span>
              )}
            </CardDescription>
          </div>
          <Link href="/settings/billing">
            <Button variant="outline" size="sm">
              Manage Subscription
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Team Members</p>
              <p className="font-semibold">
                {organization.usage.users} / {plan.features.maxUsers === -1 ? '∞' : plan.features.maxUsers}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Leads</p>
              <p className="font-semibold">
                {organization.usage.leads} / {plan.features.maxLeads === -1 ? '∞' : plan.features.maxLeads}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Projects</p>
              <p className="font-semibold">
                {organization.usage.projects} / {plan.features.maxProjects === -1 ? '∞' : plan.features.maxProjects}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Invoices</p>
              <p className="font-semibold">
                {organization.usage.invoices} / {plan.features.maxInvoices === -1 ? '∞' : plan.features.maxInvoices}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
