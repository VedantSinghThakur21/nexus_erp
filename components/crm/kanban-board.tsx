'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { updateLeadStatus } from "@/app/actions/crm"
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Define the columns for your pipeline
const COLUMNS = [
  { id: 'Open', title: 'New Leads', color: 'bg-blue-500/10 text-blue-700' },
  { id: 'Replied', title: 'Contacted', color: 'bg-yellow-500/10 text-yellow-700' },
  { id: 'Opportunity', title: 'Opportunity', color: 'bg-purple-500/10 text-purple-700' },
  { id: 'Quotation', title: 'Proposal Sent', color: 'bg-orange-500/10 text-orange-700' },
  { id: 'Converted', title: 'Won', color: 'bg-green-500/10 text-green-700' },
]

export function KanbanBoard({ leads }: { leads: any[] }) {
  const router = useRouter()
  // Optimistic UI: We update local state immediately while the server saves
  const [items, setItems] = useState(leads)

  // Handle the drop event
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    
    if (!over) return

    const leadId = active.id as string
    const newStatus = over.id as string // The column ID is the status

    // 1. Find the lead in our list
    const lead = items.find(l => l.name === leadId)
    if (!lead || lead.status === newStatus) return

    // 2. Optimistic Update (Update UI instantly)
    setItems(items.map(l => 
      l.name === leadId ? { ...l, status: newStatus } : l
    ))

    // 3. Server Update (Save to ERPNext)
    const res = await updateLeadStatus(leadId, newStatus)
    
    if (!res.success) {
      // Revert if failed (optional, but good practice)
      alert("Failed to move card")
      router.refresh()
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
      <div className="flex h-full gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="w-80 flex-shrink-0 flex flex-col gap-4">
            {/* Column Header */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{col.title}</span>
              <Badge variant="secondary" className="bg-white dark:bg-slate-900">
                {items.filter(l => l.status === col.id).length}
              </Badge>
            </div>

            {/* Drop Zone */}
            <KanbanColumn id={col.id} leads={items.filter(l => l.status === col.id)} />
          </div>
        ))}
      </div>
    </DndContext>
  )
}

// Sub-component for the Drop Zone
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'

function KanbanColumn({ id, leads }: { id: string, leads: any[] }) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div ref={setNodeRef} className="flex-1 flex flex-col gap-3 min-h-[500px]">
      {leads.map(lead => (
        <DraggableCard key={lead.name} lead={lead} />
      ))}
    </div>
  )
}

// Sub-component for the Draggable Card
function DraggableCard({ lead }: { lead: any }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.name,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card className="cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between items-start">
            <Link href={`/crm/${lead.name}`} className="font-semibold hover:text-blue-600 hover:underline">
                {lead.lead_name}
            </Link>
          </div>
          <div className="text-xs text-slate-500">
            {lead.company_name || "Individual"}
          </div>
          {lead.mobile_no && (
             <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                📞 {lead.mobile_no}
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
