import { redirect } from 'next/navigation'

/**
 * Tenant root (tesla.avariq.in/) → redirect to /dashboard
 */
export default function TenantRootPage() {
  redirect('/dashboard')
}
