'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { updateQuotationStatus } from "@/app/actions/crm"

interface QuotationStatusDropdownProps {
  quotationId: string
  currentStatus: string
}

export function QuotationStatusDropdown({ quotationId, currentStatus }: QuotationStatusDropdownProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [status, setStatus] = useState(currentStatus)

  const quotationStatuses = ['Draft', 'Open', 'Ordered', 'Lost']

  const statusColors: Record<string, string> = {
    'Draft': 'bg-slate-100 text-slate-800',
    'Open': 'bg-blue-100 text-blue-800',
    'Ordered': 'bg-green-100 text-green-800',
    'Lost': 'bg-red-100 text-red-800'
  }

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return

    setUpdating(true)
    try {
      const result = await updateQuotationStatus(quotationId, newStatus)
      
      if (result.error) {
        throw new Error(result.error)
      }

      setStatus(newStatus)
      console.log('[QuotationStatusDropdown] Status updated successfully')
      router.refresh()
    } catch (error) {
      console.error('[QuotationStatusDropdown] Error updating quotation status:', error)
      alert('Failed to update quotation status. Please try again.')
      setStatus(currentStatus)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Select
      value={status}
      onValueChange={handleStatusChange}
      disabled={updating}
    >
      <SelectTrigger className="h-10 border-0 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 w-fit">
        <Badge className={statusColors[status] || 'bg-slate-100 text-slate-800'}>
          {updating ? 'Updating...' : status}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {quotationStatuses.map((s) => (
          <SelectItem key={s} value={s}>
            <Badge className={statusColors[s] || 'bg-slate-100 text-slate-800'}>
              {s}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
