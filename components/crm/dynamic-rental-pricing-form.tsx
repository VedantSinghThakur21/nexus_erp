'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, X, DollarSign } from "lucide-react"
import { RentalPricingComponents } from "@/types/rental-pricing"

interface DynamicRentalPricingFormProps {
  components: Partial<RentalPricingComponents>
  onChange: (components: Partial<RentalPricingComponents>) => void
  currency?: string
}

const AVAILABLE_COMPONENTS = [
  { key: 'base_cost', label: 'Base Rental Cost', required: true },
  { key: 'accommodation_charges', label: 'Accommodation Charges', required: false },
  { key: 'usage_charges', label: 'Usage Charges', required: false },
  { key: 'fuel_charges', label: 'Fuel Charges', required: false },
  { key: 'elongation_charges', label: 'Elongation Charges', required: false },
  { key: 'risk_charges', label: 'Risk Charges', required: false },
  { key: 'commercial_charges', label: 'Commercial Charges', required: false },
  { key: 'incidental_charges', label: 'Incidental Charges', required: false },
  { key: 'other_charges', label: 'Other Charges', required: false },
] as const

export function DynamicRentalPricingForm({ 
  components, 
  onChange, 
  currency = '₹' 
}: DynamicRentalPricingFormProps) {
  const [showComponentSelector, setShowComponentSelector] = useState(false)

  // Get active components (explicitly added or required)
  const activeComponentKeys = Object.keys(components) as Array<keyof RentalPricingComponents>

  // Get available components that can be added
  const availableToAdd = AVAILABLE_COMPONENTS.filter(
    comp => !activeComponentKeys.includes(comp.key as keyof RentalPricingComponents) && !comp.required
  )

  const updateComponent = (key: keyof RentalPricingComponents, value: number | undefined) => {
    const next: Partial<RentalPricingComponents> = { ...components }
    if (value === undefined) {
      delete next[key]
    } else {
      next[key] = value
    }
    console.log('[DynamicRentalPricing] Updating component:', key, '=', value)
    console.log('[DynamicRentalPricing] New components:', next)
    onChange(next)
  }

  const removeComponent = (key: keyof RentalPricingComponents) => {
    const newComponents = { ...components }
    delete newComponents[key]
    onChange(newComponents)
  }

  const addComponent = (key: keyof RentalPricingComponents) => {
    onChange({
      ...components,
      [key]: 0
    })
    setShowComponentSelector(false)
  }

  const getTotalCost = () => {
    return Object.values(components).reduce((sum, val) => sum + (val || 0), 0)
  }

  return (
    <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Rental Pricing Components
          </CardTitle>
          {availableToAdd.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowComponentSelector(!showComponentSelector)}
              className="gap-2 text-xs h-8"
            >
              <Plus className="h-3 w-3" />
              Add Component
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Component Selector Dropdown */}
        {showComponentSelector && availableToAdd.length > 0 && (
          <Card className="border-2 border-purple-300 dark:border-purple-700">
            <CardContent className="p-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                Select components to add:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {availableToAdd.map((comp) => (
                  <Button
                    key={comp.key}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addComponent(comp.key as keyof RentalPricingComponents)}
                    className="justify-start text-xs h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {comp.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Components */}
        <div className="space-y-2">
          {AVAILABLE_COMPONENTS.filter(
            comp => comp.required || activeComponentKeys.includes(comp.key as keyof RentalPricingComponents)
          ).map((comp) => {
            const isRequired = comp.required
            const rawValue = components[comp.key as keyof RentalPricingComponents]
            const value = rawValue === undefined || rawValue === null ? '' : rawValue

            return (
              <div key={comp.key} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor={comp.key} className="text-xs">
                      {comp.label}
                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {!isRequired && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeComponent(comp.key as keyof RentalPricingComponents)}
                        className="h-5 w-5 p-0"
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <Input
                    id={comp.key}
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '') {
                        updateComponent(comp.key as keyof RentalPricingComponents, undefined)
                        return
                      }
                      const parsed = parseFloat(val)
                      if (isNaN(parsed)) {
                        updateComponent(comp.key as keyof RentalPricingComponents, undefined)
                        return
                      }
                      updateComponent(comp.key as keyof RentalPricingComponents, parsed)
                    }}
                    placeholder="0.00"
                    className="h-9 text-sm"
                    required={isRequired}
                  />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-5 min-w-[80px] text-right">
                  {currency}{Number(rawValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Total Cost */}
        <div className="border-t border-purple-300 dark:border-purple-700 pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Total Rental Cost:
            </span>
            <Badge variant="default" className="text-sm bg-purple-600 hover:bg-purple-700">
              {currency}{getTotalCost().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Badge>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Add only the components you need for this rental. Total will be automatically calculated.
        </p>
      </CardContent>
    </Card>
  )
}
