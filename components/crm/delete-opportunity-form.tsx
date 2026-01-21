'use client'

import { Button } from "@/components/ui/button"
import { deleteOpportunity } from "@/app/actions/crm"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface DeleteOpportunityFormProps {
  opportunityId: string
}

export function DeleteOpportunityForm({ opportunityId }: DeleteOpportunityFormProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!confirm('Are you sure you want to delete this opportunity? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    const result = await deleteOpportunity(opportunityId)
    
    if (result?.error) {
      alert('Failed to delete opportunity: ' + result.error)
      setIsDeleting(false)
    } else {
      router.push('/crm/opportunities')
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
