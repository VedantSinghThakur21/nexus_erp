import { NextRequest, NextResponse } from 'next/server'
import { lookupTenantBySubdomain } from '@/lib/provisioning-client'
import { requireAuth } from '@/app/api/_lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response

  try {
    const searchParams = request.nextUrl.searchParams
    const tenant = searchParams.get('tenant')

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant parameter is required' },
        { status: 400 }
      )
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
    const siteName = `${tenant}.${rootDomain}`

    try {
      const tenantRecord = await lookupTenantBySubdomain(tenant)

      if (tenantRecord) {
        if (tenantRecord.api_key && tenantRecord.status === 'Active') {
          return NextResponse.json({
            ready: true,
            status: 'active',
            siteName,
            message: 'Workspace is ready'
          })
        } else if (tenantRecord.status === 'Active') {
          return NextResponse.json({
            ready: false,
            status: 'provisioning',
            siteName,
            message: 'Finalizing workspace setup...'
          })
        } else {
          return NextResponse.json({
            ready: false,
            status: 'provisioning',
            siteName,
            message: 'Workspace is being created'
          })
        }
      }

      return NextResponse.json({
        ready: false,
        status: 'unknown',
        siteName,
        message: 'Checking status...'
      })
    } catch {
      return NextResponse.json({
        ready: false,
        status: 'provisioning',
        siteName,
        message: 'Creating workspace...'
      })
    }
  } catch (error: unknown) {
    console.error('Error checking provisioning status:', error)
    const message = error instanceof Error ? error.message : 'Failed to check status'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
