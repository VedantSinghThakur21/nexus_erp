"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Calendar, DollarSign, TrendingUp, Search, SlidersHorizontal, Plus } from "lucide-react"
import Link from "next/link"

interface Quotation {
  name: string
  customer_name?: string
  party_name?: string
  quotation_to: string
  status: string
  valid_till: string
  grand_total: number
  currency: string
}

interface Opportunity {
  name: string
  customer_name?: string
  party_name?: string
  opportunity_from: string
  opportunity_type: string
  opportunity_amount: number
  probability: number
  sales_stage: string
  expected_closing?: string
}

interface QuotationsViewProps {
  quotations: Quotation[]
  proposalOpportunities: Opportunity[]
}

export function QuotationsView({ quotations, proposalOpportunities }: QuotationsViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "value">("date")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [creatingQuotation, setCreatingQuotation] = useState<string | null>(null)

  const handleCreateQuotation = (opportunityName: string) => {
    // Redirect to new quotation page with opportunity ID
    window.location.href = `/crm/quotations/new?opportunity=${encodeURIComponent(opportunityName)}`
  }

  // Status colors
  const statusColors: Record<string, string> = {
    'Draft': 'bg-slate-100 text-slate-800',
    'Open': 'bg-blue-100 text-blue-800',
    'Ordered': 'bg-green-100 text-green-800',
    'Lost': 'bg-red-100 text-red-800',
    'Expired': 'bg-orange-100 text-orange-800'
  }

  // Check if expired
  const isExpired = (validTill: string) => {
    return new Date(validTill) < new Date()
  }

  // Filter and sort quotations
  let filteredQuotations = quotations.filter((quotation) => {
    const matchesSearch = searchQuery === "" || 
      quotation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quotation.customer_name || quotation.party_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    
    const expired = isExpired(quotation.valid_till)
    const displayStatus = expired && quotation.status === 'Open' ? 'Expired' : quotation.status
    const matchesStatus = statusFilter === "all" || displayStatus === statusFilter

    const validDate = new Date(quotation.valid_till)
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    let matchesDate = true
    if (dateFilter === "expiring-soon") {
      matchesDate = validDate <= thirtyDaysFromNow && validDate >= now
    } else if (dateFilter === "expired") {
      matchesDate = expired
    } else if (dateFilter === "valid") {
      matchesDate = !expired
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  // Sort
  if (sortBy === "value") {
    filteredQuotations = [...filteredQuotations].sort((a, b) => (b.grand_total || 0) - (a.grand_total || 0))
  } else {
    filteredQuotations = [...filteredQuotations].sort((a, b) => 
      new Date(b.valid_till).getTime() - new Date(a.valid_till).getTime()
    )
  }

  // Stats
  const stats = {
    total: quotations.length,
    open: quotations.filter(q => q.status === 'Open' && !isExpired(q.valid_till)).length,
    ordered: quotations.filter(q => q.status === 'Ordered').length,
    totalValue: quotations.reduce((sum, q) => sum + (q.grand_total || 0), 0)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Quotations</h1>
          <p className="text-slate-500 mt-1">Manage and track all customer quotations</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/opportunities">
            <Button variant="outline">View Opportunities</Button>
          </Link>
          <Link href="/crm">
            <Button variant="outline">Back to CRM</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Quotations</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Open</CardTitle>
            <FileText className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Ordered</CardTitle>
            <FileText className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.ordered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalValue.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="quotations" className="w-full">
        <TabsList>
          <TabsTrigger value="quotations">
            All Quotations ({quotations.length})
          </TabsTrigger>
          <TabsTrigger value="proposals">
            Ready for Quotation ({proposalOpportunities.length})
          </TabsTrigger>
        </TabsList>

        {/* Quotations Tab */}
        <TabsContent value="quotations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search quotations or customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Ordered">Ordered</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="valid">Valid</SelectItem>
                    <SelectItem value="expiring-soon">Expiring Soon (30d)</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "value")}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="value">Sort by Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Quotations List */}
          <Card>
            <CardHeader>
              <CardTitle>
                {filteredQuotations.length} Quotation{filteredQuotations.length !== 1 ? 's' : ''}
              </CardTitle>
              <CardDescription>Click on a quotation to view details</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredQuotations.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="font-medium text-lg mb-2">No quotations found</p>
                  <p className="text-sm">Try adjusting your filters or create a new quotation</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuotations.map((quotation) => {
                    const expired = isExpired(quotation.valid_till)
                    const displayStatus = expired && quotation.status === 'Open' ? 'Expired' : quotation.status

                    return (
                      <Link 
                        key={quotation.name} 
                        href={`/crm/quotations/${encodeURIComponent(quotation.name)}`}
                        className="block"
                      >
                        <div className="border rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                                  {quotation.name}
                                </h3>
                                <Badge className={statusColors[displayStatus] || 'bg-slate-100 text-slate-800'}>
                                  {displayStatus}
                                </Badge>
                              </div>
                              
                              <div className="grid md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-slate-500">Customer: </span>
                                  <span className="font-medium">{quotation.customer_name || quotation.party_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-slate-400" />
                                  <span className="text-slate-500">Valid till: </span>
                                  <span className={`font-medium ${expired ? 'text-red-600' : ''}`}>
                                    {new Date(quotation.valid_till).toLocaleDateString('en-IN')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Amount: </span>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    ₹{(quotation.grand_total || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ready for Quotation Tab */}
        <TabsContent value="proposals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Opportunities Ready for Quotation</CardTitle>
              <CardDescription>
                These opportunities are in "Proposal/Price Quote" stage. Click to create a quotation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {proposalOpportunities.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="font-medium text-lg mb-2">No opportunities ready</p>
                  <p className="text-sm mt-2 mb-4">Move opportunities to "Proposal/Price Quote" stage to see them here</p>
                  <Link href="/crm/opportunities">
                    <Button className="gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Go to Opportunities
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {proposalOpportunities.map((opp) => (
                    <div 
                      key={opp.name}
                      className="border rounded-lg p-4 hover:shadow-md transition-all bg-purple-50/50 dark:bg-purple-950/20"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                              {opp.customer_name || opp.party_name}
                            </h3>
                            <Badge className="bg-purple-100 text-purple-700">
                              {opp.probability}% Win Rate
                            </Badge>
                          </div>
                          
                          <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
                            <div>
                              <span className="text-slate-500">Type: </span>
                              <span className="font-medium">{opp.opportunity_type}</span>
                            </div>
                            {opp.expected_closing && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-500">Expected: </span>
                                <span className="font-medium">
                                  {new Date(opp.expected_closing).toLocaleDateString('en-IN')}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-500">Value: </span>
                              <span className="font-bold text-purple-700 dark:text-purple-400">
                                ₹{(opp.opportunity_amount || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleCreateQuotation(opp.name)}
                              disabled={creatingQuotation === opp.name}
                              className="gap-2 bg-purple-600 hover:bg-purple-700"
                            >
                              <Plus className="h-4 w-4" />
                              {creatingQuotation === opp.name ? 'Creating...' : 'Create Quotation'}
                            </Button>
                            <Link href={`/crm/opportunities/${encodeURIComponent(opp.name)}`}>
                              <Button variant="outline">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
