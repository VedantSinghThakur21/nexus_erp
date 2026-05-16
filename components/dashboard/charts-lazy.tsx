'use client'

import dynamic from 'next/dynamic'

const chartsLoading = () => (
  <div className="h-[350px] animate-pulse rounded-xl bg-muted/50" aria-hidden />
)

export const DashboardChartsLazy = dynamic(
  () => import('@/components/dashboard/charts').then((m) => m.DashboardCharts),
  { ssr: false, loading: chartsLoading },
)

export const AnimatedAreaChartLazy = dynamic(
  () => import('@/components/dashboard/animated-charts').then((m) => m.AnimatedAreaChart),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded-lg bg-muted/50" /> },
)

export const AnimatedBarChartLazy = dynamic(
  () => import('@/components/dashboard/animated-charts').then((m) => m.AnimatedBarChart),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded-lg bg-muted/50" /> },
)
