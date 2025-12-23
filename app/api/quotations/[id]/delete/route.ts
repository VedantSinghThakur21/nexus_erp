import { NextRequest, NextResponse } from 'next/server'
import { deleteQuotation } from '@/app/actions/crm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quotationName = decodeURIComponent(id)
    
    const result = await deleteQuotation(quotationName)
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Quotation deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting quotation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete quotation' },
      { status: 500 }
    )
  }
}
