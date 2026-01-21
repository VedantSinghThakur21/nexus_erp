import { getQuotation } from "@/app/actions/crm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, FileText, Building2, Pencil, Printer, Clock, User } from "lucide-react"
import Link from "next/link"
import { DeleteQuotationButton } from "@/components/crm/delete-quotation-button"
import { RentalPricingBreakdown } from "@/components/crm/rental-pricing-breakdown"
import { QuotationStatusDropdown } from "@/components/crm/quotation-status-dropdown"

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const quotationName = decodeURIComponent(id)
  
  let quotation
  try {
    quotation = await getQuotation(quotationName)
    
    // Additional null check
    if (!quotation) {
      throw new Error("Quotation not found")
    }
    
    // Debug: Log the quotation data to see what we're receiving
    console.log('=== QUOTATION DETAIL PAGE ===')
    console.log('Quotation items:', quotation.items?.length)
    quotation.items?.forEach((item: any, idx: number) => {
      console.log(`\nItem ${idx + 1}:`, item.item_code)
      console.log('  custom_is_rental:', item.custom_is_rental)
      console.log('  custom_rental_type:', item.custom_rental_type)
      console.log('  custom_rental_duration:', item.custom_rental_duration)
      console.log('  custom_rental_start_date:', item.custom_rental_start_date)
      console.log('  custom_rental_end_date:', item.custom_rental_end_date)
      console.log('  custom_base_rental_cost:', item.custom_base_rental_cost)
      console.log('  custom_accommodation_charges:', item.custom_accommodation_charges)
      console.log('  custom_rental_data:', item.custom_rental_data)
    })
  } catch (e) {
    console.error("Error fetching quotation:", e)
    return (
      <div className="p-8 flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Quotation Not Found</h1>
        <p className="text-muted-foreground">The quotation "{quotationName}" could not be found.</p>
        <Link href="/crm/quotations">
          <Button variant="outline">Back to Quotations</Button>
        </Link>
      </div>
    )
  }

  // Status colors
  const statusColors: Record<string, string> = {
    'Draft': 'bg-slate-100 text-slate-800',
    'Open': 'bg-blue-100 text-blue-800',
    'Ordered': 'bg-green-100 text-green-800',
    'Lost': 'bg-red-100 text-red-800'
  }

  // Check if expired
  const isExpired = quotation.valid_till && new Date(quotation.valid_till) < new Date()

  return (
    <div suppressHydrationWarning className="p-8 space-y-6">
      {/* Back Button */}
      <Link href="/crm/quotations">
        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" /> Back to Quotations
        </Button>
      </Link>

      {/* Header Section */}
      <div suppressHydrationWarning className="flex justify-between items-start">
        <div suppressHydrationWarning>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {quotation.name}
          </h1>
          <p className="text-slate-500">
            {quotation.quotation_to === 'Customer' ? 'Customer' : 'Lead'}: {quotation.customer_name || quotation.party_name}
          </p>
        </div>
        <div suppressHydrationWarning className="flex gap-2 items-center">
          <Link href={`/print/quotation/${encodeURIComponent(quotation.name)}`} target="_blank">
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </Link>
          {(quotation.status === 'Draft' || quotation.status === 'Open') && (
            <Link href={`/crm/quotations/${encodeURIComponent(quotation.name)}/edit`}>
              <Button className="gap-2">
                <FileText className="h-4 w-4" />
                Edit Quotation
              </Button>
            </Link>
          )}
          <DeleteQuotationButton 
            quotationId={quotation.name} 
            quotationStatus={quotation.status} 
          />
          <QuotationStatusDropdown 
            quotationId={quotation.name}
            currentStatus={quotation.status}
          />
          {isExpired && quotation.status === 'Open' && (
            <Badge className="bg-orange-100 text-orange-800">Expired</Badge>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div suppressHydrationWarning className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Transaction Date</CardTitle>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {quotation.transaction_date 
                ? new Date(quotation.transaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Not set'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Valid Until</CardTitle>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div suppressHydrationWarning className={`text-lg font-semibold ${isExpired ? 'text-red-600' : ''}`}>
              {quotation.valid_till ? new Date(quotation.valid_till).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Currency</CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div suppressHydrationWarning className="text-lg font-semibold">{quotation.currency || 'INR'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          {quotation.items && quotation.items.length > 0 ? (
            <div suppressHydrationWarning className="space-y-4">
              {quotation.items.map((item: Record<string, any>, idx: number) => {
                const rentalData = (() => {
                  try {
                    if (item.custom_rental_data) {
                      return typeof item.custom_rental_data === 'string'
                        ? JSON.parse(item.custom_rental_data)
                        : item.custom_rental_data
                    }
                  } catch (err) {
                    console.error('Failed to parse rental data', err)
                  }
                  return null
                })()

                const parseNumber = (val: any) => {
                  const num = Number(val)
                  return Number.isFinite(num) ? num : 0
                }

                const pricingComponents = {
                  base_cost: parseNumber(item.custom_base_rental_cost ?? rentalData?.baseRentalCost ?? rentalData?.base_cost ?? item.pricing_components?.base_cost),
                  accommodation_charges: parseNumber(item.custom_accommodation_charges ?? rentalData?.accommodationCost ?? rentalData?.accommodation_charges ?? item.pricing_components?.accommodation_charges),
                  usage_charges: parseNumber(item.custom_usage_charges ?? rentalData?.usageCost ?? rentalData?.usage_charges ?? item.pricing_components?.usage_charges),
                  fuel_charges: parseNumber(item.custom_fuel_charges ?? rentalData?.fuelCost ?? rentalData?.fuel_charges ?? item.pricing_components?.fuel_charges),
                  elongation_charges: parseNumber(item.custom_elongation_charges ?? rentalData?.elongationCost ?? rentalData?.elongation_charges ?? item.pricing_components?.elongation_charges),
                  risk_charges: parseNumber(item.custom_risk_charges ?? rentalData?.riskCost ?? rentalData?.risk_charges ?? item.pricing_components?.risk_charges),
                  commercial_charges: parseNumber(item.custom_commercial_charges ?? rentalData?.commercialCost ?? rentalData?.commercial_charges ?? item.pricing_components?.commercial_charges),
                  incidental_charges: parseNumber(item.custom_incidental_charges ?? rentalData?.incidentalCost ?? rentalData?.incidental_charges ?? item.pricing_components?.incidental_charges),
                  other_charges: parseNumber(item.custom_other_charges ?? rentalData?.otherCost ?? rentalData?.other_charges ?? item.pricing_components?.other_charges),
                }

                const hasPricingComponents = Object.values(pricingComponents).some((val) => val > 0)
                const isRental = (
                  item.custom_is_rental ||
                  item.is_rental ||
                  item.custom_rental_type ||
                  item.rental_type ||
                  item.custom_rental_duration ||
                  item.rental_duration ||
                  hasPricingComponents
                )
                const totalRentalCost = parseNumber(
                  item.custom_total_rental_cost ??
                  rentalData?.totalCost ??
                  item.total_rental_cost ??
                  item.rate
                )
                
                return (
                  <div suppressHydrationWarning key={idx} className="border rounded-lg overflow-hidden">
                    {/* Item Header */}
                    <div suppressHydrationWarning className="bg-slate-50 dark:bg-slate-900 p-4 border-b">
                      <div suppressHydrationWarning className="flex justify-between items-start">
                        <div suppressHydrationWarning>
                          <h3 className="font-semibold text-lg">{item.item_name || item.item_code || 'N/A'}</h3>
                          <p className="text-sm text-slate-500 mt-1">{item.description || 'No description'}</p>
                        </div>
                        {isRental && (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            Rental
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Standard Item Details */}
                    <div suppressHydrationWarning className="p-4 grid grid-cols-4 gap-4">
                      <div suppressHydrationWarning>
                        <p className="text-xs text-slate-500">Item Code</p>
                        <p className="font-medium">{item.item_code || 'N/A'}</p>
                      </div>
                      <div suppressHydrationWarning>
                        <p className="text-xs text-slate-500">Quantity</p>
                        <p className="font-medium">{item.qty || 0}</p>
                      </div>
                      <div suppressHydrationWarning>
                        <p className="text-xs text-slate-500">Rate</p>
                        <p className="font-medium">₹{(item.rate || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div suppressHydrationWarning>
                        <p className="text-xs text-slate-500">Amount</p>
                        <p className="font-medium text-lg">₹{(item.amount || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Rental Details */}
                    {isRental && (
                      <div suppressHydrationWarning className="border-t bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900/80 dark:to-blue-950/30 p-6">
                        <h4 className="font-semibold text-base mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                          <Clock className="h-5 w-5 text-blue-600" />
                          Rental Details
                        </h4>
                        <div suppressHydrationWarning className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div suppressHydrationWarning className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Rental Type</p>
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {(() => {
                                const rentalType = item.custom_rental_type || item.rental_type || 'N/A'
                                if (typeof rentalType === 'string' && rentalType.length > 0 && !rentalType.includes('\n')) {
                                  return rentalType.charAt(0).toUpperCase() + rentalType.slice(1)
                                }
                                return 'N/A'
                              })()}
                            </Badge>
                          </div>
                          <div suppressHydrationWarning className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Duration</p>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">
                              {item.custom_rental_duration || item.rental_duration || '0'}{' '}
                              <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                                {(() => {
                                  const rentalType = item.custom_rental_type || item.rental_type || ''
                                  if (typeof rentalType === 'string' && rentalType.length > 0 && !rentalType.includes('\n')) {
                                    return rentalType.charAt(0).toUpperCase() + rentalType.slice(1)
                                  }
                                  return ''
                                })()}
                              </span>
                            </p>
                          </div>
                          <div suppressHydrationWarning className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Start Date</p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {item.custom_rental_start_date || item.rental_start_date ? 
                                new Date(item.custom_rental_start_date || item.rental_start_date).toLocaleDateString('en-IN', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: 'numeric' 
                                }) : 
                                'N/A'}
                            </p>
                            {(item.custom_rental_start_time || item.rental_start_time) && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {(item.custom_rental_start_time || item.rental_start_time).substring(0, 5)}
                              </p>
                            )}
                          </div>
                          <div suppressHydrationWarning className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">End Date</p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {item.custom_rental_end_date || item.rental_end_date ? 
                                new Date(item.custom_rental_end_date || item.rental_end_date).toLocaleDateString('en-IN', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: 'numeric' 
                                }) : 
                                'N/A'}
                            </p>
                            {(item.custom_rental_end_time || item.rental_end_time) && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {(item.custom_rental_end_time || item.rental_end_time).substring(0, 5)}
                              </p>
                            )}
                          </div>
                        </div>

                        {(item.custom_operator_included || item.operator_included) && (
                          <div className="mt-4 bg-white/60 dark:bg-slate-900/60 rounded-lg p-4 border border-green-200 dark:border-green-800 flex items-center gap-3">
                            <User className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">Operator Included</p>
                              {(item.custom_operator_name || item.operator_name) && (
                                <p className="text-xs text-slate-600 dark:text-slate-400">Assigned: {item.custom_operator_name || item.operator_name}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Rental Cost Breakdown - Always show for rental items */}
                        <div suppressHydrationWarning className="mt-6">
                          <RentalPricingBreakdown 
                            item={{
                              pricing_components: pricingComponents,
                              rental_type: item.custom_rental_type || item.rental_type,
                              rental_duration: item.custom_rental_duration || item.rental_duration,
                              rental_start_date: item.custom_rental_start_date || item.rental_start_date,
                              rental_end_date: item.custom_rental_end_date || item.rental_end_date,
                              rental_start_time: item.custom_rental_start_time || item.rental_start_time,
                              rental_end_time: item.custom_rental_end_time || item.rental_end_time,
                              requires_operator: item.custom_requires_operator || item.requires_operator,
                              operator_included: item.custom_operator_included || item.operator_included,
                              operator_name: item.custom_operator_name || item.operator_name,
                              total_rental_cost: totalRentalCost,
                            } as any}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Totals */}
              <div suppressHydrationWarning className="border rounded-lg bg-slate-50 dark:bg-slate-900 p-4">
                <div suppressHydrationWarning className="flex justify-end gap-12">
                  <div suppressHydrationWarning className="space-y-2 text-sm">
                    <div suppressHydrationWarning className="flex justify-between gap-8">
                      <span className="text-slate-500">Net Total:</span>
                      <span className="font-medium">₹{(quotation.net_total || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {(quotation.total_taxes_and_charges || 0) > 0 && (
                      <div suppressHydrationWarning className="flex justify-between gap-8">
                        <span className="text-slate-500">Taxes:</span>
                        <span className="font-medium">₹{(quotation.total_taxes_and_charges || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div suppressHydrationWarning className="flex justify-between gap-8 text-lg font-bold border-t pt-2">
                      <span>Grand Total:</span>
                      <span className="text-slate-900 dark:text-white">₹{(quotation.grand_total || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No items added to this quotation.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      {quotation.terms && (
        <Card>
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {quotation.terms}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Opportunity */}
      {quotation.opportunity && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <Link 
              href={`/crm/opportunities/${encodeURIComponent(quotation.opportunity)}`}
              className="text-blue-600 hover:underline flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View Opportunity: {quotation.opportunity}
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
