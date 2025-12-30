'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Organization, SUBSCRIPTION_PLANS, getUsagePercentage } from '@/types/subscription'
import { Users, FileText, Briefcase, Receipt, HardDrive, ArrowUp } from 'lucide-react'
import Link from 'next/link'

interface UsageWidgetProps {
  organization: Organization
}

export function UsageWidget({ organization }: UsageWidgetProps) {
  const plan = SUBSCRIPTION_PLANS[organization.subscription.plan]
  const usage = organization.usage

  const usageItems = [
    {
      label: 'Team Members',
      icon: Users,
      current: usage.users,
      limit: plan.features.maxUsers,
      color: 'text-blue-600'
    },
    {
      label: 'Leads',
      icon: FileText,
      current: usage.leads,
      limit: plan.features.maxLeads,
      color: 'text-green-600'
    },
    {
      label: 'Projects',
      icon: Briefcase,
      current: usage.projects,
      limit: plan.features.maxProjects,
      color: 'text-purple-600'
    },
    {
      label: 'Invoices',
      icon: Receipt,
      current: usage.invoices,
      limit: plan.features.maxInvoices,
      color: 'text-orange-600'
    },
    {
      label: 'Storage',
      icon: HardDrive,
      current: usage.storage,
      limit: plan.features.maxStorage,
      color: 'text-red-600',
      unit: 'MB'
    }
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Usage & Limits</CardTitle>
        <Badge variant={organization.subscription.status === 'active' ? 'default' : 'secondary'}>
          {plan.name} Plan
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {usageItems.map((item) => {
          const percentage = getUsagePercentage(item.current, item.limit)
          const isNearLimit = percentage >= 80
          const Icon = item.icon

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className="text-slate-600">
                  {item.current} / {item.limit === -1 ? '∞' : item.limit}{item.unit ? ` ${item.unit}` : ''}
                </span>
              </div>
              {item.limit !== -1 && (
                <Progress 
                  value={percentage} 
                  className={isNearLimit ? 'bg-red-100' : ''}
                />
              )}
            </div>
          )
        })}

        <div className="pt-4 border-t">
          <Link href="/settings/billing">
            <Button variant="outline" className="w-full gap-2">
              <ArrowUp className="h-4 w-4" />
              Upgrade Plan
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
