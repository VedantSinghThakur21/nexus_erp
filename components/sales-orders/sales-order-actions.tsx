'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText } from "lucide-react"
import { updateSalesOrderStatus } from "@/app/actions/sales-orders"

interface SalesOrderActionsProps {
  orderId: string
  currentStatus: string
  canCreateInvoice?: boolean
}

export function SalesOrderActions({ orderId, currentStatus, canCreateInvoice = true }: SalesOrderActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(currentStatus)

  const statuses = [
    'Draft',
    'To Deliver and Bill',
    'To Bill',
    'To Deliver',
    'Completed',
    'On Hold',
    'Cancelled'
  ]

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return
    
    setSelectedStatus(newStatus)
    setLoading(true)
    try {
      const result = await updateSalesOrderStatus(orderId, newStatus)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || 'Failed to update status')
        setSelectedStatus(currentStatus)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
      setSelectedStatus(currentStatus)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvoice = () => {
    router.push(`/invoices/new?sales_order=${encodeURIComponent(orderId)}`)
  }

  // Determine if we can create invoice
  const isReadyForInvoice = canCreateInvoice && (
    currentStatus === 'To Bill' || 
    currentStatus === 'To Deliver and Bill'
  )

  return (
    <div className="flex gap-3 items-center">
      {/* Status Dropdown */}
      <div className="flex items-center gap-2">
        <Label className="text-sm text-slate-600">Status:</Label>
        <Select value={selectedStatus} onValueChange={handleStatusChange} disabled={loading}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Create Invoice */}
      {isReadyForInvoice && (
        <Button onClick={handleCreateInvoice} size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      )}
    </div>
  )
}
