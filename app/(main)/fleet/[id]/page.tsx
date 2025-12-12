import { getAsset } from "@/app/actions/fleet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Calendar, Activity, History } from "lucide-react"
import Link from "next/link"
import { BookingDialog } from "@/components/fleet/booking-dialog"

export default async function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const machine = await getAsset(id)

  if (!machine) return <div className="p-8">Machine not found</div>

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link href="/fleet">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {machine.item_name || machine.item_code}
                    </h1>
                    <Badge className={`${
                        machine.status === 'Active' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                        machine.status === 'Maintenance' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                        'bg-blue-100 text-blue-700 hover:bg-blue-100'
                    }`}>
                        {machine.status}
                    </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-slate-500">
                    <span className="font-mono text-xs border px-2 py-0.5 rounded">{machine.name}</span>
                    <span className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3" /> {machine.warehouse}</span>
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline">Maintenance Log</Button>
            
            {/* The Booking Dialog Component */}
            <BookingDialog asset={machine} />
            
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Main Stats */}
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Technical Specifications</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Brand</label>
                        <p className="text-lg font-medium">{machine.brand || "—"}</p>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Model</label>
                        <p className="text-lg font-medium">{machine.item_code}</p>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Purchase Date</label>
                        <p className="text-slate-700 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {machine.purchase_date || "Unknown"}
                        </p>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Warranty</label>
                        <p className="text-slate-700 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-slate-400" />
                            {machine.warranty_expiry_date || "Expired / None"}
                        </p>
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-500 uppercase">Notes</label>
                        <p className="text-slate-600 mt-1 bg-slate-50 p-3 rounded-md text-sm">
                            {machine.details || "No specific notes recorded for this machine."}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Sidebar Status */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Utilization (This Month)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-slate-900">72%</div>
                    <div className="h-2 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-blue-600 w-[72%]" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">18 days rented out of 25 working days.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3 text-sm">
                            <div className="mt-0.5">
                                <History className="h-4 w-4 text-slate-400" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">Returned from Site A</p>
                                <p className="text-xs text-slate-500">2 days ago • Inspection Passed</p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
