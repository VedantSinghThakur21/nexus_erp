import { getLeads, getCustomers } from "@/app/actions/crm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Users, TrendingUp } from "lucide-react"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function CRMPage() {
  const leads = await getLeads()
  const customers = await getCustomers()

  // Calculate stats
  const stats = {
    openLeads: leads.filter(l => l.status === 'Open').length,
    qualifiedLeads: leads.filter(l => l.status === 'Qualified').length,
    totalCustomers: customers.length
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Lead Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Track and manage your sales leads</p>
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

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Open Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.openLeads}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Qualified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.qualifiedLeads}</div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="flex-1">
        <KanbanBoard leads={leads} />
      </div>
    </div>
  )
}
