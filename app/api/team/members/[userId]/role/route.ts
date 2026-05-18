import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/auth'
import { headers } from 'next/headers'
import { updateTeamMemberRole } from '@/app/actions/team'

const bodySchema = z.object({
  role: z.string().min(1).max(140),
})

const userIdSchema = z.string().min(1).max(140)

type RouteParams = { params: Promise<{ userId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { userId: rawUserId } = await params
  const userIdParsed = userIdSchema.safeParse(decodeURIComponent(rawUserId))
  if (!userIdParsed.success) {
    return NextResponse.json({ error: 'Invalid user id', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const bodyParsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!bodyParsed.success) {
    return NextResponse.json({ error: 'Invalid body', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const result = await updateTeamMemberRole(userIdParsed.data, bodyParsed.data.role)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Failed to update role', code: 'ROLE_ERROR' },
      { status: 500 }
    )
  }

  revalidateTag('teams-settings', 'max')

  return NextResponse.json({ success: true })
}
