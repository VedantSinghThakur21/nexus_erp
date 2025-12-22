import { NextRequest, NextResponse } from 'next/server'
import { getOpportunity } from '@/app/actions/crm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const opportunityId = decodeURIComponent(id)

    const opportunity = await getOpportunity(opportunityId)

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ opportunity })
  } catch (error: any) {
    console.error('Error fetching opportunity:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch opportunity' },
      { status: 500 }
    )
  }
}
