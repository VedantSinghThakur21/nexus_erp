import { getLeads, getCustomers } from "@/app/actions/crm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { List, Kanban, Plus, Users, UserCheck } from "lucide-react"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function CRMPage() {
  const leads = await getLeads()
  const customers = await getCustomers() // <--- Fetch Customers

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-60px)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">CRM</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage leads and customers</p>
        </div>
        
        <Link href="/crm/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Plus className="h-4 w-4" /> New Lead
            </Button>
        </Link>
      </div>

      <Tabs defaultValue="kanban" className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 shrink-0">
            <TabsList className="bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="kanban" className="gap-2"><Kanban className="h-4 w-4"/> Pipeline</TabsTrigger>
                <TabsTrigger value="leads" className="gap-2"><List className="h-4 w-4"/> Leads List</TabsTrigger>
                <TabsTrigger value="customers" className="gap-2"><UserCheck className="h-4 w-4"/> Customers</TabsTrigger>
            </TabsList>
        </div>

        {/* View 1: Kanban Board (Leads) */}
        <TabsContent value="kanban" className="flex-1 overflow-x-auto overflow-y-hidden pb-2 data-[state=inactive]:hidden">
            <div className="h-full">
                <KanbanBoard leads={leads} />
            </div>
        </TabsContent>

        {/* View 2: Lead List */}
        <TabsContent value="leads" className="flex-1 overflow-auto data-[state=inactive]:hidden">
            <Card>
                <CardHeader><CardTitle>All Leads</CardTitle></CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900 font-medium text-slate-500 sticky top-0">
                                <tr className="border-b border-slate-200 dark:border-slate-800">
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Company</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((lead) => (
                                    <tr key={lead.name} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                        <td className="p-4">
                                            <Link href={`/crm/${lead.name}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                                                {lead.lead_name}
                                            </Link>
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{lead.company_name}</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                                {lead.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* View 3: Customer List (NEW) */}
        <TabsContent value="customers" className="flex-1 overflow-auto data-[state=inactive]:hidden">
            <Card>
                <CardHeader><CardTitle>Active Customers</CardTitle></CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900 font-medium text-slate-500 sticky top-0">
                                <tr className="border-b border-slate-200 dark:border-slate-800">
                                    <th className="p-4">Customer Name</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Territory</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.length === 0 ? (
                                     <tr><td colSpan={3} className="p-6 text-center text-slate-500">No customers yet. Convert a lead to create one.</td></tr>
                                ) : (
                                    customers.map((cust) => (
                                        <tr key={cust.name} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                            <td className="p-4 font-medium text-slate-900 dark:text-white">
                                                {cust.customer_name}
                                            </td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{cust.customer_type}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{cust.territory}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
