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
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Loader2, ArrowLeft, Building2, ChevronDown, ChevronUp } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ItemSearch } from "@/components/invoices/item-search"
import { getTaxTemplates, getTaxTemplate } from "@/app/actions/settings"
import { getCompanyDetails, getBankDetails } from "@/app/actions/crm"
import { Switch } from "@/components/ui/switch"
import { RentalPricingForm } from "@/components/crm/rental-pricing-form"
import { RentalPricingBreakdown } from "@/components/crm/rental-pricing-breakdown"
import { RentalItem, RentalPricingComponents, calculateTotalRentalCost, calculateRentalDuration } from "@/types/rental-pricing"

interface QuotationItem {
  id: number
  item_code: string
  item_name: string
  description: string
  item_category?: string
  
  // Standard pricing
  qty: number
  rate: number
  amount: number
  
  // Rental pricing fields
  is_rental?: boolean
  rental_type?: 'hours' | 'days' | 'months'
  rental_duration?: number
  rental_start_date?: string
  rental_end_date?: string
  rental_start_time?: string
  rental_end_time?: string
  requires_operator?: boolean
  operator_included?: boolean
  operator_name?: string
  pricing_components?: RentalPricingComponents
  total_rental_cost?: number
}

export default function EditQuotationPage() {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const router = useRouter()
  const params = useParams()
  const quotationId = decodeURIComponent(params.id as string)

  // Rental mode state
  const [isRentalMode, setIsRentalMode] = useState(false)
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null)

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
    { 
      id: 1, 
      item_code: "", 
      item_name: "", 
      description: "", 
      qty: 1, 
      rate: 0, 
      amount: 0,
      is_rental: false,
      pricing_components: {
        base_cost: 0,
        accommodation_charges: 0,
        usage_charges: 0,
        fuel_charges: 0,
        elongation_charges: 0,
        risk_charges: 0,
        commercial_charges: 0,
        incidental_charges: 0,
        other_charges: 0,
      }
    }
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
            const loadedItems = q.items.map((item: any, index: number) => {
              // Parse rental data
              const rentalData = item.custom_rental_data ? 
                (typeof item.custom_rental_data === 'string' ? JSON.parse(item.custom_rental_data) : item.custom_rental_data) : 
                null
              
              const isRental = item.custom_is_rental || item.is_rental || false
              
              return {
                id: index + 1,
                item_code: item.item_code || '',
                item_name: item.item_name || item.item_code || '',
                description: item.description || item.item_name || '',
                item_category: item.item_group,
                qty: item.qty || 1,
                rate: item.rate || 0,
                amount: (item.qty || 1) * (item.rate || 0),
                is_rental: isRental,
                rental_type: item.custom_rental_type || item.rental_type,
                rental_duration: item.custom_rental_duration || item.rental_duration,
                rental_start_date: item.custom_rental_start_date || item.rental_start_date,
                rental_end_date: item.custom_rental_end_date || item.rental_end_date,
                rental_start_time: item.custom_rental_start_time || item.rental_start_time,
                rental_end_time: item.custom_rental_end_time || item.rental_end_time,
                operator_included: item.custom_operator_included || item.operator_included || false,
                total_rental_cost: item.custom_total_rental_cost || item.total_rental_cost || 0,
                pricing_components: rentalData ? {
                  base_cost: rentalData.baseRentalCost || 0,
                  accommodation_charges: rentalData.accommodationCost || 0,
                  usage_charges: rentalData.usageCost || 0,
                  fuel_charges: rentalData.fuelCost || 0,
                  elongation_charges: rentalData.elongationCost || 0,
                  risk_charges: rentalData.riskCost || 0,
                  commercial_charges: rentalData.commercialCost || 0,
                  incidental_charges: rentalData.incidentalCost || 0,
                  other_charges: rentalData.otherCost || 0,
                } : {
                  base_cost: 0,
                  accommodation_charges: 0,
                  usage_charges: 0,
                  fuel_charges: 0,
                  elongation_charges: 0,
                  risk_charges: 0,
                  commercial_charges: 0,
                  incidental_charges: 0,
                  other_charges: 0,
                }
              }
            })
            setItems(loadedItems)
            
            // Enable rental mode if any item is rental
            if (loadedItems.some((item: QuotationItem) => item.is_rental)) {
              setIsRentalMode(true)
            }
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
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg overflow-hidden">
                      {/* Item Header */}
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm text-slate-500">#{index + 1}</span>
                              {item.is_rental && (
                                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                  Rental Item
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs text-slate-500">Item Code</Label>
                                <ItemSearch
                                  value={item.item_code}
                                  onChange={(code, desc, name) => {
                                    updateItem(item.id, 'item_code', code)
                                    updateItem(item.id, 'item_name', name || code)
                                    if (desc) updateItem(item.id, 'description', desc)
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-slate-500">Description</Label>
                                <Input
                                  placeholder="Description"
                                  value={item.description}
                                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Item Details */}
                      <div className="p-4">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <Label className="text-xs text-slate-500">Quantity *</Label>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.qty}
                              onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                              className="text-sm"
                              required
                              disabled={item.is_rental}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">Rate *</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                              className="text-sm"
                              required
                              disabled={item.is_rental}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">Amount</Label>
                            <div className="h-9 flex items-center text-sm font-medium">
                              ₹{item.amount.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>

                        {/* Rental Pricing Details & Components */}
                        {item.is_rental && (
                          <div className="border-t pt-4 mt-4 space-y-4">
                            {/* Rental Period Info */}
                            <div>
                              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                <span>Rental Period</span>
                                <Badge variant="outline" className="text-xs">
                                  {item.rental_type ? item.rental_type.charAt(0).toUpperCase() + item.rental_type.slice(1) : 'N/A'}
                                </Badge>
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Duration</p>
                                  <p className="font-medium">{item.rental_duration || 'N/A'} {item.rental_type ? item.rental_type.charAt(0).toUpperCase() + item.rental_type.slice(1) : ''}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Start Date</p>
                                  <p className="font-medium">
                                    {item.rental_start_date ? new Date(item.rental_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                  </p>
                                  {item.rental_start_time && <p className="text-xs text-slate-400">{item.rental_start_time}</p>}
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">End Date</p>
                                  <p className="font-medium">
                                    {item.rental_end_date ? new Date(item.rental_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                  </p>
                                  {item.rental_end_time && <p className="text-xs text-slate-400">{item.rental_end_time}</p>}
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Operator</p>
                                  {item.operator_included ? (
                                    <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Included</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">Not Included</Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Editable Pricing Components */}
                            <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                              <h4 className="font-semibold text-sm mb-3 text-blue-900 dark:text-blue-100">Rental Cost Components</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                  <Label className="text-xs text-blue-700 dark:text-blue-300">Base Cost</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.pricing_components?.base_cost || 0}
                                    onChange={(e) => {
                                      const newComponents = { ...item.pricing_components, base_cost: parseFloat(e.target.value) || 0 }
                                      const total = Object.values(newComponents).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0)
                                      updateItem(item.id, 'pricing_components', newComponents)
                                      updateItem(item.id, 'total_rental_cost', total)
                                      updateItem(item.id, 'rate', total)
                                      updateItem(item.id, 'amount', item.qty * total)
                                    }}
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-green-700 dark:text-green-300">Accommodation</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.pricing_components?.accommodation_charges || 0}
                                    onChange={(e) => {
                                      const newComponents = { ...item.pricing_components, accommodation_charges: parseFloat(e.target.value) || 0 }
                                      const total = Object.values(newComponents).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0)
                                      updateItem(item.id, 'pricing_components', newComponents)
                                      updateItem(item.id, 'total_rental_cost', total)
                                      updateItem(item.id, 'rate', total)
                                      updateItem(item.id, 'amount', item.qty * total)
                                    }}
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-purple-700 dark:text-purple-300">Usage</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.pricing_components?.usage_charges || 0}
                                    onChange={(e) => {
                                      const newComponents = { ...item.pricing_components, usage_charges: parseFloat(e.target.value) || 0 }
                                      const total = Object.values(newComponents).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0)
                                      updateItem(item.id, 'pricing_components', newComponents)
                                      updateItem(item.id, 'total_rental_cost', total)
                                      updateItem(item.id, 'rate', total)
                                      updateItem(item.id, 'amount', item.qty * total)
                                    }}
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-orange-700 dark:text-orange-300">Fuel</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.pricing_components?.fuel_charges || 0}
                                    onChange={(e) => {
                                      const newComponents = { ...item.pricing_components, fuel_charges: parseFloat(e.target.value) || 0 }
                                      const total = Object.values(newComponents).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0)
                                      updateItem(item.id, 'pricing_components', newComponents)
                                      updateItem(item.id, 'total_rental_cost', total)
                                      updateItem(item.id, 'rate', total)
                                      updateItem(item.id, 'amount', item.qty * total)
                                    }}
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-pink-700 dark:text-pink-300">Elongation</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.pricing_components?.elongation_charges || 0}
                                    onChange={(e) => {
                                      const newComponents = { ...item.pricing_components, elongation_charges: parseFloat(e.target.value) || 0 }
                                      const total = Object.values(newComponents).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0)
                                      updateItem(item.id, 'pricing_components', newComponents)
                                      updateItem(item.id, 'total_rental_cost', total)
                                      updateItem(item.id, 'rate', total)
                                      updateItem(item.id, 'amount', item.qty * total)
                                    }}
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-red-700 dark:text-red-300">Risk</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.pricing_components?.risk_charges || 0}
                                    onChange={(e) => {
                                      const newComponents = { ...item.pricing_components, risk_charges: parseFloat(e.target.value) || 0 }
                                      const total = Object.values(newComponents).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0)
                                      updateItem(item.id, 'pricing_components', newComponents)
                                      updateItem(item.id, 'total_rental_cost', total)
                                      updateItem(item.id, 'rate', total)
                                      updateItem(item.id, 'amount', item.qty * total)
                                    }}
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-indigo-700 dark:text-indigo-300">Commercial</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.pricing_components?.commercial_charges || 0}
                                    onChange={(e) => {
                                      const newComponents = { ...item.pricing_components, commercial_charges: parseFloat(e.target.value) || 0 }
                                      const total = Object.values(newComponents).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0)
                                      updateItem(item.id, 'pricing_components', newComponents)
                                      updateItem(item.id, 'total_rental_cost', total)
                                      updateItem(item.id, 'rate', total)
                                      updateItem(item.id, 'amount', item.qty * total)
                                    }}
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-teal-700 dark:text-teal-300">Incidental</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.pricing_components?.incidental_charges || 0}
                                    onChange={(e) => {
                                      const newComponents = { ...item.pricing_components, incidental_charges: parseFloat(e.target.value) || 0 }
                                      const total = Object.values(newComponents).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0)
                                      updateItem(item.id, 'pricing_components', newComponents)
                                      updateItem(item.id, 'total_rental_cost', total)
                                      updateItem(item.id, 'rate', total)
                                      updateItem(item.id, 'amount', item.qty * total)
                                    }}
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-700 dark:text-slate-300">Other</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.pricing_components?.other_charges || 0}
                                    onChange={(e) => {
                                      const newComponents = { ...item.pricing_components, other_charges: parseFloat(e.target.value) || 0 }
                                      const total = Object.values(newComponents).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0)
                                      updateItem(item.id, 'pricing_components', newComponents)
                                      updateItem(item.id, 'total_rental_cost', total)
                                      updateItem(item.id, 'rate', total)
                                      updateItem(item.id, 'amount', item.qty * total)
                                    }}
                                    className="text-sm h-8"
                                  />
                                </div>
                              </div>
                              <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700 flex justify-between items-center">
                                <span className="font-semibold text-sm text-slate-900 dark:text-white">Total Rental Cost</span>
                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                  ₹{(item.total_rental_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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
