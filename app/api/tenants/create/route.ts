import { NextRequest, NextResponse } from 'next/server'
import { createTenant } from '@/app/actions/tenants'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate required fields
    const required = ['customer_name', 'company_name', 'subdomain', 'owner_email', 'owner_name', 'plan']
    for (const field of required) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    const result = await createTenant(data)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result.tenant)
  } catch (error: any) {
    console.error('Create tenant API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create tenant' },
      { status: 500 }
    )
  }
}
