'use client'

import { Button } from "@/components/ui/button"
import { Printer, Ban, Bell, Loader2 } from "lucide-react"
import { cancelInvoice } from "@/app/actions/invoices"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { PaymentDialog } from "./payment-dialog"
import { ActionButton } from "@/components/ui/action-button"

export function InvoiceActions({ invoice }: { invoice: any }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAction = async () => {
    setLoading(true)
    const res = await cancelInvoice(invoice.name)
    
    setLoading(false)
    if (res.success) {
      router.refresh()
    } else {
      alert("Error: " + res.error)
    }
  }

  const hasOutstanding = useMemo(
    () => invoice.docstatus === 1 && (invoice.outstanding_amount > 0 || invoice.status !== 'Paid'),
    [invoice.docstatus, invoice.outstanding_amount, invoice.status]
  )

  return (
    <div className="flex items-center gap-2">
        {/* Print Button (Always Visible) */}
        <a 
            href={`/print/invoice/${invoice.name}`}
            target="_blank"
            rel="noopener noreferrer"
        >
            <Button variant="outline" className="gap-2">
                <Printer className="h-4 w-4" /> Print PDF
            </Button>
        </a>

        {/* Payment Button (Only for Submitted with Outstanding) */}
        {hasOutstanding && <PaymentDialog invoice={invoice} />}

        {/* Submit Button (Only for Drafts) */}
        {invoice.docstatus === 0 && (
          <ActionButton
            module="invoices"
            action="edit"
            label="Submit Invoice"
            onAction={async () => {
              const res = await fetch(`/api/sales/invoices/${encodeURIComponent(invoice.name)}/submit`, { method: "POST" })
              const data = await res.json()
              if (!res.ok) throw new Error(data.message || data.error || "Unable to submit invoice")
            }}
            onSuccess={() => router.refresh()}
          />
        )}

        {/* Cancel Button (Only for Submitted) */}
        {invoice.docstatus === 1 && (
            <Button 
                onClick={handleAction}
                disabled={loading}
                variant="destructive"
                className="gap-2"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Cancel
            </Button>
        )}

        {invoice.docstatus === 1 && (
          <ActionButton
            module="invoices"
            action="edit"
            label="Send Reminder"
            icon={<Bell className="h-3.5 w-3.5" />}
            variant="outline"
            onAction={async () => {
              const res = await fetch(`/api/sales/invoices/${encodeURIComponent(invoice.name)}/send-payment-reminder`, {
                method: "POST",
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.message || data.error || "Unable to send reminder")
            }}
            onSuccess={() => router.refresh()}
          />
        )}
    </div>
  )
}

