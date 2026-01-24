'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface DeleteSalesOrderButtonProps {
  orderId: string
  orderStatus: string
  docStatus: number
}

export function DeleteSalesOrderButton({ orderId, orderStatus, docStatus }: DeleteSalesOrderButtonProps) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  // Only show delete button for Draft sales orders that haven't been submitted
  if (docStatus === 1 || orderStatus !== 'Draft') {
    return null
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete sales order ${orderId}? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)

    try {
      const response = await fetch(`/api/sales-orders/${encodeURIComponent(orderId)}/delete`, {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete sales order')
      }

      router.push('/sales-orders')
    } catch (error: any) {
      console.error('Error deleting sales order:', error)
      alert(`Failed to delete sales order: ${error.message}`)
      setDeleting(false)
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
      className="gap-2"
    >
      {deleting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Deleting...
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4" />
          Delete
        </>
      )}
    </Button>
  )
}