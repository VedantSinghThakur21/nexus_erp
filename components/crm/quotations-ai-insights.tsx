'use client'

import Link from 'next/link'
import { Sparkles, AlertTriangle, FileText, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AiScoreGauge } from '@/components/crm/ai-score-gauge'
import {
  atRiskQuotations,
  expiringQuotations,
  quotationHealthLabel,
  quotationHealthScore,
  validityLabel,
  type QuotationInsightInput,
} from '@/lib/ai/quotation-insights'

export function QuotationsAiInsights({ quotations }: { quotations: QuotationInsightInput[] }) {
  const score = quotationHealthScore(quotations)
  const atRisk = atRiskQuotations(quotations)[0]
  const expiring = expiringQuotations(quotations).slice(0, 3)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-none">
      <div className="flex items-center justify-between border-b border-border bg-muted/20 p-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-foreground">AI Insights</h3>
        </div>
        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-4">
          <AiScoreGauge score={score} size="sm" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">Quote pipeline</p>
            <p className="text-sm font-semibold text-foreground">{quotationHealthLabel(score)}</p>
            <p className="text-[11px] text-muted-foreground">
              {quotations.filter((q) => ['Open', 'Sent'].includes(q.status)).length} open ·{' '}
              {quotations.length} total
            </p>
          </div>
        </div>

        {atRisk && (
          <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-tighter text-amber-600 dark:text-amber-400">
                Needs attention
              </span>
            </div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">{atRisk.name}</h4>
            <p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">
              {atRisk.customer_name || atRisk.party_name} · {validityLabel(atRisk.valid_till).text}. Follow up or renew
              before losing the deal.
            </p>
            <Button size="sm" className="w-full" asChild>
              <Link href={`/crm/quotations/${encodeURIComponent(atRisk.name)}`}>View quotation</Link>
            </Button>
          </div>
        )}

        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Recommended actions
          </p>
          <div className="space-y-3">
            {expiring.length === 0 && (
              <p className="text-xs text-muted-foreground">No quotes expiring in the next 14 days.</p>
            )}
            {expiring.map((q) => (
              <Link
                key={q.name}
                href={`/crm/quotations/${encodeURIComponent(q.name)}`}
                className="flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    Follow up — {q.customer_name || q.party_name}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {validityLabel(q.valid_till).text} · ₹{(q.grand_total || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-muted/20 p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Expiring soon
          </span>
          <span className="text-xs font-bold text-amber-600">{expiringQuotations(quotations).length}</span>
        </div>
        <p className="text-[11px] italic text-muted-foreground">
          Validity uses local dates from ERP. Connect Dify CRM for win-probability scoring.
        </p>
      </div>
    </div>
  )
}
