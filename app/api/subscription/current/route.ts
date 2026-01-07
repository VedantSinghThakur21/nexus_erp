import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

/**
 * API endpoint to get current tenant's subscription plan
 */
export async function GET(request: NextRequest) {
  try {
    const headersList = await headers()
    const subdomain = headersList.get('X-Subdomain')
    const tenantMode = headersList.get('X-Tenant-Mode')

    if (tenantMode === 'master' || !subdomain) {
      // On master site, return enterprise plan (admin access)
      return NextResponse.json({
        plan: 'enterprise',
        tenant: null
      })
    }

    // Fetch tenant info from master database
    const masterUrl = process.env.ERP_NEXT_URL || 'http://103.224.243.242:8080'
    const apiKey = process.env.ERP_API_KEY
    const apiSecret = process.env.ERP_API_SECRET

    const response = await fetch(`${masterUrl}/api/method/frappe.client.get_list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`
      },
      body: JSON.stringify({
        doctype: 'Tenant',
        filters: { subdomain },
        fields: ['name', 'plan', 'status', 'company_name'],
        limit_page_length: 1
      })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch tenant info')
    }

    const result = await response.json()
    
    if (!result.message || result.message.length === 0) {
      return NextResponse.json({
        plan: 'free',
        tenant: null
      })
    }

    const tenant = result.message[0]

    return NextResponse.json({
      plan: tenant.plan || 'free',
      status: tenant.status,
      tenant: {
        name: tenant.company_name,
        subdomain
      }
    })

  } catch (error: any) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}
