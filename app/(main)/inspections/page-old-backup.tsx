import { getInspections } from "@/app/actions/inspections"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClipboardCheck, Plus, ArrowRight, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function InspectionsPage() {
  const inspections = await getInspections()

  const stats = {
    total: inspections.length,
    accepted: inspections.filter(i => i.status === 'Accepted').length,
    rejected: inspections.filter(i => i.status === 'Rejected').length,
    outgoing: inspections.filter(i => i.inspection_type === 'Outgoing').length,
    incoming: inspections.filter(i => i.inspection_type === 'Incoming').length
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Inspections</h1>
          <p className="text-slate-500 dark:text-slate-400">Quality checks and PDI reports</p>
        </div>
        
        <Link href="/inspections/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Plus className="h-4 w-4" /> New Inspection
            </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {inspections.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Passed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pre-Delivery</CardTitle>
              <ArrowRight className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.outgoing}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4">
        {inspections.length === 0 ? (
           <div className="p-12 text-center border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
             <div className="flex justify-center mb-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <ClipboardCheck className="h-6 w-6 text-slate-400" />
                </div>
             </div>
             <h3 className="text-lg font-medium text-slate-900 dark:text-white">No inspections recorded</h3>
             <p className="text-slate-500 mt-1">Perform a Pre-Delivery Inspection (PDI) before renting out equipment.</p>
           </div>
        ) : (
           inspections.map((insp) => (
            <Link key={insp.name} href={`/inspections/${insp.name}`}>
              <Card className="group hover:shadow-md transition-all border-slate-200 dark:border-slate-800">
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{insp.reference_name}</h3>
                            <Badge variant={insp.status === 'Accepted' ? 'default' : 'destructive'} className={insp.status === 'Accepted' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                {insp.status}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                                <ArrowRight className={`h-4 w-4 ${insp.inspection_type === 'Incoming' ? 'text-orange-500 rotate-180' : 'text-blue-500'}`} />
                                {insp.inspection_type} Check
                            </span>
                            {/* FIX: Use report_date */}
                            <span>Date: {insp.report_date}</span>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-xs text-slate-400 font-mono">{insp.name}</p>
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

