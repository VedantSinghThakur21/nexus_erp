"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface AICrmInsightsProps {
  accessibleModules: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  atRiskDeals: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  highProbOpportunities: any[];
}

interface CrmInsightResult {
  executive_summary: string;
  at_risk_analysis?: {
    identified_risk_deals: string[];
    risk_factors: string[];
    recommended_mitigation: string;
  };
  opportunity_analysis?: {
    top_prospects: string[];
    key_drivers: string[];
    recommended_closing_actions: string[];
  };
}

export function AICrmInsights({
  accessibleModules,
  atRiskDeals = [],
  highProbOpportunities = []
}: AICrmInsightsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<CrmInsightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare payload for the AI
      const payload = {
        at_risk_pipeline: atRiskDeals.map(deal => ({
          customer: deal.customer_name,
          days_inactive: deal.days_since_activity,
          reason: deal.reason
        })),
        high_probability_pipeline: highProbOpportunities.map(opp => ({
          customer: opp.customer_name || opp.party_name,
          stage: opp.sales_stage,
          amount: opp.opportunity_amount,
          probability: opp.probability
        }))
      };

      const response = await fetch('/api/ai/crm-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            pipeline_data: JSON.stringify(payload)
          }
        })
      });

      let data;
      try {
        data = await response.json();
      } catch {
        // Fallback if not JSON
        throw new Error(`Failed to generate insights: ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to generate insights: ${response.statusText}`);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.result && typeof data.result === 'object') {
        setInsights(data.result);
      } else {
        throw new Error("Invalid format received from AI.");
      }
    } catch (err: unknown) {
      console.error("AI Insight generation error:", err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during AI analysis. Please verify the AI Service configuration.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = accessibleModules.includes('quotations') || accessibleModules.includes('crm');

  // Fallback UI if not generated yet
  if (!insights && !loading && !error) {
    return (
      <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl p-6 relative h-full flex flex-col w-full h-full max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500/10">
              <span className="material-symbols-outlined text-blue-400 text-xl">psychology</span>
            </span>
            <h4 className="font-bold text-base text-white tracking-wider uppercase">
              AI PIPELINE INSIGHTS
            </h4>
          </div>
          <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <span className="material-symbols-outlined text-4xl text-slate-600 mb-4">analytics</span>
          <h3 className="text-white font-semibold mb-2">Ready for Analysis</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Generate an AI-driven executive summary of your active pipeline. This analyzes at-risk deals and high-probability opportunities to recommend the best next actions.
          </p>
          
          <button 
            onClick={handleGenerateInsights}
            disabled={!hasAccess || (atRiskDeals.length === 0 && highProbOpportunities.length === 0)}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            {hasAccess ? "Generate Executive Summary" : "Access Restricted"}
          </button>
          
          {(atRiskDeals.length === 0 && highProbOpportunities.length === 0) && hasAccess && (
             <p className="text-[10px] text-amber-500/80 mt-3">Not enough CRM data to analyze.</p>
          )}
        </div>
      </div>
    );
  }

  // Loading State
  if (loading) {
     return (
        <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl p-6 relative h-full flex flex-col w-full h-full max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500/10">
                <span className="material-symbols-outlined text-blue-400 text-xl animate-pulse">psychology</span>
              </span>
              <h4 className="font-bold text-base text-white tracking-wider uppercase">
                AI PIPELINE INSIGHTS
              </h4>
            </div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
  
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-400 animate-pulse">neurology</span>
              </div>
            </div>
            <p className="text-sm font-semibold text-white animate-pulse">Analyzing Pipeline Data...</p>
            <p className="text-[10px] text-slate-500 mt-2">Evaluating risk factors & closing drivers</p>
          </div>
        </div>
      );
  }

  return (
    <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl p-5 relative h-full flex flex-col w-full h-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/10">
            <span className="material-symbols-outlined text-emerald-400 text-xl">psychology</span>
          </span>
          <h4 className="font-bold text-base text-white tracking-wider uppercase">
            AI PIPELINE INSIGHTS
          </h4>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleGenerateInsights} className="text-slate-500 hover:text-white transition" title="Refresh Insights">
                <span className="material-symbols-outlined text-sm">refresh</span>
            </button>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pb-2">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
             <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-red-400 text-sm">error</span>
                <span className="text-xs font-bold text-red-400 uppercase">Analysis Failed</span>
             </div>
             <p className="text-[11px] text-red-300/80">{error}</p>
          </div>
        ) : (
          <>
            {/* Executive Summary */}
            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
               <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                   <span className="material-symbols-outlined text-[14px]">summarize</span>
                   Executive Summary
               </h5>
               <p className="text-xs text-slate-300 leading-relaxed">
                   {insights?.executive_summary || "No executive summary available."}
               </p>
            </div>

            {/* At Risk Analysis */}
            {insights?.at_risk_analysis && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                   <span className="material-symbols-outlined text-[14px]">warning</span>
                   At-Risk Analysis
                </h5>
                <div className="mb-2">
                    <span className="text-[10px] text-slate-500 block mb-1">Risk Factors:</span>
                    <ul className="text-[11px] text-amber-200/80 list-disc pl-4 space-y-0.5">
                        {insights.at_risk_analysis.risk_factors?.map((factor: string, i: number) => <li key={i}>{factor}</li>)}
                    </ul>
                </div>
                <div className="pt-2 mt-2 border-t border-amber-500/10">
                    <span className="text-[10px] text-slate-500 block mb-1">Mitigation:</span>
                    <p className="text-[11px] text-slate-300 font-medium">
                        {insights.at_risk_analysis.recommended_mitigation}
                    </p>
                </div>
              </div>
            )}

            {/* Opportunity Analysis */}
            {insights?.opportunity_analysis && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                   <span className="material-symbols-outlined text-[14px]">trending_up</span>
                   Opportunity Drivers
                </h5>
                <div className="mb-2">
                    <span className="text-[10px] text-slate-500 block mb-1">Key Drivers:</span>
                    <ul className="text-[11px] text-emerald-200/80 list-disc pl-4 space-y-0.5">
                        {insights.opportunity_analysis.key_drivers?.map((driver: string, i: number) => <li key={i}>{driver}</li>)}
                    </ul>
                </div>
                <div className="pt-2 mt-2 border-t border-emerald-500/10">
                    <span className="text-[10px] text-slate-500 block mb-1">Recommended Actions:</span>
                    <ul className="text-[11px] text-slate-300 font-medium list-disc pl-4 space-y-0.5">
                        {insights.opportunity_analysis.recommended_closing_actions?.map((act: string, i: number) => <li key={i}>{act}</li>)}
                    </ul>
                </div>
              </div>
            )}
            
            {/* Quick Actions (fallback/static actions if needed) */}
             <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                        QUICK ACTIONS
                    </p>
                </div>
                {highProbOpportunities.slice(0, 2).map((opp, index) => {
                    const actionType = index === 0 ? "alternate_email" : "check_circle";
                    const actionColor = index === 0 ? "blue" : "emerald";
                    return (
                        <div
                            key={opp.name || index}
                            className="group flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-700"
                            onClick={() => router.push(`/crm/opportunities/${opp.name || ''}`)}
                        >
                        <div
                            className={`w-8 h-8 bg-${actionColor}-500/10 text-${actionColor}-400 flex items-center justify-center rounded-full ring-1 ring-${actionColor}-500/30 group-hover:scale-105 transition-transform shrink-0`}
                        >
                            <span className="material-symbols-outlined text-lg font-bold">
                                {actionType}
                            </span>
                        </div>
                        <div className="min-w-0 pr-2">
                            <p className="text-[12px] font-bold text-white truncate">
                                {index === 0 ? "Follow up - " : "Contract - "}
                                {((opp.customer_name || opp.party_name) || "Unknown").split(" ")[0]}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                                {index === 0
                                ? "High velocity activity."
                                : "Review is complete."}
                            </p>
                        </div>
                        </div>
                    );
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
