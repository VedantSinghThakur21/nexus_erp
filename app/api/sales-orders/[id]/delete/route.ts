import { NextRequest, NextResponse } from 'next/server'
import { deleteSalesOrder } from '@/app/actions/sales-orders'

// API route to delete a sales order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const salesOrderName = decodeURIComponent(id)

    const result = await deleteSalesOrder(salesOrderName)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sales order deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting sales order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete sales order' },
      { status: 500 }
    )
  }
}