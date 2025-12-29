'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RentalItem, RentalPricingComponents } from "@/types/rental-pricing"
import { CheckCircle2, User, Calendar, Clock } from "lucide-react"

interface RentalPricingBreakdownProps {
  item: RentalItem
}

export function RentalPricingBreakdown({ item }: RentalPricingBreakdownProps) {
  // Add null check for pricing_components
  if (!item?.pricing_components) {
    return null
  }

  const components = item.pricing_components

  const componentDetails = [
    { label: 'Base Cost', value: components.base_cost || 0, color: 'text-blue-600' },
    { label: 'Accommodation', value: components.accommodation_charges || 0, color: 'text-green-600' },
    { label: 'Usage', value: components.usage_charges || 0, color: 'text-purple-600' },
    { label: 'Fuel', value: components.fuel_charges || 0, color: 'text-orange-600' },
    { label: 'Elongation', value: components.elongation_charges || 0, color: 'text-pink-600' },
    { label: 'Risk', value: components.risk_charges || 0, color: 'text-red-600' },
    { label: 'Commercial', value: components.commercial_charges || 0, color: 'text-indigo-600' },
    { label: 'Incidental', value: components.incidental_charges || 0, color: 'text-teal-600' },
    { label: 'Other', value: components.other_charges || 0, color: 'text-slate-600' },
  ].filter(c => c.value > 0)

  return (
    <Card className="border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 dark:from-blue-950/40 dark:via-slate-900 dark:to-blue-950/40 shadow-sm">
      <CardHeader className="pb-4 border-b border-blue-200 dark:border-blue-800">
        <CardTitle className="text-base font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Rental Pricing Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* Duration Info */}
        {item.rental_start_date && item.rental_end_date && (
          <div className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-slate-900 dark:text-white mb-2">Rental Period</p>
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span>
                    {new Date(item.rental_start_date).toLocaleDateString('en-IN', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                    {item.rental_start_time && ` ${item.rental_start_time.substring(0, 5)}`}
                  </span>
                  <span className="text-slate-400">\u2192</span>
                  <span>
                    {new Date(item.rental_end_date).toLocaleDateString('en-IN', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                    {item.rental_end_time && ` ${item.rental_end_time.substring(0, 5)}`}
                  </span>
                </div>
                <Badge variant="outline" className="mt-2 text-xs border-blue-300 dark:border-blue-700">
                  <Clock className="h-3 w-3 mr-1" />
                  {item.rental_duration || 0} {item.rental_type ? (typeof item.rental_type === 'string' ? item.rental_type.charAt(0).toUpperCase() + item.rental_type.slice(1) : 'Units') : 'Units'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Operator Info */}
        {item.requires_operator && (
          <div className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-slate-900 dark:text-white mb-2">Operator</p>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={item.operator_included ? "default" : "secondary"}
                    className={item.operator_included ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
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
          </div>
        )}

        {/* Cost Components */}
        <div className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
            Cost Components
          </p>
          <div className="space-y-2">
            {componentDetails.map((component, idx) => (
              <div key={idx} className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <span className="text-sm text-slate-600 dark:text-slate-400">{component.label}</span>
                <span className={`font-semibold text-sm ${component.color}`}>
                  ₹{component.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-lg p-4 shadow-md">
          <div className="flex justify-between items-center">
            <span className="font-bold text-white">Total Rental Cost</span>
            <span className="text-2xl font-bold text-white">
              ₹{(item.total_rental_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
