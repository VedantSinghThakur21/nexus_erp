'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Loader2 } from "lucide-react"
import { updateInspection } from "@/app/actions/inspections"

export function UpdateInspectionDialog({ inspection }: { inspection: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(inspection.status)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await updateInspection(inspection.name, formData)

    if (result.success) {
      setOpen(false)
      window.location.reload()
    } else {
      alert(result.error || 'Failed to update inspection')
    }
    
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit className="h-4 w-4" /> Update Status
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Inspection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Result Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Accepted">Passed (Ready to Rent)</SelectItem>
                <SelectItem value="Rejected">Failed (Needs Repair)</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="status" value={status} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="remarks">Remarks / Observations</Label>
            <Textarea 
              id="remarks"
              name="remarks" 
              placeholder="Note any scratches, fuel levels, or damages..." 
              defaultValue={inspection.remarks || ''}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Inspection
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

