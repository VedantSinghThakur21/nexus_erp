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
import { getDashboardStats, getOpportunities, getRecentActivities, getAtRiskDeals, getLeadsBySource } from "@/app/actions/dashboard";
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

type LeadSource = {
  source: string;
  count: number;
  percentage: number;
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
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [statsData, oppsData, activitiesData, atRiskData, leadSourcesData] = await Promise.all([
        getDashboardStats(),
        getOpportunities(),
        getRecentActivities(),
        getAtRiskDeals(),
        getLeadsBySource(),
      ]);

      setOpportunities(oppsData);
      setLeadSources(leadSourcesData);
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

  // Calculate Sales Funnel data from opportunities
  const calculateFunnelData = () => {
    // Group opportunities by sales stage
    const stageGroups: Record<string, { count: number; value: number }> = {};

    opportunities
      .filter((opp: Opportunity) => opp.status === 'Open')
      .forEach((opp: Opportunity) => {
        const stage = opp.sales_stage;
        if (!stageGroups[stage]) {
          stageGroups[stage] = { count: 0, value: 0 };
        }
        stageGroups[stage].count += 1;
        stageGroups[stage].value += opp.opportunity_amount || 0;
      });

    // Map to funnel stages (you can customize these mappings based on your ERPNext stages)
    const funnelStages = [
      {
        name: 'PROSPECTING',
        erpStages: ['Prospecting', 'Lead'],
        color: '#3B82F6'
      },
      {
        name: 'QUALIFICATION',
        erpStages: ['Qualification', 'Qualified'],
        color: '#3B82F6'
      },
      {
        name: 'PROPOSAL',
        erpStages: ['Proposal/Price Quote', 'Proposal', 'Quote'],
        color: '#3B82F6'
      },
      {
        name: 'NEGOTIATION',
        erpStages: ['Negotiation/Review', 'Negotiation'],
        color: '#3B82F6'
      }
    ];

    const funnelData = funnelStages.map(stage => {
      let count = 0;
      let value = 0;

      stage.erpStages.forEach(erpStage => {
        if (stageGroups[erpStage]) {
          count += stageGroups[erpStage].count;
          value += stageGroups[erpStage].value;
        }
      });

      return {
        name: stage.name,
        count,
        value,
        color: stage.color
      };
    });

    // Calculate max value for width percentages
    const maxValue = Math.max(...funnelData.map(s => s.value), 1);

    // Calculate total opportunities for percentage calculation
    const totalOpportunities = funnelData.reduce((sum, stage) => sum + stage.count, 0);

    return funnelData.map(stage => ({
      ...stage,
      percentage: totalOpportunities > 0 ? (stage.count / totalOpportunities) * 100 : 0
    }));
  };

  const funnelData = calculateFunnelData();

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

      <div className="p-8 pt-0">
        {/* KPI Cards - 180px height, #1E293B background */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {/* Win Rate */}
          <Card className="bg-[#1A2233] rounded-2xl p-5 flex flex-col justify-between relative min-w-[320px] min-h-[120px]">
            <div className="flex flex-row justify-between items-start">
              <div>
                <div className="text-xs font-semibold text-gray-400 tracking-widest mb-1">WIN RATE</div>
                <div className="text-3xl font-bold text-white leading-tight">{stats.winRate.toFixed(1)}%</div>
              </div>
              <div className="mt-1">
                <TrendingUp className="h-6 w-6 text-[#3B82F6] bg-[#232B3E] rounded-full p-1" />
              </div>
            </div>
            <div className="absolute left-4 bottom-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-[#3B82F6]" />
                <span className="text-sm font-semibold text-[#3B82F6]">
                  +{stats.winRateChange.toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>

          {/* Pipeline Value */}
          <Card className="bg-[#1A2233] rounded-2xl p-5 flex flex-col justify-between relative min-w-[320px] min-h-[120px]">
            <div className="flex flex-row justify-between items-start">
              <div>
                <div className="text-xs font-semibold text-gray-400 tracking-widest mb-1">PIPELINE VALUE</div>
                <div className="text-3xl font-bold text-white leading-tight">{formatIndianCurrencyInCrores(stats.pipelineValue)}</div>
              </div>
              <div className="mt-1">
                <BarChart3 className="h-6 w-6 text-[#10B981] bg-[#232B3E] rounded-full p-1" />
              </div>
            </div>
            <div className="absolute left-4 bottom-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3 text-[9px] font-medium">
                  <span className="text-gray-400">TARGET: ₹20Cr</span>
                  <span className="text-gray-400">65% ACHIEVED</span>
                </div>
                <div className="w-48 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-[#10B981] rounded-full transition-all duration-500" style={{ width: '65%' }}></div>
                </div>
              </div>
            </div>
          </Card>

          {/* Revenue MTD */}
          <Card className="bg-[#1A2233] rounded-2xl p-5 flex flex-col justify-between relative min-w-[320px] min-h-[120px]">
            <div className="flex flex-row justify-between items-start">
              <div>
                <div className="text-xs font-semibold text-gray-400 tracking-widest mb-1">REVENUE MTD</div>
                <div className="text-3xl font-bold text-white leading-tight">{formatIndianCurrencyInCrores(stats.revenue)}</div>
              </div>
              <div className="mt-1">
                <Zap className="h-6 w-6 text-[#F59E0B] bg-[#232B3E] rounded-full p-1" />
              </div>
            </div>
            <div className="absolute left-4 bottom-4">
              <div className="flex gap-1.5">
                <div className="h-1.5 w-1.5 bg-[#F59E0B] rounded-full"></div>
                <div className="h-1.5 w-1.5 bg-[#F59E0B] rounded-full"></div>
                <div className="h-1.5 w-1.5 bg-[#F59E0B] rounded-full"></div>
                <div className="h-1.5 w-1.5 bg-gray-600 rounded-full"></div>
              </div>
            </div>
          </Card>

          {/* Active Leads */}
          <Card className="bg-[#1A2233] rounded-2xl p-5 flex flex-col justify-between relative min-w-[320px] min-h-[120px]">
            <div className="flex flex-row justify-between items-start">
              <div>
                <div className="text-xs font-semibold text-gray-400 tracking-widest mb-1">ACTIVE LEADS</div>
                <div className="text-3xl font-bold text-white leading-tight">1</div>
              </div>
              <div className="mt-1">
                <BarChart3 className="h-6 w-6 text-[#1CC9A0] bg-[#232B3E] rounded-full p-1" />
              </div>
            </div>
            <div className="absolute left-4 bottom-4">
              <span className="bg-[#232B3E] text-xs font-semibold text-white px-4 py-2 rounded-xl shadow-md tracking-widest">AI CONFIDENCE</span>
            </div>
          </Card>
        </div>

        {/* Main Content Grid - 2/3 + 1/3 */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 mb-8 items-start">
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
              <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm flex-1 min-h-[160px] flex flex-col justify-center">
                <CardHeader className="px-6 py-2 flex flex-row items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#A0AEC0]" />
                  <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wider">Sales Funnel</CardTitle>
                </CardHeader>
                <CardContent className="px-6 py-2 flex flex-col justify-center">
                  <div className="space-y-2">
                    {funnelData.map((stage, index) => (
                      <div key={stage.name}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[11px] font-bold text-gray-500 uppercase">{stage.name}</span>
                          <span className="text-[11px] font-semibold text-gray-400">
                            {formatIndianCurrency(stage.value)}
                          </span>
                        </div>
                        {/* All stages - proportional width based on percentage of total */}
                        <div className="flex items-center h-9 rounded-lg overflow-hidden">
                          <div
                            className="bg-[#3B82F6] h-full flex items-center px-3"
                            style={{ width: `${stage.percentage}%` }}
                          >
                            <span className="text-sm font-bold text-white whitespace-nowrap">{stage.count} Deals</span>
                          </div>
                          <div className="bg-gray-100 h-full" style={{ width: `${100 - stage.percentage}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Leads Source */}
              <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm flex-1 min-h-[160px] flex flex-col justify-center">
                <CardHeader className="px-6 py-2 flex flex-row items-center gap-2">
                  <Users className="h-4 w-4 text-[#A0AEC0]" />
                  <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wider">Leads Source</CardTitle>
                </CardHeader>
                <CardContent className="px-6 py-2 flex flex-row items-center justify-between">
                  {(() => {
                    // Calculate total leads
                    const totalLeads = leadSources.reduce((sum, source) => sum + source.count, 0);

                    // Color mapping for ERPNext lead sources
                    const colorMap: Record<string, string> = {
                      'Existing Customer': '#3B82F6',
                      'Reference': '#10B981',
                      'Advertisement': '#F59E0B',
                      'Cold Calling': '#8B5CF6',
                      'Exhibition': '#EC4899',
                      'Supplier Reference': '#06B6D4',
                      'Mass Mailing': '#EF4444',
                      'Customer\'s Vendor': '#14B8A6',
                      'Campaign': '#F97316',
                      'Walk In': '#84CC16',
                      'Direct': '#3B82F6',
                      'Unknown': '#6B7280'
                    };

                    // Get color for source, or use a default
                    const getColor = (source: string, index: number) => {
                      if (colorMap[source]) return colorMap[source];
                      const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];
                      return defaultColors[index % defaultColors.length];
                    };

                    // Calculate SVG arc paths
                    const radius = 70;
                    const strokeWidth = 28;
                    const circumference = 2 * Math.PI * radius;

                    let currentOffset = 0;
                    const arcs = leadSources.map((source, index) => {
                      const dashLength = (source.percentage / 100) * circumference;
                      const arc = {
                        color: getColor(source.source, index),
                        dasharray: `${dashLength} ${circumference}`,
                        dashoffset: -currentOffset
                      };
                      currentOffset += dashLength;
                      return arc;
                    });

                    return (
                      <>
                        {/* Donut Chart - Left Side */}
                        <div className="flex items-center">
                          <div className="relative">
                            <svg width="140" height="140" viewBox="0 0 180 180">
                              {arcs.map((arc, index) => (
                                <circle
                                  key={index}
                                  cx="90"
                                  cy="90"
                                  r={radius}
                                  fill="none"
                                  stroke={arc.color}
                                  strokeWidth={strokeWidth}
                                  strokeDasharray={arc.dasharray}
                                  strokeDashoffset={arc.dashoffset}
                                  transform="rotate(-90 90 90)"
                                />
                              ))}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <p className="text-2xl font-bold text-gray-900">
                                {totalLeads >= 1000 ? `${(totalLeads / 1000).toFixed(1)}k` : totalLeads}
                              </p>
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">TOTAL</p>
                            </div>
                          </div>
                        </div>

                        {/* Legend - Right Side */}
                        <div className="flex flex-col gap-2">
                          {leadSources.map((source, index) => (
                            <div key={source.source} className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: getColor(source.source, index) }}
                              ></div>
                              <span className="text-sm text-gray-700">{source.source}</span>
                              <span className="text-sm font-semibold text-gray-900 ml-auto">
                                ({source.percentage.toFixed(0)}%)
                              </span>
                            </div>
                          ))}
                          {leadSources.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">No lead source data available</p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Intelligence Hub (400px width, STICKY) */}
          <div>
            <div className="sticky top-[76px]">
              <Card className="rounded-xl border border-gray-200 bg-white min-h-0 h-full flex flex-col justify-between">
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