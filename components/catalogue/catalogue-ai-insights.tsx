'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sparkles, Loader2, ArrowRight } from 'lucide-react'
import {
  buildCatalogueInsights,
  type CatalogueItemInput,
  type CatalogueInsightAlert,
} from '@/lib/ai/catalogue-insights'

const TONE_STYLES: Record<CatalogueInsightAlert['tone'], string> = {
  info: 'border-slate-700',
  warning: 'border-amber-500/40',
  success: 'border-emerald-500/40',
}

export function CatalogueAiInsights({ items }: { items: CatalogueItemInput[] }) {
  const heuristic = useMemo(() => buildCatalogueInsights(items), [items])
  const [alerts, setAlerts] = useState(heuristic.alerts)
  const [loading, setLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [forecastNote, setForecastNote] = useState<string | null>(null)

  useEffect(() => {
    setAlerts(heuristic.alerts)
  }, [heuristic.alerts])

  useEffect(() => {
    if (items.length === 0) return
    let cancelled = false

    void (async () => {
      setLoading(true)
      try {
        const payload = {
          catalogue_summary: JSON.stringify({
            total_items: heuristic.summary.total,
            available: heuristic.summary.available,
            out_of_stock: heuristic.summary.outOfStock,
            top_category: heuristic.summary.topCategory,
            avg_rate: heuristic.summary.avgRate,
            categories: [...new Set(items.map((i) => i.item_group))],
          }),
        }
        const res = await fetch('/api/ai/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: payload }),
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        const result = data.result
        if (result?.executive_summary && typeof result.executive_summary === 'string') {
          setAlerts((prev) => [
            { title: 'Demand forecast', body: result.executive_summary, tone: 'info' as const },
            ...prev.slice(0, 2),
          ])
        } else if (typeof result?.forecast_growth_pct === 'number') {
          setAlerts((prev) => [
            {
              title: 'Demand forecast',
              body: `Occupancy trend suggests ~${result.forecast_growth_pct}% growth potential. Review pricing on high-demand categories.`,
              tone: 'info' as const,
            },
            ...prev.slice(0, 2),
          ])
        }
      } catch {
        // keep heuristic alerts
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [items, heuristic.summary])

  const handleFullReport = async () => {
    setReportLoading(true)
    setForecastNote(null)
    try {
      const res = await fetch('/api/ai/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            catalogue_data: JSON.stringify({
              items: items.map((i) => ({
                code: i.item_code,
                name: i.item_name,
                group: i.item_group,
                rate: i.standard_rate,
                available: i.available,
                stock_qty: i.stock_qty,
              })),
              summary: heuristic.summary,
            }),
          },
        }),
      })
      const data = await res.json()
      if (data.result?.executive_summary) {
        setForecastNote(data.result.executive_summary)
      } else if (data.result?.forecast_growth_pct != null) {
        setForecastNote(
          `Growth outlook: ${data.result.forecast_growth_pct}% · Confidence: ${data.result.confidence || 'medium'}. ${heuristic.summary.outOfStock} items need restock attention.`
        )
      } else {
        setForecastNote(
          `${heuristic.summary.total} items · ${heuristic.summary.available} bookable · avg ₹${heuristic.summary.avgRate.toLocaleString('en-IN')}. Focus restocking ${heuristic.summary.outOfStock} out-of-stock lines.`
        )
      }
    } catch {
      setForecastNote('Could not reach forecast service — showing catalogue summary from ERP data.')
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 shadow-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h5 className="text-[11px] font-bold uppercase tracking-widest text-slate-300">AI Intelligence</h5>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
          <Sparkles className="h-5 w-5 text-blue-400" />
        </div>
      </div>

      <div className="space-y-4">
        {alerts.map((alert, i) => (
          <div
            key={`${alert.title}-${i}`}
            className={`rounded-lg border bg-slate-900/60 p-4 ${TONE_STYLES[alert.tone]}`}
          >
            <p className="mb-1.5 text-sm font-semibold text-white">{alert.title}</p>
            <p className="text-xs leading-relaxed text-slate-300">{alert.body}</p>
          </div>
        ))}
      </div>

      {forecastNote && (
        <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
          <p className="text-xs leading-relaxed text-blue-100">{forecastNote}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleFullReport()}
        disabled={reportLoading || items.length === 0}
        className="mt-6 flex w-full items-center justify-center py-2.5 text-xs font-bold uppercase tracking-wider text-yellow-400 transition hover:text-yellow-300 disabled:opacity-50"
      >
        {reportLoading ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            Full AI Report
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </>
        )}
      </button>
    </div>
  )
}
