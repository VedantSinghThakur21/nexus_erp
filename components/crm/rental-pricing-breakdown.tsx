'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RentalItem, RentalPricingComponents } from "@/types/rental-pricing"
import { CheckCircle2, User, Calendar, Clock } from "lucide-react"

interface RentalPricingBreakdownProps {
  item: RentalItem
}

export function RentalPricingBreakdown({ item }: RentalPricingBreakdownProps) {
  const components = item.pricing_components

  const componentDetails = [
    { label: 'Base Cost', value: components.base_cost, color: 'text-blue-600' },
    { label: 'Accommodation', value: components.accommodation_charges, color: 'text-green-600' },
    { label: 'Usage', value: components.usage_charges, color: 'text-purple-600' },
    { label: 'Fuel', value: components.fuel_charges, color: 'text-orange-600' },
    { label: 'Elongation', value: components.elongation_charges, color: 'text-pink-600' },
    { label: 'Risk', value: components.risk_charges, color: 'text-red-600' },
    { label: 'Commercial', value: components.commercial_charges, color: 'text-indigo-600' },
    { label: 'Incidental', value: components.incidental_charges, color: 'text-teal-600' },
    { label: 'Other', value: components.other_charges, color: 'text-slate-600' },
  ].filter(c => c.value > 0)

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
          Rental Pricing Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Duration Info */}
        <div className="flex items-start gap-3 text-sm">
          <Calendar className="h-4 w-4 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Rental Period</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {item.rental_start_date && new Date(item.rental_start_date).toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
              {item.rental_start_time && ` ${item.rental_start_time}`}
              {' → '}
              {item.rental_end_date && new Date(item.rental_end_date).toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
              {item.rental_end_time && ` ${item.rental_end_time}`}
            </p>
            <Badge variant="outline" className="mt-1 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {item.rental_duration} {item.rental_type}
            </Badge>
          </div>
        </div>

        {/* Operator Info */}
        {item.requires_operator && (
          <div className="flex items-start gap-3 text-sm">
            <User className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Operator</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant={item.operator_included ? "default" : "secondary"}
                  className="text-xs"
                >
                  {item.operator_included ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Included
                    </>
                  ) : (
                    'Not Included'
                  )}
                </Badge>
                {item.operator_included && item.operator_name && (
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {item.operator_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cost Components */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
            Cost Components
          </p>
          <div className="space-y-1.5">
            {componentDetails.map((component, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">{component.label}</span>
                <span className={`font-medium ${component.color}`}>
                  ₹{component.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-900 dark:text-white">Total Rental Cost</span>
            <span className="text-lg font-bold text-blue-600">
              ₹{item.total_rental_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
