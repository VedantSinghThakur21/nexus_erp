'use client'

import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, FileText, ClipboardCheck } from "lucide-react"
import { returnAsset } from "@/app/actions/bookings"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface BookingActionsProps {
  bookingId: string
  isMobilized?: boolean
  isReturned?: boolean
  assetName?: string
}

export function BookingActions({ bookingId, isMobilized, isReturned, assetName }: BookingActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleReturn = async () => {
    if (!confirm("Are you sure you want to return this asset? This will mark the booking as completed.")) {
      return
    }

    setLoading(true)
    const result = await returnAsset(bookingId)

    if (result.success) {
      router.push('/bookings')
      router.refresh()
    } else {
      alert("Error: " + (result.error || "Failed to return asset"))
      setLoading(false)
    }
  }

  const handleCreateInspection = () => {
    const params = new URLSearchParams()
    if (assetName) params.set('asset', assetName)
    params.set('booking', bookingId)
    router.push(`/inspections/new?${params.toString()}`)
  }

  const handleCreateInvoice = () => {
    router.push(`/invoices/new?sales_order=${encodeURIComponent(bookingId)}`)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {/* Create Inspection — available any time during booking lifecycle */}
      <Button variant="outline" size="sm" onClick={handleCreateInspection}>
        <ClipboardCheck className="h-4 w-4 mr-2" />
        Create Inspection
      </Button>

      {/* Return Asset — only when mobilized and not yet returned */}
      {isMobilized && !isReturned && (
        <Button
          onClick={handleReturn}
          disabled={loading}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Return Asset
        </Button>
      )}

      {/* Create Invoice — available after return or for billing */}
      {(isReturned || isMobilized) && (
        <Button size="sm" onClick={handleCreateInvoice}>
          <FileText className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      )}
    </div>
  )
}
