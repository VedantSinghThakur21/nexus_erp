"use client"

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Zap,
  BarChart3,
  Users,
  Search,
  Bell,
  Lightbulb,
  Mail,
  Calendar,
  CheckCircle,
  UserPlus,
  MessageSquare,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { getDashboardStats, getOpportunities, getRecentActivities, getAtRiskDeals } from "@/app/actions/dashboard";
import { formatIndianCurrency, formatIndianCurrencyInCrores } from "@/lib/currency";

type Opportunity = {
  name: string;
  customer_name?: string;
  party_name?: string;
  sales_stage: string;
  opportunity_amount: number;
  probability: number;
  status: string;
  modified: string;
};

type Stats = {
  pipelineValue: number;
  revenue: number;
  activeLeads: number;
  winRate: number;
  winRateChange: number;
  leadsChange: number;
};

type ActivityItem = {
  type: 'closed-won' | 'hot-prospect' | 'engagement';
  title: string;
  subtitle: string;
  time: string;
};

type AtRiskDeal = {
  name: string;
  healthScore: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    pipelineValue: 0,
    revenue: 0,
    activeLeads: 0,
    winRate: 0,
    winRateChange: 0,
    leadsChange: 0,
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [atRiskDeal, setAtRiskDeal] = useState<AtRiskDeal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [statsData, oppsData, activitiesData, atRiskData] = await Promise.all([
        getDashboardStats(),
        getOpportunities(),
        getRecentActivities(),
        getAtRiskDeals(),
      ]);

      setOpportunities(oppsData);
      setStats({
        pipelineValue: statsData.pipelineValue,
        revenue: statsData.revenue,
        activeLeads: statsData.openOpportunities,
        winRate: statsData.winRate,
        winRateChange: statsData.winRateChange,
        leadsChange: statsData.leadsChange,
      });
      setActivities(
        (activitiesData as any[]).map(item => ({
          ...item,
          type: item.type as "closed-won" | "hot-prospect" | "engagement"
        }))
      );
      if (atRiskData.length > 0) {
        setAtRiskDeal(atRiskData[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setLoading(false);
    }
  }

  const highProbOpportunities = opportunities
    .filter((opp: Opportunity) => opp.probability >= 50 && opp.status === 'Open')
    .sort((a: Opportunity, b: Opportunity) => b.probability - a.probability)
    .slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-[#5B6FE3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header - 72px height */}
      <header className="h-[72px] bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
        <div className="flex items-center">
          <div className="relative w-[480px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full h-10 bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FE3]/20 focus:border-[#5B6FE3] text-gray-700 placeholder:text-gray-400"
              placeholder="Ask AI anything..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative text-gray-500 hover:text-gray-700 transition-colors p-2">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[#5B6FE3] rounded-full"></span>
          </button>
          <div className="h-8 w-px bg-gray-200"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">Adrian Chen</p>
              <p className="text-xs text-gray-500">Regional Director</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#5B6FE3] to-[#4A5BC9] flex items-center justify-center text-white font-semibold text-sm">
              AC
            </div>
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* KPI Cards - Proper font sizing (text-4xl = 36px) */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {/* Win Rate */}
          <Card className="bg-[#1E293B] border-none rounded-2xl overflow-hidden h-[180px] shadow-lg">
            <CardContent className="p-6 w-full h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.15em]">WIN RATE</p>
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-[#5B6FE3]/10">
                  <TrendingUp className="h-4 w-4 text-[#5B6FE3]" />
                </div>
              </div>
              <div>
                <h3 className="text-4xl font-bold text-white leading-none tracking-tight mb-2">
                  {stats.winRate.toFixed(1)}%
                </h3>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-[#5B6FE3]" />
                  <span className="text-sm font-semibold text-[#5B6FE3]">+{stats.winRateChange.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Value */}
          <Card className="bg-[#1E293B] border-none rounded-2xl overflow-hidden h-[180px] shadow-lg">
            <CardContent className="p-6 w-full h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.15em]">PIPELINE VALUE</p>
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-[#10B981]/10">
                  <BarChart3 className="h-4 w-4 text-[#10B981]" />
                </div>
              </div>
              <div>
                <h3 className="text-4xl font-bold text-white leading-none tracking-tight mb-3">
                  {formatIndianCurrencyInCrores(stats.pipelineValue)}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-medium">
                    <span className="text-gray-400">TARGET: ₹20Cr</span>
                    <span className="text-gray-400">65% ACHIEVED</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-[#10B981] rounded-full transition-all duration-500" style={{ width: '65%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue MTD */}
          <Card className="bg-[#1E293B] border-none rounded-2xl overflow-hidden h-[180px] shadow-lg">
            <CardContent className="p-6 w-full h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.15em]">REVENUE MTD</p>
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-[#F59E0B]/10">
                  <Zap className="h-4 w-4 text-[#F59E0B]" />
                </div>
              </div>
              <div>
                <h3 className="text-4xl font-bold text-white leading-none tracking-tight mb-3">
                  {formatIndianCurrencyInCrores(stats.revenue)}
                </h3>
                <div className="flex gap-1.5 mt-1">
                  <div className="h-1.5 w-2 bg-[#F59E0B] rounded-full"></div>
                  <div className="h-1.5 w-2 bg-[#F59E0B] rounded-full"></div>
                  <div className="h-1.5 w-2 bg-[#F59E0B] rounded-full"></div>
                  <div className="h-1.5 w-2 bg-gray-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Leads */}
          <Card className="bg-[#1E293B] border-none rounded-2xl overflow-hidden h-[180px] shadow-lg">
            <CardContent className="p-6 w-full h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.15em]">ACTIVE LEADS</p>
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-[#F59E0B]/10">
                  <Zap className="h-4 w-4 text-[#F59E0B]" />
                </div>
              </div>
              <div>
                <h3 className="text-4xl font-bold text-white leading-none tracking-tight mb-3">
                  {stats.activeLeads.toLocaleString()}
                </h3>
                <div className="inline-block px-3 py-1.5 bg-gray-700/40 rounded-lg border border-gray-600/30">
                  <p className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.12em]">AI CONFIDENCE</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid - 24px gaps */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Main Content (2/3 width) */}
          <div className="xl:col-span-2 flex gap-6">
            {/* Sales Funnel */}
            <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm flex-1 min-w-0">
              <CardHeader className="px-8 py-6 flex flex-row items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#5B7CFA]" />
                <CardTitle className="text-base font-bold text-gray-700 uppercase tracking-wider">Sales Funnel</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-7">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase">Discovery</span>
                      <span className="text-xs font-bold text-gray-400">₹4.2Cr</span>
                    </div>
                    <div className="bg-[#5B7CFA] h-10 rounded-lg flex items-center justify-between px-5 shadow-sm w-full">
                      <span className="text-base font-bold text-white">12 Deals</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase">Proposal</span>
                      <span className="text-xs font-bold text-gray-400">₹3.1Cr</span>
                    </div>
                    <div className="bg-[#5B7CFA] h-10 rounded-lg flex items-center justify-between px-5 shadow-sm" style={{ width: '70%' }}>
                      <span className="text-base font-bold text-white">8 Deals</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase">Negotiation</span>
                      <span className="text-xs font-bold text-gray-400">₹2.8Cr</span>
                    </div>
                    <div className="bg-[#5B7CFA] h-10 rounded-lg flex items-center justify-between px-5 shadow-sm" style={{ width: '50%' }}>
                      <span className="text-base font-bold text-white">5 Deals</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Leads Source */}
            <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm flex-1 min-w-0">
              <CardHeader className="px-8 py-6 border-b border-gray-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#5B7CFA]" />
                <CardTitle className="text-base font-bold text-gray-700 uppercase tracking-wider">Leads Source</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <svg width="180" height="180" viewBox="0 0 180 180">
                      <circle cx="90" cy="90" r="70" fill="none" stroke="#5B7CFA" strokeWidth="18" strokeDasharray="285 440" transform="rotate(-90 90 90)" />
                      <circle cx="90" cy="90" r="70" fill="none" stroke="#10B981" strokeWidth="18" strokeDasharray="88 440" strokeDashoffset="-285" transform="rotate(-90 90 90)" />
                      <circle cx="90" cy="90" r="70" fill="none" stroke="#E5EAF2" strokeWidth="18" strokeDasharray="67 440" strokeDashoffset="-373" transform="rotate(-90 90 90)" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-2xl font-bold text-gray-900">1.2k</p>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Total</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 ml-8">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#5B7CFA]"></span>
                      <span className="text-sm text-gray-700">Direct</span>
                      <span className="text-sm text-gray-700 ml-2">65%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#10B981]"></span>
                      <span className="text-sm text-gray-700">Referral</span>
                      <span className="text-sm text-gray-700 ml-2">20%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Right Column - Intelligence Hub (1/3 width) */}
          <div className="space-y-6 min-w-[340px] max-w-[360px]">
            <Card className="rounded-xl border border-gray-200 bg-white sticky top-24">
              <CardHeader className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-[#5B6FE3]/10 rounded-lg flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-[#5B6FE3]" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900">Intelligence Hub</CardTitle>
                    <p className="text-xs text-[#5B6FE3] font-semibold uppercase tracking-wider mt-0.5">AI Copilot Active</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Deal at Risk Alert */}
                {atRiskDeal && (
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-5 rounded-xl border-2 border-orange-200">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Deal at Risk</span>
                    </div>
                    <h5 className="text-sm font-bold text-gray-900 mb-2">{atRiskDeal.name}</h5>
                    <p className="text-xs text-gray-600 mb-4">
                      Health score dropped to <span className="font-bold text-orange-600">{atRiskDeal.healthScore}/100</span>.
                    </p>
                    <button className="w-full py-2.5 bg-[#5B6FE3] hover:bg-[#4A5BC9] text-white font-semibold text-sm rounded-lg transition-colors">
                      Generate Strategy
                    </button>
                  </div>
                )}

                {/* Priority Actions */}
                <div>
                  <h6 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Priority Actions</h6>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="h-8 w-8 rounded bg-white border border-gray-200 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-[#5B6FE3]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">Follow up: Velocity</p>
                        <p className="text-xs text-gray-500">Proposal viewed 3x.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="h-8 w-8 rounded bg-white border border-gray-200 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 text-[#10B981]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">Executive Demo</p>
                        <p className="text-xs text-gray-500">Confirm Stark Ent.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Market Insight */}
                <div className="pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Market Insight</span>
                    <span className="text-sm font-bold text-[#10B981]">+14%</span>
                  </div>
                  <p className="text-xs text-gray-600 italic leading-relaxed">
                    "Sales cycles shortening by 2.4 days this quarter."
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Team Performance Row (Full Width) */}
        <div className="w-full mt-8">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-gray-400" />
            <span className="text-lg font-bold text-gray-700 uppercase tracking-wider">Team Performance & Intelligence</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Closed Deal */}
            <div className="flex flex-col rounded-xl border border-gray-200 p-6 h-full bg-transparent shadow-none">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#10B981]/10">
                  <CheckCircle className="h-6 w-6 text-[#10B981]" />
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase">Closed Deal</span>
              </div>
              <div className="font-bold text-gray-900 text-lg mb-1">Sarah Jenkins</div>
              <div className="text-sm text-gray-500 mb-1">Cyberdyne Corp</div>
              <div className="text-xs text-[#10B981] font-medium">2 MINUTES AGO</div>
            </div>
            {/* New Lead */}
            <div className="flex flex-col rounded-xl border border-gray-200 p-6 h-full bg-transparent shadow-none">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#8B5CF6]/10">
                  <UserPlus className="h-6 w-6 text-[#8B5CF6]" />
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase">New Lead</span>
              </div>
              <div className="font-bold text-gray-900 text-lg mb-1">Mike Rossi</div>
              <div className="text-sm text-gray-500 mb-1">TechFlow Systems</div>
              <div className="text-xs text-[#8B5CF6] font-medium">15 MINUTES AGO</div>
            </div>
            {/* Outbound */}
            <div className="flex flex-col rounded-xl border border-gray-200 p-6 h-full bg-transparent shadow-none">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#A78BFA]/10">
                  <Mail className="h-6 w-6 text-[#A78BFA]" />
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase">Outbound</span>
              </div>
              <div className="font-bold text-gray-900 text-lg mb-1">David Geller</div>
              <div className="text-sm text-gray-500 mb-1">Stark Industries</div>
              <div className="text-xs text-[#A78BFA] font-medium">45 MINUTES AGO</div>
            </div>
            {/* Meeting Set */}
            <div className="flex flex-col rounded-xl border border-gray-200 p-6 h-full bg-transparent shadow-none">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#F59E0B]/10">
                  <Calendar className="h-6 w-6 text-[#F59E0B]" />
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase">Meeting Set</span>
              </div>
              <div className="font-bold text-gray-900 text-lg mb-1">Amy Pond</div>
              <div className="text-sm text-gray-500 mb-1">Waltham Co.</div>
              <div className="text-xs text-[#F59E0B] font-medium">1 HOUR AGO</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}