'use client'

import React from 'react'
import type { TeamMemberRow } from '@/app/actions/team-data'

export const TeamMemberRowMemo = React.memo(function TeamMemberRowMemo({
  member,
  removingEmail,
  onEdit,
  onRemove,
}: {
  member: TeamMemberRow
  removingEmail: string | null
  onEdit: (m: TeamMemberRow) => void
  onRemove: (email: string, name: string) => void
}) {
  const isProtected = member.email === 'Administrator'

  return (
    <div className="border-b border-border p-4 hover:bg-muted/20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">
            {member.first_name} {member.last_name || ''}
          </p>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="text-sm text-primary" onClick={() => onEdit(member)}>
            Permissions
          </button>
          {!isProtected && (
            <button
              type="button"
              disabled={removingEmail === member.email}
              className="text-sm text-destructive disabled:opacity-50"
              onClick={() => onRemove(member.email, `${member.first_name} ${member.last_name || ''}`)}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
