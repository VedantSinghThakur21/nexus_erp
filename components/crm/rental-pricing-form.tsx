'use client'

import { useState, useEffect } from "react"
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
import { RentalPricingComponents, RentalItem, calculateTotalRentalCost, calculateRentalDuration, formatRentalPeriod, TIME_BASED_CATEGORIES } from "@/types/rental-pricing"
import { DynamicRentalPricingForm } from "@/components/crm/dynamic-rental-pricing-form"
import { Calendar, Clock, User, IndianRupee } from "lucide-react"

interface RentalPricingFormProps {
  item: Partial<RentalItem>
  onChange: (updates: Partial<RentalItem>) => void
  itemCategory?: string
}

export function RentalPricingForm({ item, onChange, itemCategory }: RentalPricingFormProps) {
  const [components, setComponents] = useState<Partial<RentalPricingComponents>>(() => {
    // Initialize with existing pricing_components or empty object
    return item.pricing_components || {}
  })

  // Check if this category supports time selection
  const supportsTimeSelection = itemCategory ? TIME_BASED_CATEGORIES.includes(itemCategory) : false

  // Calculate rental duration whenever dates or rental type change
  useEffect(() => {
    if (item.rental_start_date && item.rental_end_date && item.rental_type) {
      const duration = calculateRentalDuration(
        item.rental_start_date,
        item.rental_end_date,
        item.rental_start_time,
        item.rental_end_time,
        item.rental_type
      )
      
      console.log('Calculated rental duration:', {
        start: item.rental_start_date,
        end: item.rental_end_date,
        type: item.rental_type,
        duration
      })
      
      // Only update if duration actually changed
      if (duration !== item.rental_duration) {
        onChange({ rental_duration: duration })
      }
    }
  }, [item.rental_start_date, item.rental_end_date, item.rental_start_time, item.rental_end_time, item.rental_type])

  const updateComponent = (field: keyof RentalPricingComponents, value: number) => {
    const updated = { ...components, [field]: value }
    setComponents(updated)
    
    // Convert partial to complete for calculation
    const completeComponents: RentalPricingComponents = {
      base_cost: updated.base_cost ?? 0,
      accommodation_charges: updated.accommodation_charges ?? 0,
      usage_charges: updated.usage_charges ?? 0,
      fuel_charges: updated.fuel_charges ?? 0,
      elongation_charges: updated.elongation_charges ?? 0,
      risk_charges: updated.risk_charges ?? 0,
      commercial_charges: updated.commercial_charges ?? 0,
      incidental_charges: updated.incidental_charges ?? 0,
      other_charges: updated.other_charges ?? 0,
    }
    
    const totalCost = calculateTotalRentalCost(completeComponents)
    onChange({
      pricing_components: completeComponents,
      total_rental_cost: totalCost,
      rate: totalCost,
      amount: (item.qty || 1) * totalCost
    })
  }

  // Update components when changed from parent
  useEffect(() => {
    if (item.pricing_components && JSON.stringify(item.pricing_components) !== JSON.stringify(components)) {
      setComponents(item.pricing_components)
    }
  }, [item.pricing_components])

  const totalCost = calculateTotalRentalCost({
    base_cost: components.base_cost ?? 0,
    accommodation_charges: components.accommodation_charges ?? 0,
    usage_charges: components.usage_charges ?? 0,
    fuel_charges: components.fuel_charges ?? 0,
    elongation_charges: components.elongation_charges ?? 0,
    risk_charges: components.risk_charges ?? 0,
    commercial_charges: components.commercial_charges ?? 0,
    incidental_charges: components.incidental_charges ?? 0,
    other_charges: components.other_charges ?? 0,
  })

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
                  <SelectValue placeholder="Select type">
                    {item.rental_type ? (
                      item.rental_type.charAt(0).toUpperCase() + item.rental_type.slice(1)
                    ) : 'Days'}
                  </SelectValue>
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
              onCheckedChange={(checked: boolean) => onChange({ requires_operator: checked })}
            />
          </div>

          {item.requires_operator && (
            <>
              <div className="flex items-center justify-between">
                <Label>Operator Included in Price</Label>
                <Switch
                  checked={item.operator_included || false}
                  onCheckedChange={(checked: boolean) => onChange({ operator_included: checked })}
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

      {/* Pricing Components Section - Dynamic */}
      <DynamicRentalPricingForm
        components={components}
        onChange={(newComponents) => {
          console.log('[RentalPricingForm] Received new components from DynamicRentalPricingForm:', newComponents)
          setComponents(newComponents)
          
          // Convert partial to complete for calculation
          const completeComponents: RentalPricingComponents = {
            base_cost: newComponents.base_cost ?? 0,
            accommodation_charges: newComponents.accommodation_charges ?? 0,
            usage_charges: newComponents.usage_charges ?? 0,
            fuel_charges: newComponents.fuel_charges ?? 0,
            elongation_charges: newComponents.elongation_charges ?? 0,
            risk_charges: newComponents.risk_charges ?? 0,
            commercial_charges: newComponents.commercial_charges ?? 0,
            incidental_charges: newComponents.incidental_charges ?? 0,
            other_charges: newComponents.other_charges ?? 0,
          }
          
          const totalCost = calculateTotalRentalCost(completeComponents)
          console.log('[RentalPricingForm] Total cost calculated:', totalCost)
          onChange({ 
            pricing_components: completeComponents,
            total_rental_cost: totalCost,
            rate: totalCost,
            amount: (item.qty || 1) * totalCost
          })
        }}
        currency="₹"
      />
    </div>
  )
}
