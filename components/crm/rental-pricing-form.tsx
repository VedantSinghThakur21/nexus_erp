'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RentalPricingComponents, RentalItem, calculateTotalRentalCost, formatRentalPeriod, TIME_BASED_CATEGORIES } from "@/types/rental-pricing"
import { Calendar, Clock, User, IndianRupee } from "lucide-react"

interface RentalPricingFormProps {
  item: Partial<RentalItem>
  onChange: (updates: Partial<RentalItem>) => void
  itemCategory?: string
}

export function RentalPricingForm({ item, onChange, itemCategory }: RentalPricingFormProps) {
  const [components, setComponents] = useState<RentalPricingComponents>(
    item.pricing_components || {
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
  )

  // Check if this category supports time selection
  const supportsTimeSelection = itemCategory ? TIME_BASED_CATEGORIES.includes(itemCategory) : false

  const updateComponent = (field: keyof RentalPricingComponents, value: number) => {
    const updated = { ...components, [field]: value }
    setComponents(updated)
    
    const totalCost = calculateTotalRentalCost(updated)
    onChange({
      pricing_components: updated,
      total_rental_cost: totalCost,
      rate: totalCost,
      amount: (item.qty || 1) * totalCost
    })
  }

  const totalCost = calculateTotalRentalCost(components)

  return (
    <div className="space-y-6">
      {/* Rental Duration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Rental Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Rental Type</Label>
              <Select
                value={item.rental_type || 'days'}
                onValueChange={(value) => onChange({ rental_type: value as 'hours' | 'days' | 'months' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportsTimeSelection && <SelectItem value="hours">Hours</SelectItem>}
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={item.rental_start_date || ''}
                onChange={(e) => onChange({ rental_start_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={item.rental_end_date || ''}
                onChange={(e) => onChange({ rental_end_date: e.target.value })}
                required
              />
            </div>
          </div>

          {supportsTimeSelection && item.rental_type === 'hours' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Start Time
                </Label>
                <Input
                  type="time"
                  value={item.rental_start_time || ''}
                  onChange={(e) => onChange({ rental_start_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  End Time
                </Label>
                <Input
                  type="time"
                  value={item.rental_end_time || ''}
                  onChange={(e) => onChange({ rental_end_time: e.target.value })}
                />
              </div>
            </div>
          )}

          {item.rental_start_date && item.rental_end_date && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {formatRentalPeriod(
                  item.rental_start_date,
                  item.rental_end_date,
                  item.rental_start_time,
                  item.rental_end_time,
                  item.rental_type || 'days'
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operator Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Operator Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Requires Operator</Label>
            <Switch
              checked={item.requires_operator || false}
              onCheckedChange={(checked) => onChange({ requires_operator: checked })}
            />
          </div>

          {item.requires_operator && (
            <>
              <div className="flex items-center justify-between">
                <Label>Operator Included in Price</Label>
                <Switch
                  checked={item.operator_included || false}
                  onCheckedChange={(checked) => onChange({ operator_included: checked })}
                />
              </div>

              {item.operator_included && (
                <div className="space-y-2">
                  <Label>Operator Name (Optional)</Label>
                  <Input
                    placeholder="Enter operator name"
                    value={item.operator_name || ''}
                    onChange={(e) => onChange({ operator_name: e.target.value })}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Pricing Components Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            Pricing Components
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Base Cost *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={components.base_cost}
                onChange={(e) => updateComponent('base_cost', parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Accommodation Charges</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={components.accommodation_charges}
                onChange={(e) => updateComponent('accommodation_charges', parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Usage Charges</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={components.usage_charges}
                onChange={(e) => updateComponent('usage_charges', parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Fuel Charges</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={components.fuel_charges}
                onChange={(e) => updateComponent('fuel_charges', parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Elongation Charges</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={components.elongation_charges}
                onChange={(e) => updateComponent('elongation_charges', parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Risk Charges</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={components.risk_charges}
                onChange={(e) => updateComponent('risk_charges', parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Commercial Charges</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={components.commercial_charges}
                onChange={(e) => updateComponent('commercial_charges', parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Incidental Charges</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={components.incidental_charges}
                onChange={(e) => updateComponent('incidental_charges', parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-xs">Other Charges</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={components.other_charges}
                onChange={(e) => updateComponent('other_charges', parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Total Breakdown */}
          <div className="border-t pt-3 mt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between font-medium">
                <span className="text-slate-600 dark:text-slate-400">Total Rental Cost:</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {item.rental_start_date && item.rental_end_date && item.rental_type && (
                <p className="text-xs text-slate-500">
                  Based on {item.rental_duration || 0} {item.rental_type}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
