# Rental Pricing System for Heavy Equipment Quotations

## Overview

This document describes the comprehensive rental pricing system integrated into the Nexus ERP quotation workflow. The system supports duration-based pricing for heavy equipment rentals with detailed cost breakdowns.

## Features

### 1. **Rental vs. Standard Mode**
- Toggle between standard product quotations and rental-based quotations
- Each item can be individually configured as rental or standard
- Rental mode unlocks duration, operator, and pricing breakdown fields

### 2. **Duration-Based Pricing**
The system calculates rental costs based on:
- **Rental Type**: Hours, Days, or Months
- **Date Range**: Start and end dates for the rental period
- **Time Selection** (for applicable categories): Start and end times for hourly rentals

#### Time-Based Categories
Categories that support hourly rentals with time selection:
- Excavators
- Bulldozers
- Cranes
- Loaders
- Graders
- Compactors
- Generators
- Concrete Mixers
- Tower Cranes
- Material Hoists

Other categories default to day/month-based rentals.

### 3. **Comprehensive Pricing Components**

Each rental item includes a detailed cost breakdown:

| Component | Description | Required |
|-----------|-------------|----------|
| **Base Cost** | Base rental rate for the equipment | ✓ Yes |
| **Accommodation** | Housing/lodging charges for operator | Optional |
| **Usage** | Usage-based charges (hours/km) | Optional |
| **Fuel** | Fuel charges | Optional |
| **Elongation** | Extension/overtime charges | Optional |
| **Risk** | Insurance/risk coverage charges | Optional |
| **Commercial** | Commercial/administrative fees | Optional |
| **Incidental** | Incidental expenses | Optional |
| **Other** | Miscellaneous charges | Optional |

**Total Rental Cost** = Sum of all components

### 4. **Operator Management**
- **Requires Operator**: Flag indicating if operator is needed
- **Operator Included**: Whether operator cost is included in price
- **Operator Name**: Optional field for assigned operator

### 5. **Automatic Calculations**
- Duration automatically calculated from start/end dates and times
- Total rental cost auto-summed from all pricing components
- Item rate set to total rental cost
- Amount calculated as Qty × Rate
- Net Total and Grand Total updated dynamically

## User Workflow

### Creating a Rental Quotation

1. **Navigate** to CRM → Quotations → New Quotation
2. **Fill** customer/lead information
3. **Enable Rental Mode** by clicking the "Rental Mode" toggle button
4. **Add Items** using the standard item search
5. **Enable Rental** for each applicable item by clicking "Enable Rental"
6. **Configure Rental Details**:
   - Select rental type (hours/days/months)
   - Set start and end dates
   - For hourly rentals in supported categories, set start and end times
   - Configure operator requirements
   - Fill in pricing components
7. **Review** the total rental cost calculated automatically
8. **Add Taxes** if applicable using tax templates
9. **Submit** the quotation

### Rental Item Display

#### In Form (Expanded)
- Full rental pricing form with all fields
- Live calculation of total rental cost
- Duration display with formatted date range

#### In Form (Collapsed)
- Compact summary showing: duration, rental type, operator status
- "Edit" button to expand and modify

#### In Print Format
- Complete item details with rental period
- Operator inclusion status with visual badge
- Detailed pricing breakdown table showing all non-zero components
- Grand total with taxes

## Quotation Workflow Integration

### From Opportunity to Quotation
1. Opportunities in **"Proposal/Price Quote"** stage appear in "Ready for Quotation" tab
2. Click **"Create Quotation"** from opportunity card
3. Quotation pre-fills with opportunity details (party, currency, items)
4. Configure rental details if applicable
5. Submit quotation

### Quotation Acceptance Flow
1. Customer accepts quotation
2. Update opportunity as **"Won"** (status: Converted)
3. Convert to **Sales Order** or **Contract**
4. Sales Order flows to delivery and invoicing

### Quotation Rejection Flow
1. Customer rejects quotation
2. Mark opportunity as **"Lost"**
3. Record lost reason for analytics

## Technical Implementation

### Data Structures

```typescript
interface RentalPricingComponents {
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

interface RentalItem {
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
  qty: number
  rate: number
  amount: number
}
```

### Key Components

1. **`types/rental-pricing.ts`** - Type definitions and helper functions
2. **`components/crm/rental-pricing-form.tsx`** - Rental pricing input form
3. **`components/crm/rental-pricing-breakdown.tsx`** - Rental summary display
4. **`app/(main)/crm/quotations/new/page.tsx`** - Enhanced quotation form
5. **`app/print/quotation/[id]/page.tsx`** - Print format with rental breakdown

### Helper Functions

- **`calculateRentalDuration()`** - Calculates duration based on dates/times
- **`calculateTotalRentalCost()`** - Sums all pricing components
- **`formatRentalPeriod()`** - Formats rental period for display

## Print Format

The print format displays:

1. **Standard quotation header** - Company details, quotation number, dates
2. **Customer information** - Bill to details
3. **Items table** with columns:
   - Item Description
   - **Duration** (rental period with dates/times)
   - **Operator** (included/required status)
   - Qty, Rate, Amount
4. **Pricing breakdown row** (for rental items):
   - Grid layout showing all non-zero cost components
   - Clearly labeled with component names and amounts
5. **Totals section** - Net total, taxes, grand total
6. **Terms and conditions**
7. **Bank details and signature**

## Best Practices

### For Sales Teams
1. **Always enable rental mode** when quoting equipment rentals
2. **Fill all applicable cost components** for transparency
3. **Include operator details** if operator will be provided
4. **Use time selection** for short-term hourly rentals (excavators, cranes, etc.)
5. **Review breakdown** before sending to customer

### For Pricing
1. **Base cost** should reflect core rental rate
2. **Fuel charges** typically calculated as: (estimated usage × fuel rate)
3. **Accommodation** added only if operator housing required
4. **Risk charges** for high-value or specialized equipment
5. **Commercial charges** for admin/documentation fees

### For Operations
1. **Verify operator availability** before marking as "included"
2. **Check equipment calendar** for rental period conflicts
3. **Validate pricing components** against company rate card
4. **Ensure dates align** with project timelines

## ERPNext Field Mapping

Rental fields are stored in custom fields on the Quotation Item doctype:

| ERPNext Field | Type | Description |
|---------------|------|-------------|
| `is_rental` | Check | Indicates rental item |
| `rental_type` | Select | hours/days/months |
| `rental_duration` | Int | Calculated duration |
| `rental_start_date` | Date | Start date |
| `rental_end_date` | Date | End date |
| `rental_start_time` | Time | Start time (optional) |
| `rental_end_time` | Time | End time (optional) |
| `requires_operator` | Check | Operator needed flag |
| `operator_included` | Check | Operator in price flag |
| `operator_name` | Data | Operator name |
| `pricing_components` | JSON | Cost breakdown |
| `total_rental_cost` | Currency | Computed total |

## Future Enhancements

### Planned Features
1. **Pricing Rules Integration** - Apply discounts to rental components
2. **Equipment Availability Check** - Real-time availability validation
3. **Rate Card Templates** - Pre-configured pricing for equipment types
4. **Multi-Equipment Bundles** - Package pricing for equipment sets
5. **Rental Contract Generation** - Auto-generate rental agreements
6. **Delivery Scheduling** - Integration with logistics planning
7. **Usage Tracking** - Post-rental usage validation and adjustments

### API Endpoints (Future)
- `POST /api/rental/calculate-price` - Calculate rental pricing
- `GET /api/rental/availability` - Check equipment availability
- `POST /api/rental/reserve` - Reserve equipment for quotation
- `GET /api/rental/rate-card` - Fetch rate card for equipment

## Support

For issues or questions about the rental pricing system:
1. Check this documentation first
2. Review existing quotations for examples
3. Contact the development team for technical issues
4. Contact sales operations for pricing/workflow questions

---

**Document Version**: 1.0  
**Last Updated**: December 26, 2025  
**System**: Nexus ERP - Heavy Equipment Rental Management
