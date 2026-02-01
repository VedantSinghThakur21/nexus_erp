"use client"

import { useEffect, useMemo, useState } from "react";
import type { Opportunity } from "@/app/actions/crm";
import { getDashboardStats } from "@/app/actions/dashboard";
import { getOpportunities } from "@/app/actions/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Users, 
  AlertCircle, 
  Sparkles, 
  ChevronRight,
  Search,
  Bell,
  CheckCircle,
  UserPlus,
  Mail,
  Activity,
  BarChart3,
  Calendar,
  FileText
} from "lucide-react";
import Link from "next/link";

type Stats = {
  pipelineValue: number;
  revenue: number;
  openOpportunities: number;
  winRate: number;
  winRateChange?: number;
  leadsChange?: number;
};

function isStats(obj: any): obj is Stats {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.pipelineValue === "number" &&
    typeof obj.revenue === "number" &&
    typeof obj.openOpportunities === "number" &&
    typeof obj.winRate === "number"
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    pipelineValue: 12800000,
    revenue: 2450000,
    openOpportunities: 1402,
    winRate: 64.5,
    winRateChange: 2.4,
    leadsChange: 18,
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDashboardStats().catch(() => ({})),
      getOpportunities().catch(() => []),
    ]).then(([statsRes, oppsRes]) => {
      if (isStats(statsRes)) {
        setStats(statsRes);
      }
      setOpportunities(oppsRes || []);
      setLoading(false);
    }).catch(() => {
      setError("Failed to load dashboard");
      setLoading(false);
    });
  }, []);

  const highProbOpportunities = useMemo(
    () => {
      // Use real data if available, otherwise use demo data
      const realOpps = (opportunities || [])
        .filter((opp) => opp.probability >= 50 && opp.status === "Open")
        .slice(0, 4);
      
      if (realOpps.length > 0) return realOpps;
      
      // Demo data
      return [
        {
          name: "velocity-tech",
          customer_name: "Velocity Tech",
          party_name: "Velocity Tech",
          sales_stage: "Proposal",
          opportunity_amount: 420000,
          probability: 92,
          status: "Open"
        },
        {
          name: "cloudsphere",
          customer_name: "CloudSphere",
          party_name: "CloudSphere",
          sales_stage: "Discovery",
          opportunity_amount: 315000,
          probability: 78,
          status: "Open"
        },
        {
          name: "urban-mobility",
          customer_name: "Urban Mobility",
          party_name: "Urban Mobility",
          sales_stage: "Negotiation",
          opportunity_amount: 890000,
          probability: 45,
          status: "Open"
        },
        {
          name: "nextgen-tech",
          customer_name: "NextGen Tech",
          party_name: "NextGen Tech",
          sales_stage: "Closed",
          opportunity_amount: 1200000,
          probability: 100,
          status: "Closed Won"
        }
      ] as Opportunity[];
    },
    [opportunities]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#385197]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header - Note: Sidebar is handled by AppSidebar component */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center w-full max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full bg-gray-100 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#385197]/10 text-gray-600 placeholder:text-gray-400"
              placeholder="Ask AI anything..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-5">
          <button className="relative text-gray-500 hover:text-gray-800 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-rose-500 border-2 border-white rounded-full"></span>
          </button>
          <div className="h-7 w-px bg-gray-200"></div>
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="text-right">
              <p className="text-xs font-bold text-gray-800 group-hover:text-[#385197]">Adrian Chen</p>
              <p className="text-[10px] text-gray-400 leading-none">Regional Director</p>
            </div>
            <div className="h-9 w-9 rounded-full border border-gray-200 overflow-hidden bg-gray-100">
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                AC
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="xl:grid xl:grid-cols-[1fr_360px] xl:gap-6 xl:p-6">
        {/* Left Column - Main Dashboard */}
        <div className="space-y-6 p-6 xl:p-0">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Win Rate */}
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Win Rate</p>
                  <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> {stats.winRateChange?.toFixed(1)}%
                  </Badge>
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-gray-900 leading-none">
                  {stats.winRate.toFixed(1)}%
                </h3>
                <div className="w-full bg-gray-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-[#FFCC3F] h-full rounded-full transition-all duration-500" 
                    style={{ width: `${stats.winRate}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Value */}
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pipeline Value</p>
                  <BarChart3 className="h-5 w-5 text-gray-300" />
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-gray-900 leading-none">
                  ${(stats.pipelineValue / 1000000).toFixed(1)}M
                </h3>
                <div className="flex items-end gap-1 h-8 mt-3">
                  {[30, 50, 40, 70, 60, 90].map((height, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-[#385197] rounded-sm transition-all hover:opacity-80"
                      style={{ height: `${height}%`, opacity: 0.1 + (idx * 0.15) }}
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue MTD */}
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Revenue MTD</p>
                  <DollarSign className="h-5 w-5 text-gray-300" />
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-gray-900 leading-none">
                  ${(stats.revenue / 1000000).toFixed(2)}M
                </h3>
                <div className="flex gap-1.5 mt-4">
                  <div className="h-1.5 flex-1 bg-[#385197] rounded-full"></div>
                  <div className="h-1.5 flex-1 bg-[#385197] rounded-full"></div>
                  <div className="h-1.5 flex-1 bg-[#385197] rounded-full"></div>
                  <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
                </div>
              </CardContent>
            </Card>

            {/* Active Leads */}
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Leads</p>
                  <Users className="h-5 w-5 text-gray-300" />
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-gray-900 leading-none">
                  {stats.openOpportunities.toLocaleString()}
                </h3>
                <p className="text-[11px] text-emerald-600 font-bold mt-3 uppercase tracking-wide">
                  +{stats.leadsChange}% vs LW
                </p>
              </CardContent>
            </Card>
          </div>

          {/* High-Probability Opportunities Table */}
          <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <CardHeader className="px-5 py-3.5 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-gray-800">High-Probability Opportunities</CardTitle>
                <Link 
                  href="/crm/opportunities" 
                  className="text-[11px] font-bold text-[#385197] hover:bg-gray-50 px-3 py-1.5 rounded-md transition-colors border border-gray-100"
                >
                  Full Pipeline
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="px-5 py-3">Account</th>
                      <th className="px-5 py-3">Stage</th>
                      <th className="px-5 py-3">Value</th>
                      <th className="px-5 py-3 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {highProbOpportunities.map((opp, idx) => {
                      const stageColors: Record<string, { bg: string; text: string; border: string }> = {
                        'Proposal': { bg: 'bg-blue-50', text: 'text-[#385197]', border: 'border-blue-100' },
                        'Discovery': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
                        'Negotiation': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
                        'Closed': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
                      };
                      const stageStyle = stageColors[opp.sales_stage] || stageColors['Proposal'];
                      
                      const confidenceColor = opp.probability >= 80 
                        ? 'bg-emerald-500' 
                        : opp.probability >= 50 
                        ? 'bg-[#385197]' 
                        : 'bg-amber-500';
                      
                      const confidenceTextColor = opp.probability >= 80 
                        ? 'text-emerald-600' 
                        : opp.probability >= 50 
                        ? 'text-[#385197]' 
                        : 'text-amber-500';

                      return (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors cursor-pointer">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold border border-gray-200">
                                {(opp.customer_name || opp.party_name || '??').substring(0, 2).toUpperCase()}
                              </div>
                              <span className="font-bold text-gray-900">
                                {opp.customer_name || opp.party_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <Badge className={`${stageStyle.bg} ${stageStyle.text} ${stageStyle.border} text-[10px] font-bold border px-2 py-0.5`}>
                              {opp.sales_stage}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 font-semibold text-gray-700">
                            ${(opp.opportunity_amount / 1000).toFixed(0)}K
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-3">
                              <span className={`font-bold ${confidenceTextColor}`}>
                                {opp.probability}%
                              </span>
                              <div className="w-24 h-1.5 bg-gray-100 rounded-full">
                                <div 
                                  className={`h-full ${confidenceColor} rounded-full transition-all duration-500`}
                                  style={{ width: `${opp.probability}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Forecast */}
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#385197]" />
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Revenue Forecast</h4>
                  </div>
                  <div className="flex items-center gap-5 text-[10px] font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-0.5 bg-[#385197]"></span>
                      <span className="text-gray-400">Actual</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-0.5 border-t border-dashed border-[#385197]"></span>
                      <span className="text-gray-400">AI Path</span>
                    </div>
                  </div>
                </div>
                <div className="relative h-32">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <defs>
                      <linearGradient id="blue-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#385197" />
                        <stop offset="100%" stopColor="white" />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M 0 30 L 10 28 L 25 32 L 40 22 L 55 24 L 70 15 L 70 40 L 0 40 Z" 
                      fill="url(#blue-gradient)" 
                      opacity="0.1"
                    />
                    <path 
                      d="M 0 30 L 10 28 L 25 32 L 40 22 L 55 24 L 70 15" 
                      fill="none" 
                      stroke="#385197" 
                      strokeLinecap="round" 
                      strokeWidth="2"
                    />
                    <path 
                      d="M 70 15 L 85 10 L 100 8" 
                      fill="none" 
                      stroke="#385197" 
                      strokeDasharray="2" 
                      strokeLinecap="round" 
                      strokeWidth="2"
                    />
                    <circle cx="70" cy="15" fill="#385197" r="2" />
                  </svg>
                  <div className="absolute bottom-0 w-full flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                    <span>Week 1</span>
                    <span>Week 4 (Est)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Volume */}
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4">Activity Volume</h4>
                <div className="flex items-end justify-between h-32 gap-2 px-2">
                  {[
                    { day: 'M', height: 35, active: false },
                    { day: 'T', height: 55, active: false },
                    { day: 'W', height: 45, active: false },
                    { day: 'T', height: 90, active: true },
                    { day: 'F', height: 65, active: false },
                    { day: 'S', height: 50, active: false },
                  ].map((bar, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className={`w-full rounded-t-sm transition-all ${
                          bar.active ? 'bg-[#385197]' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        style={{ height: `${bar.height}%` }}
                      ></div>
                      <span className="text-[10px] font-bold text-gray-400">{bar.day}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-Time Activity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-400" />
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Real-Time Revenue Activity</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Closed Won */}
              <Card className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="h-11 w-11 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle className="h-6 w-6 fill-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Closed-Won</p>
                    <h5 className="text-sm font-bold text-gray-900 truncate mt-1">Sarah Jenkins</h5>
                    <p className="text-xs text-gray-600 truncate mt-0.5">Cyberdyne Corp • $85k</p>
                    <span className="text-[10px] font-bold text-gray-400 uppercase mt-2 block">2 min ago</span>
                  </div>
                </CardContent>
              </Card>

              {/* Hot Prospect */}
              <Card className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="h-11 w-11 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Hot Prospect</p>
                    <h5 className="text-sm font-bold text-gray-900 truncate mt-1">Mike Rossi</h5>
                    <p className="text-xs text-gray-600 truncate mt-0.5">TechFlow Systems</p>
                    <span className="text-[10px] font-bold text-gray-400 uppercase mt-2 block">15 min ago</span>
                  </div>
                </CardContent>
              </Card>

              {/* Engagement */}
              <Card className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="h-11 w-11 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-purple-600 uppercase">Engagement</p>
                    <h5 className="text-sm font-bold text-gray-900 truncate mt-1">David Geller</h5>
                    <p className="text-xs text-gray-600 truncate mt-0.5">Stark Ind. Proposal Opened</p>
                    <span className="text-[10px] font-bold text-gray-400 uppercase mt-2 block">45 min ago</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <footer className="flex flex-col md:flex-row items-center justify-between pt-4 pb-2 border-t border-gray-200 gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Systems Operational</p>
              </div>
              <p className="text-[10px] text-gray-400">v4.12.0 Enterprise Ultimate</p>
            </div>
            <div className="flex items-center gap-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <a className="hover:text-[#385197] transition-colors" href="#">API Docs</a>
              <a className="hover:text-[#385197] transition-colors" href="#">Support Hub</a>
              <a className="hover:text-[#385197] transition-colors" href="#">Terms of Service</a>
            </div>
          </footer>
        </div>

        {/* Right Column - Intelligence Hub */}
        <div className="p-6 xl:p-0 space-y-6">
          <Card className="rounded-xl border border-gray-200 bg-white shadow-sm xl:sticky xl:top-20">
            <CardHeader className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 bg-[#385197]/5 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-[#385197]" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800 leading-none">Intelligence Hub</CardTitle>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">AI Copilot active</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* Deal at Risk Alert */}
              <div className="bg-white p-5 rounded-xl border-2 border-[#FFCC3F] shadow-sm relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <div className="h-1.5 w-1.5 bg-[#FFCC3F] rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2 mb-3 text-[#FFCC3F] font-bold">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-[10px] uppercase tracking-widest">Deal at Risk</span>
                </div>
                <h5 className="text-sm font-bold text-gray-900">Acme Corp HQ</h5>
                <p className="text-xs text-gray-500 leading-tight mt-1.5">
                  Health score dropped to <span className="font-bold text-rose-500">42/100</span>.
                </p>
                <button className="w-full mt-4 py-2 bg-[#385197] hover:brightness-110 active:scale-95 transition-all text-white font-bold text-[11px] rounded-lg">
                  Generate Strategy
                </button>
              </div>

              {/* Priority Actions */}
              <div className="space-y-3">
                <h6 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priority Actions</h6>
                
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex gap-4 hover:border-[#385197] transition-colors cursor-pointer group">
                  <div className="h-8 w-8 rounded bg-white border border-gray-100 flex items-center justify-center text-[#385197] shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-tight group-hover:text-[#385197]">
                      Follow up: Velocity
                    </p>
                    <p className="text-[10px] text-gray-500">Proposal viewed 3x.</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex gap-4 hover:border-[#385197] transition-colors cursor-pointer group">
                  <div className="h-8 w-8 rounded bg-white border border-gray-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-tight group-hover:text-[#385197]">
                      Executive Demo
                    </p>
                    <p className="text-[10px] text-gray-500">Confirm Stark Ent.</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex gap-4 hover:border-[#385197] transition-colors cursor-pointer group">
                  <div className="h-8 w-8 rounded bg-white border border-gray-100 flex items-center justify-center text-amber-600 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-tight group-hover:text-[#385197]">
                      Update Pricing
                    </p>
                    <p className="text-[10px] text-gray-500">CloudSphere request.</p>
                  </div>
                </div>
              </div>
            </CardContent>

            {/* Market Insight Footer */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Market Insight</span>
                <span className="text-[11px] font-bold text-emerald-600">+14%</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight italic">
                "Sales cycles shortening by 2.4 days this quarter due to AI-driven vetting."
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Floating AI Button */}
      <button className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-[#385197] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all z-50 flex items-center justify-center border-2 border-white/10 group">
        <Sparkles className="h-7 w-7" />
        <div className="absolute right-full mr-3 bg-gray-900 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-widest border border-white/10">
          Ask Avariq AI
        </div>
      </button>
    </div>
  );
}