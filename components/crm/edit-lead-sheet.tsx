'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Pencil, Loader2 } from "lucide-react"
import { updateLead } from "@/app/actions/crm"
import { useRouter } from "next/navigation"

// We pass the current data in so the form isn't empty
export function EditLeadSheet({ lead }: { lead: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const res = await updateLead(lead.name, formData)
    setLoading(false)
    
    if (res.success) {
      setOpen(false)
      router.refresh()
    } else {
      alert("Error: " + res.error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit Details
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>Edit Lead Profile</SheetTitle>
          <SheetDescription>
            Update the detailed information for {lead.lead_name}.
          </SheetDescription>
        </SheetHeader>
        
        <form action={handleSubmit} className="grid gap-6 py-6">
          
          {/* Status */}
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Input id="status" name="status" defaultValue={lead.status} />
          </div>

          {/* Territory */}
          <div className="grid gap-2">
            <Label htmlFor="territory">Territory / Region</Label>
            <Input id="territory" name="territory" defaultValue={lead.territory} placeholder="e.g. North America" />
          </div>

          {/* Source */}
          <div className="grid gap-2">
            <Label htmlFor="source">Lead Source</Label>
            <Input id="source" name="source" defaultValue={lead.source} placeholder="e.g. LinkedIn, Referral" />
          </div>

          {/* Notes (Rich Text in ERPNext, simple text here) */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes & Requirements</Label>
            <Textarea 
                id="notes" 
                name="notes" 
                defaultValue={lead.notes} 
                className="min-h-[150px]"
                placeholder="Enter meeting notes, customer needs, etc." 
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

