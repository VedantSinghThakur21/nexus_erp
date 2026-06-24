'use client'

import { UserProvider } from '@/contexts/user-context'
import { ProfileProvider } from '@/contexts/profile-context'
import type { UserProfile } from '@/app/actions/profile'

export function MainDataProviders({
  initialRoles,
  initialProfile,
  children,
}: {
  initialRoles: string[]
  initialProfile: UserProfile | null
  children: React.ReactNode
}) {
  return (
    <UserProvider initialRoles={initialRoles}>
      <ProfileProvider initialProfile={initialProfile}>
        {children}
      </ProfileProvider>
    </UserProvider>
  )
}
