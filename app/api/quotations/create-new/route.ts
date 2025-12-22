import { NextRequest, NextResponse } from 'next/server'
import { createQuotation } from '@/app/actions/crm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      quotation_to,
      party_name,
      transaction_date,
      valid_till,
      currency,
      order_type,
      items,
      payment_terms_template,
      terms
    } = body

    // Validate required fields
    if (!quotation_to || !party_name || !transaction_date || !valid_till) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      )
    }

    // Create the quotation using the action
    const quotation = await createQuotation({
      quotation_to,
      party_name,
      transaction_date,
      valid_till,
      currency: currency || 'INR',
      order_type: order_type || 'Sales',
      items,
      payment_terms_template,
      terms
    })

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
