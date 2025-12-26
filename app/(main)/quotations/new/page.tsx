"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, ShoppingCart, FileText, Search, Plus, X, Printer, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NewQuotationPage() {
  const router = useRouter()
  const [items, setItems] = useState([
    { id: 1, code: "LAP-PRO-15", name: "MacBook Pro 16-inch M2 Max", qty: 1, uom: "Nos", rate: 2400.00, disc: 0, amount: 2400.00 }
  ])

  const [formData, setFormData] = useState({
    customer: "",
    quotationDate: new Date().toISOString().split('T')[0],
    validUntil: "",
    leadSource: "Direct",
    currency: "USD",
    status: "Draft",
    terms: ""
  })

  const addItem = () => {
    setItems([...items, { 
      id: items.length + 1, 
      code: "", 
      name: "", 
      qty: 0, 
      uom: "Nos", 
      rate: 0, 
      disc: 0, 
      amount: 0 
    }])
  }

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id))
  }

  const netTotal = items.reduce((sum, item) => sum + item.amount, 0)
  const tax = netTotal * 0.10 // 10% tax
  const grandTotal = netTotal + tax

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/quotations">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
              New Quotation
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create a new quotation for a customer or lead.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" /> Save Draft
          </Button>
          <AnimatedButton variant="neon">
            <Printer className="h-4 w-4 mr-2" /> Submit
          </AnimatedButton>
        </div>
      </div>

      {/* Customer Information */}
      <AnimatedCard variant="glass" delay={0.1}>
        <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="customer">Customer *</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="customer"
                  placeholder="Search customer..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="quotationDate">Quotation Date</Label>
              <Input
                id="quotationDate"
                type="date"
                value={formData.quotationDate}
                onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                placeholder="mm/dd/yyyy"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="leadSource">Lead Source</Label>
              <Select defaultValue="Direct">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Direct">Direct</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Campaign">Campaign</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <div className="flex gap-2 mt-1.5">
                <Select defaultValue="USD">
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 rounded-lg">
                  Rate: 1.00
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <div className="mt-1.5">
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                  ● Draft
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Items & Pricing */}
      <AnimatedCard variant="glass" delay={0.2}>
        <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
              Items & Pricing
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan Barcode
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-3 w-12">#</th>
                  <th className="pb-3">Item Code & Description</th>
                  <th className="pb-3 w-24">Qty</th>
                  <th className="pb-3 w-24">UOM</th>
                  <th className="pb-3 w-32">Rate</th>
                  <th className="pb-3 w-24">Disc. %</th>
                  <th className="pb-3 w-32">Amount</th>
                  <th className="pb-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">{idx + 1}</td>
                    <td className="py-3">
                      <div>
                        <div className="font-medium text-sm text-blue-600 dark:text-blue-400">
                          {item.code || "LAP-PRO-15"}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {item.name || "MacBook Pro 16-inch M2 Max"}
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <Input type="number" defaultValue={item.qty} className="w-20 text-sm" />
                    </td>
                    <td className="py-3">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{item.uom}</span>
                    </td>
                    <td className="py-3">
                      <Input type="number" defaultValue={item.rate} className="w-28 text-sm" />
                    </td>
                    <td className="py-3">
                      <Input type="number" defaultValue={item.disc} className="w-20 text-sm" />
                    </td>
                    <td className="py-3">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3">
                      {idx > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 p-0 text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={8} className="py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addItem}
                      className="text-blue-600 gap-2"
                    >
                      <Plus className="h-4 w-4" /> Add Row
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </AnimatedCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Terms and Conditions */}
        <AnimatedCard variant="glass" delay={0.3}>
          <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-600" />
              Terms and Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Textarea
              placeholder="Enter terms of service, warranty details, or specific notes for this quotation..."
              rows={8}
              className="resize-none"
            />
            <div className="flex gap-2 mt-4">
              <Badge variant="outline" className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                Standard Warranty
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                Net 30 Payment
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                Delivery Terms
              </Badge>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Totals */}
        <AnimatedCard variant="glass" delay={0.4}>
          <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="text-base font-semibold">Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Net Total</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ${netTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                Discount
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">$0.00</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-slate-600 dark:text-slate-400">Tax (VAT 10%)</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">
                ${tax.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-900 dark:text-white">Grand Total</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${grandTotal.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500">Two Thousand Six Hundred and Forty Dollars</div>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4 gap-2">
              <Printer className="h-4 w-4" /> Print Preview
            </Button>
          </CardContent>
        </AnimatedCard>
      </div>
    </div>
  )
}
