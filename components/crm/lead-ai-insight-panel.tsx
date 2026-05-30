'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  calculateLeadScore,
  leadInsightSummary,
  leadScoreLabel,
  leadScoreTier,
} from '@/lib/ai/crm-scoring'
import { AiScoreGauge } from './ai-score-gauge'

type LeadAiInsightPanelProps = {
  lead: {
    name: string
    lead_name: string
    status: string
    email_id?: string
    mobile_no?: string
    company_name?: string
    job_title?: string
    source?: string
    industry?: string
  }
}

export function LeadAiInsightPanel({ lead }: LeadAiInsightPanelProps) {
  const heuristic = calculateLeadScore(lead)
  const [score, setScore] = useState(heuristic)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'heuristic' | 'dify'>('heuristic')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/ai/lead-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputs: {
              leads_data: JSON.stringify([
                {
                  name: lead.name,
                  status: lead.status,
                  has_email: !!lead.email_id,
                  has_phone: !!lead.mobile_no,
                  has_company: !!lead.company_name,
                  has_job_title: !!lead.job_title,
                  source: lead.source || null,
                  industry: lead.industry || null,
                },
              ]),
            },
          }),
        })
        if (!res.ok) return
        const data = await res.json()
        const row = data.result?.scores?.[0]
        if (!cancelled && row && typeof row.score === 'number') {
          setScore(Math.min(100, Math.max(0, row.score)))
          setSource('dify')
        }
      } catch {
        // keep heuristic
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [lead])

  const tier = leadScoreTier(score)
  const tierColor =
    tier === 'hot'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
      : tier === 'warm'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
        : 'bg-red-500/15 text-red-700 dark:text-red-400'

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI lead insight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="relative">
            <AiScoreGauge score={score} />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Badge className={tierColor}>{leadScoreLabel(score)}</Badge>
            <p className="text-xs text-muted-foreground">
              {source === 'dify' ? 'Model-assisted score' : 'Smart score (CRM signals)'}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {leadInsightSummary(lead, score)}
        </p>
      </CardContent>
    </Card>
  )
}
