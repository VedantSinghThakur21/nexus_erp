'use client'

import { useState, useEffect } from "react"
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
import { createInvoice, getCompanyDetails, getBankDetails, getCustomerDetails } from "@/app/actions/invoices"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CustomerSearch } from "@/components/invoices/customer-search"
import { ItemSearch } from "@/components/invoices/item-search"

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
  const [taxTemplate, setTaxTemplate] = useState("In State GST") // Default Tax Template
  
  // Dynamic Data State
  const [companyInfo, setCompanyInfo] = useState<{ name: string, gstin: string } | null>(null)
  const [bankInfo, setBankInfo] = useState<{ bank: string, bank_account_no: string, branch_code: string } | null>(null)
  const [customerDetails, setCustomerDetails] = useState<{ tax_id?: string, primary_address?: string } | null>(null)

  // Items State
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: 1, item_code: "", description: "", hsn_sac: "997319", qty: 1, rate: 0, amount: 0 }
  ])

  // Fetch Initial Data (Company & Bank)
  useEffect(() => {
    getCompanyDetails().then(data => {
        if (data) setCompanyInfo(data)
    })
    
    getBankDetails().then(data => {
        if (data) setBankInfo(data)
    })
  }, [])

  // Fetch Customer Data when selected
  useEffect(() => {
    if (customer) {
        getCustomerDetails(customer).then(data => {
            if (data) setCustomerDetails(data)
        })
    } else {
        setCustomerDetails(null)
    }
  }, [customer])

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

  // Totals Logic (Visual Estimate Only)
  // Real calculation happens in ERPNext based on the Tax Template selected
  const subTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0)
  // Assume 18% for visual feedback if template is GST
  const taxRate = taxTemplate.includes("GST") ? 0.18 : 0
  const taxAmount = subTotal * taxRate
  const grandTotal = subTotal + taxAmount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const payload = {
        customer,
        posting_date: date,
        due_date: dueDate,
        items,
        taxes_and_charges: taxTemplate // Pass the selected template to backend
    }

    const res = await createInvoice(payload)
    
    if (res.success && res.name) {
      router.push(`/invoices/${res.name}`)
      router.refresh()
    } else {
      alert("Error: " + (res.error || "Unknown error"))
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6" suppressHydrationWarning>
      {/* Top Bar */}
      <div className="flex items-center justify-between" suppressHydrationWarning>
        <div className="flex items-center gap-4" suppressHydrationWarning>
            <Link href="/invoices">
                <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div suppressHydrationWarning>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">New GST Invoice</h1>
                <p className="text-slate-500">Create a compliant tax invoice</p>
            </div>
        </div>
        <div className="flex gap-2" suppressHydrationWarning>
            <Button variant="outline" asChild><Link href="/invoices">Cancel</Link></Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Invoice
            </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Supplier & Customer Details */}
        <div className="grid md:grid-cols-2 gap-6 items-start" suppressHydrationWarning>
            <Card className="h-full flex flex-col">
                <CardHeader className="pb-2"><CardTitle className="text-base text-slate-500">Bill To (Customer)</CardTitle></CardHeader>
                <CardContent className="space-y-4 flex-1">
                    <div className="grid gap-2" suppressHydrationWarning>
                        <Label>Customer Name <span className="text-red-500">*</span></Label>
                        <CustomerSearch value={customer} onChange={setCustomer} />
                        
                        {/* Dynamic Customer Info */}
                        {customerDetails ? (
                            <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-100 space-y-1" suppressHydrationWarning>
                                {customerDetails.tax_id && <p><strong>GSTIN:</strong> {customerDetails.tax_id}</p>}
                                {customerDetails.primary_address ? (
                                    <p className="whitespace-pre-wrap">{customerDetails.primary_address}</p>
                                ) : (
                                    <p className="italic text-slate-400">No primary address found.</p>
                                )}
                            </div>
                        ) : (
                            <div className="mt-2 h-16 bg-slate-50/50 rounded border border-dashed border-slate-100 flex items-center justify-center text-xs text-slate-400" suppressHydrationWarning>
                                Customer details will appear here
                            </div>
                        )}
                    </div>
                    <div className="grid gap-2" suppressHydrationWarning>
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

            <Card className="h-full flex flex-col">
                <CardHeader className="pb-2"><CardTitle className="text-base text-slate-500">Invoice Details</CardTitle></CardHeader>
                <CardContent className="space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-4" suppressHydrationWarning>
                        <div className="grid gap-2" suppressHydrationWarning>
                            <Label>Invoice Date</Label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2" suppressHydrationWarning>
                            <Label>Due Date</Label>
                            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </div>
                    </div>
                    
                    {/* Tax Template Selection */}
                    <div className="grid gap-2" suppressHydrationWarning>
                        <Label>Tax Template</Label>
                        <Select value={taxTemplate} onValueChange={setTaxTemplate}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="In State GST">In State GST (18%)</SelectItem>
                                <SelectItem value="Out of State GST">Out of State GST (18%)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* DYNAMIC COMPANY DETAILS */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border text-sm text-slate-600 flex-1" suppressHydrationWarning>
                        <div className="flex gap-2 items-center mb-2" suppressHydrationWarning>
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {companyInfo?.name || "Loading Company..."}
                            </span>
                        </div>
                        <div className="ml-6 space-y-1" suppressHydrationWarning>
                             <p className="text-xs text-slate-500">GSTIN: {companyInfo?.gstin || "Not Set"}</p>
                        </div>
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
                <div className="border-t" suppressHydrationWarning>
                    <div className="grid grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-xs font-medium text-slate-500 border-b" suppressHydrationWarning>
                        <div className="col-span-1 text-center" suppressHydrationWarning>#</div>
                        <div className="col-span-4" suppressHydrationWarning>Description / Item</div>
                        <div className="col-span-2" suppressHydrationWarning>HSN/SAC</div>
                        <div className="col-span-1 text-right" suppressHydrationWarning>Qty</div>
                        <div className="col-span-2 text-right" suppressHydrationWarning>Rate (₹)</div>
                        <div className="col-span-2 text-right" suppressHydrationWarning>Amount (₹)</div>
                    </div>

                    <div className="divide-y" suppressHydrationWarning>
                        {items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-2 items-start hover:bg-slate-50/50 group" suppressHydrationWarning>
                                <div className="col-span-1 pt-2 text-center text-sm text-slate-400" suppressHydrationWarning>
                                    <span className="group-hover:hidden">{index + 1}</span>
                                    <Trash2 className="h-4 w-4 mx-auto hidden group-hover:block text-red-500 cursor-pointer" onClick={() => removeItem(item.id)} />
                                </div>
                                <div className="col-span-4 space-y-1" suppressHydrationWarning>
                                    {/* Using ItemSearch Component Here */}
                                    <div className="h-8" suppressHydrationWarning>
                                        <ItemSearch 
                                            value={item.item_code} 
                                            onChange={(code, desc) => {
                                                updateItem(item.id, 'item_code', code)
                                                if(desc) updateItem(item.id, 'description', desc)
                                            }} 
                                        />
                                    </div>
                                    <Input 
                                        placeholder="Description" 
                                        value={item.description} 
                                        onChange={(e) => updateItem(item.id, 'description', e.target.value)} 
                                        className="h-7 text-xs text-muted-foreground border-dashed border-slate-200 dark:border-slate-800 bg-transparent" 
                                    />
                                </div>
                                <div className="col-span-2" suppressHydrationWarning>
                                    <Input value={item.hsn_sac} onChange={(e) => updateItem(item.id, 'hsn_sac', e.target.value)} className="h-8 text-sm" placeholder="997319" />
                                </div>
                                <div className="col-span-1" suppressHydrationWarning>
                                    <Input type="number" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" />
                                </div>
                                <div className="col-span-2" suppressHydrationWarning>
                                    <Input type="number" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" />
                                </div>
                                <div className="col-span-2 pt-2 text-right text-sm font-medium" suppressHydrationWarning>
                                    ₹ {item.amount.toLocaleString('en-IN')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Footer: GST Calculation & Totals */}
        <div className="grid md:grid-cols-2 gap-8 items-start" suppressHydrationWarning>
            <div className="space-y-6" suppressHydrationWarning>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Bank Details</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1 text-slate-600">
                        {/* DYNAMIC BANK DETAILS */}
                        {bankInfo ? (
                            <>
                                <div className="flex justify-between" suppressHydrationWarning><span>Bank:</span> <span className="font-medium">{bankInfo.bank}</span></div>
                                <div className="flex justify-between" suppressHydrationWarning><span>A/C No:</span> <span className="font-medium">{bankInfo.bank_account_no}</span></div>
                                <div className="flex justify-between" suppressHydrationWarning><span>IFSC:</span> <span className="font-medium">{bankInfo.branch_code || "—"}</span></div>
                            </>
                        ) : (
                            <div className="text-slate-400 italic" suppressHydrationWarning>No default bank account set.</div>
                        )}
                    </CardContent>
                </Card>
                <div className="text-xs text-slate-400 px-2" suppressHydrationWarning>
                    Declaration: We declare that this invoice shows the actual price of the goods described and all particulars are true and correct.
                </div>
            </div>

            <Card className="bg-slate-50/50 dark:bg-slate-900/50">
                <CardContent className="p-6 space-y-3">
                    <div className="flex justify-between text-sm" suppressHydrationWarning>
                        <span className="text-slate-500">Subtotal</span>
                        <span>₹ {subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {/* Visual representation of taxes */}
                    <div className="flex justify-between text-sm" suppressHydrationWarning>
                        <span className="text-slate-500">Tax ({taxTemplate})</span>
                        <span>₹ {taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-3 mt-2" suppressHydrationWarning>
                        <span className="font-bold text-lg">Grand Total</span>
                        <span className="font-bold text-xl">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-right text-xs text-slate-400 pt-1" suppressHydrationWarning>
                        Amount in Words: (Auto-generated on save)
                    </div>
                </CardContent>
            </Card>
        </div>

      </form>
    </div>
  )
}
