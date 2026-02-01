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
        {/* KPI Cards - 24px gaps, 180px height */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {/* Win Rate */}
          <Card className="bg-[#181C2A] border-none rounded-xl overflow-hidden h-[180px]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Win Rate</p>
                <div className="p-1.5 bg-[#5B6FE3]/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-[#5B6FE3]" />
                </div>
              </div>
              <h3 className="text-[32px] font-semibold text-white mb-2">{stats.winRate.toFixed(1)}%</h3>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-[#5B6FE3]" />
                <span className="text-xs font-semibold text-[#5B6FE3]">+{stats.winRateChange.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Value */}
          <Card className="bg-[#181C2A] border-none rounded-xl overflow-hidden h-[180px]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pipeline Value</p>
                <div className="p-1.5 bg-[#10B981]/10 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-[#10B981]" />
                </div>
              </div>
              <h3 className="text-[32px] font-semibold text-white mb-2">{formatIndianCurrencyInCrores(stats.pipelineValue)}</h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">TARGET: ₹20Cr</span>
                  <span className="text-gray-400">65% ACHIEVED</span>
                </div>
                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-[#10B981] rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue MTD */}
          <Card className="bg-[#181C2A] border-none rounded-xl overflow-hidden h-[180px]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue MTD</p>
                <div className="p-1.5 bg-[#F59E0B]/10 rounded-lg">
                  <Zap className="h-4 w-4 text-[#F59E0B]" />
                </div>
              </div>
              <h3 className="text-[32px] font-semibold text-white mb-2">{formatIndianCurrencyInCrores(stats.revenue)}</h3>
              <div className="flex gap-1">
                <div className="h-1 w-2 bg-[#F59E0B] rounded-full"></div>
                <div className="h-1 w-2 bg-[#F59E0B] rounded-full"></div>
                <div className="h-1 w-2 bg-[#F59E0B] rounded-full"></div>
                <div className="h-1 w-2 bg-gray-600 rounded-full"></div>
              </div>
            </CardContent>
          </Card>

          {/* Active Leads */}
          <Card className="bg-[#181C2A] border-none rounded-xl overflow-hidden h-[180px]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Leads</p>
                <div className="p-1.5 bg-[#F59E0B]/10 rounded-lg">
                  <Zap className="h-4 w-4 text-[#F59E0B]" />
                </div>
              </div>
              <h3 className="text-[32px] font-semibold text-white mb-2">{stats.activeLeads.toLocaleString()}</h3>
              <div className="inline-block px-2.5 py-1 bg-gray-700/50 rounded-md">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">AI Confidence</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid - 24px gaps */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Main Content (2/3 width) */}
          <div className="xl:col-span-2 space-y-6">
            {/* High-Probability Opportunities */}
            <Card className="rounded-xl border border-gray-200 bg-white">
              <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-gray-900">High-Probability Opportunities</CardTitle>
                <a href="/crm/opportunities" className="text-xs font-bold text-[#5B6FE3] uppercase tracking-wider hover:underline">
                  Full Pipeline
                </a>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {highProbOpportunities.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                            No high-probability opportunities found
                          </td>
                        </tr>
                      ) : (
                        highProbOpportunities.map((opp: Opportunity, idx: number) => {
                          const customerName = opp.customer_name || opp.party_name || 'Unknown';
                          const initials = customerName.substring(0, 2).toUpperCase();

                          const stageColors: Record<string, { bg: string; text: string; barBg: string; textColor: string }> = {
                            'Prospecting': { bg: 'bg-blue-50', text: 'text-[#5B6FE3]', barBg: '#5B6FE3', textColor: '#5B6FE3' },
                            'Qualification': { bg: 'bg-purple-50', text: 'text-[#8B5CF6]', barBg: '#8B5CF6', textColor: '#8B5CF6' },
                            'Proposal/Price Quote': { bg: 'bg-blue-50', text: 'text-[#5B6FE3]', barBg: '#5B6FE3', textColor: '#5B6FE3' },
                            'Negotiation/Review': { bg: 'bg-emerald-50', text: 'text-[#10B981]', barBg: '#10B981', textColor: '#10B981' },
                          };
                          const stageStyle = stageColors[opp.sales_stage] || stageColors['Prospecting'];

                          return (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700 border border-gray-200">
                                    {initials}
                                  </div>
                                  <span className="font-semibold text-gray-900">{customerName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge className={`${stageStyle.bg} ${stageStyle.text} text-xs font-semibold px-2.5 py-0.5 border-0 uppercase`}>
                                  {opp.sales_stage}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 font-semibold text-gray-900">
                                {formatIndianCurrency(opp.opportunity_amount)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-3">
                                  <span className="font-bold text-sm" style={{ color: stageStyle.textColor }}>{opp.probability}%</span>
                                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{ width: `${opp.probability}%`, backgroundColor: stageStyle.barBg }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Funnel */}
              <Card className="rounded-xl border border-gray-200 bg-white">
                <CardHeader className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                    <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wider">Sales Funnel</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Discovery</span>
                        <span className="text-xs font-semibold text-gray-400">₹4.2Cr</span>
                      </div>
                      <div className="bg-[#5B6FE3] h-10 rounded flex items-center justify-between px-3">
                        <span className="text-sm font-bold text-white">12 Deals</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Proposal</span>
                        <span className="text-xs font-semibold text-gray-400">₹2.1Cr</span>
                      </div>
                      <div className="bg-[#5B6FE3] h-10 rounded flex items-center justify-between px-3" style={{ width: '70%' }}>
                        <span className="text-sm font-bold text-white">8 Deals</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Negotiation</span>
                        <span className="text-xs font-semibold text-gray-400">₹2.8Cr</span>
                      </div>
                      <div className="bg-[#5B6FE3] h-10 rounded flex items-center justify-between px-3" style={{ width: '50%' }}>
                        <span className="text-sm font-bold text-white">5 Deals</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leads Source */}
              <Card className="rounded-xl border border-gray-200 bg-white">
                <CardHeader className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wider">Leads Source</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <svg width="180" height="180" viewBox="0 0 180 180">
                        <circle cx="90" cy="90" r="70" fill="none" stroke="#5B6FE3" strokeWidth="28" strokeDasharray="285 440" transform="rotate(-90 90 90)" />
                        <circle cx="90" cy="90" r="70" fill="none" stroke="#10B981" strokeWidth="28" strokeDasharray="88 440" strokeDashoffset="-285" transform="rotate(-90 90 90)" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-2xl font-bold text-gray-900">1.2k</p>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#5B6FE3]"></div>
                        <span className="text-sm text-gray-700">Direct</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">65%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#10B981]"></div>
                        <span className="text-sm text-gray-700">Referral</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">20%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Intelligence Hub (1/3 width) */}
          <div className="space-y-6">
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
        <Card className="rounded-xl border border-gray-200 bg-white">
          <CardHeader className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wider">Team Performance & Intelligence</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-[#10B981] transition-colors bg-white">
                <div className="h-10 w-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-5 w-5 text-[#10B981]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Closed Deal</p>
                  <p className="font-semibold text-gray-900 truncate">Sarah Jenkins</p>
                  <p className="text-xs text-gray-500 mt-0.5">Cyberdyne Corp</p>
                  <p className="text-xs text-gray-400 mt-0.5">2 MINUTES AGO</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-[#5B6FE3] transition-colors bg-white">
                <div className="h-10 w-10 rounded-lg bg-[#5B6FE3]/10 flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5 text-[#5B6FE3]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">New Lead</p>
                  <p className="font-semibold text-gray-900 truncate">Mike Rossi</p>
                  <p className="text-xs text-gray-500 mt-0.5">TechFlow Systems</p>
                  <p className="text-xs text-gray-400 mt-0.5">15 MINUTES AGO</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-[#8B5CF6] transition-colors bg-white">
                <div className="h-10 w-10 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-[#8B5CF6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Outbound</p>
                  <p className="font-semibold text-gray-900 truncate">David Geller</p>
                  <p className="text-xs text-gray-500 mt-0.5">Stark Industries</p>
                  <p className="text-xs text-gray-400 mt-0.5">45 MINUTES AGO</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-[#F59E0B] transition-colors bg-white">
                <div className="h-10 w-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-[#F59E0B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Meeting Set</p>
                  <p className="font-semibold text-gray-900 truncate">Amy Pond</p>
                  <p className="text-xs text-gray-500 mt-0.5">Waltham Co.</p>
                  <p className="text-xs text-gray-400 mt-0.5">1 HOUR AGO</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    );
  }