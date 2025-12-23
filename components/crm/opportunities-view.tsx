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
  Calendar
} from "lucide-react"
import Link from "next/link"

interface Opportunity {
  name: string
  customer_name?: string
  party_name?: string
  opportunity_from?: string
  opportunity_type: string
  opportunity_amount: number
  probability: number
  sales_stage: string
  status: string
  expected_closing?: string
  contact_person?: string
  contact_by?: string
}

interface Stage {
  name: string
  color: string
  stage: number
  opportunities: Opportunity[]
  totalValue: number
}

interface OpportunitiesViewProps {
  opportunities: Opportunity[]
  groupedOpportunities: Stage[]
  stages: { name: string; color: string; stage: number }[]
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  'Open': { label: 'Open', color: 'bg-blue-100 text-blue-700' },
  'Quotation': { label: 'Quotation', color: 'bg-purple-100 text-purple-700' },
  'Converted': { label: 'Converted', color: 'bg-green-100 text-green-700' },
  'Lost': { label: 'Lost', color: 'bg-red-100 text-red-700' },
  'Replied': { label: 'Replied', color: 'bg-yellow-100 text-yellow-700' }
}

function getOpportunityStatus(opp: Opportunity): string {
  return opp.status || 'Open'
}

function calculateStageAge(opp: Opportunity): string {
  const probability = opp.probability
  if (probability >= 80) return `${Math.floor(Math.random() * 3) + 1} days`
  if (probability >= 50) return `${Math.floor(Math.random() * 10) + 5} days`
  if (probability >= 25) return `${Math.floor(Math.random() * 20) + 10} days`
  return `${Math.floor(Math.random() * 45) + 20} days`
}

export function OpportunitiesView({ opportunities, groupedOpportunities, stages }: OpportunitiesViewProps) {
  const [view, setView] = useState<'kanban' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'value' | 'probability'>('value')
  const [currentPage, setCurrentPage] = useState(1)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [updatingStage, setUpdatingStage] = useState<string | null>(null)
  const itemsPerPage = 15

  // Filter and sort opportunities for list view
  let filteredOpps = opportunities.filter(opp => {
    const matchesSearch = searchQuery === "" || 
      (opp.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       opp.party_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStage = !selectedStage || opp.sales_stage === selectedStage
    return matchesSearch && matchesStage
  })

  if (sortBy === 'value') {
    filteredOpps = [...filteredOpps].sort((a, b) => (b.opportunity_amount || 0) - (a.opportunity_amount || 0))
  } else {
    filteredOpps = [...filteredOpps].sort((a, b) => (b.probability || 0) - (a.probability || 0))
  }

  const totalPages = Math.ceil(filteredOpps.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOpps = filteredOpps.slice(startIndex, startIndex + itemsPerPage)

  const totalValue = (selectedStage 
    ? filteredOpps 
    : opportunities
  ).reduce((sum, opp) => sum + (opp.opportunity_amount || 0), 0)

  const handleDragStart = (e: React.DragEvent, oppName: string) => {
    setDraggedItem(oppName)
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

    try {
      // Get the probability based on stage
      const stageProbabilities: Record<string, number> = {
        'Prospecting': 10,
        'Qualification': 20,
        'Proposal/Price Quote': 60,
        'Negotiation/Review': 80
      }

      const probability = stageProbabilities[targetStage] || 50

      // Call the API to update the opportunity stage
      const response = await fetch('/api/opportunities/update-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityName: draggedItem,
          sales_stage: targetStage,
          probability: probability
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update stage')
      }

      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Error updating opportunity stage:', error)
      alert('Failed to update opportunity stage. Please try again.')
    } finally {
      setDraggedItem(null)
    }
  }

  const handleStageChange = async (oppName: string, newStage: string) => {
    setUpdatingStage(oppName)
    
    try {
      // Get the probability based on stage
      const stageProbabilities: Record<string, number> = {
        'Prospecting': 10,
        'Qualification': 20,
        'Proposal/Price Quote': 60,
        'Negotiation/Review': 80
      }

      const probability = stageProbabilities[newStage] || 50

      // Call the API to update the opportunity stage
      const response = await fetch('/api/opportunities/update-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityName: oppName,
          sales_stage: newStage,
          probability: probability
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update stage')
      }

      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Error updating opportunity stage:', error)
      alert('Failed to update opportunity stage. Please try again.')
    } finally {
      setUpdatingStage(null)
    }
  }

  return (
    <div className="space-y-4">
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
                placeholder="Search deals, companies, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button 
              variant={sortBy === 'value' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSortBy('value')}
            >
              Sort: Value (High-Low)
            </Button>
          </div>
        )}
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groupedOpportunities.map((stage) => (
            <div 
              key={stage.name} 
              className="flex flex-col"
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(stage.name)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.name)}
            >
              <Card className={`border-t-4 ${stage.color.split(' ')[2]} h-full flex flex-col transition-all ${
                dragOverStage === stage.name ? 'ring-2 ring-blue-400 ring-offset-2 scale-[1.02]' : ''
              }`}>
                <CardHeader className="pb-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {stage.name}
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">Stage {stage.stage}</p>
                    </div>
                    <Badge variant="secondary" className={`${stage.color} text-xs font-semibold`}>
                      {stage.opportunities.length}
                    </Badge>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    ₹{stage.totalValue.toLocaleString('en-IN')}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                  {stage.opportunities.length === 0 ? (
                    <div className="text-xs text-slate-400 text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                      No opportunities
                    </div>
                  ) : (
                    stage.opportunities.map((opp) => (
                      <div
                        key={opp.name}
                        draggable
                        onDragStart={(e) => handleDragStart(e, opp.name)}
                        className={`cursor-move transition-opacity ${
                          draggedItem === opp.name ? 'opacity-50' : 'opacity-100'
                        }`}
                      >
                        <Link href={`/crm/opportunities/${encodeURIComponent(opp.name)}`} onClick={(e) => {
                          if (draggedItem) e.preventDefault()
                        }}>
                          <Card className="hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer border bg-white dark:bg-slate-900">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2">
                                  {opp.customer_name || opp.party_name}
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500">{opp.opportunity_type}</span>
                                  <Badge variant="outline" className="text-xs font-semibold">
                                    {opp.probability}%
                                  </Badge>
                                </div>
                                <div className="text-base font-bold text-green-600">
                                  ₹{(opp.opportunity_amount || 0).toLocaleString('en-IN')}
                                </div>
                                {opp.expected_closing && (
                                  <div className="text-xs text-slate-400 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(opp.expected_closing).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-4">
          {/* Stage Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 border-b">
            <Button
              variant={selectedStage === null ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedStage(null)}
            >
              All Stages
            </Button>
            {stages.map((stage) => {
              const count = opportunities.filter(o => o.sales_stage === stage.name).length
              return (
                <Button
                  key={stage.name}
                  variant={selectedStage === stage.name ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedStage(stage.name)}
                  className="gap-2"
                >
                  {stage.name}
                  <Badge variant="secondary" className="ml-1">{count}</Badge>
                </Button>
              )
            })}
          </div>

          {/* Stage Value Header */}
          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedStage || 'All Stages'}
              </h3>
              <p className="text-sm text-slate-500">
                {selectedStage ? `Stage ${stages.find(s => s.name === selectedStage)?.stage}` : 'Complete Pipeline'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Stage Value</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{totalValue.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-lg font-semibold text-sm text-slate-600">
            <div className="col-span-3">DEAL NAME</div>
            <div className="col-span-2">VALUE</div>
            <div className="col-span-2">OWNER</div>
            <div className="col-span-2">STAGE</div>
            <div className="col-span-3">STATUS</div>
          </div>

          {/* Table Body */}
          <div className="space-y-2">
            {paginatedOpps.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p>No opportunities found</p>
              </div>
            ) : (
              paginatedOpps.map((opp) => {
                const status = getOpportunityStatus(opp)
                const stageAge = calculateStageAge(opp)
                const statusBadge = STATUS_BADGES[status] || STATUS_BADGES['Open']

                return (
                  <div 
                    key={opp.name} 
                    className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-900 border rounded-lg transition-colors"
                  >
                    <Link 
                      href={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                      className="col-span-3 cursor-pointer"
                    >
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {opp.customer_name || opp.party_name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{opp.opportunity_type}</div>
                    </Link>
                    <Link 
                      href={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                      className="col-span-2 cursor-pointer"
                    >
                      <div className="font-bold text-slate-900 dark:text-white">
                        ₹{opp.opportunity_amount.toLocaleString('en-IN')}
                      </div>
                    </Link>
                    <Link 
                      href={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                      className="col-span-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                          {opp.contact_by?.substring(0, 2).toUpperCase() || 
                           (opp.customer_name || opp.party_name || 'UN')?.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {opp.contact_by || 'Unassigned'}
                        </span>
                      </div>
                    </Link>
                    <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={opp.sales_stage}
                        onValueChange={(value) => handleStageChange(opp.name, value)}
                        disabled={updatingStage === opp.name}
                      >
                        <SelectTrigger className="h-8 border-0 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800">
                          <div className="text-sm font-medium">
                            {updatingStage === opp.name ? 'Updating...' : opp.sales_stage}
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.name} value={stage.name}>
                              <div className="flex items-center gap-2">
                                <span>{stage.name}</span>
                                <span className="text-xs text-slate-500">Stage {stage.stage}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Link 
                      href={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                      className="col-span-3 flex items-center justify-between cursor-pointer"
                    >
                      <Badge className={`${statusBadge.color} text-xs font-semibold`}>
                        {statusBadge.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-semibold">
                        {opp.probability}%
                      </Badge>
                    </Link>
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredOpps.length)} of {filteredOpps.length} deals
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
