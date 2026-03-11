import { NextRequest, NextResponse } from 'next/server'
import { updateQuotation } from '@/app/actions/crm'
import { requireAuth } from '@/app/api/_lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response

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
