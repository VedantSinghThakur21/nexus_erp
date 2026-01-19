import React from "react"
import { frappeRequest } from "@/app/lib/api"
import Link from "next/link"
import { PrintButton } from "./print-button"

// Helper: Fetch Invoice
async function getInvoice(id: string) {
  try {
    const doc = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Invoice',
      name: decodeURIComponent(id)
    }) as any
    return doc
  } catch (e) {
    return null
  }
}

// Helper: Fetch Company Details (For GSTIN, Logo, etc.)
async function getCompany(companyName: string) {
  try {
    const doc = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Company',
        name: companyName
    }) as any
    return doc
  } catch (e) {
    return {}
  }
}

// Helper: Fetch Default Bank Account
async function getBankDetails(companyName: string) {
  try {
    const banks = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Bank Account',
        filters: `[["company", "=", "${companyName}"], ["is_default", "=", 1]]`,
        fields: '["bank", "bank_account_no", "branch_code"]', // branch_code often holds IFSC/Sort Code
        limit_page_length: 1
    }) as any[]
    return banks[0] || null
  } catch (e) {
    return null
  }
}

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await getInvoice(id)

  if (!invoice) return <div>Invoice Not Found</div>

  // Fetch company and bank details in parallel
  const [company, bank] = await Promise.all([
    getCompany(invoice.company),
    getBankDetails(invoice.company)
  ])

  return (
    <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center">
      
      {/* No-Print Control Bar */}
      <div className="w-full max-w-[210mm] mb-6 flex justify-between items-center print:hidden">
        <Link href={`/invoices/${id}`} className="text-sm text-slate-500 hover:underline">
            &larr; Back to Dashboard
        </Link>
        <PrintButton />
      </div>

      {/* A4 Paper Container */}
      <div className="w-[210mm] min-h-[297mm] bg-white shadow-lg p-[15mm] text-slate-900 text-sm leading-relaxed print:shadow-none print:w-full">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div>
                <h1 className="text-3xl font-bold uppercase tracking-wide">Tax Invoice</h1>
                <p className="text-slate-500 mt-1">Original for Recipient</p>
            </div>
            <div className="text-right">
                {/* DYNAMIC COMPANY DETAILS */}
                <h2 className="text-xl font-bold">{company.company_name || invoice.company}</h2>
                
                {/* Display Company Address (if available on invoice, else fallback) */}
                <div className="whitespace-pre-wrap text-sm mt-1">
                    {invoice.company_address_display || company.company_description || ""}
                </div>
                
                <p className="mt-1"><strong>GSTIN:</strong> {company.tax_id || "Not Set"}</p>
                <p><strong>Email:</strong> {company.email || "Not Set"}</p>
            </div>
        </div>

        {/* Info Grid */}
        <div className="flex justify-between mb-8">
            <div className="w-1/2">
                <h3 className="font-bold text-slate-500 uppercase text-xs mb-2">Bill To</h3>
                <p className="font-bold text-lg">{invoice.customer_name}</p>
                <p className="whitespace-pre-wrap">{invoice.address_display || "Address not provided"}</p>
                {invoice.gstin && <p className="mt-1"><strong>GSTIN:</strong> {invoice.gstin}</p>}
            </div>
            <div className="w-1/3 text-right space-y-1">
                <div className="flex justify-between">
                    <span className="text-slate-500">Invoice No:</span>
                    <span className="font-mono font-bold">{invoice.name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span>{invoice.posting_date}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Due Date:</span>
                    <span>{invoice.due_date}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Place of Supply:</span>
                    <span>{invoice.place_of_supply || "Not Specified"}</span>
                </div>
            </div>
        </div>

        {/* Table */}
        <table className="w-full mb-8 border-collapse">
            <thead>
                <tr className="bg-slate-100 border-y border-slate-300">
                    <th className="py-2 px-3 text-left font-semibold">#</th>
                    <th className="py-2 px-3 text-left font-semibold">Description</th>
                    <th className="py-2 px-3 text-left font-semibold">Duration</th>
                    <th className="py-2 px-3 text-center font-semibold">Operator</th>
                    <th className="py-2 px-3 text-left font-semibold">HSN/SAC</th>
                    <th className="py-2 px-3 text-right font-semibold">Qty</th>
                    <th className="py-2 px-3 text-right font-semibold">Rate</th>
                    <th className="py-2 px-3 text-right font-semibold">Amount</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item: any, idx: number) => {
                    const isRental = item.custom_is_rental
                    const hasBreakdown = (
                        (item.custom_base_rental_cost && item.custom_base_rental_cost > 0) ||
                        (item.custom_accommodation_charges && item.custom_accommodation_charges > 0) ||
                        (item.custom_usage_charges && item.custom_usage_charges > 0) ||
                        (item.custom_fuel_charges && item.custom_fuel_charges > 0) ||
                        (item.custom_elongation_charges && item.custom_elongation_charges > 0) ||
                        (item.custom_risk_charges && item.custom_risk_charges > 0) ||
                        (item.custom_commercial_charges && item.custom_commercial_charges > 0) ||
                        (item.custom_incidental_charges && item.custom_incidental_charges > 0) ||
                        (item.custom_other_charges && item.custom_other_charges > 0)
                    )

                    return (
                        <React.Fragment key={idx}>
                            <tr>
                                <td className="py-3 px-3 align-top">{idx + 1}</td>
                                <td className="py-3 px-3 align-top">
                                    <p className="font-medium">{item.item_name || item.item_code}</p>
                                    <p className="text-slate-500 text-xs mt-1">{item.description}</p>
                                </td>
                                <td className="py-3 px-3 align-top text-sm">
                                    {isRental ? (
                                        <div className="text-xs">
                                            <p className="font-medium">{item.custom_rental_duration} {item.custom_rental_type}</p>
                                            {item.custom_rental_start_date && (
                                                <p className="text-slate-500 mt-0.5">
                                                    {new Date(item.custom_rental_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                    {item.custom_rental_start_time && ` ${item.custom_rental_start_time}`}
                                                </p>
                                            )}
                                            {item.custom_rental_end_date && (
                                                <p className="text-slate-500">
                                                    to {new Date(item.custom_rental_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                    {item.custom_rental_end_time && ` ${item.custom_rental_end_time}`}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-xs">—</span>
                                    )}
                                </td>
                                <td className="py-3 px-3 align-top text-center text-xs">
                                    {item.custom_requires_operator ? (
                                        item.custom_operator_included ? (
                                            <div>
                                                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Included</span>
                                                {item.custom_operator_name && <p className="text-slate-600 mt-1">{item.custom_operator_name}</p>}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">Required</span>
                                        )
                                    ) : (
                                        <span className="text-slate-400">—</span>
                                    )}
                                </td>
                                <td className="py-3 px-3 align-top">{item.gst_hsn_code || "—"}</td>
                                <td className="py-3 px-3 align-top text-right">{item.qty}</td>
                                <td className="py-3 px-3 align-top text-right">{item.rate.toLocaleString()}</td>
                                <td className="py-3 px-3 align-top text-right font-bold">{item.amount.toLocaleString()}</td>
                            </tr>

                            {isRental && hasBreakdown && (
                                <tr className="border-t border-slate-200">
                                    <td colSpan={8} className="py-4 px-3">
                                        <div className="pl-8">
                                            <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-3 border-b border-slate-300 pb-2">
                                                Rate Breakdown
                                            </p>
                                            <div className="grid grid-cols-3 gap-x-8 gap-y-2">
                                                {item.custom_base_rental_cost > 0 && (
                                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                                        <span className="text-xs text-slate-600">Base Cost</span>
                                                        <span className="text-xs font-semibold text-slate-900">₹{item.custom_base_rental_cost.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                                {item.custom_accommodation_charges > 0 && (
                                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                                        <span className="text-xs text-slate-600">Accommodation</span>
                                                        <span className="text-xs font-semibold text-slate-900">₹{item.custom_accommodation_charges.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                                {item.custom_usage_charges > 0 && (
                                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                                        <span className="text-xs text-slate-600">Usage Charges</span>
                                                        <span className="text-xs font-semibold text-slate-900">₹{item.custom_usage_charges.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                                {item.custom_fuel_charges > 0 && (
                                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                                        <span className="text-xs text-slate-600">Fuel</span>
                                                        <span className="text-xs font-semibold text-slate-900">₹{item.custom_fuel_charges.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                                {item.custom_elongation_charges > 0 && (
                                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                                        <span className="text-xs text-slate-600">Elongation</span>
                                                        <span className="text-xs font-semibold text-slate-900">₹{item.custom_elongation_charges.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                                {item.custom_risk_charges > 0 && (
                                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                                        <span className="text-xs text-slate-600">Risk</span>
                                                        <span className="text-xs font-semibold text-slate-900">₹{item.custom_risk_charges.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                                {item.custom_commercial_charges > 0 && (
                                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                                        <span className="text-xs text-slate-600">Commercial</span>
                                                        <span className="text-xs font-semibold text-slate-900">₹{item.custom_commercial_charges.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                                {item.custom_incidental_charges > 0 && (
                                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                                        <span className="text-xs text-slate-600">Incidental</span>
                                                        <span className="text-xs font-semibold text-slate-900">₹{item.custom_incidental_charges.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                                {item.custom_other_charges > 0 && (
                                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                                        <span className="text-xs text-slate-600">Other</span>
                                                        <span className="text-xs font-semibold text-slate-900">₹{item.custom_other_charges.toLocaleString('en-IN')}</span>
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

        {/* Totals & Tax */}
        <div className="flex justify-end mb-12">
            <div className="w-1/2 space-y-2">
                <div className="flex justify-between px-3">
                    <span>Subtotal</span>
                    <span>{invoice.net_total?.toLocaleString()}</span>
                </div>
                
                {/* Dynamic Tax Rows */}
                {invoice.taxes?.map((tax: any, i: number) => (
                     <div key={i} className="flex justify-between px-3 text-slate-600">
                        <span>{tax.description}</span>
                        <span>{tax.tax_amount_after_discount_amount?.toLocaleString() || tax.tax_amount.toLocaleString()}</span>
                    </div>
                ))}

                <div className="flex justify-between px-3 py-2 border-t-2 border-slate-900 font-bold text-lg mt-2">
                    <span>Grand Total</span>
                    <span>₹ {invoice.grand_total?.toLocaleString()}</span>
                </div>
                <div className="text-right text-xs text-slate-500 italic px-3">
                    Amount in Words: {invoice.in_words || "Rupees ... Only"}
                </div>
            </div>
        </div>

        {/* Footer Grid */}
        <div className="grid grid-cols-2 gap-12 border-t border-slate-300 pt-6">
            <div>
                <h4 className="font-bold text-sm mb-2 uppercase">Bank Details</h4>
                {/* DYNAMIC BANK DETAILS */}
                {bank ? (
                    <div className="text-sm space-y-1">
                        <p><span className="text-slate-500 w-20 inline-block">Bank:</span> {bank.bank}</p>
                        <p><span className="text-slate-500 w-20 inline-block">A/C No:</span> {bank.bank_account_no}</p>
                        <p><span className="text-slate-500 w-20 inline-block">IFSC:</span> {bank.branch_code || "—"}</p>
                    </div>
                ) : (
                    <div className="text-sm text-slate-400 italic">
                        No default bank account set in ERPNext.
                    </div>
                )}
            </div>
            <div className="text-right flex flex-col justify-between">
                <div>
                    <h4 className="font-bold text-sm">For {company.company_name || invoice.company}</h4>
                </div>
                <div className="h-20" /> 
                <p className="text-xs text-slate-500">Authorised Signatory</p>
            </div>
        </div>

        {/* Declaration */}
        <div className="mt-8 text-xs text-slate-400 text-center">
            We declare that this invoice shows the actual price of the goods/services described and all particulars are true and correct.
        </div>

      </div>
    </div>
  )
}
