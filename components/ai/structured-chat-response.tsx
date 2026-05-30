'use client'

import { AlertCircle, Download, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { AnalyticsInsight, AnalyticsResponse } from '@/lib/analyticsApi'
import { jsonToCsv, downloadCsv } from '@/utils/exportCsv'

export function getTextFromAnalyticsResponse(response: AnalyticsResponse): string {
  switch (response.type) {
    case 'table':
      return `Found ${response.rows.length} records.`
    case 'number':
      return `${response.label}: ${response.value}`
    case 'error':
      return response.message
    case 'info':
      return response.message
    default:
      return ''
  }
}

export function AnalyticsResponseRenderer({ response }: { response: AnalyticsResponse }) {
  switch (response.type) {
    case 'table':
      return <TableRenderer response={response} />
    case 'number':
      return <NumberRenderer response={response} />
    case 'error':
      return <ErrorRenderer response={response} />
    case 'info':
      return <InfoRenderer response={response} />
    default:
      return null
  }
}

function TableRenderer({ response }: { response: Extract<AnalyticsResponse, { type: 'table' }> }) {
  const handleExport = () => {
    const csv = jsonToCsv(response.columns, response.rows)
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`nexus-export-${timestamp}.csv`, csv)
  }

  return (
    <div className="space-y-2">
      {response.insight && <InsightCard insight={response.insight} />}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/40 bg-secondary/30 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {response.title ?? `${response.rows.length} record${response.rows.length !== 1 ? 's' : ''}`}
            {response.note && <span className="ml-1 text-amber-500">({response.note})</span>}
          </span>
          {response.exportable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleExport}
            >
              <Download className="h-3 w-3" />
              Export CSV
            </Button>
          )}
        </div>
        <div className="max-h-[320px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-secondary/60 dark:bg-secondary/40">
              <tr>
                {response.columns.map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap border-b border-border/30 px-3 py-2 text-left font-semibold text-muted-foreground"
                  >
                    {formatColumnHeader(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {response.rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-b border-border/20 transition-colors last:border-0 hover:bg-secondary/20"
                >
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="whitespace-nowrap px-3 py-2 text-foreground/90">
                      {formatCellValue(cell, response.columns[cellIdx])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function NumberRenderer({ response }: { response: Extract<AnalyticsResponse, { type: 'number' }> }) {
  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-blue-500/5 p-5 text-center shadow-sm">
      <div className="text-3xl font-bold tabular-nums text-foreground">
        {typeof response.value === 'number' ? response.value.toLocaleString() : response.value}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{response.label}</div>
    </div>
  )
}

function ErrorRenderer({ response }: { response: Extract<AnalyticsResponse, { type: 'error' }> }) {
  return (
    <div className="space-y-2">
      <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">{response.message}</AlertDescription>
      </Alert>
      {response.suggestions && response.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {response.suggestions.map((s, i) => (
            <Badge key={i} variant="secondary" className="text-[11px] font-normal">
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoRenderer({ response }: { response: Extract<AnalyticsResponse, { type: 'info' }> }) {
  return (
    <div className="space-y-2">
      {response.insight && <InsightCard insight={response.insight} />}
      <Alert className="border-border/40 bg-secondary/40">
        <Info className="h-4 w-4 text-muted-foreground" />
        <AlertDescription className="text-sm text-muted-foreground">{response.message}</AlertDescription>
      </Alert>
    </div>
  )
}

function InsightCard({ insight }: { insight: AnalyticsInsight }) {
  if (insight.kind === 'invoices') {
    const currency = 'INR'
    return (
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-blue-500/5 p-4 shadow-sm">
        <div className="text-sm font-semibold">Invoice insights</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {insight.unpaid_count} unpaid · {currency}{' '}
          {(insight.unpaid_amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      </div>
    )
  }
  if (insight.kind === 'sales_orders') {
    return (
      <div className="rounded-xl border border-border/60 p-4 text-sm">
        {insight.total_count} sales orders
      </div>
    )
  }
  if (insight.kind === 'customers') {
    return (
      <div className="rounded-xl border border-border/60 p-4 text-sm">
        {insight.total_count} customers
      </div>
    )
  }
  return null
}

function formatColumnHeader(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCellValue(value: unknown, column: string): string {
  if (value === null || value === undefined) return '—'
  if (
    typeof value === 'number' &&
    (column.includes('total') || column.includes('amount') || column.includes('rate') || column.includes('qty'))
  ) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }
  return String(value)
}
