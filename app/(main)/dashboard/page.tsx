import { Suspense } from 'react'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { ListViewSkeleton } from '@/components/ui/list-view-skeleton'
import { loadDashboardData } from '@/lib/dashboard/load-dashboard-data'
import { getUserRoles } from '@/lib/auth-guard'
import { getAccessibleModules } from '@/lib/role-permissions'

export const dynamic = 'force-dynamic'

async function DashboardContent() {
  const roles = await getUserRoles()
  const accessibleModules = getAccessibleModules(roles)
  const initialData = await loadDashboardData(accessibleModules)

  return <DashboardView initialData={initialData} accessibleModules={accessibleModules} />
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<ListViewSkeleton titleWidthClass="w-40" rows={6} />}>
      <DashboardContent />
    </Suspense>
  )
}
