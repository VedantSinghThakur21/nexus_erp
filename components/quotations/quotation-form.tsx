'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import { Plus, Trash2, Barcode, Calendar, FileText, DollarSign, Percent } from "lucide-react"
import { createQuotation } from "@/app/actions/quotations"
import { getTaxTemplates, applyItemPricingRules } from "@/app/actions/common"
import { useRouter } from 'next/navigation'

interface QuotationItem {
  item_code: string
  item_name: string
  description: string
  qty: number
  uom: string
  rate: number
  discount_percentage: number
  amount: number
  pricing_rules?: string
}

interface TaxTemplate {
  name: string
  title: string
}

export default function QuotationForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [taxTemplates, setTaxTemplates] = useState<TaxTemplate[]>([])
  const [formData, setFormData] = useState({
    quotation_to: 'Customer',
    party_name: '',
    customer_name: '',
    transaction_date: new Date().toISOString().split('T')[0],
    valid_till: '',
    currency: 'INR',
    terms: '',
    contact_email: '',
    territory: '',
    taxes_and_charges: ''
  })

  const [items, setItems] = useState<QuotationItem[]>([
    {
      item_code: '',
      item_name: '',
      description: '',
      qty: 1,
      uom: 'Nos',
      rate: 0,
      discount_percentage: 0,
      amount: 0,
      pricing_rules: ''
    }
  ])

  // Fetch tax templates on mount
  useEffect(() => {
    const fetchTaxTemplates = async () => {
      const templates = await getTaxTemplates()
      setTaxTemplates(Array.isArray(templates) ? templates : [])
    }
    fetchTaxTemplates()
  }, [])

  // Apply pricing rules when item details change
  const applyPricingRules = async (index: number, itemCode: string, qty: number) => {
    if (!itemCode || !formData.party_name) return

    const result = await applyItemPricingRules({
      item_code: itemCode,
      customer: formData.party_name,
      qty: qty,
      transaction_date: formData.transaction_date
    })

    if (result.success && result.data) {
      const newItems = [...items]
      if (result.data.price_list_rate) newItems[index].rate = result.data.price_list_rate
      if (result.data.discount_percentage) newItems[index].discount_percentage = result.data.discount_percentage
      if (result.data.pricing_rules) newItems[index].pricing_rules = result.data.pricing_rules
      newItems[index].amount = calculateItemAmount(newItems[index])
      setItems(newItems)
    }
  }

  const calculateItemAmount = (item: QuotationItem) => {
    const subtotal = item.qty * item.rate
    const discount = subtotal * (item.discount_percentage / 100)
    return subtotal - discount
  }

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Recalculate amount
    if (['qty', 'rate', 'discount_percentage'].includes(field)) {
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
      pricing_rules: ''
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const netTotal = items.reduce((sum, item) => sum + item.amount, 0)
  const grandTotal = netTotal

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const quotationData = {
        ...formData,
        items: items.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name || item.item_code,
          description: item.description,
          qty: item.qty,
          uom: item.uom,
          rate: item.rate,
          discount_percentage: item.discount_percentage,
          amount: item.amount
        }))
      }

      const result = await createQuotation(quotationData)

      if (result.success) {
        router.push('/quotations')
      } else {
        alert(result.error || 'Failed to create quotation')
      }
    } catch (error) {
      console.error('Failed to create quotation:', error)
      alert('Failed to create quotation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold text-slate-900 dark:text-white">
            New Quotation
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create a new quotation for customer or lead
          </p>
        </div>
        <div className="flex gap-2">
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
            {loading ? 'Saving...' : 'Save Quotation'}
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
              <Label>Quotation To</Label>
              <select
                className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                value={formData.quotation_to}
                onChange={(e) => setFormData({ ...formData, quotation_to: e.target.value })}
              >
                <option value="Customer">Customer</option>
                <option value="Lead">Lead</option>
              </select>
            </div>
            <div>
              <Label>Party Name *</Label>
              <Input
                required
                placeholder="Enter customer/lead ID"
                value={formData.party_name}
                onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                required
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Valid Until *</Label>
              <Input
                type="date"
                required
                value={formData.valid_till}
                onChange={(e) => setFormData({ ...formData, valid_till: e.target.value })}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </CardContent>
      </AnimatedCard>

      {/* Items & Pricing */}
      <AnimatedCard>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Items & Pricing
            </CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">ITEM CODE *</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">DESCRIPTION</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">QTY *</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">UOM</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">RATE *</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">DISC %</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">AMOUNT</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
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
                          Pricing Rule Applied
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
                ))}
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
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Net Total</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formData.currency} {netTotal.toFixed(2)}
                </span>
              </div>

              <div className="text-xs text-slate-500 mt-2">
                Taxes will be applied based on selected tax template
              </div>

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
