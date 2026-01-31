// (file removed)
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Users, FileText, FolderKanban, Receipt, AlertCircle } from 'lucide-react'
import { getUsageSummary } from '@/app/actions/usage-limits'

interface UsageSummary {
  plan: string
  planName: string
  usage: {
    users: { current: number; limit: number | 'unlimited' }
    leads: { current: number; limit: number | 'unlimited' }
    projects: { current: number; limit: number | 'unlimited' }
    invoices: { current: number; limit: number | 'unlimited' }
    storage: { current: number; limit: number | 'unlimited' }
  }
}

export function UsageWidget({ subdomain }: { subdomain: string }) {
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const data = await getUsageSummary(subdomain)
        setUsage(data)
      } catch (error) {
        console.error('Failed to fetch usage:', error)
      } finally {
        setLoading(false)
      }
    }

    if (subdomain) {
      fetchUsage()
    }
  }, [subdomain])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage & Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (!usage) {
    return null
  }

  function getPercentage(current: number, limit: number | 'unlimited'): number {
    if (limit === 'unlimited') return 0
    return (current / limit) * 100
  }

  function isNearLimit(current: number, limit: number | 'unlimited'): boolean {
    if (limit === 'unlimited') return false
    return current >= limit * 0.8
  }

  const usageItems = [
    {
      icon: Users,
      label: 'Team Members',
      current: usage.usage.users.current,
      limit: usage.usage.users.limit,
      color: 'blue'
    },
    {
      icon: FileText,
      label: 'Leads',
      current: usage.usage.leads.current,
      limit: usage.usage.leads.limit,
      color: 'green'
    },
    {
      icon: FolderKanban,
      label: 'Projects',
      current: usage.usage.projects.current,
      limit: usage.usage.projects.limit,
      color: 'purple'
    },
    {
      icon: Receipt,
      label: 'Invoices',
      current: usage.usage.invoices.current,
      limit: usage.usage.invoices.limit,
      color: 'orange'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Usage & Limits</CardTitle>
            <CardDescription>
              Current plan: <span className="font-semibold">{usage.planName}</span>
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href="/settings?tab=billing">Upgrade Plan</a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {usageItems.map((item) => {
          const Icon = item.icon
          const percentage = getPercentage(item.current, item.limit)
          const nearLimit = isNearLimit(item.current, item.limit)
          const limitText = item.limit === 'unlimited' ? '∞' : item.limit

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {item.current} / {limitText}
                  </span>
                  {nearLimit && (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                </div>
              </div>
              {item.limit !== 'unlimited' && (
                <Progress 
                  value={percentage} 
                  className={`h-2 ${nearLimit ? 'bg-orange-100' : ''}`}
                />
              )}
              {nearLimit && (
                <p className="text-xs text-orange-600">
                  You're approaching your limit. Consider upgrading.
                </p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
