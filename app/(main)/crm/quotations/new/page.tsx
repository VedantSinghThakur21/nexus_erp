'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Loader2, ArrowLeft, Calendar as CalendarIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ItemSearch } from "@/components/invoices/item-search"

interface QuotationItem {
  id: number
  item_code: string
  item_name: string
  description: string
  qty: number
  rate: number
  amount: number
}

export default function NewQuotationPage() {
  const [loading, setLoading] = useState(false)
  const [prefilling, setPrefilling] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const opportunityId = searchParams.get('opportunity')

  // Header Fields
  const [quotationTo, setQuotationTo] = useState("Customer") // Customer or Lead
  const [partyName, setPartyName] = useState("")
  const [transactionDate, setTransactionDate] = useState("")
  const [validTill, setValidTill] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [orderType, setOrderType] = useState("Sales") // Sales, Maintenance, etc.
  const [opportunityReference, setOpportunityReference] = useState("")

  // Set dates on client side to avoid hydration mismatch
  useEffect(() => {
    if (!transactionDate) {
      setTransactionDate(new Date().toISOString().split('T')[0])
    }
    if (!validTill) {
      const date = new Date()
      date.setDate(date.getDate() + 30)
      setValidTill(date.toISOString().split('T')[0])
    }
  }, [])

  // Items State
  const [items, setItems] = useState<QuotationItem[]>([
    { id: 1, item_code: "", item_name: "", description: "", qty: 1, rate: 0, amount: 0 }
  ])

  // Additional Fields
  const [paymentTermsTemplate, setPaymentTermsTemplate] = useState("")
  const [termsAndConditions, setTermsAndConditions] = useState("")

  // Prefill from opportunity if provided
  useEffect(() => {
    if (opportunityId) {
      setPrefilling(true)
      fetch(`/api/opportunities/${encodeURIComponent(opportunityId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.opportunity) {
            const opp = data.opportunity
            
            // Set party info
            setQuotationTo(opp.opportunity_from === 'Customer' ? 'Customer' : 'Lead')
            setPartyName(opp.party_name || '')
            setCurrency(opp.currency || 'INR')
            setOpportunityReference(opp.name)
            
            // Set items if available
            if (opp.items && opp.items.length > 0) {
              const prefillItems = opp.items.map((item: any, index: number) => ({
                id: index + 1,
                item_code: item.item_code || '',
                item_name: item.item_name || item.item_code || '',
                description: item.description || item.item_name || '',
                qty: item.qty || 1,
                rate: item.rate || 0,
                amount: (item.qty || 1) * (item.rate || 0)
              }))
              setItems(prefillItems)
            }
          }
        })
        .catch(error => {
          console.error('Error fetching opportunity:', error)
          alert('Failed to load opportunity details')
        })
        .finally(() => setPrefilling(false))
    }
  }, [opportunityId])

  // Calculations
  const calculateRowAmount = (qty: number, rate: number) => qty * rate

  const updateItem = (id: number, field: keyof QuotationItem, value: any) => {
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
    const newId = Math.max(...items.map(i => i.id), 0) + 1
    setItems([...items, { id: newId, item_code: "", item_name: "", description: "", qty: 1, rate: 0, amount: 0 }])
  }

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  // Totals
  const netTotal = items.reduce((sum, item) => sum + item.amount, 0)
  const taxRate = 0.18 // 18% GST
  const totalTaxes = netTotal * taxRate
  const grandTotal = netTotal + totalTaxes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!partyName) {
      alert(`Please select a ${quotationTo.toLowerCase()}`)
      return
    }

    if (items.some(item => !item.item_code || item.qty <= 0 || item.rate < 0)) {
      alert('Please fill in all item details with valid quantity and rate')
      return
    }

    setLoading(true)

    try {
      const quotationData = {
        quotation_to: quotationTo,
        party_name: partyName,
        transaction_date: transactionDate,
        valid_till: validTill,
        currency: currency,
        order_type: orderType,
        opportunity: opportunityReference || undefined,
        items: items.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name || item.item_code,
          description: item.description || item.item_name || item.item_code,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount
        })),
        payment_terms_template: paymentTermsTemplate || undefined,
        terms: termsAndConditions || undefined
      }

      const response = await fetch('/api/quotations/create-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create quotation')
      }

      const result = await response.json()
      
      if (result.quotation?.name) {
        router.push(`/crm/quotations/${encodeURIComponent(result.quotation.name)}`)
      } else {
        router.push('/crm/quotations')
      }
    } catch (error: any) {
      console.error('Error creating quotation:', error)
      alert(error.message || 'Failed to create quotation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/crm/quotations">
            <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600 mb-4">
              <ArrowLeft className="h-4 w-4" /> Back to Quotations
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {opportunityId ? 'Create Quotation from Opportunity' : 'Create New Quotation'}
          </h1>
          <p className="text-slate-500 mt-1">
            {opportunityId 
              ? `Creating quotation for opportunity ${opportunityId}` 
              : 'Fill in the details below to create a new quotation'}
          </p>
        </div>

        {prefilling && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading opportunity details...</span>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer/Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer / Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quotationTo">Quotation To *</Label>
                <Select value={quotationTo} onValueChange={setQuotationTo} disabled={!!opportunityId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer">Customer</SelectItem>
                    <SelectItem value="Lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="partyName">{quotationTo} Name *</Label>
                <Input
                  id="partyName"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder={`Enter ${quotationTo.toLowerCase()} name`}
                  disabled={!!opportunityId}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transactionDate">Transaction Date *</Label>
                <Input
                  id="transactionDate"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="validTill">Valid Till *</Label>
                <Input
                  id="validTill"
                  type="date"
                  value={validTill}
                  onChange={(e) => setValidTill(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="orderType">Order Type</Label>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Shopping Cart">Shopping Cart</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Button type="button" onClick={addItem} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border-t">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-xs font-medium text-slate-500 border-b">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-4">Item / Description</div>
                  <div className="col-span-1 text-right">Qty *</div>
                  <div className="col-span-2 text-right">Rate *</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-2"></div>
                </div>

                {/* Item Rows */}
                <div className="divide-y">
                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-2 items-start hover:bg-slate-50/50 dark:hover:bg-slate-900/50 group">
                      <div className="col-span-1 pt-2 text-center text-sm text-slate-400">
                        <span className="group-hover:hidden">{index + 1}</span>
                        <Trash2 
                          className="h-4 w-4 mx-auto hidden group-hover:block text-red-500 cursor-pointer" 
                          onClick={() => removeItem(item.id)} 
                        />
                      </div>
                      <div className="col-span-4 space-y-1">
                        <div className="h-8">
                          <ItemSearch
                            value={item.item_code}
                            onChange={(code, desc) => {
                              updateItem(item.id, 'item_code', code)
                              updateItem(item.id, 'item_name', code)
                              if (desc) updateItem(item.id, 'description', desc)
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
                      <div className="col-span-1">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.qty}
                          onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm text-right"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm text-right"
                          required
                        />
                      </div>
                      <div className="col-span-2 pt-2 text-right text-sm font-medium">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </div>
                      <div className="col-span-2"></div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-6 border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-80 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Net Total:</span>
                        <span className="font-medium">₹{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Taxes (18% GST):</span>
                        <span className="font-medium">₹{totalTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Grand Total:</span>
                        <span className="text-slate-900 dark:text-white">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="paymentTerms">Payment Terms Template</Label>
                <Input
                  id="paymentTerms"
                  value={paymentTermsTemplate}
                  onChange={(e) => setPaymentTermsTemplate(e.target.value)}
                  placeholder="e.g., Net 30, 50% Advance"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="terms">Terms and Conditions</Label>
                <Textarea
                  id="terms"
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Enter terms and conditions..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Link href="/crm/quotations">
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Quotation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
