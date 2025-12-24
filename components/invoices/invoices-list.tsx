"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Download } from "lucide-react"
import Link from "next/link"
import { DeleteInvoiceButton } from "@/components/invoices/delete-invoice-button"

interface Invoice {
  name: string
  customer_name: string
  due_date: string
  grand_total: number
  status: string
  currency: string
}

interface InvoicesListProps {
  invoices: Invoice[]
  totalRevenue: number
}

const INVOICE_STATUSES = [
  { value: 'Draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'Unpaid', label: 'Unpaid', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { value: 'Overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
  { value: 'Partly Paid', label: 'Partly Paid', color: 'bg-blue-100 text-blue-800' },
  { value: 'Return', label: 'Return', color: 'bg-purple-100 text-purple-800' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-slate-100 text-slate-700' },
]

function getStatusColor(status: string): string {
  const statusObj = INVOICE_STATUSES.find(s => s.value === status)
  return statusObj?.color || 'bg-gray-100 text-gray-700'
}

export function InvoicesList({ invoices, totalRevenue }: InvoicesListProps) {
  return (
    <>
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <span className="text-muted-foreground">₹</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 font-medium text-slate-500">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No invoices found. Click "New Invoice" to create one.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.name} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <Link 
                            href={`/invoices/${inv.name}`} 
                            className="hover:underline text-blue-600 dark:text-blue-400"
                          >
                            {inv.name}
                          </Link>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{inv.customer_name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{inv.due_date}</td>
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        {inv.currency} {inv.grand_total.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(inv.status)}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        {/* Print Button */}
                        <a 
                          href={`/print/invoice/${inv.name}`}
                          target="_blank"
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>

                        {/* Delete Button (Client Component) */}
                        <DeleteInvoiceButton id={inv.name} status={inv.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

