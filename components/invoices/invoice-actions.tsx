'use client'

import { Button } from "@/components/ui/button"
import { Printer, CheckCircle, Ban, Loader2 } from "lucide-react"
import { submitInvoice, cancelInvoice } from "@/app/actions/invoices"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function InvoiceActions({ invoice }: { invoice: any }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAction = async (action: 'submit' | 'cancel') => {
    setLoading(true)
    const res = action === 'submit' 
      ? await submitInvoice(invoice.name)
      : await cancelInvoice(invoice.name)
    
    setLoading(false)
    if (res.success) {
      router.refresh()
    } else {
      alert("Error: " + res.error)
    }
  }

  return (
    <div className="flex items-center gap-2">
        {/* Print Button (Always Visible) */}
        <a 
            href={`${process.env.NEXT_PUBLIC_ERP_NEXT_URL || 'http://103.224.243.242:8080'}/api/method/frappe.utils.print_format.download_pdf?doctype=Sales%20Invoice&name=${invoice.name}&format=Standard`}
            target="_blank"
            rel="noopener noreferrer"
        >
            <Button variant="outline" className="gap-2">
                <Printer className="h-4 w-4" /> Print PDF
            </Button>
        </a>

        {/* Submit Button (Only for Drafts) */}
        {invoice.docstatus === 0 && (
            <Button 
                onClick={() => handleAction('submit')} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Submit
            </Button>
        )}

        {/* Cancel Button (Only for Submitted) */}
        {invoice.docstatus === 1 && (
            <Button 
                onClick={() => handleAction('cancel')} 
                disabled={loading}
                variant="destructive"
                className="gap-2"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Cancel
            </Button>
        )}
    </div>
  )
}
