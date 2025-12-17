import { frappeRequest } from "@/app/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building2 } from "lucide-react"
import Link from "next/link"
import { InvoiceActions } from "@/components/invoices/invoice-actions"

// Fetch single invoice with child items
async function getInvoice(id: string) {
  const name = decodeURIComponent(id)
  try {
    // Fetch full document including child tables (items, taxes)
    const doc = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Invoice',
      name: name
    })
    return doc
  } catch (e) {
    console.error("Error fetching invoice:", e)
    return null
  }
}

// Fetch Bank Details (for display)
async function getBankDetails(companyName: string) {
  try {
    const banks = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Bank Account',
        filters: `[["company", "=", "${companyName}"], ["is_default", "=", 1]]`,
        fields: '["bank", "bank_account_no", "branch_code"]',
        limit_page_length: 1
    })
    return banks[0] || null
  } catch (e) {
    return null
  }
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await getInvoice(id)

  if (!invoice) return <div className="p-8">Invoice not found</div>

  // Fetch bank details based on the invoice's company
  const bank = await getBankDetails(invoice.company)

  // Calculate tax values if not provided explicitly in taxes array (Fallback for display)
  const totalTax = invoice.total_taxes_and_charges || 0;
  const grandTotal = invoice.grand_total || 0;
  const netTotal = invoice.net_total || 0;

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* Header Navigation & Actions */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link href="/invoices">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{invoice.name}</h1>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        invoice.status === 'Paid' ? 'bg-green-100 text-green-800' : 
                        invoice.status === 'Overdue' ? 'bg-red-100 text-red-800' : 
                        invoice.docstatus === 2 ? 'bg-slate-200 text-slate-600' : 
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                        {invoice.status}
                    </span>
                </div>
                <p className="text-slate-500">{invoice.customer_name}</p>
            </div>
        </div>
        
        {/* Actions Component (Submit, Cancel, Print) */}
        <InvoiceActions invoice={invoice} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Invoice Data */}
        <Card className="md:col-span-2">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-base">Invoice Items</CardTitle>
                    <span className="text-xs text-slate-500 uppercase font-medium">{invoice.currency}</span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Items Table */}
                <div>
                    <div className="grid grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-xs font-medium text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <div className="col-span-1">#</div>
                        <div className="col-span-5">Item & Description</div>
                        <div className="col-span-2">HSN/SAC</div>
                        <div className="col-span-1 text-right">Qty</div>
                        <div className="col-span-3 text-right">Amount</div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {invoice.items?.map((item: any, idx: number) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                <div className="col-span-1 text-slate-500">{idx + 1}</div>
                                <div className="col-span-5">
                                    <div className="font-medium">{item.item_name || item.item_code}</div>
                                    {item.description && (
                                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</div>
                                    )}
                                </div>
                                <div className="col-span-2 text-xs text-slate-500 flex items-center">{item.gst_hsn_code || "—"}</div>
                                <div className="col-span-1 text-right">{item.qty}</div>
                                <div className="col-span-3 text-right font-medium">{item.amount.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals Section */}
                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col gap-2 max-w-[250px] ml-auto">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Net Total</span>
                            <span className="text-slate-700 dark:text-slate-300">{netTotal.toLocaleString()}</span>
                        </div>
                        
                        {/* Tax Breakdown */}
                        {invoice.taxes?.length > 0 ? (
                            invoice.taxes.map((tax: any, i: number) => (
                                <div key={i} className="flex justify-between text-xs text-slate-500">
                                    <span>{tax.description}</span>
                                    <span>{(tax.tax_amount_after_discount_amount || tax.tax_amount)?.toLocaleString()}</span>
                                </div>
                            ))
                        ) : (
                            /* Fallback if taxes array is empty but total tax exists */
                            totalTax > 0 && (
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Total Tax</span>
                                    <span>{totalTax.toLocaleString()}</span>
                                </div>
                            )
                        )}

                        <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-3 mt-1 text-slate-900 dark:text-white">
                            <span>Grand Total</span>
                            <span>{invoice.currency} {grandTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Right Column: Meta Info */}
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Details</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Invoice Date</label>
                        <p className="font-medium text-slate-900 dark:text-white">{invoice.posting_date}</p>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Due Date</label>
                        <p className="font-medium text-slate-900 dark:text-white">{invoice.due_date}</p>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Place of Supply</label>
                        <p className="font-medium text-slate-900 dark:text-white">{invoice.place_of_supply || "—"}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Bank Details</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                     {bank ? (
                        <>
                            <div className="flex justify-between"><span>Bank:</span> <span className="font-medium text-slate-900 dark:text-white">{bank.bank}</span></div>
                            <div className="flex justify-between"><span>A/C No:</span> <span className="font-medium text-slate-900 dark:text-white">{bank.bank_account_no}</span></div>
                            <div className="flex justify-between"><span>IFSC:</span> <span className="font-medium text-slate-900 dark:text-white">{bank.branch_code || "—"}</span></div>
                        </>
                    ) : (
                        <p className="italic text-xs">No bank details linked.</p>
                    )}
                </CardContent>
            </Card>

            <div className="text-xs text-slate-400 px-2 text-center">
                This is a computer generated invoice.
            </div>
        </div>
      </div>
    </div>
  )
}
