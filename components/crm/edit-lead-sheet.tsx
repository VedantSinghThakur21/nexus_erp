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
          {/* --- Basic Info --- */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="lead_name">Full Name</Label>
              <Input id="lead_name" name="lead_name" defaultValue={lead.lead_name} placeholder="Full Name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company_name">Company</Label>
              <Input id="company_name" name="company_name" defaultValue={lead.company_name} placeholder="Company Name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input id="job_title" name="job_title" defaultValue={lead.job_title} placeholder="Job Title" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" defaultValue={lead.industry} placeholder="Industry" />
            </div>
          </div>

          {/* --- Contact Info --- */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email_id">Email</Label>
              <Input id="email_id" name="email_id" type="email" defaultValue={lead.email_id} placeholder="Email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mobile_no">Mobile No</Label>
              <Input id="mobile_no" name="mobile_no" defaultValue={lead.mobile_no} placeholder="Mobile Number" />
            </div>
          </div>

          {/* --- Status & Source --- */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={lead.status} className="border rounded px-2 py-1">
                <option value="Lead">Lead</option>
                <option value="Open">Open</option>
                <option value="Replied">Replied</option>
                <option value="Interested">Interested</option>
                <option value="Opportunity">Opportunity</option>
                <option value="Quotation">Quotation</option>
                <option value="Converted">Converted</option>
                <option value="Do Not Contact">Do Not Contact</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="source">Lead Source</Label>
              <Input id="source" name="source" defaultValue={lead.source} placeholder="e.g. LinkedIn, Referral" />
            </div>
          </div>

          {/* --- Territory & Location --- */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="territory">Territory / Region</Label>
              <Input id="territory" name="territory" defaultValue={lead.territory} placeholder="e.g. North America" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={lead.city} placeholder="City" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" defaultValue={lead.country} placeholder="Country" />
            </div>
          </div>

          {/* --- Notes --- */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes & Requirements</Label>
            <Textarea 
                id="notes" 
                name="notes" 
                defaultValue={lead.notes} 
                className="min-h-[100px]"
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

