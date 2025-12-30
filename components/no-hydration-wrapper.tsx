/**
 * Wrapper component to prevent hydration mismatches caused by browser extensions
 * Use this for components that might be affected by extensions that modify the DOM
 */

import { ReactNode } from 'react'

interface NoHydrationWrapperProps {
  children: ReactNode
  className?: string
}

export function NoHydrationWrapper({ children, className }: NoHydrationWrapperProps) {
  return (
    <div suppressHydrationWarning className={className}>
      {children}
    </div>
  )
}
