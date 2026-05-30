'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  calculateOpportunityProbability,
  opportunityHealthLabel,
  opportunityInsightSummary,
} from '@/lib/ai/crm-scoring'
import { AiScoreGauge } from './ai-score-gauge'

type OpportunityAiInsightPanelProps = {
  opportunity: {
    name: string
    sales_stage?: string
    probability?: number
    opportunity_amount?: number
    expected_closing?: string
    party_name?: string
    customer_name?: string
    status?: string
  }
}

export function OpportunityAiInsightPanel({ opportunity }: OpportunityAiInsightPanelProps) {
  const heuristic = calculateOpportunityProbability(opportunity)
  const [probability, setProbability] = useState(heuristic)
  const [loading, setLoading] = useState(!opportunity.probability)
  const [source, setSource] = useState<'erp' | 'heuristic' | 'dify'>(
    opportunity.probability ? 'erp' : 'heuristic'
  )

  useEffect(() => {
    if (opportunity.status === 'Converted' || opportunity.status === 'Lost') {
      setLoading(false)
      return
    }

    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/ai/opportunity-probability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputs: {
              opportunity_data: JSON.stringify({
                name: opportunity.name,
                sales_stage: opportunity.sales_stage,
                amount: opportunity.opportunity_amount,
                expected_closing: opportunity.expected_closing,
                current_probability: opportunity.probability,
              }),
            },
          }),
        })
        if (!res.ok) return
        const data = await res.json()
        const prob = data.result?.probability
        if (!cancelled && typeof prob === 'number') {
          setProbability(Math.min(100, Math.max(0, prob)))
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
  }, [opportunity])

  const health = opportunityHealthLabel(probability)
  const healthColor =
    health === 'On Track'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
      : health === 'Stalled'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
        : 'bg-red-500/15 text-red-700 dark:text-red-400'

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          AI win probability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="relative">
            <AiScoreGauge score={probability} />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Badge className={healthColor}>{health}</Badge>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              {source === 'dify'
                ? 'AI-adjusted probability'
                : source === 'erp'
                  ? 'From ERPNext'
                  : 'Estimated from stage & timeline'}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {opportunityInsightSummary({ ...opportunity, probability })}
        </p>
      </CardContent>
    </Card>
  )
}
