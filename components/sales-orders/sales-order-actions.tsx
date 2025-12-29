'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, CheckCircle } from "lucide-react"
import { updateSalesOrderStatus } from "@/app/actions/sales-orders"

interface SalesOrderActionsProps {
  orderId: string
  currentStatus: string
  canCreateInvoice?: boolean
}

export function SalesOrderActions({ orderId, currentStatus, canCreateInvoice = true }: SalesOrderActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
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

  const handleStatusUpdate = async () => {
    if (!selectedStatus || selectedStatus === currentStatus) {
      setStatusDialogOpen(false)
      return
    }

    setLoading(true)
    try {
      const result = await updateSalesOrderStatus(orderId, selectedStatus)
      if (result.success) {
        setStatusDialogOpen(false)
        router.refresh()
      } else {
        alert(result.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvoice = () => {
    router.push(`/invoices/new?sales_order=${encodeURIComponent(orderId)}`)
  }

  // Determine if we can create invoice (status should be "To Bill" or "To Deliver and Bill")
  const isReadyForInvoice = canCreateInvoice && (
    currentStatus === 'To Bill' || 
    currentStatus === 'To Deliver and Bill'
  )

  return (
    <div className="flex gap-2">
      {/* Update Status */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <CheckCircle className="w-4 h-4 mr-2" />
            Update Status
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Sales Order Status</DialogTitle>
            <DialogDescription>
              Change the status of this sales order
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="status">Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id="status" className="mt-2">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={loading || selectedStatus === currentStatus}>
              {loading ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
