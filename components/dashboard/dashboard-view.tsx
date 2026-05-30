"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowUpRight,
  Briefcase,
  FolderOpenDot,
  ReceiptText,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DashboardSectionFailed } from "@/components/dashboard/section-failed"
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary"
import type { DashboardPayload } from "@/lib/dashboard/load-dashboard-data"
import { formatIndianCurrency } from "@/lib/currency"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type DashboardViewProps = {
  initialData: DashboardPayload
  accessibleModules: string[]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function relativeTimeLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const deltaMinutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000))
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`
  const deltaHours = Math.floor(deltaMinutes / 60)
  if (deltaHours < 24) return `${deltaHours}h ago`
  return `${Math.floor(deltaHours / 24)}d ago`
}

function stageBadge(stage: string): "default" | "secondary" | "outline" {
  if (stage.includes("Negotiation")) return "default"
  if (stage.includes("Qualification")) return "secondary"
  return "outline"
}

export function DashboardView({ initialData, accessibleModules }: DashboardViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState("")

  const stats = initialData.stats ?? {
    pipelineValue: 0,
    revenue: 0,
    openOpportunities: 0,
    winRate: 0,
    winRateChange: 0,
    leadsChange: 0,
  }
  const opportunities = initialData.opportunities ?? []
  const activities = initialData.activities ?? []
  const atRiskDeals = initialData.atRiskDeals ?? []
  const leadSources = initialData.leadSources ?? []
  const funnelData = initialData.funnelData ?? []

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return
      startTransition(() => router.refresh())
    }

    document.addEventListener("visibilitychange", refresh)
    window.addEventListener("focus", refresh)
    return () => {
      document.removeEventListener("visibilitychange", refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [router])

  const highProbOpportunities = useMemo(
    () =>
      opportunities
        .filter((opp) => opp.probability >= 70 && opp.status === "Open")
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3),
    [opportunities],
  )

  const leadSourceData = useMemo(() => {
    const total = leadSources.reduce((sum, item) => sum + (item.count || 0), 0)
    return leadSources.slice(0, 4).map((source) => ({
      name: source.source,
      count: source.count,
      percent: Math.round(((source.count || 0) / Math.max(total, 1)) * 100),
    }))
  }, [leadSources])

  const statCards = [
    {
      title: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      delta: stats.winRateChange,
      icon: TrendingUp,
    },
    {
      title: "Pipeline Value",
      value: formatIndianCurrency(stats.pipelineValue),
      delta: stats.leadsChange,
      icon: Briefcase,
    },
    {
      title: "Revenue MTD",
      value: formatIndianCurrency(stats.revenue),
      delta: stats.winRateChange,
      icon: ReceiptText,
    },
    {
      title: "Open Opportunities",
      value: stats.openOpportunities.toLocaleString(),
      delta: stats.leadsChange,
      icon: FolderOpenDot,
    },
  ].filter((item) => item.title !== "Revenue MTD" || accessibleModules.includes("invoices"))

  return (
    <div className="app-shell flex flex-col">
      <PageHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="app-content space-y-6"
      >
        <div className="app-container space-y-6">
          {isPending && (
            <motion.div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Refreshing dashboard
            </motion.div>
          )}

          <div className="flex items-center justify-between border-b border-border pb-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Pipeline, revenue, and team activity in one place.
              </p>
            </div>
            <div className="hidden gap-2 md:flex">
              {[
                { href: "/crm/leads", label: "New Lead" },
                { href: "/quotations/new", label: "New Quotation" },
                { href: "/invoices/new", label: "New Invoice" },
              ].map((action) => (
                <Link key={action.href} href={action.href} prefetch>
                  <Button variant="ghost" className="h-9 rounded-lg border border-dashed border-border">
                    <Sparkles className="h-4 w-4" />
                    {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {initialData.statsError ? (
            <DashboardSectionFailed title="Metrics" message={initialData.statsError.message} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((item) => {
                const DeltaIcon = item.delta >= 0 ? TrendingUp : TrendingDown
                const StatIcon = item.icon
                return (
                  <motion.div key={item.title} whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                    <Card className="rounded-xl border border-border bg-card shadow-none">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <p className="text-[13px] font-medium text-muted-foreground">{item.title}</p>
                          <StatIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="mt-4 text-2xl font-medium leading-tight text-foreground">{item.value}</p>
                        <Badge variant="outline" className="mt-3 gap-1 rounded-md text-[11px] font-medium">
                          <DeltaIcon
                            className={`h-3 w-3 ${item.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}
                          />
                          {item.delta >= 0 ? "+" : ""}
                          {item.delta.toFixed(1)}%
                        </Badge>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <SectionErrorBoundary title="Opportunities" onRetry={() => router.refresh()}>
                {initialData.opportunitiesError ? (
                  <DashboardSectionFailed
                    title="High-probability opportunities"
                    message={initialData.opportunitiesError.message}
                  />
                ) : (
                  <Card className="rounded-xl border border-border bg-card shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">High-Probability Opportunities</CardTitle>
                      <Link href="/crm/opportunities" prefetch>
                        <Button variant="ghost" size="sm">
                          View pipeline
                        </Button>
                      </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px]">
                          <thead className="sticky top-0 bg-background">
                            <tr className="border-y border-border">
                              <th className="h-12 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Account
                              </th>
                              <th className="h-12 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Stage
                              </th>
                              <th className="h-12 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Value
                              </th>
                              <th className="h-12 px-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Confidence
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {highProbOpportunities.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                                  No high-probability opportunities found.
                                </td>
                              </tr>
                            ) : (
                              highProbOpportunities.map((opp, index) => (
                                <motion.tr
                                  key={opp.name}
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.04 }}
                                  className="group h-12 cursor-pointer hover:bg-muted/50"
                                  onClick={() => router.push(`/crm/opportunities/${opp.name}`)}
                                >
                                  <td className="px-4 text-sm font-medium text-foreground">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-[11px] text-muted-foreground">
                                        {getInitials((opp.customer_name || opp.party_name) || "NA")}
                                      </div>
                                      <span>{opp.customer_name || opp.party_name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4">
                                    <Badge
                                      variant={stageBadge(opp.sales_stage)}
                                      className="rounded-md text-[11px] font-medium"
                                    >
                                      {opp.sales_stage}
                                    </Badge>
                                  </td>
                                  <td className="px-4 text-sm text-foreground">
                                    {formatIndianCurrency(opp.opportunity_amount)}
                                  </td>
                                  <td className="px-4 text-right text-sm font-medium text-foreground">
                                    {opp.probability}%
                                  </td>
                                </motion.tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </SectionErrorBoundary>

              <div className="grid gap-4 md:grid-cols-2">
                {initialData.funnelError ? (
                  <DashboardSectionFailed title="Sales funnel" message={initialData.funnelError.message} />
                ) : (
                  <Card className="rounded-xl border border-border bg-card shadow-none">
                    <CardHeader>
                      <CardTitle className="text-base">Sales Funnel</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {funnelData.map((item, index) => (
                        <div key={item.stage} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{item.stage}</span>
                            <span>{item.count} deals</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.width}%` }}
                              transition={{ duration: 0.2, delay: index * 0.04 }}
                              className="h-2 rounded-full bg-primary"
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {initialData.leadSourcesError ? (
                  <DashboardSectionFailed title="Lead sources" message={initialData.leadSourcesError.message} />
                ) : (
                  <Card className="rounded-xl border border-border bg-card shadow-none">
                    <CardHeader>
                      <CardTitle className="text-base">Lead Sources</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {leadSourceData.length === 0 && (
                        <p className="text-sm text-muted-foreground">No source distribution data available.</p>
                      )}
                      {leadSourceData.map((source, index) => (
                        <motion.div
                          key={source.name}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2"
                        >
                          <p className="text-sm font-medium text-foreground">{source.name}</p>
                          <Badge variant="outline" className="rounded-md text-[11px] font-medium">
                            {source.percent}% ({source.count})
                          </Badge>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="space-y-4 lg:col-span-4">
              {initialData.activitiesError ? (
                <DashboardSectionFailed title="Recent activity" message={initialData.activitiesError.message} />
              ) : (
                <Card className="rounded-xl border border-border bg-card shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {activities.slice(0, 6).map((activity, index) => (
                      <motion.div
                        key={`${activity.owner}-${index}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="flex items-start gap-3 rounded-md border border-border bg-muted/20 p-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          {getInitials(activity.owner)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{activity.owner}</p>
                          <p className="truncate text-sm text-muted-foreground">{activity.company}</p>
                          <p className="text-xs text-muted-foreground">{relativeTimeLabel(activity.time)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {initialData.atRiskError ? (
                <DashboardSectionFailed title="At-risk deals" message={initialData.atRiskError.message} />
              ) : (
                <Card className="rounded-xl border border-border bg-card shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">At-Risk Deals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {atRiskDeals.length === 0 && (
                      <p className="text-sm text-muted-foreground">No deals currently flagged by risk checks.</p>
                    )}
                    {atRiskDeals.slice(0, 4).map((deal, index) => (
                      <motion.div
                        key={deal.name}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="rounded-md border border-border p-3"
                      >
                        <p className="text-sm font-medium text-foreground">{deal.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{deal.days_since_activity} days inactive</p>
                        <p className="mt-1 text-xs text-red-600">{deal.reason}</p>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {[
                  { href: "/crm/new", label: "Create Lead" },
                  { href: "/sales-orders/new", label: "Create Sales Order" },
                ].map((action) => (
                  <Link key={action.href} href={action.href} prefetch>
                    <Button
                      variant="ghost"
                      className="h-10 w-full justify-between rounded-lg border border-dashed border-border"
                    >
                      {action.label}
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.main>
    </div>
  )
}
