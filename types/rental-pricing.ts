// Rental Pricing Types for Heavy Equipment Rental

export interface RentalPricingComponents {
  base_cost: number
  accommodation_charges: number
  usage_charges: number
  fuel_charges: number
  elongation_charges: number
  risk_charges: number
  commercial_charges: number
  incidental_charges: number
  other_charges: number
}

export interface RentalItem {
  item_code: string
  item_name: string
  description: string
  item_category?: string
  
  // Rental Duration
  rental_type: 'hours' | 'days' | 'months'
  rental_duration: number
  rental_start_date?: string
  rental_end_date?: string
  rental_start_time?: string
  rental_end_time?: string
  
  // Operator
  requires_operator: boolean
  operator_included: boolean
  operator_name?: string
  
  // Pricing Components
  pricing_components: RentalPricingComponents
  
  // Totals
  total_rental_cost: number
  qty: number // Usually 1 for rentals
  rate: number // Total rental cost per unit
  amount: number // Total amount (qty × rate)
}

export interface QuotationWithRental {
  name: string
  quotation_to: string
  party_name: string
  customer_name?: string
  status: string
  valid_till: string
  grand_total: number
  currency: string
  items: RentalItem[]
  transaction_date: string
  contact_email?: string
  territory?: string
  total_qty?: number
  net_total?: number
  total_taxes_and_charges?: number
}

// Categories that support day/time selection
export const TIME_BASED_CATEGORIES = [
  'Excavators',
  'Bulldozers',
  'Cranes',
  'Loaders',
  'Graders',
  'Compactors',
  'Generators',
  'Concrete Mixers',
  'Tower Cranes',
  'Material Hoists'
]

// Helper function to calculate rental duration
export function calculateRentalDuration(
  startDate: string,
  endDate: string,
  startTime?: string,
  endTime?: string,
  rentalType: 'hours' | 'days' | 'months' = 'days'
): number {
  const start = new Date(startDate + (startTime ? `T${startTime}` : 'T00:00:00'))
  const end = new Date(endDate + (endTime ? `T${endTime}` : 'T23:59:59'))
  
  const diffMs = end.getTime() - start.getTime()
  
  if (rentalType === 'hours') {
    return Math.ceil(diffMs / (1000 * 60 * 60))
  } else if (rentalType === 'days') {
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  } else {
    // months
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30))
  }
}

// Helper function to calculate total rental cost
export function calculateTotalRentalCost(components: RentalPricingComponents): number {
  const safe = (val?: number) => typeof val === 'number' ? val : 0
  return (
    safe(components.base_cost) +
    safe(components.accommodation_charges) +
    safe(components.usage_charges) +
    safe(components.fuel_charges) +
    safe(components.elongation_charges) +
    safe(components.risk_charges) +
    safe(components.commercial_charges) +
    safe(components.incidental_charges) +
    safe(components.other_charges)
  )
}

// Helper function to format rental period
export function formatRentalPeriod(
  startDate: string,
  endDate: string,
  startTime?: string,
  endTime?: string,
  rentalType: 'hours' | 'days' | 'months' = 'days'
): string {
  const duration = calculateRentalDuration(startDate, endDate, startTime, endTime, rentalType)
  const unit = rentalType === 'hours' ? 'hour' : rentalType === 'days' ? 'day' : 'month'
  const pluralUnit = duration === 1 ? unit : unit + 's'
  
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  })
  
  let period = `${duration} ${pluralUnit} (${formatDate(startDate)}`
  if (startTime) period += ` ${startTime}`
  period += ` to ${formatDate(endDate)}`
  if (endTime) period += ` ${endTime}`
  period += ')'
  
  return period
}
