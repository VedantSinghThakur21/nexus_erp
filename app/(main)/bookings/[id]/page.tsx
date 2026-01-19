import { getBooking, returnAsset } from "@/app/actions/bookings"
import { getOperators } from "@/app/actions/operators"
import { frappeRequest } from "@/app/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Truck, User, CheckCircle2, HardHat, FileText } from "lucide-react"
import Link from "next/link"
import { MobilizeDialog } from "@/components/bookings/mobilize-dialog"
import { BookingActions } from "@/components/bookings/booking-actions"

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const booking = await getBooking(id)
  const operators = await getOperators()

  if (!booking) return <div className="p-8">Booking not found</div>

  const assetName = booking.po_no?.replace('RENT-', '')
  
  // Extract operator from delivery note instructions field
  let assignedOperator = "Not Assigned";
  try {
    if (booking.per_delivered >= 100) {
      // Try to fetch the delivery note
      const deliveryNotes = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Delivery Note',
        filters: `[["customer", "=", "${booking.customer}"], ["docstatus", "!=", 2]]`,
        fields: '["name", "instructions"]',
        order_by: 'creation desc',
        limit_page_length: 1
      }) as Array<{ name: string; instructions: string }>;
      
      if (deliveryNotes && deliveryNotes.length > 0 && deliveryNotes[0].instructions) {
        const match = deliveryNotes[0].instructions.match(/Operator:\s*(.+?)(?:\||$)/);
        if (match) {
          assignedOperator = match[1].trim();
        }
      }
    }
  } catch (e) {
    console.error('Error fetching operator:', e);
  }

  const isMobilized = booking.per_delivered >= 100;
  const isCompleted = booking.status === 'Completed' || booking.status === 'Cancelled';

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link href="/bookings">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Booking #{booking.name}
                    </h1>
                    <Badge 
                        variant={booking.status === 'Completed' ? 'secondary' : booking.status === 'Draft' ? 'outline' : 'default'}
                        className={booking.status === 'Completed' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' : ''}
                    >
                        {booking.status}
                    </Badge>
                </div>
                <p className="text-slate-500">Created on {booking.transaction_date}</p>
            </div>
        </div>

        {!isCompleted && (
            <div className="flex gap-2">
                {!isMobilized ? (
                    <MobilizeDialog booking={booking} operators={operators} />
                ) : (
                    <BookingActions bookingId={booking.name} />
                )}
            </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    Rental Details
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Asset ID</span>
                    <span className="font-medium font-mono">{assetName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Start Date</span>
                    <span className="font-medium">{booking.delivery_date}</span>
                </div>
                {booking.items?.[0] && (
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">End Date</span>
                        <span className="font-medium">{booking.items[0].delivery_date}</span>
                    </div>
                )}
                 <div className="flex justify-between py-2">
                    <span className="text-slate-500">Daily Rate</span>
                    <span className="font-medium">₹{booking.items?.[0]?.rate?.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Logistics Status</span>
                        <span className={isMobilized ? "text-green-600 font-bold" : "text-orange-500 font-bold"}>
                            {isMobilized ? "On Site" : "Pending Dispatch"}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5 text-purple-600" />
                        Customer Info
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Customer</span>
                        <span className="font-medium">{booking.customer_name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Total Value</span>
                        <span className="font-bold text-lg">₹{booking.grand_total?.toLocaleString('en-IN')}</span>
                    </div>
                </CardContent>
            </Card>

            {isMobilized && (
                <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <HardHat className="h-5 w-5 text-orange-600" />
                            Crew & Logistics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-sm">Assigned Operator</span>
                            <Badge variant="outline" className="bg-white dark:bg-slate-950 font-medium">
                                {assignedOperator}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                            <FileText className="h-3 w-3" />
                            <span>Delivery Note Generated</span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  )
}
