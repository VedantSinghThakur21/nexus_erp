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
      terms,
      taxes_and_charges,
      opportunity
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

    // Log items for debugging
    console.log('=== API Route: Items received ===')
    items.forEach((item: any) => {
      if (item.is_rental) {
        console.log('Rental item:', item.item_code)
        console.log('  rental_type:', item.rental_type)
        console.log('  rental_duration:', item.rental_duration)
        console.log('  pricing_components:', item.pricing_components)
      }
    })

    // Create the quotation using the action - pass items as-is with frontend field names
    // The createQuotation action will handle mapping to custom_* fields
    const quotationPayload: any = {
      quotation_to,
      party_name,
      transaction_date,
      valid_till,
      currency: currency || 'INR',
      order_type: order_type || 'Sales',
      items: items  // Pass original items, not processedItems
    }

    // Only add optional fields if they have valid values
    if (opportunity && opportunity.trim() !== '') {
      quotationPayload.opportunity = opportunity
    }
    
    if (payment_terms_template && payment_terms_template.trim() !== '') {
      quotationPayload.payment_terms_template = payment_terms_template
    }
    
    if (terms && terms.trim() !== '') {
      quotationPayload.terms = terms
    }

    if (taxes_and_charges && taxes_and_charges.trim() !== '') {
      quotationPayload.taxes_and_charges = taxes_and_charges
    }

    const quotation = await createQuotation(quotationPayload)

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
