'use client'

import { Button } from '@/components/ui/button'
import { UserMinus } from 'lucide-react'
import { removeTeamMember } from '@/app/actions/team'
import { useState } from 'react'

interface RemoveMemberButtonProps {
  memberEmail: string
  memberName: string
}

export function RemoveMemberButton({ memberEmail, memberName }: RemoveMemberButtonProps) {
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRemove = async () => {
    if (confirm(`Remove ${memberName} from the organization?`)) {
      setIsRemoving(true)
      try {
        const result = await removeTeamMember(memberEmail)
        if (result.success) {
          window.location.reload()
        } else {
          alert(result.error)
        }
      } catch (error) {
        alert('Failed to remove team member')
      } finally {
        setIsRemoving(false)
      }
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRemove}
      disabled={isRemoving}
    >
      <UserMinus className="h-4 w-4 mr-1" />
      {isRemoving ? 'Removing...' : 'Remove'}
    </Button>
  )
}
