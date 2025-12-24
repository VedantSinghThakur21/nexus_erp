import { getLeads, getCustomers } from "@/app/actions/crm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Users, TrendingUp, UserCheck, PhoneCall } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LeadsView } from "@/components/crm/leads-view"

export default async function CRMPage() {
  const leads = await getLeads()
  const customers = await getCustomers()

  // Lead stages/statuses
  const stages = [
    { name: 'Lead', color: 'bg-gray-100 text-gray-700 border-gray-200', stage: 1 },
    { name: 'Open', color: 'bg-blue-100 text-blue-700 border-blue-200', stage: 2 },
    { name: 'Replied', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', stage: 3 },
    { name: 'Interested', color: 'bg-purple-100 text-purple-700 border-purple-200', stage: 4 },
    { name: 'Opportunity', color: 'bg-orange-100 text-orange-700 border-orange-200', stage: 5 },
    { name: 'Quotation', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', stage: 6 },
    { name: 'Converted', color: 'bg-green-100 text-green-700 border-green-200', stage: 7 },
    { name: 'Do Not Contact', color: 'bg-red-100 text-red-700 border-red-200', stage: 8 },
  ]

  // Active leads (not converted or do not contact)
  const activeLeads = leads.filter(l => 
    l.status !== 'Converted' && l.status !== 'Do Not Contact'
  )

  const groupedLeads = stages.map(stage => ({
    ...stage,
    leads: leads.filter(l => l.status === stage.name),
    count: leads.filter(l => l.status === stage.name).length
  }))

  // Calculate stats
  const stats = {
    totalLeads: leads.length,
    activeLeads: activeLeads.length,
    openLeads: leads.filter(l => l.status === 'Open').length,
    interestedLeads: leads.filter(l => l.status === 'Interested').length,
    opportunityLeads: leads.filter(l => l.status === 'Opportunity').length,
    convertedLeads: leads.filter(l => l.status === 'Converted').length,
    totalCustomers: customers.length
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Lead Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Track and manage your sales leads</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-slate-500">Active Leads</div>
            <div className="text-2xl font-bold text-blue-600">{activeLeads.length}</div>
          </div>
          <div className="flex gap-2">
            <Link href="/crm/customers">
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" /> Customers ({customers.length})
              </Button>
            </Link>
            <Link href="/crm/opportunities">
              <Button variant="outline" className="gap-2">
                <TrendingUp className="h-4 w-4" /> Opportunities
              </Button>
            </Link>
            <Link href="/crm/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Plus className="h-4 w-4" /> New Lead
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interested</CardTitle>
            <PhoneCall className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.interestedLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.opportunityLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.convertedLeads}</div>
          </CardContent>
        </Card>
      </div>

      {/* Leads View Component with Kanban and List */}
      <LeadsView 
        leads={activeLeads} 
        groupedLeads={groupedLeads}
        stages={stages} 
      />
    </div>
  )
}

