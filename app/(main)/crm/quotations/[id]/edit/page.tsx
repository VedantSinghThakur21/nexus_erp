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
import { Plus, Trash2, Loader2, ArrowLeft, Building2 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ItemSearch } from "@/components/invoices/item-search"
import { getTaxTemplates, getTaxTemplate } from "@/app/actions/settings"
import { getCompanyDetails, getBankDetails } from "@/app/actions/crm"

interface QuotationItem {
  id: number
  item_code: string
  item_name: string
  description: string
  qty: number
  rate: number
  amount: number
}

export default function EditQuotationPage() {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const router = useRouter()
  const params = useParams()
  const quotationId = decodeURIComponent(params.id as string)

  // Header Fields
  const [quotationTo, setQuotationTo] = useState("Customer")
  const [partyName, setPartyName] = useState("")
  const [transactionDate, setTransactionDate] = useState("")
  const [validTill, setValidTill] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [orderType, setOrderType] = useState("Sales")
  const [opportunityReference, setOpportunityReference] = useState("")

  // Items State
  const [items, setItems] = useState<QuotationItem[]>([
    { id: 1, item_code: "", item_name: "", description: "", qty: 1, rate: 0, amount: 0 }
  ])

  // Additional Fields
  const [paymentTermsTemplate, setPaymentTermsTemplate] = useState("")
  const [termsAndConditions, setTermsAndConditions] = useState("")
  const [taxTemplate, setTaxTemplate] = useState("")
  const [availableTaxTemplates, setAvailableTaxTemplates] = useState<Array<{name: string, title: string}>>([])
  const [selectedTaxTemplateDetails, setSelectedTaxTemplateDetails] = useState<any>(null)
  // Company and Bank Info (for display only)
  const [companyInfo, setCompanyInfo] = useState<{ name: string, gstin: string } | null>(null)
  const [bankInfo, setBankInfo] = useState<{ bank: string, bank_account_no: string, branch_code: string } | null>(null)
  // Fetch tax templates, company details, and bank details on mount
  useEffect(() => {
    getTaxTemplates().then(templates => {
      setAvailableTaxTemplates(templates)
    })
    
    getCompanyDetails().then(data => {
      if (data) setCompanyInfo(data)
    })
    
    getBankDetails().then(data => {
      if (data) setBankInfo(data)
    })
  }, [])

  // Fetch selected tax template details when template changes
  useEffect(() => {
    if (taxTemplate && taxTemplate !== 'none') {
      getTaxTemplate(taxTemplate).then(details => {
        setSelectedTaxTemplateDetails(details)
      })
    } else {
      setSelectedTaxTemplateDetails(null)
    }
  }, [taxTemplate])

  // Fetch existing quotation data
  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const response = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}`)
        const data = await response.json()
        
        if (data.quotation) {
          const q = data.quotation
          
          // Set header fields
          setQuotationTo(q.quotation_to || 'Customer')
          setPartyName(q.party_name || '')
          setTransactionDate(q.transaction_date || new Date().toISOString().split('T')[0])
          setValidTill(q.valid_till || '')
          setCurrency(q.currency || 'INR')
          setOrderType(q.order_type || 'Sales')
          setOpportunityReference(q.opportunity || '')
          
          // Set items
          if (q.items && q.items.length > 0) {
            const loadedItems = q.items.map((item: any, index: number) => ({
              id: index + 1,
              item_code: item.item_code || '',
              item_name: item.item_name || item.item_code || '',
              description: item.description || item.item_name || '',
              qty: item.qty || 1,
              rate: item.rate || 0,
              amount: (item.qty || 1) * (item.rate || 0)
            }))
            setItems(loadedItems)
          }
          
          // Set additional fields
          setPaymentTermsTemplate(q.payment_terms_template || '')
          setTermsAndConditions(q.terms || '')
          setTaxTemplate(q.taxes_and_charges || '')
        }
      } catch (error) {
        console.error('Error fetching quotation:', error)
        alert('Failed to load quotation data')
      } finally {
        setFetching(false)
      }
    }
    
    fetchQuotation()
  }, [quotationId])

  // Calculate totals
  const netTotal = items.reduce((sum, item) => sum + item.amount, 0)
  
  // Calculate taxes dynamically based on selected template
  const totalTaxes = selectedTaxTemplateDetails?.taxes?.reduce((sum: number, tax: any) => {
    return sum + (netTotal * (tax.rate || 0) / 100)
  }, 0) || 0
  
  const grandTotal = netTotal + totalTaxes

  // Item management functions
  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1
    setItems([...items, { id: newId, item_code: "", item_name: "", description: "", qty: 1, rate: 0, amount: 0 }])
  }

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: number, field: keyof QuotationItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        // Recalculate amount when qty or rate changes
        if (field === 'qty' || field === 'rate') {
          updatedItem.amount = updatedItem.qty * updatedItem.rate
        }
        return updatedItem
      }
      return item
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate items
      const validItems = items.filter(item => 
        (item.item_code || item.description) && item.qty > 0
      )

      if (validItems.length === 0) {
        alert('Please add at least one item with a valid item code/description and quantity')
        setLoading(false)
        return
      }

      // Prepare quotation data
      const quotationData = {
        quotation_to: quotationTo,
        party_name: partyName,
        transaction_date: transactionDate,
        valid_till: validTill,
        currency: currency,
        order_type: orderType,
        items: validItems.map(item => ({
          item_code: item.item_code || undefined,
          item_name: item.item_name || item.item_code,
          description: item.description || item.item_name || item.item_code,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount
        }))
      }

      // Add optional fields only if they have values
      if (paymentTermsTemplate && paymentTermsTemplate.trim()) {
        quotationData.payment_terms_template = paymentTermsTemplate.trim()
      }
      
      if (termsAndConditions && termsAndConditions.trim()) {
        quotationData.terms = termsAndConditions.trim()
      }
      
      if (opportunityReference && opportunityReference.trim()) {
        quotationData.opportunity = opportunityReference.trim()
      }

      if (taxTemplate && taxTemplate.trim() !== '' && taxTemplate !== 'none') {
        quotationData.taxes_and_charges = taxTemplate
      }

      // Send update request
      const response = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update quotation')
      }

      alert('✅ Quotation updated successfully!')
      router.push(`/crm/quotations/${encodeURIComponent(quotationId)}`)
    } catch (error: any) {
      console.error('Error updating quotation:', error)
      
      // Parse error message for better user feedback
      const errorMessage = error.message || 'Failed to update quotation'
      
      if (errorMessage.includes('Party')) {
        alert(`❌ Error: ${errorMessage}\n\nThe customer/lead specified does not exist in ERPNext. Please create it first or use an existing party name.`)
      } else if (errorMessage.includes('Payment Terms')) {
        alert(`❌ Error: ${errorMessage}\n\nThe payment terms template does not exist in ERPNext. Please leave it blank or use an existing template.`)
      } else {
        alert(`❌ ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading quotation data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/crm/quotations/${encodeURIComponent(quotationId)}`}>
            <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600 mb-4">
              <ArrowLeft className="h-4 w-4" /> Back to Quotation
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Edit Quotation: {quotationId}
          </h1>
          <p className="text-slate-500 mt-1">
            Update the quotation details below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer / Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer / Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quotationTo">Quotation To *</Label>
                <Select value={quotationTo} onValueChange={setQuotationTo}>
                  <SelectTrigger id="quotationTo">
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
                <Label htmlFor="currency">Currency *</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="orderType">Order Type</Label>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger id="orderType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Shopping Cart">Shopping Cart</SelectItem>
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
                      
                      {/* Dynamic tax breakdown */}
                      {selectedTaxTemplateDetails?.taxes && selectedTaxTemplateDetails.taxes.length > 0 ? (
                        <>
                          {selectedTaxTemplateDetails.taxes.map((tax: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-slate-400">{tax.description || tax.account_head} ({tax.rate}%):</span>
                              <span className="font-medium">₹{(netTotal * (tax.rate || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total Taxes:</span>
                            <span className="font-medium">₹{totalTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      ) : taxTemplate && taxTemplate !== 'none' ? (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Taxes (Loading...):</span>
                          <span className="font-medium">₹{totalTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      ) : null}
                      
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

          {/* Company & Bank Information (Read-only Display) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company & Bank Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">Company Details</Label>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-base">{companyInfo?.name || "Loading Company..."}</p>
                  <p className="text-xs text-slate-500">GSTIN: {companyInfo?.gstin || "Not Set"}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">Bank Details</Label>
                {bankInfo ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span>Bank:</span> <span className="font-medium">{bankInfo.bank}</span></div>
                    <div className="flex justify-between"><span>A/C No:</span> <span className="font-medium">{bankInfo.bank_account_no}</span></div>
                    <div className="flex justify-between"><span>IFSC:</span> <span className="font-medium">{bankInfo.branch_code || "—"}</span></div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Loading bank information...</p>
                )}
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
                <Label htmlFor="taxTemplate">Tax Template</Label>
                <Select value={taxTemplate} onValueChange={setTaxTemplate}>
                  <SelectTrigger id="taxTemplate">
                    <SelectValue placeholder="Select tax template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableTaxTemplates.map(template => (
                      <SelectItem key={template.name} value={template.name}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            <Link href={`/crm/quotations/${encodeURIComponent(quotationId)}`}>
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Updating...' : 'Update Quotation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
