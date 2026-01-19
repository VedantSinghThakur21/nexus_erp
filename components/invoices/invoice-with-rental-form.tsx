'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import { Plus, Trash2, FileText, DollarSign, Percent, Package, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { createInvoice } from "@/app/actions/invoices"
import { getTaxTemplates, getTaxTemplateDetails, getWarehouses } from "@/app/actions/common"
import { getSalesOrder } from "@/app/actions/sales-orders"

interface InvoiceItem {
  item_code: string
  item_name?: string
  description: string
  qty: number
  uom: string
  rate: number
  discount_percentage: number
  amount: number
  warehouse: string
  
  // Rental fields
  rental_type?: string
  rental_duration?: number
  rental_start_date?: string
  rental_end_date?: string
  rental_start_time?: string
  rental_end_time?: string
  requires_operator?: boolean
  operator_included?: boolean
  operator_name?: string
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

export default function InvoiceWithRentalForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const salesOrderParam = searchParams.get('sales_order')
  
  const [loading, setLoading] = useState(false)
  const [fetchingSalesOrder, setFetchingSalesOrder] = useState(false)
  const [taxTemplates, setTaxTemplates] = useState<TaxTemplate[]>([])
  const [warehouses, setWarehouses] = useState<string[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  
  const [formData, setFormData] = useState({
    customer: '',
    customer_name: '',
    posting_date: new Date().toISOString().split('T')[0],
    due_date: '',
    currency: 'INR',
    terms: '',
    contact_email: '',
    territory: '',
    taxes_and_charges: '',
    sales_order_no: '',
    po_no: '',
    po_date: ''
  })

  const [items, setItems] = useState<InvoiceItem[]>([{
    item_code: '',
    item_name: '',
    description: '',
    qty: 1,
    uom: 'Nos',
    rate: 0,
    discount_percentage: 0,
    amount: 0,
    warehouse: ''
  }])

  // Fetch tax templates and warehouses
  useEffect(() => {
    const fetchData = async () => {
      const [templates, warehouseList] = await Promise.all([
        getTaxTemplates(),
        getWarehouses()
      ])
      setTaxTemplates(Array.isArray(templates) ? templates : [])
      setWarehouses(warehouseList)
    }
    fetchData()
  }, [])

  // Fetch sales order data if parameter exists
  useEffect(() => {
    const fetchSalesOrder = async () => {
      if (!salesOrderParam) return
      
      setFetchingSalesOrder(true)
      try {
        const salesOrder = await getSalesOrder(salesOrderParam)
        
        if (salesOrder) {
          setFormData({
            customer: salesOrder.customer || '',
            customer_name: salesOrder.customer_name || '',
            posting_date: new Date().toISOString().split('T')[0],
            due_date: salesOrder.delivery_date || '',
            currency: salesOrder.currency || 'INR',
            terms: salesOrder.terms || '',
            contact_email: salesOrder.contact_email || '',
            territory: salesOrder.territory || '',
            taxes_and_charges: salesOrder.taxes_and_charges || '',
            sales_order_no: salesOrder.name || '',
            po_no: salesOrder.po_no || '',
            po_date: salesOrder.po_date || ''
          })

          if (salesOrder.items && salesOrder.items.length > 0) {
            const invoiceItems = salesOrder.items.map((item: any) => {
              const baseItem = {
                item_code: item.item_code || '',
                item_name: item.item_name || '',
                description: item.description || '',
                qty: item.qty || 1,
                uom: item.uom || 'Nos',
                rate: item.rate || 0,
                discount_percentage: item.discount_percentage || 0,
                amount: item.amount || 0,
                warehouse: item.warehouse || ''
              }

              // Map rental data if present
              if (item.custom_rental_type || item.custom_rental_duration) {
                return {
                  ...baseItem,
                  rental_type: item.custom_rental_type || '',
                  rental_duration: item.custom_rental_duration || 0,
                  rental_start_date: item.custom_rental_start_date || '',
                  rental_end_date: item.custom_rental_end_date || '',
                  rental_start_time: item.custom_rental_start_time || '',
                  rental_end_time: item.custom_rental_end_time || '',
                  requires_operator: item.custom_requires_operator || false,
                  operator_included: item.custom_operator_included || false,
                  operator_name: item.custom_operator_name || '',
                  base_cost: item.custom_base_rental_cost || 0,
                  accommodation_charges: item.custom_accommodation_charges || 0,
                  usage_charges: item.custom_usage_charges || 0,
                  fuel_charges: item.custom_fuel_charges || 0,
                  elongation_charges: item.custom_elongation_charges || 0,
                  risk_charges: item.custom_risk_charges || 0,
                  commercial_charges: item.custom_commercial_charges || 0,
                  incidental_charges: item.custom_incidental_charges || 0,
                  other_charges: item.custom_other_charges || 0,
                  total_rental_cost: item.custom_total_rental_cost || 0
                }
              }

              return baseItem
            })
            setItems(invoiceItems)
          }
        }
      } catch (error) {
        console.error('Failed to fetch sales order:', error)
      } finally {
        setFetchingSalesOrder(false)
      }
    }

    fetchSalesOrder()
  }, [salesOrderParam])

  const calculateItemAmount = (item: InvoiceItem) => {
    const subtotal = item.qty * item.rate
    const discount = subtotal * (item.discount_percentage / 100)
    return subtotal - discount
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
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
      warehouse: ''
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const netTotal = items.reduce((sum, item) => sum + item.amount, 0)
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0)
  
  // Calculate tax
  const [taxAmount, setTaxAmount] = useState(0)
  const [taxRate, setTaxRate] = useState(0)
  
  useEffect(() => {
    const fetchTaxRate = async () => {
      if (formData.taxes_and_charges && netTotal > 0) {
        try {
          const taxTemplate = await getTaxTemplateDetails(formData.taxes_and_charges) as any
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
      const invoiceData = {
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
            warehouse: item.warehouse
          }

          // Map rental data to ERPNext custom fields if present
          if (item.rental_type || item.rental_duration) {
            baseItem.custom_is_rental = 1
            baseItem.custom_rental_type = item.rental_type ? item.rental_type.charAt(0).toUpperCase() + item.rental_type.slice(1) : undefined
            baseItem.custom_rental_duration = item.rental_duration
            baseItem.custom_rental_start_date = item.rental_start_date
            baseItem.custom_rental_end_date = item.rental_end_date
            baseItem.custom_rental_start_time = item.rental_start_time
            baseItem.custom_rental_end_time = item.rental_end_time
            baseItem.custom_requires_operator = item.requires_operator ? 1 : 0
            baseItem.custom_operator_included = item.operator_included ? 1 : 0
            if (item.operator_name) baseItem.custom_operator_name = item.operator_name
            
            baseItem.custom_base_rental_cost = item.base_cost || 0
            baseItem.custom_accommodation_charges = item.accommodation_charges || 0
            baseItem.custom_usage_charges = item.usage_charges || 0
            baseItem.custom_fuel_charges = item.fuel_charges || 0
            baseItem.custom_elongation_charges = item.elongation_charges || 0
            baseItem.custom_risk_charges = item.risk_charges || 0
            baseItem.custom_commercial_charges = item.commercial_charges || 0
            baseItem.custom_incidental_charges = item.incidental_charges || 0
            baseItem.custom_other_charges = item.other_charges || 0
            baseItem.custom_total_rental_cost = item.total_rental_cost || 0
          }

          return baseItem
        })
      }

      const result = await createInvoice(invoiceData)
      
      if (result.error) {
        alert(result.error)
      } else {
        router.push('/invoices')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert('Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingSalesOrder) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading sales order data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {salesOrderParam ? 'Create Invoice from Sales Order' : 'Create New Invoice'}
          </h1>
          <p className="text-slate-500 mt-1">
            {salesOrderParam ? `Based on ${salesOrderParam}` : 'Fill in the details below'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Date Info */}
        <AnimatedCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer">Customer *</Label>
                <Input
                  id="customer"
                  required
                  value={formData.customer}
                  onChange={(e) => setFormData({...formData, customer: e.target.value})}
                  placeholder="Customer ID"
                />
              </div>
              <div>
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                  placeholder="Customer Name"
                />
              </div>
              <div>
                <Label htmlFor="posting_date">Posting Date *</Label>
                <Input
                  id="posting_date"
                  type="date"
                  required
                  value={formData.posting_date}
                  onChange={(e) => setFormData({...formData, posting_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="taxes_and_charges">Tax Template</Label>
                <select
                  id="taxes_and_charges"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md"
                  value={formData.taxes_and_charges}
                  onChange={(e) => setFormData({...formData, taxes_and_charges: e.target.value})}
                >
                  <option value="">Select Tax Template</option>
                  {taxTemplates.map((template) => (
                    <option key={template.name} value={template.name}>
                      {template.title || template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="territory">Territory</Label>
                <Input
                  id="territory"
                  value={formData.territory}
                  onChange={(e) => setFormData({...formData, territory: e.target.value})}
                  placeholder="Territory"
                />
              </div>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Items Section */}
        <AnimatedCard>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Items
                <Badge variant="secondary" className="ml-2">
                  Total Qty: {totalQty}
                </Badge>
              </CardTitle>
              <Button type="button" onClick={addItem} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
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
                            <td colSpan={9} className="py-2 px-2">
                              <div className="space-y-2">
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

        {/* Summary & Submit */}
        <AnimatedCard>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => setFormData({...formData, terms: e.target.value})}
                  placeholder="Enter terms and conditions..."
                  rows={4}
                  className="mt-2"
                />
              </div>
              <div className="ml-8 min-w-[300px] space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Net Total:</span>
                  <span className="font-medium">₹{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Taxes ({taxRate}%):</span>
                    <span className="font-medium">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-blue-600">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <AnimatedButton
                    type="submit"
                    className="flex-1"
                    disabled={loading || items.some(item => !item.item_code || item.qty <= 0)}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Create Invoice
                      </>
                    )}
                  </AnimatedButton>
                </div>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
      </form>
    </div>
  )
}
