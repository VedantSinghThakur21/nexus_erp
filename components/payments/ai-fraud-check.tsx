"use client";

import { useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck, Shield } from "lucide-react";

export function AIFraudCheck({ payment }: { payment: any }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkFraud = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch('/api/ai/fraud-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            payment_data: JSON.stringify({
              amount: payment.paid_amount || payment.received_amount || 0,
              type: payment.payment_type,
              party: payment.party_name,
              mode: payment.mode_of_payment
            })
          }
        })
      });

      if (!res.ok) {
        throw new Error('Failed to generate fraud check');
      }

      const data = await res.json();
      setResult(data.result);
    } catch (err: any) {
      console.error(err);
      setResult({ status: 'ERROR', confidence: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded border bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
        <Loader2 className="h-3 w-3 animate-spin mr-1" /> ANALYZING
      </span>
    );
  }

  if (result) {
    const isSuspicious = result.status === 'SUSPICIOUS' || result.risk_level === 'HIGH';
    const isError = result.status === 'ERROR';

    if (isError) {
        return (
            <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded border bg-red-50 text-red-500 border-red-200 dark:bg-red-500/10 dark:border-red-500/20" title="AI Verification Failed">
              <ShieldAlert className="h-3 w-3 mr-1" /> FAILED
            </span>
        );
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded border ${
        isSuspicious 
          ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' 
          : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
      }`} title={`Confidence: ${result.confidence || 99}%`}>
        {isSuspicious ? <ShieldAlert className="h-3 w-3 mr-1" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
        {isSuspicious ? 'FLAGGED' : 'VERIFIED'}
      </span>
    );
  }

  // Initial State
  return (
    <button 
      onClick={checkFraud}
      className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded border bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 transition-colors dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30 dark:hover:bg-indigo-500/20"
    >
      <Shield className="h-3 w-3 mr-1" /> CHECK
    </button>
  );
}
