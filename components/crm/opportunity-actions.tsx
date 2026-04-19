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
  markOpportunityAsWon,
  markOpportunityAsLost,
  reopenOpportunity
} from "@/app/actions/crm"
import { useRouter } from "next/navigation"
import { ArrowRight, FileText, CheckCircle, XCircle, RotateCcw, UserCheck, CalendarPlus } from "lucide-react"
import { ActionButton } from "@/components/ui/action-button"

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
  const followUpDate = new Date().toISOString().slice(0, 10)
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
          <DialogContent className="bg-card border-border">
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
        <ActionButton
          module="quotations"
          action="create"
          label="Create Quotation"
          icon={<FileText className="h-3.5 w-3.5" />}
          onAction={async () => {
            const res = await fetch(`/api/crm/opportunities/${encodeURIComponent(opportunity.name)}/create-quotation`, {
              method: "POST",
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || data.error || "Failed to create quotation")
            router.push(`/crm/quotations/${encodeURIComponent(data.quotation_name)}`)
          }}
        />
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
        <>
          <ActionButton
            module="crm"
            action="convert"
            label="Convert to Customer"
            icon={<UserCheck className="h-3.5 w-3.5" />}
            variant="outline"
            onAction={async () => {
              const res = await fetch(`/api/crm/opportunities/${encodeURIComponent(opportunity.name)}/convert`, {
                method: "POST",
              })
              if (!res.ok) {
                const data = await res.json()
                throw new Error(data.message || data.error || "Conversion failed")
              }
            }}
            onSuccess={() => router.refresh()}
          />
          <ActionButton
            module="crm"
            action="create"
            label="Schedule Follow-up"
            icon={<CalendarPlus className="h-3.5 w-3.5" />}
            variant="outline"
            onAction={async () => {
              const res = await fetch(`/api/crm/opportunities/${encodeURIComponent(opportunity.name)}/follow-up`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: followUpDate }),
              })
              if (!res.ok) {
                const data = await res.json()
                throw new Error(data.message || data.error || "Unable to schedule follow-up")
              }
            }}
            onSuccess={() => router.refresh()}
          />
        </>
      )}

      {isOpen && !isWon && !isLost && (
        <Dialog open={isLostDialogOpen} onOpenChange={setIsLostDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2" variant="destructive">
              <XCircle className="h-4 w-4" />
              Mark as Lost
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
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
              <ActionButton
                module="crm"
                action="edit"
                label={isLoading ? "Updating..." : "Mark Lost"}
                icon={<XCircle className="h-3.5 w-3.5" />}
                variant="destructive"
                onAction={handleMarkAsLost}
                onSuccess={() => router.refresh()}
              />
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

