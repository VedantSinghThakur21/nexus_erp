import { NextRequest, NextResponse } from 'next/server'
import { updateQuotation } from '@/app/actions/crm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quotationName = decodeURIComponent(id)
    const body = await request.json()
    
    const result = await updateQuotation(quotationName, body)
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true,
      quotation: result.quotation 
    })
  } catch (error: any) {
    console.error('Error updating quotation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update quotation' },
      { status: 500 }
    )
  }
}
