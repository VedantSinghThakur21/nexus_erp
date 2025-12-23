'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface DeleteQuotationButtonProps {
  quotationId: string
  quotationStatus: string
}

export function DeleteQuotationButton({ quotationId, quotationStatus }: DeleteQuotationButtonProps) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  // Only show delete button for Draft quotations
  if (quotationStatus !== 'Draft') {
    return null
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete quotation ${quotationId}? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)

    try {
      const response = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/delete`, {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete quotation')
      }

      router.push('/crm/quotations')
    } catch (error: any) {
      console.error('Error deleting quotation:', error)
      alert(`Failed to delete quotation: ${error.message}`)
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
