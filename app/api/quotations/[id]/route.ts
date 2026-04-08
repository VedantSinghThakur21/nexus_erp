import { NextRequest, NextResponse } from 'next/server'
import { getQuotation } from '@/app/actions/crm'
import { requireModuleAccess } from '@/app/api/_lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require quotations module access
  const auth = await requireModuleAccess('quotations')
  if (!auth.authorized) return auth.response

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch quotation'
    console.error('Error fetching quotation:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
