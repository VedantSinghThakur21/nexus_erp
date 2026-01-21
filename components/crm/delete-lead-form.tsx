'use client'

import { Button } from "@/components/ui/button"
import { deleteLead } from "@/app/actions/crm"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface DeleteLeadFormProps {
  leadId: string
}

export function DeleteLeadForm({ leadId }: DeleteLeadFormProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    const result = await deleteLead(leadId)
    
    if (result?.error) {
      alert('Failed to delete lead: ' + result.error)
      setIsDeleting(false)
    } else {
      router.push('/crm')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleDelete}>
      <Button type="submit" variant="destructive" className="ml-2" disabled={isDeleting}>
        {isDeleting ? 'Deleting...' : 'Delete'}
      </Button>
    </form>
  )
}
