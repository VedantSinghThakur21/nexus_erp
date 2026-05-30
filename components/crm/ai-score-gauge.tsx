'use client'

import { cn } from '@/lib/utils'

export function AiScoreGauge({
  score,
  size = 'md',
  className,
}: {
  score: number
  size?: 'sm' | 'md'
  className?: string
}) {
  const clamp = Math.max(0, Math.min(100, score))
  const color = clamp >= 75 ? '#10b981' : clamp >= 50 ? '#f59e0b' : '#ef4444'
  const r = size === 'sm' ? 22 : 28
  const svg = size === 'sm' ? 56 : 72
  const circ = 2 * Math.PI * r
  const dash = (clamp / 100) * circ

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <svg width={svg} height={svg} viewBox={`0 0 ${svg} ${svg}`}>
        <circle
          cx={svg / 2}
          cy={svg / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className="text-muted/30"
        />
        <circle
          cx={svg / 2}
          cy={svg / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${svg / 2} ${svg / 2})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text
          x={svg / 2}
          y={svg / 2 + (size === 'sm' ? 4 : 5)}
          textAnchor="middle"
          className="fill-foreground text-sm font-bold"
          fontSize={size === 'sm' ? 12 : 14}
        >
          {clamp}
        </text>
      </svg>
    </div>
  )
}
