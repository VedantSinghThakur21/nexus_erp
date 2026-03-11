"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, ShieldCheck, Info } from "lucide-react";

export function AIRiskScore({ inspection }: { inspection: any }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateRisk = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/risk-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            inspection_data: JSON.stringify({
              status: inspection.status,
              remarks: inspection.remarks,
              type: inspection.inspection_type,
            })
          }
        })
      });

      if (!res.ok) {
        throw new Error('Failed to generate risk score');
      }

      const data = await res.json();
      setResult(data.result);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-500 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20";
    if (score >= 50) return "text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20";
    return "text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20";
  };

  const getRiskIcon = (score: number) => {
    if (score >= 80) return <AlertTriangle className="h-6 w-6 text-red-500" />;
    if (score >= 50) return <Info className="h-6 w-6 text-amber-500" />;
    return <ShieldCheck className="h-6 w-6 text-emerald-500" />;
  };

  return (
    <Card className="mt-6 border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20">
      <CardHeader className="pb-3 border-b border-indigo-50 dark:border-indigo-900/20">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
            <span className="material-symbols-outlined text-indigo-500">auto_awesome</span>
            AI Risk Assessment
          </CardTitle>
          {!result && !loading && (
            <Button 
                onClick={calculateRisk} 
                variant="outline" 
                size="sm"
                className="bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-slate-900 dark:hover:bg-indigo-950/50 dark:border-indigo-800"
            >
              Analyze Risk
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loading && (
          <div className="flex items-center justify-center p-6 text-indigo-500 gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Neural engine analyzing inspection data...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-3 border border-red-100 dark:border-red-800/50">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className={`p-5 rounded-xl border flex items-center gap-4 ${getRiskColor(result?.risk_score || 0)}`}>
               <div className="bg-white/50 dark:bg-black/20 p-3 rounded-full shadow-sm">
                 {getRiskIcon(result?.risk_score || 0)}
               </div>
               <div className="flex-1">
                 <p className="text-sm font-bold uppercase tracking-wider opacity-80 mb-1">
                    Risk Score
                 </p>
                 <div className="flex items-end gap-2">
                    <span className="text-4xl font-black leading-none">{result?.risk_score || "--"}</span>
                    <span className="text-sm font-medium pb-1 opacity-70">/ 100</span>
                 </div>
               </div>
               <Button 
                  onClick={calculateRisk} 
                  variant="ghost" 
                  size="sm"
                  className="opacity-70 hover:opacity-100"
                >
                  Re-evaluate
                </Button>
            </div>
            
            {result?.recommendation && (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-center">
                 {result.recommendation}
              </div>
            )}
            
            {result?.critical_issues && result.critical_issues.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 px-1 text-red-600 dark:text-red-400 flex items-center gap-2">
                       <AlertTriangle className="w-4 h-4" /> Detected Risk Factors
                    </h4>
                    <ul className="space-y-2">
                        {result.critical_issues.map((issue: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-lg">
                                <span className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                                {issue}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        )}
        
        {!result && !loading && !error && (
            <div className="text-center p-6">
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Click "Analyze Risk" to evaluate this inspection and surface potential issues using our AI engine.
                </p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
