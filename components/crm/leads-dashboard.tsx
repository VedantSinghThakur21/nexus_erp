"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import { Search, Filter, Download, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { updateLeadStatus, convertLeadToOpportunity } from "@/app/actions/crm"
import { useRouter } from "next/navigation"

interface Lead {
  name: string
  lead_name: string
  email_id?: string
  status: string
  company_name?: string
  territory?: string
  source?: string
}

interface LeadsDashboardProps {
  leads: Lead[]
}

export function LeadsDashboard({ leads }: LeadsDashboardProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [selectedAIInsights, setSelectedAIInsights] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [sortBy, setSortBy] = useState<string>("last_activity")
  const [draggedLead, setDraggedLead] = useState<any>(null)
  
  // Conversion modal state
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertLeadId, setConvertLeadId] = useState<string | null>(null)
  const [convertLeadName, setConvertLeadName] = useState<string>("")
  const [convertOpportunityAmount, setConvertOpportunityAmount] = useState<number>(0)
  const [convertCreateCustomer, setConvertCreateCustomer] = useState(false)
  const [convertLoading, setConvertLoading] = useState(false)
  
  const itemsPerPage = 10

  // ERPNext lead statuses
  const erpNextStatuses = ["Lead", "Open", "Replied", "Opportunity", "Quotation", "Lost Quotation", "Interested", "Converted", "Do Not Contact"]

  // Drag and drop handlers
  const handleDragStart = (lead: any) => {
    setDraggedLead(lead)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (newStatus: string) => {
    if (!draggedLead || draggedLead.status === newStatus) {
      setDraggedLead(null)
      return
    }
    
    // Update lead status via API
    const result = await updateLeadStatus(draggedLead.name, newStatus)
    if (result.success) {
      router.refresh()
    } else {
      alert('Failed to update lead status')
    }
    setDraggedLead(null)
  }

  // Calculate AI scores (mock for now)
  const leadsWithScores = leads.map(lead => ({
    ...lead,
    aiScore: Math.floor(Math.random() * 40) + 60, // 60-100
    company: lead.company_name || "N/A",
    nextAction: getNextAction(lead.status)
  }))

  // Filter leads
  const filteredLeads = leadsWithScores.filter(lead => {
    const matchesSearch = lead.lead_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.company?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(lead.status)
    return matchesSearch && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Stats
  const stats = {
    totalActiveLeads: leadsWithScores.filter(l => l.status !== "Converted" && l.status !== "Do Not Contact").length,
    hotLeads: leadsWithScores.filter(l => l.aiScore >= 85).length,
    newThisWeek: leadsWithScores.filter(l => l.status === "New").length,
    conversionRate: "18.5%"
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Convert Lead to Opportunity Modal */}
      {showConvertModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          onClick={(e) => {
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
                  setConvertLoading(true)
                  try {
                    const leadIdToConvert = convertLeadId ?? "";
                    const opportunityAmountToUse = typeof convertOpportunityAmount === "number" && !isNaN(convertOpportunityAmount) ? convertOpportunityAmount : 0;
                    const result = await convertLeadToOpportunity(leadIdToConvert, convertCreateCustomer, opportunityAmountToUse);
                    if (result.error) {
                      alert('❌ Failed to convert lead to opportunity.\n' + (result.error || 'Unknown error. See server logs for details.'));
                      throw new Error(result.error);
                    }
                    alert('✅ Successfully converted lead to opportunity!\n\nOpportunity ID: ' + result.opportunityId);
                    setShowConvertModal(false);
                    setConvertLeadId(null);
                    if (result.opportunityId) {
                      router.push(`/crm/opportunities/${encodeURIComponent(result.opportunityId)}`);
                    } else {
                      router.refresh();
                    }
                  } catch (error) {
                    console.error('Error converting lead to opportunity:', error);
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
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Leads Dashboard
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">Manage your pipeline and track AI-scored opportunities</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              List
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10" />
              </svg>
              Kanban
            </button>
          </div>
          <Link href="/crm/new">
            <AnimatedButton variant="neon" className="gap-2">
              <Plus className="h-4 w-4" /> Add New Lead
            </AnimatedButton>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { 
            title: "Total Active Leads", 
            value: stats.totalActiveLeads, 
            change: "+2%",
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          },
          { 
            title: "Hot Leads 🔥", 
            value: stats.hotLeads, 
            change: "+12%",
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          },
          { 
            title: "New This Week", 
            value: stats.newThisWeek, 
            change: "+5%",
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          },
          { 
            title: "Conversion Rate", 
            value: stats.conversionRate, 
            change: "+1%",
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          },
        ].map((stat, idx) => (
          <AnimatedCard key={idx} className="p-4" variant="glass" delay={idx * 0.1}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{stat.title}</p>
                <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stat.value}</p>
                <span className="text-xs text-green-600 dark:text-green-400 mt-1 inline-block">{stat.change}</span>
              </div>
              <div className="text-slate-400">{stat.icon}</div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {viewMode === "list" && (
          <div className="space-y-6">
            {/* Filters Sidebar */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 border border-slate-200 dark:border-slate-700">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filters</h4>
                <button className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline" onClick={() => setSelectedStatus([])}>Reset</button>
              </div>
              <div className="mb-4">
                <div className="text-xs font-medium text-slate-500 mb-2">STATUS</div>
                <div className="flex flex-col gap-1">
                  {erpNextStatuses.map(status => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatus.includes(status)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedStatus([...selectedStatus, status])
                          } else {
                            setSelectedStatus(selectedStatus.filter(s => s !== status))
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{status}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <div className="text-xs font-medium text-slate-500 mb-2">AI INSIGHT</div>
                <div className="flex flex-col gap-1">
                  {["High Priority (>80)", "Likely to Convert", "Requires Attention"].map(insight => (
                    <label key={insight} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        // TODO: Implement AI insight filter logic
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{insight}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">LEAD OWNER</div>
                <select className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  <option>All Owners</option>
                  <option>John Doe</option>
                  <option>Jane Smith</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Leads Table / Kanban */}
        <AnimatedCard className="lg:col-span-3" variant="glass" delay={0.6}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search leads, companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                  ⌘K
                </kbd>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="last_activity">Sort by: Last Activity</option>
                  <option value="ai_score">Sort by: AI Score</option>
                  <option value="lead_name">Sort by: Name</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "list" ? (
              <>
                <div className="text-xs text-slate-500 mb-3">
                  Showing 1-{Math.min(itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
                </div>
                
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <div className="col-span-3">LEAD NAME</div>
                  <div className="col-span-2">COMPANY</div>
                  <div className="col-span-2 flex items-center gap-1">
                    AI SCORE
                    <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </div>
                  <div className="col-span-2">STATUS</div>
                  <div className="col-span-2">NEXT ACTION</div>
                  <div className="col-span-1">VIEW</div>
                </div>

                {/* Table Rows */}
                <div className="space-y-2 mt-3">
                  {paginatedLeads.map((lead, idx) => (
                    <div 
                      key={idx} 
                      className="grid grid-cols-12 gap-4 py-3 px-2 text-sm items-center hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors"
                    >
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                          {lead.lead_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{lead.lead_name || "Unknown"}</p>
                          <p className="text-xs text-slate-500">{lead.email_id || "No email"}</p>
                        </div>
                      </div>
                      <div className="col-span-2 text-slate-700 dark:text-slate-300">{lead.company}</div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                lead.aiScore >= 85 ? 'bg-green-500' : 
                                lead.aiScore >= 70 ? 'bg-yellow-500' : 
                                'bg-orange-500'
                              }`}
                              style={{ width: `${lead.aiScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">{lead.aiScore}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <select
                          className="w-full text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          value={lead.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            
                            // Special handling for Opportunity status
                            if (newStatus === 'Opportunity') {
                              setConvertOpportunityAmount(0)
                              setConvertCreateCustomer(false)
                              setConvertLeadId(lead.name)
                              setConvertLeadName(lead.lead_name)
                              setShowConvertModal(true)
                              return
                            }
                            
                            // For other statuses, just update
                            const result = await updateLeadStatus(lead.name, newStatus)
                            if (result.success) {
                              router.refresh()
                            } else {
                              alert('Failed to update status')
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {erpNextStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-orange-600 dark:text-orange-400">⚠️</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">{lead.nextAction}</span>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Link href={`/crm/${lead.name}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Selected 0 leads
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    {[...Array(Math.min(totalPages, 3))].map((_, i) => (
                      <Button
                        key={i}
                        variant={currentPage === i + 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(i + 1)}
                        className="w-8 h-8"
                      >
                        {i + 1}
                      </Button>
                    ))}
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Kanban View */
              <div className="overflow-x-auto">
                <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
                  {erpNextStatuses.map(status => {
                    const statusLeads = filteredLeads.filter(l => l.status === status)
                    return (
                      <div 
                        key={status} 
                        className="flex-shrink-0 w-72"
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(status)}
                      >
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{status}</h3>
                            <Badge variant="secondary" className="text-xs">{statusLeads.length}</Badge>
                          </div>
                        </div>
                        <div className="space-y-3 min-h-[200px]">
                          {statusLeads.map((lead, idx) => (
                            <Card 
                              key={idx} 
                              className="p-3 hover:shadow-md transition-shadow cursor-move"
                              draggable
                              onDragStart={() => handleDragStart(lead)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                  {lead.lead_name?.charAt(0) || "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{lead.lead_name || "Unknown"}</p>
                                  <p className="text-xs text-slate-500 truncate">{lead.email_id || "No email"}</p>
                                  {lead.company && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">{lead.company}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${
                                          lead.aiScore >= 85 ? 'bg-green-500' : 
                                          lead.aiScore >= 70 ? 'bg-yellow-500' : 
                                          'bg-orange-500'
                                        }`}
                                        style={{ width: `${lead.aiScore}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-900 dark:text-white">{lead.aiScore}</span>
                                  </div>
                                  {lead.nextAction && (
                                    <div className="flex items-center gap-1 mt-2">
                                      <span className="text-xs text-orange-600 dark:text-orange-400">⚠️</span>
                                      <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{lead.nextAction}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                          {statusLeads.length === 0 && (
                            <div className="text-center py-8 text-sm text-slate-400">
                              No leads
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </AnimatedCard>
      </div>


    </div>
  )
}

function getNextAction(status: string): string {
  const actions: Record<string, string> = {
    "Lead": "Initial research",
    "Open": "Make first contact",
    "Replied": "Send follow-up",
    "Opportunity": "Discuss requirements",
    "Quotation": "Send quotation",
    "Lost Quotation": "Review feedback",
    "Interested": "Schedule meeting",
    "Converted": "Complete",
    "Do Not Contact": "No action"
  }
  return actions[status] || "No action"
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    "Lead": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300",
    "Open": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    "Replied": "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
    "Opportunity": "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
    "Quotation": "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
    "Lost Quotation": "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    "Interested": "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
    "Converted": "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
    "Do Not Contact": "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300"
  }
  return colors[status] || "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300"
}
