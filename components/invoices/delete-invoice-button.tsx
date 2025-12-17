'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { deleteInvoice } from "@/app/actions/invoices"
import { useRouter } from "next/navigation"

export function DeleteInvoiceButton({ id, status }: { id: string, status: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Only allow deleting Draft or Cancelled invoices
  if (status !== 'Draft' && status !== 'Cancelled' && status !== 'Overdue' && status !== 'Paid' && status !== 'Unpaid') {
      // Actually status is string in list, docstatus is int. 
      // Usually only docstatus 0 (Draft) and 2 (Cancelled) are deletable.
      // But status string can be 'Draft', 'Overdue' (submitted), 'Paid' (submitted).
      // We will let server validate logic, but visually maybe hide for 'Paid'?
      // Let's just show it and let server reject if invalid.
  }
  
  // Safe check: Usually Paid/Overdue means Submitted.
  const isLocked = status === 'Paid' || status === 'Overdue' || status === 'Unpaid' || status === 'Submitted';

  if (isLocked) return <div className="w-8" />; // Empty placeholder

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this invoice?")) return
    
    setLoading(true)
    const res = await deleteInvoice(id)
    setLoading(false)

    if (res.success) {
      router.refresh()
    } else {
      alert(res.error)
    }
  }

  return (
    <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
        onClick={handleDelete}
        disabled={loading}
    >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  )
}
