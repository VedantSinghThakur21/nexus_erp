
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { StatCard } from "@/components/dashboard/StatCard";
import { OpportunitiesTable } from "@/components/dashboard/OpportunitiesTable";
import { IntelligenceHub, DealAtRisk, PriorityActions, MarketVelocity } from "@/components/dashboard/widgets";
import { StageConversions } from "@/components/dashboard/StageConversions";
import { ActivityVolume } from "@/components/dashboard/ActivityVolume";

export default function DashboardPage() {
  const stats = [
    { title: "Win Rate", value: "64.5%", trend: "↑ 2.4%", subtext: "Targeting 75% for Q3", color: "text-green-600" },
    { title: "Pipeline Value", value: "$12.8M", trend: "+$1.2M this month", subtext: "Weighted: $8.4M", color: "text-blue-600" },
    { title: "Revenue MTD", value: "$2.45M", trend: "112% of quota", subtext: "", color: "text-green-600" },
    { title: "Active Leads", value: "1,402", trend: "+18% vs last week", subtext: "Avg Response: 4.2h", color: "text-blue-600" },
  ];
  const opportunities = [
    { initials: "VT", account: "Velocity Tech", stage: "Proposal", value: 420000, confidence: 92 },
    { initials: "CS", account: "CloudSphere", stage: "Discovery", value: 315000, confidence: 78 },
    { initials: "UM", account: "Urban Mobility", stage: "Negotiation", value: 890000, confidence: 45 },
  ];

  return (
    <div className="flex min-h-screen bg-[#F6F8FA]">
      <SidebarNav />
      <main className="flex-1 p-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <input className="w-1/3 px-4 py-2 rounded-lg border border-gray-200 bg-white" placeholder="🔍  Search anything..." />
          <div className="flex items-center gap-4">
            <img src="/user-avatar.png" className="w-10 h-10 rounded-full" />
          </div>
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map(stat => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">High-Probability Opportunities</h2>
                <button className="text-blue-600 font-medium">Full Pipeline</button>
              </div>
              <OpportunitiesTable data={opportunities} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StageConversions />
              <ActivityVolume />
            </div>
          </div>
          <div>
            <IntelligenceHub />
            <DealAtRisk />
            <PriorityActions />
            <MarketVelocity />
          </div>
        </div>
      </main>
    </div>
  );
}
