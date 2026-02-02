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
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      {/* Header - 60px height */}
      <header className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center">
          <div className="relative w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full h-9 bg-[#F7F9FC] border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] text-gray-700 placeholder:text-gray-400"
              placeholder="Ask AI anything..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative text-gray-500 hover:text-gray-700 transition-colors p-2">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[#3B82F6] rounded-full"></span>
          </button>
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">Adrian Chen</p>
              <p className="text-xs text-gray-500">Regional Director</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-white font-semibold text-sm">
              AC
            </div>
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* KPI Cards - 180px height, #1E293B background */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {/* Win Rate */}
          <Card className="bg-[#1a2332] border-none rounded-2xl h-[180px] shadow-md">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">WIN RATE</span>
                <div className="h-8 w-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-[#3B82F6]" />
                </div>
              </div>
              <div>
                <h3 className="text-5xl font-bold text-white mb-2 leading-none">
                  {stats.winRate.toFixed(1)}%
                </h3>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-[#3B82F6]" />
                  <span className="text-sm font-semibold text-[#3B82F6]">
                    +{stats.winRateChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Value */}
          <Card className="bg-[#1a2332] border-none rounded-2xl h-[180px] shadow-md">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">PIPELINE VALUE</span>
                <div className="h-8 w-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-[#10B981]" />
                </div>
              </div>
              <div>
                <h3 className="text-5xl font-bold text-white mb-3 leading-none">
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
          <Card className="bg-[#1a2332] border-none rounded-2xl h-[180px] shadow-md">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">REVENUE MTD</span>
                <div className="h-8 w-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-[#F59E0B]" />
                </div>
              </div>
              <div>
                <h3 className="text-5xl font-bold text-white mb-3 leading-none">
                  {formatIndianCurrencyInCrores(stats.revenue)}
                </h3>
                <div className="flex gap-1.5">
                  <div className="h-1.5 w-1.5 bg-[#F59E0B] rounded-full"></div>
                  <div className="h-1.5 w-1.5 bg-[#F59E0B] rounded-full"></div>
                  <div className="h-1.5 w-1.5 bg-[#F59E0B] rounded-full"></div>
                  <div className="h-1.5 w-1.5 bg-gray-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Leads */}
          <Card className="bg-[#1a2332] border-none rounded-2xl h-[180px] shadow-md">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">ACTIVE LEADS</span>
                <div className="h-8 w-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-[#F59E0B]" />
                </div>
              </div>
              <div>
                <h3 className="text-5xl font-bold text-white mb-3 leading-none">
                  {stats.activeLeads.toLocaleString()}
                </h3>
                <div className="inline-block px-3 py-1.5 bg-gray-700/40 rounded-lg border border-gray-600/30">
                  <span className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.1em]">AI CONFIDENCE</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid - 2/3 + 1/3 */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 mb-8">
          {/* Left Column - Main content */}
          <div className="space-y-6">
            {/* High-Probability Opportunities */}
            <Card className="rounded-xl border border-gray-200 bg-white">
              <CardHeader className="px-6 py-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-gray-900">High-Probability Opportunities</CardTitle>
                <a href="/crm/opportunities" className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider hover:underline">
                  FULL PIPELINE
                </a>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">ACCOUNT</th>
                        <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">STAGE</th>
                        <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">VALUE</th>
                        <th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">CONFIDENCE</th>
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

                          // Stage colors matching target design
                          const stageColors: Record<string, { bg: string; text: string; barColor: string }> = {
                            'Prospecting': { bg: 'bg-[#EBF5FF]', text: 'text-[#3B82F6]', barColor: '#3B82F6' },
                            'Qualification': { bg: 'bg-[#F3E8FF]', text: 'text-[#8B5CF6]', barColor: '#8B5CF6' },
                            'Proposal/Price Quote': { bg: 'bg-[#EBF5FF]', text: 'text-[#3B82F6]', barColor: '#3B82F6' },
                            'Negotiation/Review': { bg: 'bg-[#FEF3C7]', text: 'text-[#F59E0B]', barColor: '#F59E0B' },
                          };
                          const stageStyle = stageColors[opp.sales_stage] || stageColors['Prospecting'];

                          // Confidence color based on percentage
                          const confidenceColor = opp.probability >= 80 ? '#10B981' : opp.probability >= 60 ? '#3B82F6' : '#F59E0B';

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
                                <Badge className={`${stageStyle.bg} ${stageStyle.text} text-xs font-semibold px-2.5 py-0.5 uppercase rounded`}>
                                  {opp.sales_stage}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-semibold text-gray-900">
                                  {formatIndianCurrency(opp.opportunity_amount)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-3">
                                  <span className="text-sm font-bold" style={{ color: confidenceColor }}>
                                    {opp.probability}%
                                  </span>
                                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${opp.probability}%`,
                                        backgroundColor: confidenceColor
                                      }}
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

            {/* Charts Row - Side by Side */}
            <div className="grid grid-cols-2 gap-6">
              {/* Sales Funnel */}
              <Card className="rounded-xl border border-gray-200 bg-white">
                <CardHeader className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                    <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wider">SALES FUNNEL</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="space-y-3">
                    {/* Discovery */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[11px] font-bold text-gray-500 uppercase">DISCOVERY</span>
                        <span className="text-[11px] font-semibold text-gray-400">₹4.2Cr</span>
                      </div>
                      <div className="h-9 bg-[#3B82F6] rounded-lg flex items-center px-3">
                        <span className="text-sm font-bold text-white">12 Deals</span>
                      </div>
                    </div>
                    {/* Proposal */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[11px] font-bold text-gray-500 uppercase">PROPOSAL</span>
                        <span className="text-[11px] font-semibold text-gray-400">₹3.1Cr</span>
                      </div>
                      <div className="flex items-center h-9 rounded-lg overflow-hidden">
                        <div className="bg-[#3B82F6] h-full flex items-center px-3" style={{ width: '70%' }}>
                          <span className="text-sm font-bold text-white">8 Deals</span>
                        </div>
                        <div className="bg-gray-100 h-full" style={{ width: '30%' }}></div>
                      </div>
                    </div>
                    {/* Negotiation */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[11px] font-bold text-gray-500 uppercase">NEGOTIATION</span>
                        <span className="text-[11px] font-semibold text-gray-400">₹2.8Cr</span>
                      </div>
                      <div className="flex items-center h-9 rounded-lg overflow-hidden">
                        <div className="bg-[#3B82F6] h-full flex items-center px-3" style={{ width: '50%' }}>
                          <span className="text-sm font-bold text-white">5 Deals</span>
                        </div>
                        <div className="bg-gray-100 h-full" style={{ width: '50%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leads Source */}
              <Card className="rounded-xl border border-gray-200 bg-white">
                <CardHeader className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wider">LEADS SOURCE</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                      <svg width="180" height="180" viewBox="0 0 180 180">
                        <circle cx="90" cy="90" r="70" fill="none" stroke="#3B82F6" strokeWidth="28" strokeDasharray="285 440" transform="rotate(-90 90 90)" />
                        <circle cx="90" cy="90" r="70" fill="none" stroke="#10B981" strokeWidth="28" strokeDasharray="88 440" strokeDashoffset="-285" transform="rotate(-90 90 90)" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-3xl font-bold text-gray-900">1.2k</p>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">TOTAL</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#3B82F6]"></div>
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

          {/* Right Column - Intelligence Hub (400px width, STICKY) */}
          <div>
            <div className="sticky top-[76px]">
              <Card className="rounded-xl border border-gray-200 bg-white min-h-[800px]">
                <CardHeader className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-[#3B82F6]/10 rounded-lg flex items-center justify-center">
                      <Lightbulb className="h-5 w-5 text-[#3B82F6]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Intelligence Hub</h3>
                      <p className="text-xs font-semibold text-[#3B82F6] uppercase tracking-wider">AI COPILOT ACTIVE</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Deal at Risk Alert */}
                  {atRiskDeal && (
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-5 rounded-xl border-2 border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">DEAL AT RISK</span>
                      </div>
                      <h5 className="text-sm font-bold text-gray-900 mb-2">{atRiskDeal.name}</h5>
                      <p className="text-xs text-gray-600 mb-4">
                        Health score dropped to <span className="font-bold text-orange-600">{atRiskDeal.healthScore}/100</span>
                      </p>
                      <button className="w-full py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm rounded-lg transition-colors">
                        Generate Strategy
                      </button>
                    </div>
                  )}

                  {/* Priority Actions */}
                  <div>
                    <h6 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">PRIORITY ACTIONS</h6>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className="h-8 w-8 rounded bg-white border border-gray-200 flex items-center justify-center shrink-0">
                          <Mail className="h-4 w-4 text-[#3B82F6]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Follow up: Velocity</p>
                          <p className="text-xs text-gray-500">Proposal viewed 3x</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className="h-8 w-8 rounded bg-white border border-gray-200 flex items-center justify-center shrink-0">
                          <Calendar className="h-4 w-4 text-[#10B981]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Executive Demo</p>
                          <p className="text-xs text-gray-500">Confirm Stark Ent.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Market Insight */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">MARKET INSIGHT</span>
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
        </div>

        {/* Team Performance - Full Width */}
        <div>
          <div className="px-6 py-4 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-400" />
              <h3 className="text-base font-bold text-gray-700 uppercase tracking-wider">TEAM PERFORMANCE & INTELLIGENCE</h3>
            </div>
          </div>
          <div className="px-6">
            <div className="grid grid-cols-4 gap-6">
              {/* Closed Deal */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-[#10B981]" />
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">CLOSED DEAL</span>
                </div>
                <p className="text-base font-bold text-gray-900 mb-1">Sarah Jenkins</p>
                <p className="text-sm text-gray-500 mb-3">Cyberdyne Corp</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">2 MINUTES AGO</p>
              </div>

              {/* New Lead */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-[#3B82F6]" />
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">NEW LEAD</span>
                </div>
                <p className="text-base font-bold text-gray-900 mb-1">Mike Rossi</p>
                <p className="text-sm text-gray-500 mb-3">TechFlow Systems</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">15 MINUTES AGO</p>
              </div>

              {/* Outbound */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-[#8B5CF6]" />
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">OUTBOUND</span>
                </div>
                <p className="text-base font-bold text-gray-900 mb-1">David Geller</p>
                <p className="text-sm text-gray-500 mb-3">Stark Industries</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">45 MINUTES AGO</p>
              </div>

              {/* Meeting Set */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-[#F59E0B]" />
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">MEETING SET</span>
                </div>
                <p className="text-base font-bold text-gray-900 mb-1">Amy Pond</p>
                <p className="text-sm text-gray-500 mb-3">Waltham Co.</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">1 HOUR AGO</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}