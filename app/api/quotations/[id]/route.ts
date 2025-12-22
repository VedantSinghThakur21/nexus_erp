import { NextRequest, NextResponse } from 'next/server'
import { getQuotation } from '@/app/actions/crm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quotationName = decodeURIComponent(id)
    
    const quotation = await getQuotation(quotationName)
    
    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ quotation })
  } catch (error: any) {
    console.error('Error fetching quotation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quotation' },
      { status: 500 }
    )
  }
}
