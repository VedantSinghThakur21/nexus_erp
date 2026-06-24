'use client'

import { createContext, useContext } from 'react'
import type { UserProfile } from '@/app/actions/profile'

interface ProfileContextType {
  profile: UserProfile | null
}

const ProfileContext = createContext<ProfileContextType | null>(null)

export function ProfileProvider({
  children,
  initialProfile,
}: {
  children: React.ReactNode
  initialProfile: UserProfile | null
}) {
  return (
    <ProfileContext.Provider value={{ profile: initialProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider')
  }
  return context
}
