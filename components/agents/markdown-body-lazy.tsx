'use client'

import dynamic from 'next/dynamic'

export const MarkdownBodyLazy = dynamic(
  () => import('@/components/agents/markdown-body').then((m) => m.MarkdownBody),
  {
    ssr: false,
    loading: () => <p className="text-xs text-muted-foreground">Loading…</p>,
  },
)
