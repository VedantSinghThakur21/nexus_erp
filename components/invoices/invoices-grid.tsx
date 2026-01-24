"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import Link from "next/link";
import { DeleteInvoiceButton } from "@/components/invoices/delete-invoice-button";

interface Invoice {
  name: string;
  customer_name: string;
  due_date: string;
  grand_total: number;
  status: string;
  currency: string;
}

interface InvoicesGridProps {
  invoices: Invoice[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function InvoicesGrid({ invoices, page, pageSize, total, onPageChange }: InvoicesGridProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {invoices.map((inv) => (
          <Card key={inv.name} className="flex flex-col justify-between h-full">
            <CardContent className="p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-slate-400" />
                <Link href={`/invoices/${inv.name}`} className="font-semibold text-blue-700 dark:text-blue-300 hover:underline">
                  {inv.name}
                </Link>
                <Badge className="ml-auto">{inv.status}</Badge>
              </div>
              <div className="text-slate-700 dark:text-slate-200 font-medium">{inv.customer_name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Due: {inv.due_date}</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-2">{inv.currency} {Number(inv.grand_total ?? 0).toLocaleString()}</div>
              <div className="flex gap-2 mt-3">
                <a href={`/print/invoice/${inv.name}`} target="_blank" className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                  <Download className="h-4 w-4" />
                </a>
                <DeleteInvoiceButton id={inv.name} status={inv.status} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-50"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="mx-2 text-sm">Page {page} of {totalPages}</span>
        <button
          className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-50"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
