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
import { Plus, Trash2, Loader2, ArrowLeft, Calendar as CalendarIcon, Building2, Package, Wrench } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ItemSearch } from "@/components/invoices/item-search"
import { getTaxTemplates, getTaxTemplate } from "@/app/actions/settings"
import { getCompanyDetails, getBankDetails } from "@/app/actions/crm"
import { getItemGroups } from "@/app/actions/invoices"
import { PricingRulesIndicator } from "@/components/pricing-rules/pricing-rules-indicator"
import { AppliedRulesSummary } from "@/components/pricing-rules/applied-rules-summary"
import { applyPricingRules } from "@/app/actions/apply-pricing-rules"
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

export default function NewQuotationPage() {
  const [loading, setLoading] = useState(false)
  const [prefilling, setPrefilling] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const opportunityId = searchParams.get('opportunity')

  // Category filter state
  const [itemGroups, setItemGroups] = useState<string[]>([])
  const [selectedItemGroup, setSelectedItemGroup] = useState<string>('All')

  // Pricing rules state
  const [appliedPricingRules, setAppliedPricingRules] = useState<any[]>([])
  
  // Rental mode state
  const [isRentalMode, setIsRentalMode] = useState(false)
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null)

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
    { 
      id: 1, 
      item_code: "", 
      item_name: "", 
      description: "", 
      qty: 1, 
      rate: 0, 
      amount: 0,
      is_rental: false
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
    
    getItemGroups().then(groups => {
      setItemGroups(['All', ...groups])
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

  // Auto-apply pricing rules when items or customer changes
  useEffect(() => {
    const applyRules = async () => {
      if (!transactionDate || items.length === 0 || !items.some(i => i.item_code)) {
        setAppliedPricingRules([])
        return
      }

      try {
        const result = await applyPricingRules({
          customer: quotationTo === 'Customer' ? partyName : undefined,
          transaction_date: transactionDate,
          items: items
            .filter(item => item.item_code)
            .map(item => ({
              item_code: item.item_code,
              qty: item.qty,
              rate: item.rate,
            })),
        })

        if (result.applied_rules.length > 0) {
          // Update items with pricing rule adjustments
          const updatedItems = items.map(item => {
            const ruleItem = result.items.find(ri => ri.item_code === item.item_code)
            if (ruleItem && ruleItem.pricing_rule) {
              const originalRate = item.rate
              let finalRate = ruleItem.rate
              
              // Apply discount if specified
              if (ruleItem.discount_percentage) {
                finalRate = originalRate * (1 - ruleItem.discount_percentage / 100)
              } else if (ruleItem.discount_amount) {
                finalRate = originalRate - ruleItem.discount_amount
              }

              return {
                ...item,
                rate: finalRate,
                amount: calculateRowAmount(item.qty, finalRate),
              }
            }
            return item
          })
          setItems(updatedItems)

          // Track applied rules for display
          const appliedRulesDisplay = result.applied_rules.map(rule => {
            const item = items.find(i => i.item_code === result.items.find(ri => ri.pricing_rule === rule.rule_name)?.item_code)
            const ruleItem = result.items.find(ri => ri.pricing_rule === rule.rule_name)
            return {
              rule_name: rule.rule_name,
              rule_title: rule.rule_title,
              item_code: item?.item_code || '',
              item_name: item?.item_name || '',
              original_rate: item?.rate || 0,
              final_rate: ruleItem?.rate || item?.rate || 0,
              discount_percentage: rule.discount_percentage,
              discount_amount: rule.discount_amount,
              savings: item ? (item.rate - (ruleItem?.rate || item.rate)) * item.qty : 0,
            }
          })
          setAppliedPricingRules(appliedRulesDisplay)
        } else {
          setAppliedPricingRules([])
        }
      } catch (error) {
        console.error('Failed to apply pricing rules:', error)
      }
    }

    applyRules()
  }, [partyName, transactionDate, items.map(i => `${i.item_code}-${i.qty}`).join(',')])

  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1
    setItems([...items, { 
      id: newId, 
      item_code: "", 
      item_name: "", 
      description: "", 
      qty: 1, 
      rate: 0, 
      amount: 0,
      is_rental: false,
      pricing_components: {
        base_cost: 0 // Initialize with base_cost
      }
    }])
  }

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  // Totals
  const netTotal = items.reduce((sum, item) => sum + item.amount, 0)
  
  // Calculate taxes dynamically based on selected template
  const totalTaxes = selectedTaxTemplateDetails?.taxes?.reduce((sum: number, tax: any) => {
    return sum + (netTotal * (tax.rate || 0) / 100)
  }, 0) || 0
  
  const grandTotal = netTotal + totalTaxes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!partyName) {
      alert(`Please select a ${quotationTo.toLowerCase()}`)
      return
    }

    if (!transactionDate || !validTill) {
      alert('Please ensure transaction date and valid till date are filled')
      return
    }

    // Validate items - check if description is filled even if item_code is not selected from dropdown
    const invalidItems = items.filter(item => {
      const hasItemCode = item.item_code && item.item_code.trim() !== ''
      const hasDescription = item.description && item.description.trim() !== ''
      const hasValidQty = item.qty > 0
      
      // Item is valid if it has either item_code OR description, AND has valid quantity
      return !(hasItemCode || hasDescription) || !hasValidQty
    })
    
    if (invalidItems.length > 0) {
      console.log('Invalid items:', invalidItems)
      alert('Please fill in item code or description, and ensure quantity is greater than 0 for all items')
      return
    }

    setLoading(true)

    try {
      const quotationData: any = {
        quotation_to: quotationTo,
        party_name: partyName,
        transaction_date: transactionDate,
        valid_till: validTill,
        currency: currency,
        order_type: orderType,
        items: items.map(item => {
          const baseItem: any = {
            item_code: item.item_code || item.description || 'MISC',
            item_name: item.item_name || item.description || item.item_code || 'Miscellaneous',
            description: item.description || item.item_name || item.item_code,
            qty: item.qty,
            rate: item.rate,
            amount: item.amount
          }
          
          // Add rental fields if this is a rental item
          if (item.is_rental) {
            baseItem.is_rental = true
            baseItem.rental_type = item.rental_type
            baseItem.rental_duration = item.rental_duration
            baseItem.rental_start_date = item.rental_start_date
            baseItem.rental_end_date = item.rental_end_date
            if (item.rental_start_time) baseItem.rental_start_time = item.rental_start_time
            if (item.rental_end_time) baseItem.rental_end_time = item.rental_end_time
            baseItem.requires_operator = item.requires_operator
            baseItem.operator_included = item.operator_included
            if (item.operator_name) baseItem.operator_name = item.operator_name
            baseItem.pricing_components = item.pricing_components
            baseItem.total_rental_cost = item.total_rental_cost
          }
          
          return baseItem
        })
      }

      // Only add optional fields if they have values
      if (opportunityReference && opportunityReference.trim() !== '') {
        quotationData.opportunity = opportunityReference
      }
      
      if (paymentTermsTemplate && paymentTermsTemplate.trim() !== '') {
        quotationData.payment_terms_template = paymentTermsTemplate
      }
      
      if (termsAndConditions && termsAndConditions.trim() !== '') {
        quotationData.terms = termsAndConditions
      }

      if (taxTemplate && taxTemplate.trim() !== '' && taxTemplate !== 'none') {
        quotationData.taxes_and_charges = taxTemplate
      }

      console.log('Submitting quotation data:', quotationData)
      
      // Log rental items specifically
      const rentalItems = quotationData.items.filter((i: any) => i.is_rental)
      if (rentalItems.length > 0) {
        console.log('Rental items being submitted:', JSON.stringify(rentalItems, null, 2))
      }

      const response = await fetch('/api/quotations/create-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationData)
      })

      if (!response.ok) {
        const error = await response.json()
        const errorMessage = typeof error === 'string' ? error : (error.error || error.message || 'Failed to create quotation')
        
        // Provide helpful error messages
        if (errorMessage.includes('Could not find Party')) {
          alert(`The ${quotationTo} "${partyName}" does not exist in ERPNext. Please create this ${quotationTo} first, or select a different party.`)
        } else if (errorMessage.includes('Payment Terms Template')) {
          alert('Invalid payment terms template. Please clear this field or enter a valid template name.')
        } else {
          alert(errorMessage)
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      if (result.quotation?.name) {
        router.push(`/crm/quotations/${encodeURIComponent(result.quotation.name)}`)
      } else {
        router.push('/crm/quotations')
      }
    } catch (error: any) {
      console.error('Error creating quotation:', error)
      const errorMsg = typeof error === 'string' ? error : (error.message || 'Failed to create quotation')
      alert(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div suppressHydrationWarning className="max-w-6xl mx-auto">
        {/* Header */}
        <div suppressHydrationWarning className="mb-6">
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
              <div suppressHydrationWarning className="grid gap-2">
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

              <div suppressHydrationWarning className="grid gap-2">
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

              <div suppressHydrationWarning className="grid gap-2">
                <Label htmlFor="transactionDate">Transaction Date *</Label>
                <Input
                  id="transactionDate"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </div>

              <div suppressHydrationWarning className="grid gap-2">
                <Label htmlFor="validTill">Valid Till *</Label>
                <Input
                  id="validTill"
                  type="date"
                  value={validTill}
                  onChange={(e) => setValidTill(e.target.value)}
                  required
                />
              </div>

              <div suppressHydrationWarning className="grid gap-2">
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

              <div suppressHydrationWarning className="grid gap-2">
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

          {/* Pricing Rules Indicator */}
          {transactionDate && (
            <PricingRulesIndicator
              customer={quotationTo === "Customer" ? partyName : undefined}
              transactionDate={transactionDate}
              itemGroups={items.map(item => item.item_code).filter(Boolean)}
            />
          )}

          {/* Applied Pricing Rules Summary */}
          {appliedPricingRules.length > 0 && (
            <AppliedRulesSummary appliedRules={appliedPricingRules} />
          )}

          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CardTitle>Items</CardTitle>
                  <Button
                    type="button"
                    variant={isRentalMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsRentalMode(!isRentalMode)}
                    className="gap-2"
                  >
                    {isRentalMode ? (
                      <>
                        <Wrench className="h-4 w-4" />
                        Rental Mode
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4" />
                        Standard Mode
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <Label htmlFor="category-filter" className="text-sm font-normal whitespace-nowrap">Filter by Category:</Label>
                  <Select value={selectedItemGroup} onValueChange={setSelectedItemGroup}>
                    <SelectTrigger className="w-[200px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      {itemGroups.filter(g => g !== 'All').map(group => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={addItem} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Add Item
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div suppressHydrationWarning className="border-t">
                {/* Header Row */}
                <div suppressHydrationWarning className="grid grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-xs font-medium text-slate-500 border-b">
                  <div suppressHydrationWarning className="col-span-1 text-center">#</div>
                  <div suppressHydrationWarning className="col-span-4">Item / Description</div>
                  <div suppressHydrationWarning className="col-span-1 text-right">Qty *</div>
                  <div suppressHydrationWarning className="col-span-2 text-right">Rate *</div>
                  <div suppressHydrationWarning className="col-span-2 text-right">Amount</div>
                  <div suppressHydrationWarning className="col-span-2"></div>
                </div>

                {/* Item Rows */}
                <div suppressHydrationWarning className="divide-y">
                  {items.map((item, index) => (
                    <div key={item.id} className="space-y-3">
                      {/* Main Item Row */}
                      <div className="grid grid-cols-12 gap-2 px-4 py-2 items-start hover:bg-slate-50/50 dark:hover:bg-slate-900/50 group">
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
                              itemGroup={selectedItemGroup === 'All' ? undefined : selectedItemGroup}
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
                            disabled={isRentalMode && item.is_rental}
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
                            disabled={isRentalMode && item.is_rental}
                            required
                          />
                        </div>
                        <div className="col-span-2 pt-2 text-right text-sm font-medium">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </div>
                        <div className="col-span-2 pt-1 flex items-center justify-end gap-2">
                          {isRentalMode && (
                            <Button
                              type="button"
                              variant={item.is_rental ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                const newIsRental = !item.is_rental
                                if (newIsRental) {
                                  // Initialize rental fields - batch all updates
                                  const today = new Date().toISOString().split('T')[0]
                                  const tomorrow = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]
                                  
                                  setItems(items.map(i => {
                                    if (i.id === item.id) {
                                      return {
                                        ...i,
                                        is_rental: true,
                                        rental_type: 'days',
                                        rental_start_date: today,
                                        rental_end_date: tomorrow,
                                        rental_duration: 1,
                                        pricing_components: i.pricing_components?.base_cost ? i.pricing_components : { base_cost: 0 },
                                        requires_operator: false,
                                        operator_included: false
                                      }
                                    }
                                    return i
                                  }))
                                  setExpandedItemId(item.id)
                                } else {
                                  setItems(items.map(i => i.id === item.id ? { ...i, is_rental: false } : i))
                                  setExpandedItemId(null)
                                }
                              }}
                              className="h-7 text-xs gap-1"
                            >
                              <Wrench className="h-3 w-3" />
                              {item.is_rental ? 'Rental' : 'Enable Rental'}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Rental Pricing Form (Expanded) */}
                      {isRentalMode && item.is_rental && expandedItemId === item.id && (
                        <div className="px-4 pb-4">
                          <RentalPricingForm
                            item={item as Partial<RentalItem>}
                            onChange={(updates) => {
                              console.log('[QuotationPage] Received updates from RentalPricingForm:', updates)
                              const rentalUpdates: Partial<QuotationItem> = {
                                ...updates,
                                rate: updates.total_rental_cost || item.rate,
                                amount: (item.qty || 1) * (updates.total_rental_cost || item.rate)
                              }
                              
                              // Calculate duration if dates are provided
                              if (updates.rental_start_date && updates.rental_end_date && updates.rental_type) {
                                const duration = calculateRentalDuration(
                                  updates.rental_start_date,
                                  updates.rental_end_date,
                                  updates.rental_start_time,
                                  updates.rental_end_time,
                                  updates.rental_type
                                )
                                rentalUpdates.rental_duration = duration
                              }
                              
                              setItems(items.map(i => i.id === item.id ? { ...i, ...rentalUpdates } : i))
                            }}
                            itemCategory={item.item_category || selectedItemGroup}
                          />
                        </div>
                      )}

                      {/* Rental Breakdown Summary (Collapsed) */}
                      {isRentalMode && item.is_rental && expandedItemId !== item.id && item.total_rental_cost && item.total_rental_cost > 0 && (
                        <div className="px-4 pb-2">
                          <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 text-xs text-blue-900 dark:text-blue-100">
                              <Wrench className="h-3 w-3" />
                              <span>
                                Rental: {item.rental_duration} {item.rental_type}
                                {item.operator_included && ' • Operator Included'}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedItemId(item.id)}
                              className="h-6 text-xs"
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      )}
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
                <Label htmlFor="taxTemplate">Sales Taxes and Charges Template</Label>
                <Select value={taxTemplate} onValueChange={setTaxTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tax template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableTaxTemplates.map(template => (
                      <SelectItem key={template.name} value={template.name}>
                        {template.title || template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Select a tax template or <Link href="/settings" className="text-blue-600 hover:underline">create one in Settings</Link>
                </p>
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

