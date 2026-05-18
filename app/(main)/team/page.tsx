import { getTeamPageData } from '@/app/actions/team-data'
import { TeamPageClient } from './team-page-client'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const data = await getTeamPageData()
  return <TeamPageClient initialMembers={data.members} planName={data.planLimits.name} />
}
