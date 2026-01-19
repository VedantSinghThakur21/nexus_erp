import { NextRequest, NextResponse } from 'next/server'
import { frappeRequest } from '@/app/lib/api'

/**
 * Check provisioning status for a tenant
 * GET /api/provisioning-status?tenant=<subdomain>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenant = searchParams.get('tenant')
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant parameter is required' },
        { status: 400 }
      )
    }
    
    // Check if tenant site exists and is ready
    const siteName = `${tenant}.avariq.in`
    
    try {
      // Try to get site info from the main ERPNext instance
      const siteInfo = await frappeRequest(
        'frappe.client.get_list',
        'GET',
        {
          doctype: 'SaaS Tenant',
          filters: JSON.stringify([['subdomain', '=', tenant]]),
          fields: JSON.stringify(['status', 'site_url', 'subdomain', 'api_key'])
        }
      ) as any[]
      
      if (siteInfo && siteInfo.length > 0) {
        const tenantRecord = siteInfo[0]
        
        // Check if API keys are set (means provisioning is complete)
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
      
      // If no tenant record found, assume still provisioning
      return NextResponse.json({
        ready: false,
        status: 'unknown',
        siteName,
        message: 'Checking status...'
      })
      
    } catch (error) {
      // If error fetching tenant, might be in early provisioning
      return NextResponse.json({
        ready: false,
        status: 'provisioning',
        siteName,
        message: 'Creating workspace...'
      })
    }
    
  } catch (error: any) {
    console.error('Error checking provisioning status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check status' },
      { status: 500 }
    )
  }
}
