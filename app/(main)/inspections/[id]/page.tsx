import { getInspection } from "@/app/actions/inspections"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ClipboardCheck, Calendar, User, FileText, Truck } from "lucide-react"
import Link from "next/link"
import { UpdateInspectionDialog } from "@/components/inspections/update-inspection-dialog"

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inspection = await getInspection(id)

  if (!inspection) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Inspection not found</h1>
        <Link href="/inspections">
          <Button variant="outline" className="mt-4">Back to Inspections</Button>
        </Link>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    'Accepted': 'bg-green-100 text-green-700',
    'Rejected': 'bg-red-100 text-red-700'
  }

  const typeColors: Record<string, string> = {
    'Outgoing': 'text-blue-600',
    'Incoming': 'text-orange-600',
    'In Process': 'text-purple-600'
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <Link href="/inspections">
        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" /> Back to Inspections
        </Button>
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Quality Inspection
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{inspection.name}</p>
        </div>
        <div className="flex gap-2 items-center">
          <UpdateInspectionDialog inspection={inspection} />
          <Badge className={statusColors[inspection.status] || 'bg-slate-100 text-slate-800'}>
            {inspection.status}
          </Badge>
        </div>
      </div>

      {/* Main Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Asset / Equipment
              </label>
              <Link href={`/fleet/${inspection.reference_name}`}>
                <p className="text-slate-900 dark:text-slate-200 mt-1 hover:text-blue-600 cursor-pointer">
                  {inspection.reference_name}
                </p>
              </Link>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Inspection Type
              </label>
              <p className={`mt-1 font-medium ${typeColors[inspection.inspection_type] || 'text-slate-900'}`}>
                {inspection.inspection_type}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Inspection Date
              </label>
              <p className="text-slate-900 dark:text-slate-200 mt-1">{inspection.report_date}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <User className="h-4 w-4" />
                Inspected By
              </label>
              <p className="text-slate-900 dark:text-slate-200 mt-1">{inspection.inspected_by || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Result Status</label>
              <div className="mt-1">
                <Badge className={statusColors[inspection.status] || 'bg-slate-100 text-slate-800'}>
                  {inspection.status === 'Accepted' ? 'Passed - Ready to Rent' : 'Failed - Needs Repair'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {inspection.remarks && (
            <div>
              <label className="text-sm font-medium text-slate-500 flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                Remarks / Observations
              </label>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {inspection.remarks}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reference Info */}
      <Card>
        <CardHeader>
          <CardTitle>Reference Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-500">Reference Type</label>
              <p className="text-slate-900 dark:text-slate-200 mt-1">{inspection.reference_type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Reference ID</label>
              <p className="text-slate-900 dark:text-slate-200 mt-1">{inspection.reference_name}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
