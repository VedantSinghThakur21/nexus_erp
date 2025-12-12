'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Loader2, Info } from "lucide-react"
import { createInvoice } from "@/app/actions/invoices"
import { useRouter } from "next/navigation"

interface InvoiceItem {
  id: number
  item_code: string
  description: string
  hsn_sac: string
  qty: number
  rate: number
  amount: number
}

export function CreateInvoiceSheet() {
  const [open, setOpen] = useState(false)
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
        items
    }

    const res = await createInvoice(payload)
    
    if (res.success) {
      setOpen(false)
      router.refresh()
      // Reset form
      setCustomer("")
      setItems([{ id: Date.now(), item_code: "", description: "", hsn_sac: "997319", qty: 1, rate: 0, amount: 0 }])
    } else {
      alert("Error: " + res.error)
    }
    setLoading(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-[900px] w-full bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 p-0">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center">
            <div>
                <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white">New GST Invoice</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Draft
                    </span>
                </div>
            </div>
            <Button type="submit" onClick={handleSubmit} disabled={loading} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Invoice
            </Button>
        </div>
        
        <div className="px-6 py-6 space-y-8">
          
          {/* Section 1: Customer Details */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 border-b pb-2 border-slate-100 dark:border-slate-800">Billing Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <div className="grid gap-1.5 md:col-span-2">
                    <Label htmlFor="customer" className="text-xs text-slate-500">Customer Name <span className="text-red-500">*</span></Label>
                    <Input 
                        id="customer" 
                        value={customer} 
                        onChange={(e) => setCustomer(e.target.value)} 
                        placeholder="Search Customer..." 
                        className="bg-yellow-50/50 border-yellow-200 focus-visible:ring-yellow-200 text-slate-900 dark:text-slate-100" 
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="date" className="text-xs text-slate-500">Invoice Date</Label>
                    <Input 
                        id="date" 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-slate-500">Place of Supply</Label>
                    <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                        <SelectTrigger className="h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="27-Maharashtra">Maharashtra (27)</SelectItem>
                            <SelectItem value="29-Karnataka">Karnataka (29)</SelectItem>
                            <SelectItem value="07-Delhi">Delhi (07)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="dueDate" className="text-xs text-slate-500">Due Date</Label>
                    <Input 
                        id="dueDate" 
                        type="date" 
                        value={dueDate} 
                        onChange={(e) => setDueDate(e.target.value)} 
                        className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                </div>
            </div>
          </div>

          {/* Section 2: Service Details (Items) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Service / Equipment Details</h3>
            
            <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 py-2 px-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-4">Description / Item</div>
                    <div className="col-span-2">HSN/SAC</div>
                    <div className="col-span-1 text-right">Qty</div>
                    <div className="col-span-2 text-right">Rate (₹)</div>
                    <div className="col-span-2 text-right">Amount (₹)</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-start hover:bg-slate-50/50 dark:hover:bg-slate-800/50 group">
                            <div className="col-span-1 pt-2 text-center text-sm text-slate-400">
                                <span className="group-hover:hidden">{index + 1}</span>
                                <Trash2 className="h-4 w-4 mx-auto hidden group-hover:block text-red-500 cursor-pointer" onClick={() => removeItem(item.id)} />
                            </div>
                            <div className="col-span-4 space-y-1">
                                <Input 
                                    placeholder="Item Name" 
                                    value={item.item_code} 
                                    onChange={(e) => updateItem(item.id, 'item_code', e.target.value)} 
                                    className="h-8 text-sm font-medium border-slate-200 dark:border-slate-800 bg-transparent" 
                                />
                                <Input 
                                    placeholder="Description" 
                                    value={item.description} 
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)} 
                                    className="h-7 text-xs text-muted-foreground border-dashed border-slate-200 dark:border-slate-800 bg-transparent" 
                                />
                            </div>
                            <div className="col-span-2">
                                <Input 
                                    value={item.hsn_sac} 
                                    onChange={(e) => updateItem(item.id, 'hsn_sac', e.target.value)} 
                                    className="h-8 text-sm border-slate-200 dark:border-slate-800 bg-transparent" 
                                    placeholder="997319" 
                                />
                            </div>
                            <div className="col-span-1">
                                <Input 
                                    type="number" 
                                    value={item.qty} 
                                    onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)} 
                                    className="h-8 text-sm text-right border-slate-200 dark:border-slate-800 bg-transparent" 
                                />
                            </div>
                            <div className="col-span-2">
                                <Input 
                                    type="number" 
                                    value={item.rate} 
                                    onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} 
                                    className="h-8 text-sm text-right border-slate-200 dark:border-slate-800 bg-transparent" 
                                />
                            </div>
                            <div className="col-span-2 pt-2 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                                ₹ {item.amount.toLocaleString('en-IN')}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-3">
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="text-xs h-8 gap-1">
                    <Plus className="h-3 w-3" /> Add Item
                </Button>
            </div>
          </div>

          {/* Section 3: GST Calculation */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex flex-col gap-3 max-w-sm ml-auto">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="text-slate-900 dark:text-slate-200">₹ {subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                    <span>CGST (9%)</span>
                    <span>₹ {cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                    <span>SGST (9%)</span>
                    <span>₹ {sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-3 mt-2">
                    <span className="font-bold text-slate-900 dark:text-white">Grand Total</span>
                    <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
             </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  )
}
