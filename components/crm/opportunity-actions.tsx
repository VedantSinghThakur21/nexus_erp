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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  updateOpportunitySalesStage,
  createQuotationFromOpportunity,
  markOpportunityAsWon,
  markOpportunityAsLost,
  reopenOpportunity
} from "@/app/actions/crm"
import { useRouter } from "next/navigation"
import { ArrowRight, FileText, CheckCircle, XCircle, RotateCcw } from "lucide-react"

interface OpportunityActionsProps {
  opportunity: {
    name: string
    sales_stage: string
    status: string
  }
}

const SALES_STAGES = [
  { value: 'Prospecting', label: 'Prospecting (10%)', probability: 10 },
  { value: 'Qualification', label: 'Qualification (20%)', probability: 20 },
  { value: 'Proposal/Price Quote', label: 'Proposal/Price Quote (60%)', probability: 60 },
  { value: 'Negotiation/Review', label: 'Negotiation/Review (80%)', probability: 80 }
]

export function OpportunityActions({ opportunity }: OpportunityActionsProps) {
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false)
  const [isLostDialogOpen, setIsLostDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStage, setSelectedStage] = useState(opportunity.sales_stage)
  const [lostReason, setLostReason] = useState('')
  const router = useRouter()

  const handleUpdateStage = async () => {
    setIsLoading(true)
    try {
      const stage = SALES_STAGES.find(s => s.value === selectedStage)
      if (!stage) return
      
      await updateOpportunitySalesStage(opportunity.name, stage.value, stage.probability)
      setIsStageDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Stage update failed:", error)
      alert("Failed to update stage. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateQuotation = async () => {
    setIsLoading(true)
    try {
      const quotation = await createQuotationFromOpportunity(opportunity.name)
      router.push(`/crm/quotations/${encodeURIComponent(quotation.name)}`)
    } catch (error) {
      console.error("Quotation creation failed:", error)
      alert("Failed to create quotation. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsWon = async () => {
    setIsLoading(true)
    try {
      await markOpportunityAsWon(opportunity.name)
      router.refresh()
    } catch (error) {
      console.error("Mark as won failed:", error)
      alert("Failed to mark as won. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsLost = async () => {
    setIsLoading(true)
    try {
      await markOpportunityAsLost(opportunity.name, lostReason)
      setIsLostDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Mark as lost failed:", error)
      alert("Failed to mark as lost. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReopenOpportunity = async () => {
    setIsLoading(true)
    try {
      await reopenOpportunity(opportunity.name)
      router.refresh()
    } catch (error) {
      console.error("Reopen failed:", error)
      alert("Failed to reopen opportunity. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const isOpen = opportunity.status === 'Open'
  const isWon = opportunity.status === 'Converted'
  const isLost = opportunity.status === 'Lost'

  return (
    <div className="space-y-3">
      {/* Update Stage */}
      {isOpen && !isWon && !isLost && (
        <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2" variant="outline">
              <ArrowRight className="h-4 w-4" />
              Update Sales Stage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Sales Stage</DialogTitle>
              <DialogDescription>
                Move this opportunity to a different stage in the sales pipeline.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Sales Stage</Label>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALES_STAGES.map(stage => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label} ({stage.probability}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStageDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStage} disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Stage"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Quotation */}
      {isOpen && !isWon && !isLost && opportunity.sales_stage === 'Proposal/Price Quote' && (
        <Button 
          className="w-full gap-2" 
          onClick={handleCreateQuotation}
          disabled={isLoading}
        >
          <FileText className="h-4 w-4" />
          {isLoading ? "Creating..." : "Create Quotation"}
        </Button>
      )}

      {/* Mark as Won */}
      {isOpen && !isWon && !isLost && opportunity.sales_stage === 'Negotiation/Review' && (
        <Button 
          className="w-full gap-2 bg-green-600 hover:bg-green-700" 
          onClick={handleMarkAsWon}
          disabled={isLoading}
        >
          <CheckCircle className="h-4 w-4" />
          {isLoading ? "Updating..." : "Mark as Won"}
        </Button>
      )}

      {/* Mark as Lost */}
      {isOpen && !isWon && !isLost && (
        <Dialog open={isLostDialogOpen} onOpenChange={setIsLostDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2" variant="destructive">
              <XCircle className="h-4 w-4" />
              Mark as Lost
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Opportunity as Lost</DialogTitle>
              <DialogDescription>
                Record why this opportunity was lost.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Lost Reason (optional)</Label>
                <Textarea
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  placeholder="e.g., Price too high, Chose competitor, Timeline didn't match..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLostDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleMarkAsLost} disabled={isLoading}>
                {isLoading ? "Updating..." : "Mark as Lost"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Status badges and reopen action */}
      {isWon && (
        <>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              🎉 Opportunity Won!
            </p>
          </div>
          <Button 
            className="w-full gap-2" 
            variant="outline"
            onClick={handleReopenOpportunity}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4" />
            {isLoading ? "Reopening..." : "Reopen Opportunity"}
          </Button>
        </>
      )}
      
      {isLost && (
        <>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Opportunity Lost
            </p>
          </div>
          <Button 
            className="w-full gap-2" 
            variant="outline"
            onClick={handleReopenOpportunity}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4" />
            {isLoading ? "Reopening..." : "Reopen Opportunity"}
          </Button>
        </>
      )}
    </div>
  )
}

