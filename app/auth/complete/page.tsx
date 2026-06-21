import { Metadata } from 'next'
import { SsoCompleteClient } from '@/components/auth/sso-complete-client'

export const metadata: Metadata = {
  title: 'Completing sign-in - Nexus ERP',
}

export default function AuthCompletePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-neutral-200 px-6">
      <div className="w-full max-w-md glass-panel rounded-2xl border border-white/10 p-8">
        <SsoCompleteClient />
      </div>
    </div>
  )
}
