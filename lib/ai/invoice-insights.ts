import { daysFromToday, isOverdue } from '@/lib/ai/date-utils'

export type InvoiceInsightInput = {
  name: string
  customer_name: string
  grand_total: number
  status: string
  due_date?: string
  currency?: string
}

export type SalesOrderInsightInput = {
  name: string
  customer_name?: string
  customer?: string
  grand_total: number
  status: string
}

export function invoiceHealthScore(invoices: InvoiceInsightInput[]): number {
  if (invoices.length === 0) return 0
  const paid = invoices.filter((i) => i.status === 'Paid').length
  const overdue = invoices.filter((i) => isOverdue(i.due_date, i.status)).length
  const paidRatio = paid / invoices.length
  const overduePenalty = overdue / invoices.length
  return Math.min(100, Math.max(0, Math.round(paidRatio * 80 + 20 - overduePenalty * 40)))
}

export function invoiceHealthLabel(score: number): string {
  if (score >= 75) return 'Healthy collections'
  if (score >= 50) return 'Moderate risk'
  if (score > 0) return 'Collection pressure'
  return 'No invoice data'
}

export function overdueInvoices(invoices: InvoiceInsightInput[]): InvoiceInsightInput[] {
  return invoices.filter((i) => isOverdue(i.due_date, i.status))
}

export function unpaidInvoices(invoices: InvoiceInsightInput[]): InvoiceInsightInput[] {
  return invoices.filter((i) => ['Unpaid', 'Sent', 'Overdue', 'Draft'].includes(i.status))
}

export function daysOverdue(invoice: InvoiceInsightInput): number | null {
  if (!isOverdue(invoice.due_date, invoice.status)) return null
  const days = daysFromToday(invoice.due_date)
  return days === null ? null : Math.abs(days)
}
