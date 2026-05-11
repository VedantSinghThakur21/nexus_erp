import { getInspections } from '@/app/actions/inspections'
import { InspectionsClient } from './inspections-client'

export const dynamic = 'force-dynamic'

export default async function InspectionsPage() {
  const initialInspections = await getInspections()
  return <InspectionsClient initialInspections={initialInspections} />
}

