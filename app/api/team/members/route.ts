import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { fetchTeamMembersList } from '@/app/actions/team-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const members = await fetchTeamMembersList()
    return NextResponse.json(
      { members },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    )
  } catch {
    console.error('[team] members list failed')
    return NextResponse.json({ error: 'Failed to load members', code: 'TEAM_ERROR' }, { status: 500 })
  }
}
