import { getBooking } from "@/app/actions/bookings"
import { getOperators } from "@/app/actions/operators"
import { getAssetInspections } from "@/app/actions/inspections"
import { frappeRequest } from "@/app/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Truck, User, HardHat, FileText, ClipboardCheck, CheckCircle2, Circle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { MobilizeDialog } from "@/components/bookings/mobilize-dialog"
import { BookingActions } from "@/components/bookings/booking-actions"

export const dynamic = 'force-dynamic'

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const booking = await getBooking(id)
    const operators = await getOperators()

    if (!booking) return <div className="p-8">Booking not found</div>

    const assetName = booking.po_no?.replace('RENT-', '') || booking.items?.[0]?.item_code || ''

    // Derive item_code: prefer from items child table; fall back to stripping timestamp from po_no
    // po_no format is "RENT-{itemCode}-{timestamp}" so strip prefix + suffix
    let itemCode = booking.items?.[0]?.item_code || ''
    if (!itemCode && booking.po_no?.startsWith('RENT-')) {
        const stripped = booking.po_no.replace(/^RENT-/, '')
        // Remove trailing -timestamp (13-digit epoch)
        itemCode = stripped.replace(/-\d{13}$/, '')
    }

    // Fetch linked inspections: by item_code AND by delivery notes for this sales order
    let inspections: any[] = []
    try {
        inspections = await getAssetInspections(itemCode, booking.name)
    } catch { /* ignore */ }

    // Extract operator from delivery note
    let assignedOperator = "";
    try {
        if (booking.per_delivered >= 100) {
            const deliveryNotes = await frappeRequest('frappe.client.get_list', 'GET', {
                doctype: 'Delivery Note',
                filters: `[["customer", "=", "${booking.customer}"], ["docstatus", "!=", 2]]`,
                fields: '["name", "instructions"]',
                order_by: 'creation desc',
                limit_page_length: 1
            }) as Array<{ name: string; instructions: string }>;

            if (deliveryNotes?.[0]?.instructions) {
                const match = deliveryNotes[0].instructions.match(/Operator:\s*(.+?)(?:\||$)/);
                if (match) assignedOperator = match[1].trim();
            }
        }
    } catch { /* ignore */ }

    const isMobilized = booking.per_delivered >= 100;
    const isReturned = booking.status === 'Completed';
    const isCompleted = booking.status === 'Completed' || booking.status === 'Cancelled';
    const hasInspection = inspections.length > 0;

    // Workflow steps
    const steps = [
        { label: 'Booked', done: true },
        { label: 'Operator', done: !!assignedOperator },
        { label: 'Inspected', done: hasInspection },
        { label: 'Mobilized', done: isMobilized },
        { label: 'Returned', done: isReturned },
    ]

    return (
        <div className="max-w-5xl mx-auto p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/bookings">
                        <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Booking #{booking.name}
                            </h1>
                            <Badge
                                variant={isCompleted ? 'secondary' : booking.status === 'Draft' ? 'outline' : 'default'}
                                className={isReturned ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' : ''}
                            >
                                {booking.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">Created on {booking.transaction_date}</p>
                    </div>
                </div>

                {!isCompleted && (
                    <div className="flex gap-2">
                        {!isMobilized ? (
                            <MobilizeDialog booking={booking} operators={operators} />
                        ) : (
                            <BookingActions
                                bookingId={booking.name}
                                isMobilized={isMobilized}
                                isReturned={isReturned}
                                assetName={assetName}
                            />
                        )}
                    </div>
                )}

                {/* Show Create Invoice even after completion */}
                {isReturned && (
                    <div className="flex gap-2">
                        <BookingActions
                            bookingId={booking.name}
                            isMobilized={isMobilized}
                            isReturned={isReturned}
                            assetName={assetName}
                        />
                    </div>
                )}
            </div>

            {/* Workflow Progress Tracker */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between max-w-xl mx-auto">
                        {steps.map((step, i) => (
                            <div key={step.label} className="flex items-center">
                                <div className="flex flex-col items-center gap-1.5">
                                    {step.done ? (
                                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                                    ) : (
                                        <Circle className="h-6 w-6 text-slate-300" />
                                    )}
                                    <span className={`text-xs font-medium ${step.done ? 'text-green-700' : 'text-slate-400'}`}>
                                        {step.label}
                                    </span>
                                </div>
                                {i < steps.length - 1 && (
                                    <ArrowRight className={`h-4 w-4 mx-3 mb-5 ${step.done ? 'text-green-400' : 'text-slate-200'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Rental Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Truck className="h-5 w-5 text-blue-600" />
                            Rental Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-muted-foreground">Asset / Item</span>
                            <span className="font-medium font-mono">{assetName}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-muted-foreground">Start Date</span>
                            <span className="font-medium">{booking.transaction_date}</span>
                        </div>
                        {booking.items?.[0] && (
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-muted-foreground">End Date</span>
                                <span className="font-medium">{booking.items[0].delivery_date}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-2">
                            <span className="text-muted-foreground">Rate</span>
                            <span className="font-medium">₹{booking.items?.[0]?.rate?.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="mt-4 p-3 bg-slate-50 dark:bg-background rounded border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-slate-600 ">Logistics Status</span>
                                <span className={isMobilized ? (isReturned ? "text-blue-600 font-bold" : "text-green-600 font-bold") : "text-orange-500 font-bold"}>
                                    {isReturned ? "Returned" : isMobilized ? "On Site" : "Pending Dispatch"}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {/* Customer Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5 text-purple-600" />
                                Customer Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-muted-foreground">Customer</span>
                                <span className="font-medium">{booking.customer_name}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-muted-foreground">Total Value</span>
                                <span className="font-bold text-lg">₹{booking.grand_total?.toLocaleString('en-IN')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Crew & Logistics (when mobilized) */}
                    {isMobilized && assignedOperator && (
                        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <HardHat className="h-5 w-5 text-orange-600" />
                                    Crew & Logistics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground text-sm">Assigned Operator</span>
                                    <Badge variant="outline" className="bg-card dark:bg-slate-950 font-medium">
                                        {assignedOperator}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                    <FileText className="h-3 w-3" />
                                    <span>Delivery Note Generated</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Linked Inspections */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ClipboardCheck className="h-5 w-5 text-teal-600" />
                            Inspections
                        </CardTitle>
                        {!isCompleted && (
                            <Link href={`/inspections/new?booking=${booking.name}&asset=${encodeURIComponent(itemCode || assetName)}`}>
                                <Button variant="outline" size="sm">
                                    <ClipboardCheck className="h-4 w-4 mr-2" />
                                    New Inspection
                                </Button>
                            </Link>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {inspections.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No inspections recorded yet</p>
                    ) : (
                        <div className="divide-y">
                            {inspections.map((insp: any) => (
                                <Link key={insp.name} href={`/inspections/${insp.name}`} className="flex items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-background/50 px-2 rounded transition-colors">
                                    <div>
                                        <p className="text-sm font-medium">{insp.inspection_type}</p>
                                        <p className="text-xs text-muted-foreground">{insp.report_date} • By {insp.inspected_by}</p>
                                    </div>
                                    <Badge variant={insp.status === 'Accepted' ? 'default' : 'secondary'}
                                        className={insp.status === 'Accepted' ? 'bg-green-100 text-green-700' : ''}
                                    >
                                        {insp.status}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Navigation */}
            <div className="flex gap-3 text-sm">
                <Link href={`/sales-orders/${encodeURIComponent(booking.name)}`} className="text-blue-600 hover:underline flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    View Sales Order
                </Link>
            </div>
        </div>
    )
}
