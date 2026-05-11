import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth-guard'

/**
 * Tenant root (e.g. tesla.avariq.in/) — send signed-in users to the app;
 * signed-out users must not be bounced to /dashboard (e.g. after logout when
 * the login header logo still pointed at `/`).
 */
export default async function TenantRootPage() {
  const session = await getAuthSession()
  if (!session) redirect('/login')
  redirect('/dashboard')
}
