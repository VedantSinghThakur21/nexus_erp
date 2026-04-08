import { NextRequest, NextResponse } from 'next/server'
import { deleteQuotation } from '@/app/actions/crm'
import { requireActionPermission } from '@/app/api/_lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require quotations delete permission
  const auth = await requireActionPermission('quotations', 'delete')
  if (!auth.authorized) return auth.response

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete quotation'
    console.error('Error deleting quotation:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
