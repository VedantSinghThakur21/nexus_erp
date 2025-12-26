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

    // Process items to handle rental fields properly
    const processedItems = items.map((item: any) => {
      const baseItem: any = {
        item_code: item.item_code || 'MISC',
        item_name: item.item_name || item.description || 'Miscellaneous',
        description: item.description || item.item_name || '',
        qty: item.qty || 1,
        uom: item.uom || 'Nos',
        rate: item.rate || 0,
        amount: item.amount || 0
      }

      // Add rental fields as custom fields if present
      // In ERPNext, custom fields are stored directly on the child table row
      if (item.is_rental) {
        // Store rental data in a JSON field or separate custom fields
        // ERPNext supports storing JSON data in Long Text fields
        baseItem.custom_rental_data = JSON.stringify({
          is_rental: true,
          rental_type: item.rental_type,
          rental_duration: item.rental_duration,
          rental_start_date: item.rental_start_date,
          rental_end_date: item.rental_end_date,
          rental_start_time: item.rental_start_time,
          rental_end_time: item.rental_end_time,
          requires_operator: item.requires_operator,
          operator_included: item.operator_included,
          operator_name: item.operator_name,
          pricing_components: item.pricing_components,
          total_rental_cost: item.total_rental_cost
        })
        
        // Also store key rental fields as separate custom fields for easier filtering/reporting
        baseItem.custom_is_rental = 1
        baseItem.custom_rental_type = item.rental_type
        baseItem.custom_rental_duration = item.rental_duration
        baseItem.custom_rental_start_date = item.rental_start_date
        baseItem.custom_rental_end_date = item.rental_end_date
        baseItem.custom_operator_included = item.operator_included ? 1 : 0
        baseItem.custom_total_rental_cost = item.total_rental_cost
      }

      return baseItem
    })

    // Create the quotation using the action
    const quotationPayload: any = {
      quotation_to,
      party_name,
      transaction_date,
      valid_till,
      currency: currency || 'INR',
      order_type: order_type || 'Sales',
      items: processedItems
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
