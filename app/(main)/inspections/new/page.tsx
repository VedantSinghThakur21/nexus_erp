import { getFleet } from "@/app/actions/fleet"
import { CreateInspectionForm } from "@/components/inspections/create-inspection-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewInspectionPage() {
  // Fetch machines to populate the dropdown
  const fleet = await getFleet()

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inspections">
            <Button variant="ghost" size="icon">
                Q<ArrowLeft className="h-4 w-4" />
            </Button>
        </Link>
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">New Inspection</h1>
            <p className="text-slate-500">Record a quality check for an asset</p>
        </div>
      </div>

      {/* The Form Component (Client Side) */}
      <CreateInspectionForm machines={fleet} />
    </div>
  )
}

