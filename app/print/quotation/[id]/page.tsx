import React from "react"
import { frappeRequest } from "@/app/lib/api"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Printer } from "lucide-react"

// Helper: Fetch Quotation
async function getQuotation(id: string) {
  try {
    const doc = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Quotation',
      name: decodeURIComponent(id)
    })
    return doc
  } catch (e) {
    return null
  }
}

// Helper: Fetch Company Details
async function getCompany(companyName: string) {
  try {
    const doc = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Company',
      name: companyName
    })
    return doc
  } catch (e) {
    return {}
  }
}

// Helper: Fetch Bank Details
async function getBankDetails(companyName: string) {
  try {
    const accounts = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Bank Account',
      filters: `[["company", "=", "${companyName}"], ["is_company_account", "=", 1], ["is_default", "=", 1]]`,
      fields: '["bank", "bank_account_no", "branch_code"]',
      limit_page_length: 1
    })
    return accounts[0] || null
  } catch (e) {
    return null
  }
}

export default async function PrintQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const quotation = await getQuotation(id)

  if (!quotation) return <div>Quotation Not Found</div>

  const [company, bank] = await Promise.all([
    getCompany(quotation.company || 'Your Company'),
    getBankDetails(quotation.company || 'Your Company')
  ])

  return (
    <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center">
      
      {/* No-Print Control Bar */}
      <div className="w-full max-w-[210mm] mb-6 flex justify-between items-center print:hidden">
        <Link href={`/crm/quotations/${id}`} className="text-sm text-slate-500 hover:underline">
          &larr; Back to Quotation
        </Link>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Print Quotation
        </Button>
      </div>

      {/* A4 Printable Document */}
      <div className="w-[210mm] min-h-[297mm] bg-white p-12 shadow-lg print:shadow-none print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{company.company_name || "Company Name"}</h1>
            <p className="text-sm text-slate-600 mt-1">{company.email || ""}</p>
            <p className="text-sm text-slate-600">{company.phone_no || ""}</p>
            <p className="text-xs text-slate-500 mt-1">GSTIN: {company.gstin || "Not Set"}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-blue-600">QUOTATION</h2>
            <p className="text-sm text-slate-600 mt-2">Quotation #: <span className="font-medium">{quotation.name}</span></p>
            <p className="text-sm text-slate-600">Date: {new Date(quotation.transaction_date || quotation.creation).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <p className="text-sm text-slate-600">Valid Till: {quotation.valid_till ? new Date(quotation.valid_till).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}</p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-slate-50 p-4 rounded">
            <h3 className="text-xs font-semibold uppercase text-slate-500 mb-2">Bill To</h3>
            <p className="font-semibold text-slate-900">{quotation.customer_name || quotation.party_name}</p>
            <p className="text-sm text-slate-600 mt-1">{quotation.contact_email || ""}</p>
            <p className="text-sm text-slate-600">{quotation.territory || ""}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-300">
              <th className="py-3 px-3 text-left font-semibold text-sm">#</th>
              <th className="py-3 px-3 text-left font-semibold text-sm">Item Description</th>
              <th className="py-3 px-3 text-left font-semibold text-sm">Duration</th>
              <th className="py-3 px-3 text-center font-semibold text-sm">Operator</th>
              <th className="py-3 px-3 text-right font-semibold text-sm">Qty</th>
              <th className="py-3 px-3 text-right font-semibold text-sm">Rate</th>
              <th className="py-3 px-3 text-right font-semibold text-sm">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {quotation.items.map((item: any, idx: number) => {
              const isRental = item.is_rental || item.rental_duration
              const hasRentalBreakdown = item.pricing_components && Object.values(item.pricing_components).some((v: any) => v > 0)

              return (
                <React.Fragment key={idx}>
                  <tr>
                    <td className="py-3 px-3 align-top text-sm">{idx + 1}</td>
                    <td className="py-3 px-3 align-top">
                      <p className="font-medium text-sm">{item.item_name || item.item_code}</p>
                      <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                    </td>
                    <td className="py-3 px-3 align-top text-sm">
                      {isRental ? (
                        <div className="text-xs">
                          <p className="font-medium">{item.rental_duration} {item.rental_type}</p>
                          {item.rental_start_date && (
                            <p className="text-slate-500 mt-0.5">
                              {new Date(item.rental_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              {item.rental_start_time && ` ${item.rental_start_time}`}
                            </p>
                          )}
                          {item.rental_end_date && (
                            <p className="text-slate-500">
                              to {new Date(item.rental_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              {item.rental_end_time && ` ${item.rental_end_time}`}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top text-center text-xs">
                      {item.requires_operator ? (
                        item.operator_included ? (
                          <div>
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Included</span>
                            {item.operator_name && <p className="text-slate-600 mt-1">{item.operator_name}</p>}
                          </div>
                        ) : (
                          <span className="text-slate-400">Required</span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top text-right text-sm">{item.qty}</td>
                    <td className="py-3 px-3 align-top text-right text-sm">₹{item.rate.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 align-top text-right font-medium text-sm">₹{item.amount.toLocaleString('en-IN')}</td>
                  </tr>
                  
                  {/* Rental Pricing Breakdown */}
                  {isRental && hasRentalBreakdown && (
                    <tr className="bg-blue-50/50">
                      <td colSpan={7} className="py-3 px-3">
                        <div className="text-xs">
                          <p className="font-semibold text-slate-700 mb-2">Pricing Breakdown:</p>
                          <div className="grid grid-cols-3 gap-x-6 gap-y-1">
                            {item.pricing_components.base_cost > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Base Cost:</span>
                                <span className="font-medium">₹{item.pricing_components.base_cost.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {item.pricing_components.accommodation_charges > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Accommodation:</span>
                                <span className="font-medium">₹{item.pricing_components.accommodation_charges.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {item.pricing_components.usage_charges > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Usage:</span>
                                <span className="font-medium">₹{item.pricing_components.usage_charges.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {item.pricing_components.fuel_charges > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Fuel:</span>
                                <span className="font-medium">₹{item.pricing_components.fuel_charges.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {item.pricing_components.elongation_charges > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Elongation:</span>
                                <span className="font-medium">₹{item.pricing_components.elongation_charges.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {item.pricing_components.risk_charges > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Risk:</span>
                                <span className="font-medium">₹{item.pricing_components.risk_charges.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {item.pricing_components.commercial_charges > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Commercial:</span>
                                <span className="font-medium">₹{item.pricing_components.commercial_charges.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {item.pricing_components.incidental_charges > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Incidental:</span>
                                <span className="font-medium">₹{item.pricing_components.incidental_charges.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {item.pricing_components.other_charges > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Other:</span>
                                <span className="font-medium">₹{item.pricing_components.other_charges.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-12">
          <div className="w-1/3 space-y-2">
            <div className="flex justify-between px-3 text-sm">
              <span className="text-slate-600">Net Total:</span>
              <span className="font-medium">₹{(quotation.net_total || 0).toLocaleString('en-IN')}</span>
            </div>
            
            {quotation.taxes?.map((tax: any, i: number) => (
              <div key={i} className="flex justify-between px-3 text-sm text-slate-600">
                <span>{tax.description}:</span>
                <span>₹{(tax.tax_amount_after_discount_amount || tax.tax_amount)?.toLocaleString('en-IN')}</span>
              </div>
            ))}
            
            <div className="flex justify-between px-3 py-2 border-t-2 border-slate-900 font-bold text-lg">
              <span>Grand Total:</span>
              <span>₹{(quotation.grand_total || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="text-right text-xs text-slate-500 italic px-3">
              Amount in Words: {quotation.in_words || `${quotation.currency} ${quotation.grand_total}`}
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        {quotation.terms && (
          <div className="mb-8 border-t border-slate-300 pt-6">
            <h4 className="font-bold text-sm mb-2 uppercase">Terms and Conditions</h4>
            <div className="text-xs text-slate-700 whitespace-pre-wrap">
              {quotation.terms}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="grid grid-cols-2 gap-12 border-t border-slate-300 pt-6">
          <div>
            <h4 className="font-bold text-sm mb-2 uppercase">Bank Details</h4>
            {bank ? (
              <div className="text-xs space-y-1">
                <div className="flex justify-between"><span className="text-slate-600">Bank:</span> <span className="font-medium">{bank.bank}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Account No:</span> <span className="font-medium">{bank.bank_account_no}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">IFSC:</span> <span className="font-medium">{bank.branch_code || "—"}</span></div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No bank details available</p>
            )}
          </div>
          
          <div className="text-right">
            <h4 className="font-bold text-sm mb-2 uppercase">Authorized Signatory</h4>
            <div className="mt-12 border-t border-slate-400 inline-block px-8 text-xs font-medium">
              Signature
            </div>
          </div>
        </div>

        {/* Declaration */}
        <div className="mt-8 text-xs text-slate-400 text-center">
          This is a computer-generated quotation and does not require a physical signature.
        </div>
      </div>
    </div>
  )
}
