"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  List, 
  Search, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight,
  User,
  Calendar,
  TrendingUp
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
}

interface OpportunitiesListProps {
  opportunities: Opportunity[]
  stages: Stage[]
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  'Warm': { label: 'Warm', color: 'bg-yellow-100 text-yellow-700' },
  'New': { label: 'New', color: 'bg-blue-100 text-blue-700' },
  'Stagnant': { label: 'Stagnant', color: 'bg-gray-100 text-gray-700' },
  'High Value': { label: 'High Value', color: 'bg-purple-100 text-purple-700' }
}

// Calculate stage age and assign status
function getOpportunityStatus(opp: Opportunity): string {
  // In a real scenario, you'd calculate based on last_modified or created date
  // For now, we'll assign based on probability
  if (opp.probability >= 80) return 'Warm'
  if (opp.probability >= 50) return 'High Value'
  if (opp.probability <= 20) return 'Stagnant'
  return 'New'
}

function calculateStageAge(opp: Opportunity): string {
  // Mock calculation - in production you'd use actual date fields
  const probability = opp.probability
  if (probability >= 80) return `${Math.floor(Math.random() * 3) + 1} days`
  if (probability >= 50) return `${Math.floor(Math.random() * 10) + 5} days`
  if (probability >= 25) return `${Math.floor(Math.random() * 20) + 10} days`
  return `${Math.floor(Math.random() * 45) + 20} days`
}

export function OpportunitiesList({ opportunities, stages }: OpportunitiesListProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'value' | 'probability'>('value')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Filter and sort opportunities
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

  const totalValue = filteredOpps.reduce((sum, opp) => sum + (opp.opportunity_amount || 0), 0)

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        variant="outline" 
        className="w-full gap-2"
      >
        <List className="h-4 w-4" />
        View as List
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {selectedStage || 'Prospecting'}
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedStage ? `Stage ${stages.find(s => s.name === selectedStage)?.stage}` : 'Stage 1'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Stage Value</p>
                <p className="text-2xl font-bold text-slate-900">₹{totalValue.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex items-center gap-4 py-4">
            <div className="relative flex-1">
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
            <div className="flex gap-2">
              <Button 
                variant={sortBy === 'value' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSortBy('value')}
              >
                Sort: Value (High-Low)
              </Button>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <List className="h-4 w-4" />
              Columns
            </Button>
          </div>

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

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-t-lg font-semibold text-sm text-slate-600 border-b">
            <div className="col-span-3">DEAL NAME</div>
            <div className="col-span-2">VALUE</div>
            <div className="col-span-2">OWNER</div>
            <div className="col-span-2">STAGE AGE</div>
            <div className="col-span-3">STATUS</div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {paginatedOpps.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p>No opportunities found</p>
              </div>
            ) : (
              paginatedOpps.map((opp) => {
                const status = getOpportunityStatus(opp)
                const stageAge = calculateStageAge(opp)
                const statusBadge = STATUS_BADGES[status] || STATUS_BADGES['New']

                return (
                  <Link 
                    key={opp.name} 
                    href={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-900 border-b cursor-pointer transition-colors">
                      <div className="col-span-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {opp.opportunity_from === 'Lead' ? opp.party_name : opp.customer_name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{opp.opportunity_type}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="font-bold text-slate-900 dark:text-white">
                          ₹{opp.opportunity_amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                            {opp.contact_by?.substring(0, 2).toUpperCase() || 
                             (opp.customer_name || opp.party_name || 'UN')?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {opp.contact_by || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm text-slate-600">{stageAge}</div>
                      </div>
                      <div className="col-span-3 flex items-center justify-between">
                        <Badge className={`${statusBadge.color} text-xs font-semibold`}>
                          {statusBadge.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {opp.probability}%
                        </Badge>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50 dark:bg-slate-900">
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
        </DialogContent>
      </Dialog>
    </>
  )
}
