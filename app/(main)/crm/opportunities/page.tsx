import { getOpportunities } from "@/app/actions/crm"
import { OpportunitiesClient } from "@/components/crm/opportunities-client"

export const dynamic = 'force-dynamic'

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities()

  return (
    <OpportunitiesClient opportunities={opportunities} />
  )
}

