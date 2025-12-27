import { getQuotation } from "@/app/actions/crm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, FileText, Building2, Pencil, Printer, Clock, User } from "lucide-react"
import Link from "next/link"
import { DeleteQuotationButton } from "@/components/crm/delete-quotation-button"
import { RentalPricingBreakdown } from "@/components/crm/rental-pricing-breakdown"

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
    <div className="p-8 space-y-6">
      {/* Back Button */}
      <Link href="/crm/quotations">
        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" /> Back to Quotations
        </Button>
      </Link>

      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {quotation.name}
          </h1>
          <p className="text-slate-500">
            {quotation.quotation_to === 'Customer' ? 'Customer' : 'Lead'}: {quotation.customer_name || quotation.party_name}
          </p>
        </div>
        <div className="flex gap-2 items-center">
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
          <Badge className={statusColors[quotation.status] || 'bg-slate-100 text-slate-800'}>
            {quotation.status}
          </Badge>
          {isExpired && quotation.status === 'Open' && (
            <Badge className="bg-orange-100 text-orange-800">Expired</Badge>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
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
            <div className={`text-lg font-semibold ${isExpired ? 'text-red-600' : ''}`}>
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
            <div className="text-lg font-semibold">{quotation.currency || 'INR'}</div>
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
            <div className="space-y-4">
              {quotation.items.map((item: Record<string, any>, idx: number) => {
                const isRental = item.custom_is_rental || item.is_rental
                const rentalData = item.custom_rental_data ? 
                  (typeof item.custom_rental_data === 'string' ? JSON.parse(item.custom_rental_data) : item.custom_rental_data) : 
                  null
                
                return (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    {/* Item Header */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b">
                      <div className="flex justify-between items-start">
                        <div>
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
                    <div className="p-4 grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Item Code</p>
                        <p className="font-medium">{item.item_code || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Quantity</p>
                        <p className="font-medium">{item.qty || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Rate</p>
                        <p className="font-medium">₹{(item.rate || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Amount</p>
                        <p className="font-medium text-lg">₹{(item.amount || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Rental Details */}
                    {isRental && (
                      <div className="border-t bg-slate-50/50 dark:bg-slate-900/50 p-4">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Rental Details
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-slate-500">Rental Type</p>
                            <p className="font-medium capitalize">{item.custom_rental_type || item.rental_type || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Duration</p>
                            <p className="font-medium">{item.custom_rental_duration || item.rental_duration || 'N/A'} {item.custom_rental_type || item.rental_type || ''}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Start Date</p>
                            <p className="font-medium">
                              {item.custom_rental_start_date || item.rental_start_date ? 
                                new Date(item.custom_rental_start_date || item.rental_start_date).toLocaleDateString('en-IN') : 
                                'N/A'}
                              {(item.custom_rental_start_time || item.rental_start_time) && (
                                <span className="text-xs ml-1">{item.custom_rental_start_time || item.rental_start_time}</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">End Date</p>
                            <p className="font-medium">
                              {item.custom_rental_end_date || item.rental_end_date ? 
                                new Date(item.custom_rental_end_date || item.rental_end_date).toLocaleDateString('en-IN') : 
                                'N/A'}
                              {(item.custom_rental_end_time || item.rental_end_time) && (
                                <span className="text-xs ml-1">{item.custom_rental_end_time || item.rental_end_time}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {(item.custom_operator_included || item.operator_included) && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                            <User className="h-4 w-4" />
                            <span>Operator Included</span>
                          </div>
                        )}

                        {/* Rental Cost Breakdown - Always show for rental items */}
                        <div className="mt-4">
                          <RentalPricingBreakdown 
                            components={{
                              base_cost: item.custom_base_rental_cost || (rentalData?.baseRentalCost) || 0,
                              accommodation_charges: item.custom_accommodation_charges || (rentalData?.accommodationCost) || 0,
                              usage_charges: item.custom_usage_charges || (rentalData?.usageCost) || 0,
                              fuel_charges: item.custom_fuel_charges || (rentalData?.fuelCost) || 0,
                              elongation_charges: item.custom_elongation_charges || (rentalData?.elongationCost) || 0,
                              risk_charges: item.custom_risk_charges || (rentalData?.riskCost) || 0,
                              commercial_charges: item.custom_commercial_charges || (rentalData?.commercialCost) || 0,
                              incidental_charges: item.custom_incidental_charges || (rentalData?.incidentalCost) || 0,
                              other_charges: item.custom_other_charges || (rentalData?.otherCost) || 0,
                            }}
                            totalCost={item.custom_total_rental_cost || (rentalData?.totalCost) || item.rate || 0}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Totals */}
              <div className="border rounded-lg bg-slate-50 dark:bg-slate-900 p-4">
                <div className="flex justify-end gap-12">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-8">
                      <span className="text-slate-500">Net Total:</span>
                      <span className="font-medium">₹{(quotation.net_total || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {(quotation.total_taxes_and_charges || 0) > 0 && (
                      <div className="flex justify-between gap-8">
                        <span className="text-slate-500">Taxes:</span>
                        <span className="font-medium">₹{(quotation.total_taxes_and_charges || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-8 text-lg font-bold border-t pt-2">
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
