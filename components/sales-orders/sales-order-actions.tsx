'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, RefreshCw, Truck } from "lucide-react"
import { cancelSalesOrder } from "@/app/actions/sales-orders"
import { DeleteSalesOrderButton } from "./delete-sales-order-button"

interface SalesOrderActionsProps {
  orderId: string
  currentStatus: string
  docStatus: number
  canCreateInvoice?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-slate-100 text-slate-700',
  'To Deliver and Bill': 'bg-blue-100 text-blue-800',
  'To Bill': 'bg-yellow-100 text-yellow-800',
  'To Deliver': 'bg-orange-100 text-orange-800',
  'Completed': 'bg-green-100 text-green-800',
  'Cancelled': 'bg-red-100 text-red-800',
  'On Hold': 'bg-purple-100 text-purple-800',
  'Closed': 'bg-slate-100 text-slate-700',
}

export function SalesOrderActions({ orderId, currentStatus, docStatus, canCreateInvoice = true }: SalesOrderActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // ERPNext computes 'status' automatically — we never set it directly.
  // The only valid manual transitions on a submitted SO are Cancel and Put On Hold.

  const handleCancel = async () => {
    if (!confirm(`Cancel Sales Order ${orderId}? This cannot be undone.`)) return
    setLoading(true)
    try {
      const result = await cancelSalesOrder(orderId)
      if ((result as any)?.success) {
        router.refresh()
      } else {
        alert((result as any)?.error || 'Failed to cancel sales order')
      }
    } catch (e) {
      alert('Failed to cancel sales order')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvoice = () => {
    router.push(`/invoices/new?sales_order=${encodeURIComponent(orderId)}`)
  }

  const handleManageBooking = () => {
    router.push(`/bookings/${encodeURIComponent(orderId)}`)
  }

  const isReadyForInvoice = canCreateInvoice && docStatus === 1 && (
    currentStatus === 'To Bill' ||
    currentStatus === 'To Deliver and Bill'
  )

  const canCancel = docStatus === 1 && currentStatus !== 'Cancelled' && currentStatus !== 'Completed'
  const canManageBooking = docStatus === 1 && currentStatus !== 'Cancelled'

  return (
    <div className="flex gap-3 items-center">
      {/* Read-only status badge — ERPNext calculates this automatically */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Badge className={STATUS_COLORS[currentStatus] || 'bg-slate-100 text-slate-700'}>
          {currentStatus}
        </Badge>
        <button
          onClick={() => router.refresh()}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="Refresh status"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Delete/Cancel Button */}
      {docStatus === 0 ? (
        <DeleteSalesOrderButton orderId={orderId} orderStatus={currentStatus} docStatus={docStatus} />
      ) : canCancel ? (
        <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading} className="text-red-600 border-red-200 hover:bg-red-50">
          Cancel Order
        </Button>
      ) : null}

      {/* Manage Booking — connects to operational workflow */}
      {canManageBooking && (
        <Button variant="outline" size="sm" onClick={handleManageBooking} disabled={loading}>
          <Truck className="w-4 h-4 mr-2" />
          Manage Booking
        </Button>
      )}

      {/* Create Invoice */}
      {isReadyForInvoice && (
        <Button onClick={handleCreateInvoice} size="sm" disabled={loading}>
          <FileText className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      )}
    </div>
  )
}
