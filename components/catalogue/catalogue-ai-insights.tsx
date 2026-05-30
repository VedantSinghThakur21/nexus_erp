'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Package,
  TrendingUp,
  IndianRupee,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AiScoreGauge } from '@/components/crm/ai-score-gauge'
import {
  buildCatalogueInsights,
  bookableItems,
  catalogueHealthLabel,
  catalogueHealthScore,
  outOfStockItems,
  type CatalogueItemInput,
} from '@/lib/ai/catalogue-insights'

type CatalogueAiInsightsProps = {
  items: CatalogueItemInput[]
  onViewItem?: (itemCode: string) => void
}

export function CatalogueAiInsights({ items, onViewItem }: CatalogueAiInsightsProps) {
  const heuristic = useMemo(() => buildCatalogueInsights(items), [items])
  const healthScore = useMemo(() => catalogueHealthScore(items), [items])
  const atRisk = outOfStockItems(items)[0]
  const recommended = bookableItems(items).slice(0, 3)

  const [forecastLine, setForecastLine] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (items.length === 0) return
    let cancelled = false

    void (async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/ai/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputs: {
              catalogue_summary: JSON.stringify({
                total: heuristic.summary.total,
                available: heuristic.summary.available,
                out_of_stock: heuristic.summary.outOfStock,
                top_category: heuristic.summary.topCategory,
                avg_rate: heuristic.summary.avgRate,
              }),
            },
          }),
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        const result = data.result
        if (typeof result?.executive_summary === 'string') {
          setForecastLine(result.executive_summary)
        } else if (typeof result?.forecast_growth_pct === 'number') {
          setForecastLine(
            `Demand trend ~${result.forecast_growth_pct}% · review pricing on ${heuristic.summary.topCategory || 'top categories'}.`
          )
        }
      } catch {
        // keep footer default
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [items, heuristic.summary])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-none">
      <div className="flex items-center justify-between border-b border-border bg-muted/20 p-6">
        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" />
          )}
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-foreground">
            AI Insights
          </h3>
        </div>
        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-4">
          <AiScoreGauge score={healthScore} size="sm" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">Catalogue health</p>
            <p className="text-sm font-semibold text-foreground">{catalogueHealthLabel(healthScore)}</p>
            <p className="text-[11px] text-muted-foreground">
              {heuristic.summary.total} items · {heuristic.summary.available} bookable
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
            <h4 className="mb-2 text-sm font-semibold text-foreground">{atRisk.item_name}</h4>
            <p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">
              Out of stock · {atRisk.item_group}. Restock or update availability before promoting this line.
            </p>
            {onViewItem && (
              <Button size="sm" className="w-full" onClick={() => onViewItem(atRisk.item_code)}>
                View item
              </Button>
            )}
          </div>
        )}

        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Recommended actions
          </p>
          <div className="space-y-3">
            {recommended.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No bookable items in current filter — adjust price range or restock inventory.
              </p>
            )}
            {recommended.map((item) => (
              <button
                key={item.item_code}
                type="button"
                onClick={() => onViewItem?.(item.item_code)}
                className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <Package className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    Book now — {item.item_name}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    ₹{(item.standard_rate || 0).toLocaleString('en-IN')}
                    {item.stock_qty !== null ? ' /day' : ' /session'} · {item.item_group}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-muted/20 p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Available now
          </span>
          <span className="text-xs font-bold text-emerald-600">{heuristic.summary.available}</span>
        </div>
        <p className="text-[11px] italic leading-relaxed text-muted-foreground">
          {forecastLine ||
            (heuristic.summary.avgRate > 0
              ? `Avg rate ₹${heuristic.summary.avgRate.toLocaleString('en-IN')}. Connect Dify forecast for occupancy trends.`
              : 'Scores reflect stock and booking availability from ERP data.')}
        </p>
        {heuristic.summary.outOfStock > 0 && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
            <IndianRupee className="h-3 w-3" />
            {heuristic.summary.outOfStock} item{heuristic.summary.outOfStock === 1 ? '' : 's'} need restock
          </p>
        )}
      </div>
    </div>
  )
}
