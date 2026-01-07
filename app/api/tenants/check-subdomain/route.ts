import { NextRequest, NextResponse } from 'next/server'
import { checkSubdomainAvailability } from '@/app/actions/provision'

export async function POST(request: NextRequest) {
  try {
    const { subdomain } = await request.json()

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      )
    }

    const result = await checkSubdomainAvailability(subdomain)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Check subdomain API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check subdomain' },
      { status: 500 }
    )
  }
}
