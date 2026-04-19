import { searchItems } from "@/app/actions/invoices"
import { CreateInspectionForm } from "@/components/inspections/create-inspection-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function NewInspectionPage({ searchParams }: { searchParams: Promise<{ asset?: string; booking?: string }> }) {
  const params = await searchParams
  // Fetch Heavy Equipment items from catalogue
  const equipmentItems = await searchItems('', 'Heavy Equipment Rental')

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={params.booking ? `/bookings/${params.booking}` : "/inspections"}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">New Inspection</h1>
          <p className="text-muted-foreground">
            {params.booking
              ? `Quality check for Booking #${params.booking}`
              : 'Record a quality check for an asset'}
          </p>
        </div>
      </div>

      {/* The Form Component (Client Side) */}
      <CreateInspectionForm
        machines={equipmentItems}
        defaultMachine={params.asset}
        bookingId={params.booking}
      />
    </div>
  )
}
