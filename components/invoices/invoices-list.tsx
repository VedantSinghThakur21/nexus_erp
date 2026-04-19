"use client" import { useState } from "react" import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" import { Badge } from "@/components/ui/badge" import { FileText, Download } from "lucide-react" import Link from "next/link" import { DeleteInvoiceButton } from "@/components/invoices/delete-invoice-button" interface Invoice { name: string customer_name: string due_date: string grand_total: number status: string currency: string } interface InvoicesListProps { invoices: Invoice[] totalRevenue: number } const INVOICE_STATUSES = [ { value: 'Draft', label: 'Draft', color: 'bg-secondary text-gray-700' }, { value: 'Unpaid', label: 'Unpaid', color: 'bg-yellow-100 text-yellow-800' }, { value: 'Paid', label: 'Paid', color: 'bg-green-100 text-green-800' }, { value: 'Overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' }, { value: 'Partly Paid', label: 'Partly Paid', color: 'bg-blue-100 text-blue-800' }, { value: 'Return', label: 'Return', color: 'bg-purple-100 text-purple-800' }, { value: 'Cancelled', label: 'Cancelled', color: 'bg-slate-100 text-slate-700' }, ] function getStatusColor(status: string): string { const statusObj = INVOICE_STATUSES.find(s => s.value === status) return statusObj?.color || 'bg-secondary text-gray-700' } export function InvoicesList({ invoices, totalRevenue }: InvoicesListProps) { return ( <div suppressHydrationWarning> {/* Stats Row */} <div className="grid gap-4 md:grid-cols-3" suppressHydrationWarning>
<Card>
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
<CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
<span className="text-muted-foreground">₹</span>
</CardHeader>
<CardContent>
<div className="text-2xl font-bold">₹{Number(totalRevenue ?? 0).toLocaleString('en-IN')}</div>
</CardContent>
</Card>
</div>
<Card>
<CardHeader>
<CardTitle>Recent Invoices</CardTitle>
</CardHeader>
<CardContent>
<div className="rounded-md border border-slate-200 dark:border-slate-800">
<table className="w-full text-sm">
<thead className="bg-slate-50 dark:bg-background font-medium text-muted-foreground">
<tr className="border-b border-border/60 bg-muted/30">
<th className="text-left font-medium text-muted-foreground px-4 py-3">Invoice #</th>
<th className="text-left font-medium text-muted-foreground px-4 py-3">Customer</th>
<th className="text-left font-medium text-muted-foreground px-4 py-3">Date</th>
<th className="text-left font-medium text-muted-foreground px-4 py-3">Amount</th>
<th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
<th className="text-right font-medium text-muted-foreground px-4 py-3">Actions</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-200 dark:divide-slate-800"> {invoices.length === 0 ? ( <tr>
<td colSpan={6} className="p-8 text-center text-muted-foreground"> No invoices found. Click "New Invoice" to create one. </td>
</tr> ) : ( invoices.map((inv) => ( <tr key={inv.name} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
<td className="px-4 py-3 text-foreground font-medium ">
<div className="flex items-center gap-2">
<FileText className="h-4 w-4 text-slate-400" />
<Link href={`/invoices/${inv.name}`} className="hover:underline text-blue-600 dark:text-blue-400" > {inv.name} </Link>
</div>
</td>
<td className="px-4 py-3 text-foreground ">{inv.customer_name}</td>
<td className="px-4 py-3 text-foreground ">{inv.due_date}</td>
<td className="px-4 py-3 text-foreground font-medium "> {inv.currency} {Number(inv.grand_total ?? 0).toLocaleString()} </td>
<td className="px-4 py-3 text-foreground">
<Badge className={getStatusColor(inv.status)}> {inv.status} </Badge>
</td>
<td className="px-4 py-3 text-foreground text-right flex items-center justify-end gap-2"> {/* Print Button */} <a href={`/print/invoice/${inv.name}`} target="_blank" className="p-2 text-slate-400 hover:text-blue-600 transition-colors" >
<Download className="h-4 w-4" />
</a> {/* Delete Button (Client Component) */} <DeleteInvoiceButton id={inv.name} status={inv.status} />
</td>
</tr> )) )} </tbody>
</table>
</div>
</CardContent>
</Card>
</div> ) } 