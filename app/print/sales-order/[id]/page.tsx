import React from "react"
import { frappeRequest } from "@/app/lib/api"
import Link from "next/link"
import { PrintButton } from "./print-page-button"

async function getSalesOrder(id: string) {
  try {
    return await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: decodeURIComponent(id)
    })
  } catch (e) {
    return null
  }
}

async function getCompany(companyName: string) {
  try {
    return await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Company',
      name: companyName
    })
  } catch (e) {
    return {}
  }
}

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

export default async function PrintSalesOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getSalesOrder(id)

  if (!order) return <div className="p-8">Sales Order Not Found</div>

  const [company, bank] = await Promise.all([
    getCompany(order.company || 'Your Company'),
    getBankDetails(order.company || 'Your Company')
  ])

  return (
    <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-[210mm] mb-6 flex justify-between items-center print:hidden">
        <Link href={`/sales-orders/${id}`} className="text-sm text-slate-500 hover:underline">
          &larr; Back to Sales Order
        </Link>
        <PrintButton />
      </div>
      </div>

      <div className="w-[210mm] min-h-[297mm] bg-white p-12 shadow-lg print:shadow-none print:p-0">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{company.company_name || "Company Name"}</h1>
            <p className="text-sm text-slate-600 mt-1">{company.email || ""}</p>
            <p className="text-sm text-slate-600">{company.phone_no || ""}</p>
            <p className="text-xs text-slate-500 mt-1">GSTIN: {company.gstin || "Not Set"}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-green-600">SALES ORDER</h2>
            <p className="text-sm text-slate-600 mt-2">Order #: <span className="font-medium">{order.name}</span></p>
            <p className="text-sm text-slate-600">Date: {new Date(order.transaction_date || order.creation).toLocaleDateString('en-IN')}</p>
            <p className="text-sm text-slate-600">Delivery: {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : "—"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-slate-50 p-4 rounded">
            <h3 className="text-xs font-semibold uppercase text-slate-500 mb-2">Bill To</h3>
            <p className="font-semibold text-slate-900">{order.customer_name}</p>
            <p className="text-sm text-slate-600 mt-1">{order.contact_email || ""}</p>
            <p className="text-sm text-slate-600">{order.territory || ""}</p>
          </div>
        </div>

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
            {order.items.map((item: any, idx: number) => {
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
                    <td className="py-3 px-3 align-top text-sm">{idx + 1}</td>
                    <td className="py-3 px-3 align-top">
                      <p className="font-medium text-sm">{item.item_name || item.item_code}</p>
                      <p className="text-xs text-slate-600 mt-1">{item.description}</p>
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
                    <td className="py-3 px-3 align-top text-right text-sm">{item.qty}</td>
                    <td className="py-3 px-3 align-top text-right text-sm">₹{item.rate.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 align-top text-right font-medium text-sm">₹{item.amount.toLocaleString('en-IN')}</td>
                  </tr>
                  
                  {isRental && hasBreakdown && (
                    <tr className="border-t border-slate-200">
                      <td colSpan={7} className="py-4 px-3">
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

        <div className="flex justify-end mb-12">
          <div className="w-1/3 space-y-2">
            <div className="flex justify-between px-3 text-sm">
              <span className="text-slate-600">Net Total:</span>
              <span className="font-medium">₹{(order.net_total || 0).toLocaleString('en-IN')}</span>
            </div>
            {order.taxes?.map((tax: any, i: number) => (
              <div key={i} className="flex justify-between px-3 text-sm text-slate-600">
                <span>{tax.description}:</span>
                <span>₹{(tax.tax_amount_after_discount_amount || tax.tax_amount)?.toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="flex justify-between px-3 py-2 border-t-2 border-slate-900 font-bold text-lg">
              <span>Grand Total:</span>
              <span>₹{(order.grand_total || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

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
      </div>
    </div>
  )
}
