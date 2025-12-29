'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import { Plus, Trash2, FileText, DollarSign, Percent, Package, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { createSalesOrder } from "@/app/actions/sales-orders"
import { getTaxTemplates, getTaxTemplateDetails, getWarehouses, applyItemPricingRules } from "@/app/actions/common"
import { getQuotation } from "@/app/actions/crm"
import { useRouter } from 'next/navigation'

interface SalesOrderItem {
  item_code: string
  item_name: string
  description: string
  qty: number
  uom: string
  rate: number
  discount_percentage: number
  amount: number
  delivery_date?: string
  warehouse?: string
  pricing_rules?: string
  // Rental-specific fields
  rental_type?: 'hours' | 'days' | 'months'
  rental_duration?: number
  rental_start_date?: string
  rental_end_date?: string
  rental_start_time?: string
  rental_end_time?: string
  requires_operator?: boolean
  operator_included?: boolean
  operator_name?: string
  // Rental pricing components
  base_cost?: number
  accommodation_charges?: number
  usage_charges?: number
  fuel_charges?: number
  elongation_charges?: number
  risk_charges?: number
  commercial_charges?: number
  incidental_charges?: number
  other_charges?: number
  total_rental_cost?: number
}

interface TaxTemplate {
  name: string
  title: string
}

export default function SalesOrderForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const quotationParam = searchParams.get('quotation')
  
  const [loading, setLoading] = useState(false)
  const [fetchingQuotation, setFetchingQuotation] = useState(false)
  const [taxTemplates, setTaxTemplates] = useState<TaxTemplate[]>([])
  const [warehouses, setWarehouses] = useState<string[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  
  const [formData, setFormData] = useState({
    customer: '',
    customer_name: '',
    transaction_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    currency: 'INR',
    terms: '',
    contact_email: '',
    territory: '',
    taxes_and_charges: '',
    quotation_no: '',
    po_no: '',
    po_date: ''
  })

  const [items, setItems] = useState<SalesOrderItem[]>([
    {
      item_code: '',
      item_name: '',
      description: '',
      qty: 1,
      uom: 'Nos',
      rate: 0,
      discount_percentage: 0,
      amount: 0,
      delivery_date: '',
      warehouse: '',
      pricing_rules: ''
    }
  ])

  // Fetch tax templates and warehouses on mount
  useEffect(() => {
    const fetchData = async () => {
      const [templates, warehouseList] = await Promise.all([
        getTaxTemplates(),
        getWarehouses()
      ])
      setTaxTemplates(templates)
      setWarehouses(warehouseList)
    }
    fetchData()
  }, [])

  // Fetch quotation data if quotation parameter exists
  useEffect(() => {
    const fetchQuotation = async () => {
      if (!quotationParam) {
        console.log('No quotation parameter found')
        return
      }
      
      console.log('Fetching quotation:', quotationParam)
      setFetchingQuotation(true)
      try {
        const quotation = await getQuotation(quotationParam)
        console.log('Fetched quotation:', quotation)
        console.log('Quotation items:', quotation?.items)
        console.log('Quotation taxes_and_charges:', quotation?.taxes_and_charges)
        if (quotation?.items && quotation.items.length > 0) {
          quotation.items.forEach((item: any, idx: number) => {
            console.log(`Item ${idx}:`, {
              item_code: item.item_code,
              custom_rental_type: item.custom_rental_type,
              custom_rental_duration: item.custom_rental_duration,
              custom_base_rental_cost: item.custom_base_rental_cost,
              custom_accommodation_charges: item.custom_accommodation_charges
            })
          })
        }
        
        if (quotation) {
          // Determine correct customer ID based on quotation_to
          const customerId = quotation.quotation_to === 'Customer' 
            ? quotation.party_name 
            : quotation.customer || quotation.party_name
          
          // Populate form with quotation data
          setFormData({
            customer: customerId || '',
            customer_name: quotation.customer_name || quotation.party_name || '',
            transaction_date: new Date().toISOString().split('T')[0],
            delivery_date: quotation.delivery_date || quotation.valid_till || '',
            currency: quotation.currency || 'INR',
            terms: quotation.terms || '',
            contact_email: quotation.contact_email || '',
            territory: quotation.territory || '',
            taxes_and_charges: quotation.taxes_and_charges || '',
            quotation_no: quotation.name || '',
            po_no: quotation.po_no || '',
            po_date: quotation.po_date || ''
          })

          // Populate items from quotation
          if (quotation.items && quotation.items.length > 0) {
            const quotationItems = quotation.items.map((item: any) => {
              // Base item structure
              const baseItem = {
                item_code: item.item_code || '',
                item_name: item.item_name || '',
                description: item.description || '',
                qty: item.qty || 1,
                uom: item.uom || 'Nos',
                rate: item.rate || 0,
                discount_percentage: item.discount_percentage || 0,
                amount: item.amount || 0,
                delivery_date: item.delivery_date || '',
                warehouse: item.warehouse || '',
                pricing_rules: item.pricing_rule || ''
              }

              // If this is a rental item, preserve rental details (using ERPNext custom field names)
              if (item.custom_rental_type || item.custom_rental_duration || item.custom_is_rental) {
                return {
                  ...baseItem,
                  // Rental-specific fields
                  rental_type: item.custom_rental_type || 'days',
                  rental_duration: item.custom_rental_duration || 0,
                  rental_start_date: item.custom_rental_start_date || '',
                  rental_end_date: item.custom_rental_end_date || '',
                  rental_start_time: item.custom_rental_start_time || '',
                  rental_end_time: item.custom_rental_end_time || '',
                  requires_operator: item.custom_requires_operator || false,
                  operator_included: item.custom_operator_included || false,
                  operator_name: item.custom_operator_name || '',
                  // Pricing components for rental (from ERPNext custom fields)
                  base_cost: item.custom_base_rental_cost || 0,
                  accommodation_charges: item.custom_accommodation_charges || 0,
                  usage_charges: item.custom_usage_charges || 0,
                  fuel_charges: item.custom_fuel_charges || 0,
                  elongation_charges: item.custom_elongation_charges || 0,
                  risk_charges: item.custom_risk_charges || 0,
                  commercial_charges: item.custom_commercial_charges || 0,
                  incidental_charges: item.custom_incidental_charges || 0,
                  other_charges: item.custom_other_charges || 0,
                  total_rental_cost: item.custom_total_rental_cost || item.rate || 0
                }
              }

              return baseItem
            })
            setItems(quotationItems)
          }
        }
      } catch (error) {
        console.error('Failed to fetch quotation:', error)
      } finally {
        setFetchingQuotation(false)
      }
    }

    fetchQuotation()
  }, [quotationParam])

  // Apply pricing rules when item details change
  const applyPricingRules = async (index: number, itemCode: string, qty: number) => {
    if (!itemCode || !formData.customer) return

    const result = await applyItemPricingRules({
      item_code: itemCode,
      customer: formData.customer,
      qty: qty,
      transaction_date: formData.transaction_date
    })

    if (result.success && result.data) {
      const newItems = [...items]
      if (result.data.price_list_rate) newItems[index].rate = result.data.price_list_rate
      if (result.data.discount_percentage) newItems[index].discount_percentage = result.data.discount_percentage
      if (result.data.pricing_rules) newItems[index].pricing_rules = result.data.pricing_rules
      if (result.data.uom) newItems[index].uom = result.data.uom
      if (result.data.item_name) newItems[index].item_name = result.data.item_name
      if (result.data.description) newItems[index].description = result.data.description
      newItems[index].amount = calculateItemAmount(newItems[index])
      setItems(newItems)
    }
  }

  const calculateItemAmount = (item: SalesOrderItem) => {
    const subtotal = item.qty * item.rate
    const discount = subtotal * (item.discount_percentage / 100)
    return subtotal - discount
  }

  const updateItem = (index: number, field: keyof SalesOrderItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Recalculate amount
    if (['qty', 'rate', 'discount_percentage'].includes(field)) {
      newItems[index].amount = calculateItemAmount(newItems[index])
    }
    
    // Recalculate total rental cost when pricing components change
    if (field.includes('_cost') || field.includes('_charges')) {
      const item = newItems[index]
      const totalRentalCost = (
        (item.base_cost || 0) +
        (item.accommodation_charges || 0) +
        (item.usage_charges || 0) +
        (item.fuel_charges || 0) +
        (item.elongation_charges || 0) +
        (item.risk_charges || 0) +
        (item.commercial_charges || 0) +
        (item.incidental_charges || 0) +
        (item.other_charges || 0)
      )
      newItems[index].total_rental_cost = totalRentalCost
      newItems[index].rate = totalRentalCost
      newItems[index].amount = calculateItemAmount(newItems[index])
    }
    
    setItems(newItems)

    // Apply pricing rules when item_code or qty changes
    if (field === 'item_code' || field === 'qty') {
      const itemCode = field === 'item_code' ? value : newItems[index].item_code
      const qty = field === 'qty' ? value : newItems[index].qty
      if (itemCode && qty > 0) {
        applyPricingRules(index, itemCode, qty)
      }
    }
  }

  const toggleItemExpansion = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  const addItem = () => {
    setItems([...items, {
      item_code: '',
      item_name: '',
      description: '',
      qty: 1,
      uom: 'Nos',
      rate: 0,
      discount_percentage: 0,
      amount: 0,
      delivery_date: formData.delivery_date || '',
      warehouse: '',
      pricing_rules: ''
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const netTotal = items.reduce((sum, item) => sum + item.amount, 0)
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0)
  
  // Calculate tax based on selected tax template
  const [taxAmount, setTaxAmount] = useState(0)
  const [taxRate, setTaxRate] = useState(0)
  
  useEffect(() => {
    const fetchTaxRate = async () => {
      if (formData.taxes_and_charges && netTotal > 0) {
        try {
          const taxTemplate = await getTaxTemplateDetails(formData.taxes_and_charges)
          if (taxTemplate.taxes && taxTemplate.taxes.length > 0) {
            const totalRate = taxTemplate.taxes.reduce((sum: number, tax: any) => sum + (tax.rate || 0), 0)
            setTaxRate(totalRate)
            setTaxAmount((netTotal * totalRate) / 100)
          } else {
            setTaxRate(0)
            setTaxAmount(0)
          }
        } catch (error) {
          console.error('Error fetching tax template:', error)
          setTaxRate(0)
          setTaxAmount(0)
        }
      } else {
        setTaxRate(0)
        setTaxAmount(0)
      }
    }
    fetchTaxRate()
  }, [formData.taxes_and_charges, netTotal])
  
  const grandTotal = netTotal + taxAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const orderData = {
        ...formData,
        items: items.map(item => {
          const baseItem: any = {
            item_code: item.item_code,
            item_name: item.item_name || item.item_code,
            description: item.description,
            qty: item.qty,
            uom: item.uom,
            rate: item.rate,
            discount_percentage: item.discount_percentage,
            amount: item.amount,
            delivery_date: item.delivery_date || formData.delivery_date,
            warehouse: item.warehouse
          }
          
          // Include rental pricing components if this is a rental item
          if (item.rental_type || item.rental_duration) {
            baseItem.rental_type = item.rental_type
            baseItem.rental_duration = item.rental_duration
            baseItem.rental_start_date = item.rental_start_date
            baseItem.rental_end_date = item.rental_end_date
            baseItem.rental_start_time = item.rental_start_time
            baseItem.rental_end_time = item.rental_end_time
            baseItem.requires_operator = item.requires_operator
            baseItem.operator_included = item.operator_included
            baseItem.operator_name = item.operator_name
            baseItem.base_cost = item.base_cost
            baseItem.accommodation_charges = item.accommodation_charges
            baseItem.usage_charges = item.usage_charges
            baseItem.fuel_charges = item.fuel_charges
            baseItem.elongation_charges = item.elongation_charges
            baseItem.risk_charges = item.risk_charges
            baseItem.commercial_charges = item.commercial_charges
            baseItem.incidental_charges = item.incidental_charges
            baseItem.other_charges = item.other_charges
            baseItem.total_rental_cost = item.total_rental_cost
          }
          
          return baseItem
        })
      }

      const result = await createSalesOrder(orderData)

      if (result.success) {
        router.push('/sales-orders')
      } else {
        alert(result.error || 'Failed to create sales order')
      }
    } catch (error) {
      console.error('Failed to create sales order:', error)
      alert('Failed to create sales order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div suppressHydrationWarning className="flex justify-between items-start">
        <div suppressHydrationWarning>
          <h1 className="text-2xl lg:text-4xl font-bold text-slate-900 dark:text-white">
            New Sales Order
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create a new sales order for customer
          </p>
        </div>
        <div suppressHydrationWarning className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <AnimatedButton 
            type="submit" 
            variant="neon"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Sales Order'}
          </AnimatedButton>
        </div>
      </div>

      {/* Customer Information */}
      <AnimatedCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Customer ID *</Label>
              <Input
                required
                placeholder="Enter customer ID"
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Customer Name</Label>
              <Input
                placeholder="Customer display name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                placeholder="customer@example.com"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Order Date *</Label>
              <Input
                type="date"
                required
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Delivery Date *</Label>
              <Input
                type="date"
                required
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Currency</Label>
              <select
                className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <Label>Territory</Label>
              <Input
                placeholder="Territory"
                value={formData.territory}
                onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Quotation Reference</Label>
              <Input
                placeholder="QTN-2024-001"
                value={formData.quotation_no}
                onChange={(e) => setFormData({ ...formData, quotation_no: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Customer PO No</Label>
              <Input
                placeholder="Customer purchase order number"
                value={formData.po_no}
                onChange={(e) => setFormData({ ...formData, po_no: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>PO Date</Label>
              <Input
                type="date"
                value={formData.po_date}
                onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div>
              <Label>Tax Template</Label>
              <select
                className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                value={formData.taxes_and_charges}
                onChange={(e) => setFormData({ ...formData, taxes_and_charges: e.target.value })}
              >
                <option value="">Select Tax Template</option>
                {taxTemplates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.title || template.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Select a tax template to apply taxes automatically
              </p>
            </div>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Items & Pricing */}
      <AnimatedCard>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Items
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-sm">
                Total Qty: {totalQty}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">ITEM CODE *</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">DESCRIPTION</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">WAREHOUSE</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">DELIVERY</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">QTY *</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">UOM</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">RATE *</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">DISC %</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">AMOUNT</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const isRental = item.rental_type || item.rental_duration || item.base_cost
                  const hasBreakdown = (item.base_cost && item.base_cost > 0) || 
                                      (item.accommodation_charges && item.accommodation_charges > 0) ||
                                      (item.usage_charges && item.usage_charges > 0) ||
                                      (item.fuel_charges && item.fuel_charges > 0) ||
                                      (item.elongation_charges && item.elongation_charges > 0) ||
                                      (item.risk_charges && item.risk_charges > 0) ||
                                      (item.commercial_charges && item.commercial_charges > 0) ||
                                      (item.incidental_charges && item.incidental_charges > 0) ||
                                      (item.other_charges && item.other_charges > 0)
                  
                  return (
                    <React.Fragment key={index}>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-2">
                      <Input
                        required
                        placeholder="Item code"
                        value={item.item_code}
                        onChange={(e) => updateItem(index, 'item_code', e.target.value)}
                        className="text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        className="w-full px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                        value={item.warehouse}
                        onChange={(e) => updateItem(index, 'warehouse', e.target.value)}
                      >
                        <option value="">Select</option>
                        {warehouses.map((wh) => (
                          <option key={wh} value={wh}>{wh}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="date"
                        value={item.delivery_date}
                        onChange={(e) => updateItem(index, 'delivery_date', e.target.value)}
                        className="text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        required
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value) || 0)}
                        className="text-sm text-right"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        placeholder="UOM"
                        value={item.uom}
                        onChange={(e) => updateItem(index, 'uom', e.target.value)}
                        className="text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="text-sm text-right"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discount_percentage}
                        onChange={(e) => updateItem(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                        className="text-sm text-right"
                      />
                      {item.pricing_rules && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          <Percent className="w-3 h-3 mr-1" />
                          Rule
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right font-medium text-slate-900 dark:text-white">
                      {item.amount.toFixed(2)}
                    </td>
                    <td className="py-2 px-2">
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </td>
                  </tr>
                  
                  {/* Rental Pricing Breakdown Row - Editable */}
                  {isRental && (
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                      <td colSpan={10} className="py-2 px-2">
                        <div className="space-y-2">
                          {/* Toggle Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleItemExpansion(index)}
                            className="w-full flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <div className="flex items-center gap-2">
                              <Package className="w-3.5 h-3.5" />
                              <span>Rental Pricing Components</span>
                              {item.rental_type && (
                                <Badge variant="outline" className="text-xs">
                                  {item.rental_duration} {item.rental_type}
                                </Badge>
                              )}
                              {hasBreakdown && (
                                <Badge variant="secondary" className="text-xs">
                                  ₹{(item.total_rental_cost || 0).toLocaleString('en-IN')}
                                </Badge>
                              )}
                            </div>
                            {expandedItems.has(index) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                          
                          {/* Editable Pricing Components */}
                          {expandedItems.has(index) && (
                            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <Label className="text-xs text-slate-600 dark:text-slate-400">Base Cost *</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.base_cost || 0}
                                    onChange={(e) => updateItem(index, 'base_cost', parseFloat(e.target.value) || 0)}
                                    className="mt-1 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600 dark:text-slate-400">Accommodation</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.accommodation_charges || 0}
                                    onChange={(e) => updateItem(index, 'accommodation_charges', parseFloat(e.target.value) || 0)}
                                    className="mt-1 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600 dark:text-slate-400">Usage Charges</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.usage_charges || 0}
                                    onChange={(e) => updateItem(index, 'usage_charges', parseFloat(e.target.value) || 0)}
                                    className="mt-1 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600 dark:text-slate-400">Fuel Charges</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.fuel_charges || 0}
                                    onChange={(e) => updateItem(index, 'fuel_charges', parseFloat(e.target.value) || 0)}
                                    className="mt-1 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600 dark:text-slate-400">Elongation</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.elongation_charges || 0}
                                    onChange={(e) => updateItem(index, 'elongation_charges', parseFloat(e.target.value) || 0)}
                                    className="mt-1 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600 dark:text-slate-400">Risk Charges</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.risk_charges || 0}
                                    onChange={(e) => updateItem(index, 'risk_charges', parseFloat(e.target.value) || 0)}
                                    className="mt-1 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600 dark:text-slate-400">Commercial</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.commercial_charges || 0}
                                    onChange={(e) => updateItem(index, 'commercial_charges', parseFloat(e.target.value) || 0)}
                                    className="mt-1 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600 dark:text-slate-400">Incidental</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.incidental_charges || 0}
                                    onChange={(e) => updateItem(index, 'incidental_charges', parseFloat(e.target.value) || 0)}
                                    className="mt-1 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600 dark:text-slate-400">Other Charges</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.other_charges || 0}
                                    onChange={(e) => updateItem(index, 'other_charges', parseFloat(e.target.value) || 0)}
                                    className="mt-1 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                              
                              {/* Total Display */}
                              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Rental Cost</span>
                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                  ₹{(item.total_rental_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Terms & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnimatedCard>
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter terms and conditions..."
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={6}
              />
            </CardContent>
          </AnimatedCard>
        </div>

        <div>
          <AnimatedCard>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Total Items</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {items.length}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Total Quantity</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {totalQty}
                </span>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Net Total</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formData.currency} {netTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Taxes ({taxRate}%)</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formData.currency} {taxAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Grand Total</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {formData.currency} {grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </div>
      </div>
    </form>
  )
}
