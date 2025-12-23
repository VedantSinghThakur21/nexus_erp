'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil, Loader2 } from "lucide-react"
import { updateOpportunity } from "@/app/actions/crm"
import { useRouter } from "next/navigation"

interface EditOpportunityDialogProps {
  opportunity: any
}

export function EditOpportunityDialog({ opportunity }: EditOpportunityDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    opportunity_amount: opportunity.opportunity_amount || 0,
    expected_closing: opportunity.expected_closing || '',
    probability: opportunity.probability || 20,
    sales_stage: opportunity.sales_stage || 'Qualification'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await updateOpportunity(opportunity.name, formData)

    setLoading(false)

    if (result.success) {
      setOpen(false)
      router.refresh()
    } else {
      alert('Error: ' + result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Pencil className="h-4 w-4" /> Edit Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Opportunity</DialogTitle>
          <DialogDescription>
            Update opportunity details and value
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Opportunity Amount */}
            <div className="grid gap-2">
              <Label htmlFor="opportunity_amount">Opportunity Value (₹)</Label>
              <Input
                id="opportunity_amount"
                name="opportunity_amount"
                type="number"
                value={formData.opportunity_amount}
                onChange={(e) => setFormData({ ...formData, opportunity_amount: parseFloat(e.target.value) || 0 })}
                placeholder="Enter estimated value"
              />
            </div>

            {/* Expected Closing Date */}
            <div className="grid gap-2">
              <Label htmlFor="expected_closing">Expected Closing Date</Label>
              <Input
                id="expected_closing"
                name="expected_closing"
                type="date"
                value={formData.expected_closing}
                onChange={(e) => setFormData({ ...formData, expected_closing: e.target.value })}
              />
            </div>

            {/* Sales Stage */}
            <div className="grid gap-2">
              <Label htmlFor="sales_stage">Sales Stage</Label>
              <Select
                value={formData.sales_stage}
                onValueChange={(value) => {
                  const probabilities: Record<string, number> = {
                    'Prospecting': 10,
                    'Qualification': 20,
                    'Proposal/Price Quote': 60,
                    'Negotiation/Review': 80
                  }
                  setFormData({
                    ...formData,
                    sales_stage: value,
                    probability: probabilities[value] || formData.probability
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prospecting">Prospecting (10%)</SelectItem>
                  <SelectItem value="Qualification">Qualification (20%)</SelectItem>
                  <SelectItem value="Proposal/Price Quote">Proposal/Price Quote (60%)</SelectItem>
                  <SelectItem value="Negotiation/Review">Negotiation/Review (80%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Probability */}
            <div className="grid gap-2">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input
                id="probability"
                name="probability"
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
