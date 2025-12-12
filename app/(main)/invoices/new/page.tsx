'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Loader2, ArrowLeft, Building2 } from "lucide-react"
import { createInvoice } from "@/app/actions/invoices"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface InvoiceItem {
  id: number
  item_code: string
  description: string
  hsn_sac: string
  qty: number
  rate: number
  amount: number
}

export default function NewInvoicePage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Header Fields
  const [customer, setCustomer] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState("")
  const [placeOfSupply, setPlaceOfSupply] = useState("27-Maharashtra")

  // Items State
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: 1, item_code: "", description: "", hsn_sac: "997319", qty: 1, rate: 0, amount: 0 }
  ])

  // Calculations
  const calculateRowAmount = (qty: number, rate: number) => qty * rate

  const updateItem = (id: number, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        if (field === 'qty' || field === 'rate') {
          updatedItem.amount = calculateRowAmount(updatedItem.qty, updatedItem.rate)
        }
        return updatedItem
      }
      return item
    }))
  }

  const addItem = () => {
    setItems([...items, { 
      id: Date.now(), item_code: "", description: "", hsn_sac: "", qty: 1, rate: 0, amount: 0 
    }])
  }

  const removeItem = (id: number) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id))
  }

  // Totals Logic (GST 18%)
  const subTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0)
  const cgst = subTotal * 0.09
  const sgst = subTotal * 0.09
  const grandTotal = subTotal + cgst + sgst

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const payload = {
        customer,
        posting_date: date,
        due_date: dueDate,
        items,
        // We explicitly name the tax template if ERPNext is set up for it, 
        // or let ERPNext auto-fetch taxes based on Customer Tax ID.
        // For this frontend demo, we pass the raw items.
    }

    const res = await createInvoice(payload)
    
    if (res.success) {
      router.push('/invoices')
      router.refresh()
    } else {
      alert("Error: " + res.error)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/invoices">
                <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">New GST Invoice</h1>
                <p className="text-slate-500">Create a compliant tax invoice</p>
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild><Link href="/invoices">Cancel</Link></Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Invoice
            </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Supplier & Customer Details */}
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base text-slate-500">Bill To (Customer)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Customer Name <span className="text-red-500">*</span></Label>
                        <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Search Customer..." required className="bg-yellow-50/50 border-yellow-200" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Place of Supply</Label>
                        <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="27-Maharashtra">Maharashtra (27)</SelectItem>
                                <SelectItem value="29-Karnataka">Karnataka (29)</SelectItem>
                                <SelectItem value="07-Delhi">Delhi (07)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base text-slate-500">Invoice Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Invoice Date</Label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Due Date</Label>
                            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border text-sm text-slate-600">
                        <div className="flex gap-2 items-center">
                            <Building2 className="h-4 w-4" />
                            <span className="font-semibold">ABC Equipment Rentals Pvt. Ltd.</span>
                        </div>
                        <div className="mt-1 ml-6 text-xs text-slate-500">GSTIN: 27ABCDE1234F1Z5</div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Service Details Table */}
        <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-base font-semibold">Service / Equipment Details</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="border-t">
                    <div className="grid grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-xs font-medium text-slate-500 border-b">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-4">Description / Item</div>
                        <div className="col-span-2">HSN/SAC</div>
                        <div className="col-span-1 text-right">Qty</div>
                        <div className="col-span-2 text-right">Rate (₹)</div>
                        <div className="col-span-2 text-right">Amount (₹)</div>
                    </div>

                    <div className="divide-y">
                        {items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-2 items-start hover:bg-slate-50/50 group">
                                <div className="col-span-1 pt-2 text-center text-sm text-slate-400">
                                    <span className="group-hover:hidden">{index + 1}</span>
                                    <Trash2 className="h-4 w-4 mx-auto hidden group-hover:block text-red-500 cursor-pointer" onClick={() => removeItem(item.id)} />
                                </div>
                                <div className="col-span-4 space-y-1">
                                    <Input placeholder="Item Name" value={item.item_code} onChange={(e) => updateItem(item.id, 'item_code', e.target.value)} className="h-8 text-sm font-medium" />
                                    <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="h-7 text-xs text-muted-foreground border-dashed" />
                                </div>
                                <div className="col-span-2">
                                    <Input value={item.hsn_sac} onChange={(e) => updateItem(item.id, 'hsn_sac', e.target.value)} className="h-8 text-sm" placeholder="997319" />
                                </div>
                                <div className="col-span-1">
                                    <Input type="number" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" />
                                </div>
                                <div className="col-span-2">
                                    <Input type="number" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" />
                                </div>
                                <div className="col-span-2 pt-2 text-right text-sm font-medium">
                                    ₹ {item.amount.toLocaleString('en-IN')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Footer: GST Calculation & Totals */}
        <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Bank Details</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1 text-slate-600">
                        <div className="flex justify-between"><span>Bank:</span> <span className="font-medium">HDFC Bank</span></div>
                        <div className="flex justify-between"><span>A/C No:</span> <span className="font-medium">123456789012</span></div>
                        <div className="flex justify-between"><span>IFSC:</span> <span className="font-medium">HDFC0001234</span></div>
                    </CardContent>
                </Card>
                <div className="text-xs text-slate-400 px-2">
                    Declaration: We declare that this invoice shows the actual price of the goods described and all particulars are true and correct.
                </div>
            </div>

            <Card className="bg-slate-50/50 dark:bg-slate-900/50">
                <CardContent className="p-6 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Subtotal</span>
                        <span>₹ {subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">CGST (9%)</span>
                        <span>₹ {cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">SGST (9%)</span>
                        <span>₹ {sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-3 mt-2">
                        <span className="font-bold text-lg">Grand Total</span>
                        <span className="font-bold text-xl">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-right text-xs text-slate-400 pt-1">
                        Amount in Words: (Auto-generated on save)
                    </div>
                </CardContent>
            </Card>
        </div>

      </form>
    </div>
  )
}
