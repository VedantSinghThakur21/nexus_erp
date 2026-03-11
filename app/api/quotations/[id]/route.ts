import { NextRequest, NextResponse } from 'next/server'
import { getQuotation } from '@/app/actions/crm'
import { requireAuth } from '@/app/api/_lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response

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
