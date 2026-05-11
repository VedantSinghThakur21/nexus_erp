import { getTeamMembers } from '@/app/actions/team'
import { TeamClient } from './team-client'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const initialTeamMembers = await getTeamMembers()
  return <TeamClient initialTeamMembers={initialTeamMembers as any} />
}

