'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { updateLeadStatus, convertLeadToOpportunity, getOpportunityMetadata } from "@/app/actions/crm"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToastHelpers } from "@/components/ui/toast"

// Define the columns for your pipeline (Updated with proper ERPNext Lead statuses)
const COLUMNS = [
  { id: 'Lead', title: 'New Lead', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { id: 'Open', title: 'Open', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'Replied', title: 'Replied', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { id: 'Interested', title: 'Interested', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'Opportunity', title: 'Opportunity', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'Quotation', title: 'Quotation', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'Converted', title: 'Converted', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'Do Not Contact', title: 'Do Not Contact', color: 'bg-red-100 text-red-700 border-red-200' },
]

export function KanbanBoard({ leads }: { leads: any[] }) {
  const router = useRouter()
  const toast = useToastHelpers()
  // Optimistic UI: We update local state immediately while the server saves
  const [items, setItems] = useState(leads)

  // Conversion Dialog State
  const [isConversionDialogOpen, setIsConversionDialogOpen] = useState(false)
  const [pendingConversion, setPendingConversion] = useState<{ leadId: string, newStatus: string } | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [opportunityAmount, setOpportunityAmount] = useState<number>(0)
  const [opportunityType, setOpportunityType] = useState<string>('Sales')
  const [salesStage, setSalesStage] = useState<string>('Qualification')
  const [metadata, setMetadata] = useState<{ types: string[], stages: string[] }>({ types: [], stages: [] })

  // Fetch metadata when dialog opens
  const handleConversionDialogOpen = async (open: boolean) => {
    setIsConversionDialogOpen(open)
    if (open && metadata.types.length === 0) {
      const data = await getOpportunityMetadata()
      setMetadata(data)
      if (data.types.length > 0) setOpportunityType(data.types[0])
      if (data.stages.length > 0) setSalesStage(data.stages[0])
    }
  }

  // Handle the drop event
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over) return

    const leadId = active.id as string
    const newStatus = over.id as string // The column ID is the status

    // 1. Find the lead in our list
    const lead = items.find(l => l.name === leadId)
    if (!lead || lead.status === newStatus) return

    // Special handling for Opportunity conversion
    if (newStatus === 'Opportunity') {
      setPendingConversion({ leadId, newStatus })
      setPendingConversion({ leadId, newStatus })
      handleConversionDialogOpen(true)
      return
    }

    // 2. Optimistic Update (Update UI instantly)
    const originalStatus = lead.status
    setItems(items.map(l =>
      l.name === leadId ? { ...l, status: newStatus } : l
    ))

    // 3. Server Update (Save to ERPNext)
    const res = await updateLeadStatus(leadId, newStatus)

    if (!res.success) {
      // Revert if failed
      setItems(items.map(l =>
        l.name === leadId ? { ...l, status: originalStatus } : l
      ))
      alert("Failed to move card")
      router.refresh()
    }
  }

  async function confirmConversion() {
    if (!pendingConversion) return

    setIsConverting(true)
    try {
      // Perform the actual conversion logic
      const res = await convertLeadToOpportunity(
        pendingConversion.leadId,
        false, // createCustomer
        opportunityAmount,
        opportunityType,
        salesStage
      )

      if (res.success) {
        // Remove from board or move to 'Converted'? 
        // 'Opportunity' leads usually become 'Converted' in ERPNext status flow if they are fully converted,
        // OR they might stay as Lead-Opportunity if just a status change.
        // But usually convertLeadToOpportunity makes a NEW Document (Opportunity) and marks Lead as Converted.

        // Let's assume we want to show it as 'Converted' in the Lead Kanban, or remove it.
        // If we move it to 'Opportunity' column, it conceptually matches.

        setItems(items.map(l =>
          l.name === pendingConversion.leadId ? { ...l, status: 'Converted' } : l
        ))

        // In a real Kanban where we mix Leads and Opps, this would be complex. 
        // For a Lead Kanban, 'Converted' is the end state.
        toast.success("Lead converted to Opportunity successfully!")

        // Optional: Redirect to the new Opportunity?
        // if (res.opportunityId) router.push(`/crm/opportunities/${res.opportunityId}`)

        router.refresh()
      } else {
        toast.error(res.error || "Failed to convert lead")
      }
    } catch (e) {
      console.error(e)
      toast.error("An error occurred during conversion")
    } finally {
      setIsConverting(false)
      setIsConversionDialogOpen(false)
      setPendingConversion(null)
      setOpportunityAmount(0)
      setOpportunityType('Sales')
      setSalesStage('Qualification')
    }
  }

  return (
    <>
      <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
        <div className="flex h-full gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="w-80 flex-shrink-0 flex flex-col gap-4">
              {/* Column Header */}
              <div className={`flex items-center justify-between p-2 rounded-lg border-t-4 ${col.color.split(' ')[0]} bg-white dark:bg-slate-800 shadow-sm`}>
                <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{col.title}</span>
                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-900">
                  {items.filter(l => l.status === col.id).length}
                </Badge>
              </div>

              {/* Drop Zone */}
              <KanbanColumn id={col.id} leads={items.filter(l => l.status === col.id)} />
            </div>
          ))}
        </div>
      </DndContext>

      {/* Conversion Confirmation Dialog */}
      <Dialog open={isConversionDialogOpen} onOpenChange={handleConversionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Opportunity?</DialogTitle>
            <DialogDescription>
              This will create a new <strong>Opportunity</strong> record from this Lead and mark the Lead as <strong>Converted</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-500">
              Do you want to proceed with creating an Opportunity? You can set the initial details below.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Opportunity Type</Label>
                <Select value={opportunityType} onValueChange={setOpportunityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {metadata.types.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                    {metadata.types.length === 0 && <SelectItem value="Sales">Sales</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sales Stage</Label>
                <Select value={salesStage} onValueChange={setSalesStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {metadata.stages.map(stage => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                    {metadata.stages.length === 0 && <SelectItem value="Qualification">Qualification</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estimated Amount</Label>
                <Input
                  type="number"
                  min="0"
                  value={opportunityAmount}
                  onChange={(e) => setOpportunityAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConversionDialogOpen(false)} disabled={isConverting}>
              Cancel
            </Button>
            <Button onClick={confirmConversion} disabled={isConverting}>
              {isConverting ? "Converting..." : "Yes, Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Sub-component for the Drop Zone
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'

function KanbanColumn({ id, leads }: { id: string, leads: any[] }) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div ref={setNodeRef} className="flex-1 flex flex-col gap-3 min-h-[500px] p-1">
      {leads.map(lead => (
        <DraggableCard key={lead.name} lead={lead} />
      ))}
    </div>
  )
}

// Sub-component for the DraggableCard (unchanged mostly, just style tweaks)
function DraggableCard({ lead }: { lead: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.name,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : 1,
  } : undefined

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card className={`cursor-grab hover:shadow-md transition-all active:cursor-grabbing border-l-4 ${isDragging ? 'opacity-50 ring-2 ring-blue-400' : ''}`} style={{ borderLeftColor: getStatusColor(lead.status) }}>
        <CardContent className="p-3 space-y-2">
          <div className="flex justify-between items-start">
            <Link href={`/crm/${lead.name}`} className="font-semibold text-sm text-slate-900 dark:text-white hover:text-blue-600 hover:underline line-clamp-1">
              {lead.lead_name}
            </Link>
          </div>
          <div className="text-xs text-slate-500 line-clamp-1">
            {lead.company_name || "Individual"}
          </div>
          {(lead.email_id || lead.mobile_no) && (
            <div className="pt-2 flex flex-wrap gap-2">
              {lead.email_id && <Badge variant="outline" className="text-[10px] h-5 px-1 font-normal text-slate-500 bg-slate-50">✉️</Badge>}
              {lead.mobile_no && <Badge variant="outline" className="text-[10px] h-5 px-1 font-normal text-slate-500 bg-slate-50">📞</Badge>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to get status color
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Lead': '#9ca3af',
    'Open': '#60a5fa',
    'Replied': '#22d3ee',
    'Interested': '#a78bfa',
    'Opportunity': '#fb923c',
    'Quotation': '#fbbf24',
    'Converted': '#4ade80',
    'Do Not Contact': '#f87171'
  }
  return colors[status] || '#cbd5e1'
}

