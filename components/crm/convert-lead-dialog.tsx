"use client"

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
import { convertLeadToOpportunity } from "@/app/actions/crm"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"

export function ConvertLeadDialog({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [createCustomer, setCreateCustomer] = useState(false)
  const [opportunityAmount, setOpportunityAmount] = useState<number>(0)
  const router = useRouter()

  const handleConvert = async () => {
    setIsLoading(true)
    try {
      const opportunity = await convertLeadToOpportunity(leadId, createCustomer, opportunityAmount)
      setIsOpen(false)
      router.push(`/crm/opportunities/${encodeURIComponent(opportunity.opportunityId)}`)
    } catch (error) {
      console.error("Conversion failed:", error)
      alert("Failed to convert lead. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ArrowRight className="h-4 w-4" />
          Convert to Opportunity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert Lead to Opportunity</DialogTitle>
          <DialogDescription>
            Create an opportunity from lead: <strong>{leadName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Opportunity Amount */}
          <div className="space-y-2">
            <Label htmlFor="opportunityAmount">Estimated Opportunity Value (₹)</Label>
            <Input
              id="opportunityAmount"
              type="number"
              placeholder="Enter estimated deal value"
              value={opportunityAmount || ''}
              onChange={(e) => setOpportunityAmount(parseFloat(e.target.value) || 0)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              This helps track pipeline value and forecast revenue
            </p>
          </div>

          {/* Create Customer Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createCustomer"
              checked={createCustomer}
              onChange={(e) => setCreateCustomer(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="createCustomer" className="text-sm font-normal cursor-pointer">
              Also create Customer record
            </Label>
          </div>
          
          <p className="text-sm text-muted-foreground">
            This will create a new Opportunity linked to this lead. 
            {createCustomer && " A Customer record will also be created."}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={isLoading}>
            {isLoading ? "Converting..." : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

