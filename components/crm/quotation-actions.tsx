'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, FileText, Trash2, X, Mail, ShoppingCart, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { submitQuotation, cancelQuotation, deleteQuotation } from "@/app/actions/crm"
import { ActionButton } from "@/components/ui/action-button"

interface QuotationActionsProps {
  quotation: {
    name: string
    docstatus: number
    status: string
  }
}

export function QuotationActions({ quotation }: QuotationActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAction = async (action: 'submit' | 'cancel' | 'delete') => {
    let confirmMessage = ''
    
    if (action === 'submit') {
      confirmMessage = 'Submit this quotation? It will become read-only and ready for Sales Order creation.'
    } else if (action === 'cancel') {
      confirmMessage = 'Cancel this quotation? This action cannot be undone.'
    } else if (action === 'delete') {
      confirmMessage = 'Delete this quotation? This action cannot be undone.'
    }

    if (!confirm(confirmMessage)) {
      return
    }

    setLoading(true)
    try {
      let result
      if (action === 'submit') {
        result = await submitQuotation(quotation.name)
      } else if (action === 'cancel') {
        result = await cancelQuotation(quotation.name)
      } else {
        result = await deleteQuotation(quotation.name)
        if (result.success) {
          router.push('/crm/quotations')
          return
        }
      }
      
      if (result.error) {
        alert('Error: ' + result.error)
      } else {
        router.refresh()
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Print Button (Always Visible) */}
      <Link href={`/print/quotation/${encodeURIComponent(quotation.name)}`} target="_blank">
        <Button variant="outline" className="gap-2">
          <Printer className="h-4 w-4" /> Print
        </Button>
      </Link>

      {/* Edit Button (Only for Draft) */}
      {quotation.docstatus === 0 && (
        <Link href={`/crm/quotations/${encodeURIComponent(quotation.name)}/edit`}>
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Edit
          </Button>
        </Link>
      )}

      {/* Submit Button (Only for Draft) */}
      {quotation.docstatus === 0 && (
        <ActionButton
          module="quotations"
          action="edit"
          label="Submit Quotation"
          icon={<FileText className="h-3.5 w-3.5" />}
          onAction={async () => {
            const res = await fetch(`/api/sales/quotations/${encodeURIComponent(quotation.name)}/submit`, { method: "POST" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || data.error || "Unable to submit quotation")
          }}
          onSuccess={() => router.refresh()}
        />
      )}

      {quotation.docstatus === 1 && (
        <ActionButton
          module="quotations"
          action="create"
          label="Create Sales Order"
          icon={<ShoppingCart className="h-3.5 w-3.5" />}
          onAction={async () => {
            const res = await fetch(`/api/sales/quotations/${encodeURIComponent(quotation.name)}/create-sales-order`, { method: "POST" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || data.error || "Unable to create sales order")
            if (data.sales_order_name) {
              router.push(`/sales-orders/${encodeURIComponent(data.sales_order_name)}`)
            }
          }}
          onSuccess={() => router.refresh()}
        />
      )}

      {quotation.docstatus === 1 && (
        <ActionButton
          module="quotations"
          action="edit"
          label="Send by Email"
          icon={<Mail className="h-3.5 w-3.5" />}
          variant="outline"
          onAction={async () => {
            const res = await fetch(`/api/sales/quotations/${encodeURIComponent(quotation.name)}/send-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recipientEmail: "" }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || data.error || "Unable to queue email")
          }}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Cancel Button (Only for Submitted) */}
      {quotation.docstatus === 1 && (
        <Button 
          onClick={() => handleAction('cancel')} 
          disabled={loading}
          variant="destructive"
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Cancel
        </Button>
      )}

      {/* Delete Button (Only for Draft) */}
      {quotation.docstatus === 0 && (
        <Button 
          onClick={() => handleAction('delete')} 
          disabled={loading}
          variant="destructive"
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete
        </Button>
      )}
    </div>
  )
}
