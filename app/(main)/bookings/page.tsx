import { getBookings } from "@/app/actions/bookings"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Truck } from "lucide-react"
import Link from "next/link"

export default async function BookingsPage() {
  const bookings = await getBookings()

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Rental Bookings</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage active and upcoming rentals</p>
        </div>
      </div>

      <div className="grid gap-4">
        {bookings.length === 0 ? (
           <div className="p-12 text-center border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
             <p className="text-slate-500">No active bookings found.</p>
             <p className="text-sm text-slate-400 mt-1">Go to the Fleet page to book a machine.</p>
           </div>
        ) : (
           bookings.map((booking) => (
            <Link key={booking.name} href={`/bookings/${booking.name}`}>
                <Card className="group hover:shadow-md transition-all cursor-pointer border-slate-200 dark:border-slate-800">
                    <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        
                        {/* Left: Customer & Asset */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                    {booking.customer_name}
                                </h3>
                                <Badge variant={booking.status === 'Draft' ? 'outline' : 'default'} className={
                                    booking.status === 'Completed' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' : ''
                                }>
                                    {booking.status}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Truck className="h-4 w-4" /> 
                                    {booking.po_no?.replace('RENT-', '') || 'Unknown Asset'}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" /> 
                                    Start: {booking.delivery_date}
                                </span>
                            </div>
                        </div>

                        {/* Right: Amount & ID */}
                        <div className="text-left sm:text-right">
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                                ${booking.grand_total.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-1">{booking.name}</p>
                        </div>

                    </CardContent>
                </Card>
            </Link>
           ))
        )}
      </div>
    </div>
  )
}
