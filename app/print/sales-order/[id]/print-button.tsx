"use client"

import Link from "next/link"
import { Printer } from "lucide-react"

export function PrintButton({ orderId }: { orderId: string }) {
  return (
    <Link
      href={`/print/sales-order/${encodeURIComponent(orderId)}`}
      target="_blank"
      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm"
    >
      <Printer className="w-4 h-4" />
      Print Order
    </Link>
  )
}
