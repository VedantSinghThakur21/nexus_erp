import { getFleet } from "@/app/actions/fleet"
import { getBookings } from "@/app/actions/bookings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Truck, MapPin, Activity, AlertTriangle, Plus } from "lucide-react"
import Link from "next/link"
import { BookingDialog } from "@/components/fleet/booking-dialog"
import { FleetCalendar } from "@/components/fleet/fleet-calendar"

export default async function FleetPage() {
  const fleet = await getFleet()
  const bookings = await getBookings()

  // Calculate Fleet Stats
  const totalAssets = fleet.length
  const available = fleet.filter(a => a.status === 'Active').length
  const maintenance = fleet.filter(a => a.status === 'Maintenance').length

  return (
    <div className="p-8 space-y-8" suppressHydrationWarning>
      <div className="flex justify-between items-center" suppressHydrationWarning>
        <div suppressHydrationWarning>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Fleet Manager</h1>
          <p className="text-slate-500 dark:text-slate-400">Track equipment location and status</p>
        </div>
        
        <Link href="/fleet/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Add Machine
            </Button>
        </Link>
        
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3" suppressHydrationWarning>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fleet</CardTitle>
            <Truck className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent suppressHydrationWarning>
            <div className="text-2xl font-bold" suppressHydrationWarning>{totalAssets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available to Rent</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent suppressHydrationWarning>
            <div className="text-2xl font-bold text-green-600" suppressHydrationWarning>{available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent suppressHydrationWarning>
            <div className="text-2xl font-bold text-orange-600" suppressHydrationWarning>{maintenance}</div>
          </CardContent>
        </Card>
      </div>

      {/* --- NEW: Visual Availability Calendar --- */}
      <FleetCalendar assets={fleet} bookings={bookings} />

      {/* Asset Grid */}
      <div className="space-y-4" suppressHydrationWarning>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">All Machines</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" suppressHydrationWarning>
            {fleet.length === 0 ? (
                <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg" suppressHydrationWarning>
                    <div className="flex justify-center mb-4" suppressHydrationWarning>
                        <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-full" suppressHydrationWarning>
                            <Truck className="h-8 w-8 text-slate-400" />
                        </div>
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No machines found</h3>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                        Your fleet is empty. Add your first machine to start tracking inventory.
                    </p>
                    <div className="mt-6" suppressHydrationWarning>
                        <Link href="/fleet/new">
                            <Button variant="outline">Register First Machine</Button>
                        </Link>
                    </div>
                </div>
            ) : (
                fleet.map((asset) => (
                <Card key={asset.name} className="hover:shadow-lg transition-all group flex flex-col h-full overflow-hidden">
                    <Link href={`/fleet/${asset.name}`} className="flex-1 cursor-pointer">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start" suppressHydrationWarning>
                                <Badge variant="outline" className="font-mono text-xs text-slate-500">
                                    {asset.name}
                                </Badge>
                                <Badge className={`${
                                    asset.status === 'Active' ? 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300' :
                                    asset.status === 'Maintenance' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-300' :
                                    'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300'
                                }`}>
                                    {asset.status}
                                </Badge>
                            </div>
                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white mt-2 group-hover:text-blue-600 transition-colors">
                                {asset.item_name || asset.item_code}
                            </CardTitle>
                        </CardHeader>
                        <CardContent suppressHydrationWarning>
                            <div className="space-y-3 text-sm" suppressHydrationWarning>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400" suppressHydrationWarning>
                                    <MapPin className="h-4 w-4" />
                                    <span>{asset.warehouse || "Unknown Location"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Link>

                    <div className="p-6 pt-0 mt-auto" suppressHydrationWarning>
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2" suppressHydrationWarning>
                            <Link href={`/fleet/${asset.name}`} className="w-full">
                                <Button variant="secondary" size="sm" className="w-full text-xs h-8">View History</Button>
                            </Link>
                            <div className="w-full" suppressHydrationWarning>
                                <BookingDialog asset={asset} />
                            </div>
                        </div>
                    </div>
                </Card>
                ))
            )}
        </div>
      </div>
    </div>
  )
}
