"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  LayoutGrid, 
  List as ListIcon, 
  Search, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight,
  Mail,
  Phone
} from "lucide-react"
import Link from "next/link"
import { updateLeadStatus } from "@/app/actions/crm"
import { useRouter } from "next/navigation"

interface Lead {
  name: string
  lead_name: string
  email_id: string
  mobile_no: string
  status: string
  company_name: string
  job_title?: string
  territory?: string
  source?: string
  industry?: string
}

interface Stage {
  name: string
  color: string
  stage: number
  leads: Lead[]
  count: number
}

interface LeadsViewProps {
  leads: Lead[]
  groupedLeads: Stage[]
  stages: { name: string; color: string; stage: number }[]
}

export function LeadsView({ leads, groupedLeads, stages }: LeadsViewProps) {
  const [view, setView] = useState<'kanban' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertLeadId, setConvertLeadId] = useState<string | null>(null)
  const [convertLeadName, setConvertLeadName] = useState<string>("")
  const [convertOpportunityAmount, setConvertOpportunityAmount] = useState<number>(0)
  const [convertCreateCustomer, setConvertCreateCustomer] = useState(false)
  const [convertLoading, setConvertLoading] = useState(false)
  const router = useRouter()
  const itemsPerPage = 15

  // Debug: Log modal state changes
  console.log('[LeadsView] Render - showConvertModal:', showConvertModal, 'convertLeadId:', convertLeadId)

  // Filter leads for list view
  let filteredLeads = leads.filter(lead => {
    const matchesSearch = searchQuery === "" || 
      lead.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email_id?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = !selectedStage || lead.status === selectedStage
    return matchesSearch && matchesStage
  })

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + itemsPerPage)

  const handleDragStart = (e: React.DragEvent, leadName: string) => {
    setDraggedItem(leadName)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (stageName: string) => {
    setDragOverStage(stageName)
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()
    setDragOverStage(null)
    if (!draggedItem) return
    // Special handling for "Opportunity" status
    if (targetStage === 'Opportunity') {
      setDraggedItem(null)
      // Reset form state before showing modal
      setConvertOpportunityAmount(0)
      setConvertCreateCustomer(false)
      setConvertLeadId(draggedItem)
      const leadObj = leads.find(l => l.name === draggedItem)
      setConvertLeadName(leadObj?.lead_name || draggedItem || "")
      setShowConvertModal(true)
      return
    }

    // For other statuses, just update the status
    try {
      const result = await updateLeadStatus(draggedItem, targetStage)
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      console.error('Error updating lead status:', error)
      alert('Failed to update lead status. Please try again.')
    } finally {
      setDraggedItem(null)
    }
  }

  const handleStatusChange = async (leadName: string, newStatus: string) => {
    console.log('[handleStatusChange] Called with:', { leadName, newStatus })
    // Special handling for "Opportunity" status
    if (newStatus === 'Opportunity') {
      console.log('[handleStatusChange] Triggering opportunity conversion modal')
      // Reset form state before showing modal
      setConvertOpportunityAmount(0)
      setConvertCreateCustomer(false)
      setConvertLeadId(leadName)
      const leadObj = leads.find(l => l.name === leadName)
      setConvertLeadName(leadObj?.lead_name || leadName || "")
      setShowConvertModal(true)
      console.log('[handleStatusChange] Modal state set to true')
      return
    }

    // For other statuses, just update the status
    console.log('[handleStatusChange] Updating status to:', newStatus)
    setUpdatingStatus(leadName)
    try {
      const result = await updateLeadStatus(leadName, newStatus)
      console.log('[handleStatusChange] Update result:', result)
      
      if (result.error) {
        throw new Error(result.error)
      }

      console.log('[handleStatusChange] Status updated successfully, refreshing...')
      router.refresh()
    } catch (error) {
      console.error('[handleStatusChange] Error updating lead status:', error)
      alert('Failed to update lead status. Please try again.')
    } finally {
      setUpdatingStatus(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Convert Lead to Opportunity Modal */}
      {showConvertModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          onClick={(e) => {
            // Close modal if clicking on backdrop
            if (e.target === e.currentTarget) {
              setShowConvertModal(false);
              setConvertLeadId(null);
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Convert Lead to Opportunity</h2>
            <p className="mb-4">Create an opportunity from lead: <strong>{convertLeadName}</strong></p>
            <div className="space-y-4">
              <div>
                <label htmlFor="opportunityAmount" className="block text-sm font-medium mb-1">Estimated Opportunity Value (₹)</label>
                <Input
                  id="opportunityAmount"
                  type="number"
                  placeholder="Enter estimated deal value"
                  value={String(convertOpportunityAmount === 0 ? '' : convertOpportunityAmount)}
                  onChange={e => setConvertOpportunityAmount(parseFloat(e.target.value) || 0)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">This helps track pipeline value and forecast revenue</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="convertCreateCustomer"
                  checked={convertCreateCustomer}
                  onChange={e => setConvertCreateCustomer(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="convertCreateCustomer" className="text-sm font-normal cursor-pointer">Also create Customer record</label>
              </div>
              <p className="text-sm text-muted-foreground">
                This will create a new Opportunity linked to this lead.
                {convertCreateCustomer && " A Customer record will also be created."}
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => { setShowConvertModal(false); setConvertLeadId(null); }}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  console.log('[Modal] Convert button clicked')
                  setConvertLoading(true)
                  try {
                    const { convertLeadToOpportunity } = await import('@/app/actions/crm')
                    // Ensure convertLeadId is a string
                    const leadIdToConvert = convertLeadId ?? "";
                    // Ensure opportunity amount is a number
                    const opportunityAmountToUse = typeof convertOpportunityAmount === "number" && !isNaN(convertOpportunityAmount) ? convertOpportunityAmount : 0;
                    console.log('[Modal] Calling convertLeadToOpportunity with:', { leadIdToConvert, convertCreateCustomer, opportunityAmountToUse })
                    const result = await convertLeadToOpportunity(leadIdToConvert, convertCreateCustomer, opportunityAmountToUse);
                    console.log('[Modal] Conversion result:', result)
                    if (result.error) {
                      alert('❌ Failed to convert lead to opportunity.\n' + (result.error || 'Unknown error. See server logs for details.'));
                      throw new Error(result.error);
                    }
                    alert('✅ Successfully converted lead to opportunity!\n\nOpportunity ID: ' + result.opportunityId);
                    setShowConvertModal(false);
                    setConvertLeadId(null);
                    if (result.opportunityId) {
                      router.push(`/crm/opportunities/${encodeURIComponent(result.opportunityId)}`);
                    }
                  } catch (error) {
                    console.error('[Modal] Error converting lead to opportunity:', error);
                    alert('❌ Failed to convert lead to opportunity. Please try again. See console for details.');
                  } finally {
                    setConvertLoading(false);
                  }
                }}
                disabled={convertLoading}
              >
                {convertLoading ? "Converting..." : "Convert"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <Button
            variant={view === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('kanban')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban View
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
            className="gap-2"
          >
            <ListIcon className="h-4 w-4" />
            List View
          </Button>
        </div>

        {view === 'list' && (
          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search leads by name, company, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="relative flex gap-4 p-4 rounded-xl bg-gradient-to-br from-slate-50/80 to-white/60 dark:from-slate-900/80 dark:to-slate-800/60 backdrop-blur-md min-h-[60vh]">
          {groupedLeads.map((stage) => (
            <div
              key={stage.name}
              className={`flex-1 flex flex-col min-w-[220px] rounded-2xl px-2 py-2 ${dragOverStage === stage.name ? 'bg-blue-50/60 dark:bg-blue-900/20 shadow-lg' : ''}`}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(stage.name)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.name)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">{stage.name}</span>
                <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300">{stage.count}</span>
                {stage.name === 'Opportunity' && <span className="ml-1 text-xs text-orange-500">⚡</span>}
              </div>
              <div className="flex-1 flex flex-col gap-2 pb-8">
                {stage.leads.map((lead) => (
                  <Link key={lead.name} href={`/crm/${encodeURIComponent(lead.name)}`} draggable onDragStart={(e) => handleDragStart(e, lead.name)}
                    className={`group rounded-xl bg-white/80 dark:bg-slate-900/80 px-4 py-3 shadow-none border border-transparent hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col gap-1 ${draggedItem === lead.name ? 'opacity-50' : 'opacity-100'}`}
                  >
                    <span className="font-medium text-sm text-slate-900 dark:text-white truncate">{lead.lead_name}</span>
                    {lead.company_name && <span className="text-xs text-slate-500 truncate">{lead.company_name}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {/* Floating Add Button */}
          <button className="fixed bottom-8 right-8 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-3xl transition-all" title="Add Lead">
            +
          </button>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-4">
          {/* Stage Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={!selectedStage ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage(null)}
            >
              All ({leads.length})
            </Button>
            {stages.map((stage) => (
              <Button
                key={stage.name}
                variant={selectedStage === stage.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedStage(stage.name)
                  setCurrentPage(1)
                }}
              >
                {stage.name} ({groupedLeads.find(g => g.name === stage.name)?.count || 0})
              </Button>
            ))}
          </div>

          {/* Summary Bar */}
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg flex justify-between items-center">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* List Table */}
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400">
              <div className="col-span-3">Lead Name</div>
              <div className="col-span-2">Company</div>
              <div className="col-span-2">Contact</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-1">Territory</div>
            </div>

            {/* Rows */}
            {paginatedLeads.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No leads found matching your search criteria.
              </div>
            ) : (
              paginatedLeads.map((lead) => (
                <div 
                  key={lead.name} 
                  className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-900 border rounded-lg transition-colors"
                >
                  <Link 
                    href={`/crm/${encodeURIComponent(lead.name)}`}
                    className="col-span-3 cursor-pointer"
                  >
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {lead.lead_name}
                    </div>
                    {lead.job_title && (
                      <div className="text-xs text-slate-500 mt-1">{lead.job_title}</div>
                    )}
                  </Link>
                  <Link 
                    href={`/crm/${encodeURIComponent(lead.name)}`}
                    className="col-span-2 cursor-pointer"
                  >
                    <div className="text-slate-700 dark:text-slate-300">
                      {lead.company_name || "Individual"}
                    </div>
                  </Link>
                  <Link 
                    href={`/crm/${encodeURIComponent(lead.name)}`}
                    className="col-span-2 cursor-pointer"
                  >
                    <div className="text-xs text-slate-600">
                      {lead.email_id && (
                        <div className="flex items-center gap-1 mb-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{lead.email_id}</span>
                        </div>
                      )}
                      {lead.mobile_no && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{lead.mobile_no}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={lead.status}
                      onValueChange={(value) => handleStatusChange(lead.name, value)}
                      disabled={updatingStatus === lead.name}
                    >
                      <SelectTrigger className="h-7 border-0 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Badge className={getStatusColor(lead.status)}>
                          {updatingStatus === lead.name ? 'Updating...' : lead.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.name} value={stage.name}>
                            <Badge className={getStatusColor(stage.name)}>
                              {stage.name}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Link 
                    href={`/crm/${encodeURIComponent(lead.name)}`}
                    className="col-span-2 text-sm text-slate-600 cursor-pointer"
                  >
                    {lead.source || "-"}
                  </Link>
                  <Link 
                    href={`/crm/${encodeURIComponent(lead.name)}`}
                    className="col-span-1 text-xs text-slate-500 cursor-pointer"
                  >
                    {lead.territory || "-"}
                  </Link>
                </div>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper function to get status badge color
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Lead': 'bg-gray-100 text-gray-700',
    'Open': 'bg-blue-100 text-blue-700',
    'Replied': 'bg-cyan-100 text-cyan-700',
    'Interested': 'bg-purple-100 text-purple-700',
    'Opportunity': 'bg-orange-100 text-orange-700',
    'Quotation': 'bg-yellow-100 text-yellow-700',
    'Converted': 'bg-green-100 text-green-700',
    'Do Not Contact': 'bg-red-100 text-red-700'
  }
  return colors[status] || 'bg-slate-100 text-slate-700'
}

