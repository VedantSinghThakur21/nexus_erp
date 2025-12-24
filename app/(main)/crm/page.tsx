import { getLeads, getCustomers } from "@/app/actions/crm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Users, TrendingUp, UserCheck, PhoneCall } from "lucide-react"
import { AnimatedButton, AnimatedStatCard, AnimatedCard } from "@/components/ui/animated"
import Link from "next/link"
import { LeadsView } from "@/components/crm/leads-view"

export default async function CRMPage() {
  const leads = await getLeads()
  const customers = await getCustomers()

  // Lead stages/statuses
  const stages = [
    { name: 'Lead', color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700', stage: 1 },
    { name: 'Open', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700', stage: 2 },
    { name: 'Replied', color: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700', stage: 3 },
    { name: 'Interested', color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700', stage: 4 },
    { name: 'Opportunity', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700', stage: 5 },
    { name: 'Quotation', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700', stage: 6 },
    { name: 'Converted', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700', stage: 7 },
    { name: 'Do Not Contact', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700', stage: 8 },
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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-2xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
            Lead Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Track and manage your sales leads</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-slate-600 dark:text-slate-400">Active Leads</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeLeads.length}</div>
          </div>
          <div className="flex gap-2">
            <Link href="/crm/customers">
              <AnimatedButton variant="ghost" className="gap-2">
                <Users className="h-4 w-4" /> Customers ({customers.length})
              </AnimatedButton>
            </Link>
            <Link href="/crm/opportunities">
              <AnimatedButton variant="ghost" className="gap-2">
                <TrendingUp className="h-4 w-4" /> Opportunities
              </AnimatedButton>
            </Link>
            <Link href="/crm/new">
              <AnimatedButton variant="neon" className="gap-2">
                <Plus className="h-4 w-4" /> New Lead
              </AnimatedButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <AnimatedStatCard
          title="Total Leads"
          value={stats.totalLeads}
          icon={<Users className="h-5 w-5" />}
          delay={0}
        />
        
        <AnimatedStatCard
          title="Interested"
          value={stats.interestedLeads}
          icon={<PhoneCall className="h-5 w-5" />}
          variant="neon"
          delay={0.1}
        />

        <AnimatedStatCard
          title="Opportunities"
          value={stats.opportunityLeads}
          icon={<TrendingUp className="h-5 w-5" />}
          delay={0.2}
        />

        <AnimatedStatCard
          title="Converted"
          value={stats.convertedLeads}
          icon={<UserCheck className="h-5 w-5" />}
          delay={0.3}
        />
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

