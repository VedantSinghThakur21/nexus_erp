import { NextRequest, NextResponse } from 'next/server'
import { createQuotationFromOpportunity } from '@/app/actions/crm'
import { requireActionPermission } from '@/app/api/_lib/auth'

export async function POST(request: NextRequest) {
  // Require quotations create permission
  const auth = await requireActionPermission('quotations', 'create')
  if (!auth.authorized) return auth.response

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create quotation'
    console.error('Error creating quotation:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
