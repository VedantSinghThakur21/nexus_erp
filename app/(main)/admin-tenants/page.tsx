import { requireAdmin } from '@/lib/auth-guard'
import { AdminTenantsClient } from './admin-tenants-client'

export const dynamic = 'force-dynamic'

/**
 * Admin Tenants Page - System Manager Only
 * 
 * Server-side protection ensures only authenticated users
 * with System Manager role can access this page.
 */
export default async function AdminTenantsPage() {
  // Server-side auth + System Manager role check
  await requireAdmin()
  
  return <AdminTenantsClient />
}