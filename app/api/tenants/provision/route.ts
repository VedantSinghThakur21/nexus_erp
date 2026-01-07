import { NextRequest, NextResponse } from 'next/server'
import { provisionTenant } from '@/app/actions/provision'

export async function POST(request: NextRequest) {
  try {
    const { tenantId, subdomain, adminEmail, adminPassword } = await request.json()

    // Validate required fields
    if (!tenantId || !subdomain || !adminEmail) {
      return NextResponse.json(
        { error: 'tenantId, subdomain, and adminEmail are required' },
        { status: 400 }
      )
    }

    const result = await provisionTenant(
      tenantId,
      subdomain,
      adminEmail,
      adminPassword || 'admin123'
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Provision tenant API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to provision tenant' },
      { status: 500 }
    )
  }
}
