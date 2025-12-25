"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import { Search, Filter, Download, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [selectedAIInsights, setSelectedAIInsights] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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
          <AnimatedButton variant="outline" className="gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            List
          </AnimatedButton>
          <AnimatedButton variant="outline" className="gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10" />
            </svg>
            Kanban
          </AnimatedButton>
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
        {/* Filters Sidebar */}
        <AnimatedCard className="lg:col-span-1" variant="glass" delay={0.5}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Filters</CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600 text-xs h-auto p-0">
              Reset
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Filter */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">STATUS</h4>
              <div className="space-y-2">
                {[
                  { name: "Open", count: leadsWithScores.filter(l => l.status === "Open").length },
                  { name: "Contacted", count: leadsWithScores.filter(l => l.status === "Contacted").length },
                  { name: "Opportunity", count: leadsWithScores.filter(l => l.status === "Opportunity").length },
                  { name: "Qualified", count: leadsWithScores.filter(l => l.status === "Qualified").length }
                ].filter(status => status.count > 0).map(status => (
                  <label key={status.name} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={selectedStatus.includes(status.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStatus([...selectedStatus, status.name])
                        } else {
                          setSelectedStatus(selectedStatus.filter(s => s !== status.name))
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white flex-1">
                      {status.name}
                    </span>
                    <span className="text-xs text-slate-500">{status.count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* AI Insight Filter */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                AI INSIGHT 
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </h4>
              <div className="space-y-2">
                {[
                  "High Priority (>80)",
                  "Likely to Convert",
                  "Requires Attention"
                ].map(insight => (
                  <label key={insight} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                      {insight}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Lead Owner Filter */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">LEAD OWNER</h4>
              <select className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option>All Owners</option>
                <option>John Doe</option>
                <option>Jane Smith</option>
              </select>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Leads Table */}
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
                <select className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  <option>Sort by: Last Activity</option>
                  <option>Sort by: AI Score</option>
                  <option>Sort by: Name</option>
                </select>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
              <div className="col-span-3">NEXT ACTION</div>
            </div>

            {/* Table Rows */}
            <div className="space-y-2 mt-3">
              {paginatedLeads.map((lead, idx) => (
                <div 
                  key={idx} 
                  className="grid grid-cols-12 gap-4 py-3 px-2 text-sm items-center hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
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
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(lead.status)} text-xs`}
                    >
                      {lead.status}
                    </Badge>
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-orange-600 dark:text-orange-400">⚠️</span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">{lead.nextAction}</span>
                    </div>
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
          </CardContent>
        </AnimatedCard>
      </div>
    </div>
  )
}

function getNextAction(status: string): string {
  const actions: Record<string, string> = {
    "New": "Call today",
    "Contacted": "Send proposal",
    "Qualified": "Meeting 2pm Fri",
    "Interested": "Follow up email",
    "Open": "Research company",
    "Replied": "Schedule call"
  }
  return actions[status] || "No action"
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    "New": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    "Contacted": "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
    "Qualified": "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
    "Interested": "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
    "Open": "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300"
  }
  return colors[status] || "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300"
}
