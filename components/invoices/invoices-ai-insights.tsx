'use client'

import Link from 'next/link'
import { Sparkles, AlertTriangle, Receipt, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AiScoreGauge } from '@/components/crm/ai-score-gauge'
import {
  invoiceHealthLabel,
  invoiceHealthScore,
  overdueInvoices,
  unpaidInvoices,
  type InvoiceInsightInput,
  type SalesOrderInsightInput,
} from '@/lib/ai/invoice-insights'

type InvoicesAiInsightsProps = {
  invoices: InvoiceInsightInput[]
  readyForInvoice?: SalesOrderInsightInput[]
}

export function InvoicesAiInsights({ invoices, readyForInvoice = [] }: InvoicesAiInsightsProps) {
  const score = invoiceHealthScore(invoices)
  const overdue = overdueInvoices(invoices)[0]
  const followUp = unpaidInvoices(invoices).slice(0, 3)
  const billNow = readyForInvoice.slice(0, 2)

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
            <p className="text-xs font-medium text-muted-foreground">Collection health</p>
            <p className="text-sm font-semibold text-foreground">{invoiceHealthLabel(score)}</p>
            <p className="text-[11px] text-muted-foreground">
              {invoices.length} invoices · {readyForInvoice.length} ready to bill
            </p>
          </div>
        </div>

        {overdue && (
          <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-tighter text-amber-600 dark:text-amber-400">
                Overdue
              </span>
            </div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">{overdue.name}</h4>
            <p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">
              {overdue.customer_name} · {overdue.status}. Send payment reminder or escalate collection.
            </p>
            <Button size="sm" className="w-full" asChild>
              <Link href={`/invoices/${encodeURIComponent(overdue.name)}`}>View invoice</Link>
            </Button>
          </div>
        )}

        {!overdue && billNow.length > 0 && (
          <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-tighter text-blue-600 dark:text-blue-400">
                Ready to bill
              </span>
            </div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">{billNow[0].name}</h4>
            <p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">
              Delivered order for {billNow[0].customer_name || billNow[0].customer} — create invoice to recognize revenue.
            </p>
            <Button size="sm" className="w-full" asChild>
              <Link href={`/invoices/new?sales_order=${encodeURIComponent(billNow[0].name)}`}>
                Create invoice
              </Link>
            </Button>
          </div>
        )}

        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Recommended actions
          </p>
          <div className="space-y-3">
            {followUp.length === 0 && billNow.length === 0 && (
              <p className="text-xs text-muted-foreground">No outstanding collection actions right now.</p>
            )}
            {followUp.map((inv) => (
              <Link
                key={inv.name}
                href={`/invoices/${encodeURIComponent(inv.name)}`}
                className="flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">Collect — {inv.customer_name}</p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {inv.status} · ₹{(inv.grand_total || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </Link>
            ))}
            {billNow.slice(overdue ? 0 : 1).map((order) => (
              <Link
                key={order.name}
                href={`/invoices/new?sales_order=${encodeURIComponent(order.name)}`}
                className="flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">Bill — {order.name}</p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {order.customer_name || order.customer}
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
            <TrendingUp className="h-3 w-3" /> Overdue
          </span>
          <span className={`text-xs font-bold ${overdueInvoices(invoices).length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {overdueInvoices(invoices).length}
          </span>
        </div>
        <p className="text-[11px] italic text-muted-foreground">
          Insights use due dates and payment status from ERP. Connect Dify risk scoring for deeper analysis.
        </p>
      </div>
    </div>
  )
}
