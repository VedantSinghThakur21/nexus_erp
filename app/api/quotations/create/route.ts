import { NextRequest, NextResponse } from 'next/server'
import { createQuotationFromOpportunity } from '@/app/actions/crm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { opportunityName } = body

    if (!opportunityName) {
      return NextResponse.json(
        { error: 'Opportunity name is required' },
        { status: 400 }
      )
    }

    // Create the quotation using the existing action
    const quotation = await createQuotationFromOpportunity(opportunityName)

    return NextResponse.json({ 
      success: true,
      quotation: quotation 
    })
  } catch (error: any) {
    console.error('Error creating quotation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create quotation' },
      { status: 500 }
    )
  }
}
