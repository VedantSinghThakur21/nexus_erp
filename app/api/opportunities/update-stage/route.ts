import { NextRequest, NextResponse } from 'next/server'
import { updateOpportunitySalesStage } from '@/app/actions/crm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { opportunityName, sales_stage, probability } = body

    if (!opportunityName || !sales_stage || probability === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update the opportunity stage using the existing action
    await updateOpportunitySalesStage(opportunityName, sales_stage, probability)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating opportunity stage:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update opportunity stage' },
      { status: 500 }
    )
  }
}
