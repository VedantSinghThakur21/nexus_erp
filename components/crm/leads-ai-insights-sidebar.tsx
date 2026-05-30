'use client'

import Link from 'next/link'
import { Sparkles, AlertTriangle, Mail, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { calculateLeadScore, leadScoreLabel, leadScoreTier } from '@/lib/ai/crm-scoring'
import { AiScoreGauge } from './ai-score-gauge'

type LeadRow = {
  name: string
  lead_name: string
  email_id?: string
  mobile_no?: string
  status: string
  company_name?: string
  job_title?: string
  source?: string
  industry?: string
  aiScore?: number
}

export function LeadsAiInsightsSidebar({ leads }: { leads: LeadRow[] }) {
  const scored = leads.map((l) => ({
    ...l,
    aiScore: l.aiScore ?? calculateLeadScore(l),
  }))

  const hot = scored.filter((l) => leadScoreTier(l.aiScore) === 'hot').slice(0, 3)
  const cold = scored.filter((l) => leadScoreTier(l.aiScore) === 'cold').slice(0, 1)
  const avg =
    scored.length > 0
      ? Math.round(scored.reduce((s, l) => s + l.aiScore, 0) / scored.length)
      : 0

  const atRisk = cold[0]

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
          <AiScoreGauge score={avg} size="sm" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">Pipeline quality</p>
            <p className="text-sm font-semibold text-foreground">{leadScoreLabel(avg)}</p>
            <p className="text-[11px] text-muted-foreground">{scored.length} active leads · avg {avg}</p>
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
            <h4 className="mb-2 text-sm font-semibold text-foreground">
              {atRisk.lead_name || atRisk.company_name || atRisk.name}
            </h4>
            <p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">
              Score {atRisk.aiScore}/100 · {atRisk.status}. Enrich contact details or re-engage before this goes cold.
            </p>
            <Button size="sm" className="w-full" asChild>
              <Link href={`/crm/${encodeURIComponent(atRisk.name)}`}>View lead</Link>
            </Button>
          </div>
        )}

        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Recommended actions
          </p>
          <div className="space-y-3">
            {hot.length === 0 && (
              <p className="text-xs text-muted-foreground">No hot leads yet — scores update as data improves.</p>
            )}
            {hot.map((lead) => (
              <Link
                key={lead.name}
                href={`/crm/${encodeURIComponent(lead.name)}`}
                className="flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    Follow up — {lead.lead_name}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    AI score {lead.aiScore} · {lead.status}
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
            <TrendingUp className="h-3 w-3" /> Hot leads
          </span>
          <span className="text-xs font-bold text-emerald-600">{hot.length}</span>
        </div>
        <p className="text-[11px] italic text-muted-foreground">
          Scores blend CRM completeness and stage. Connect Dify for model-based scoring.
        </p>
      </div>
    </div>
  )
}
