'use client'

import dynamic from 'next/dynamic'

/** Defers analytics chat bundle until after shell paint (not on critical path). */
export const FloatingAIChatLazy = dynamic(
  () => import('@/components/ai/floating-chat').then((m) => m.FloatingAIChat),
  { ssr: false, loading: () => null },
)
