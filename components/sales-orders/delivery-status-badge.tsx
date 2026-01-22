'use client'

import { Badge } from '@/components/ui/badge'
import { DeliveryStatus, DELIVERY_STATUS_COLORS, DELIVERY_STATUS_DESCRIPTION } from '@/lib/delivery-status'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface DeliveryStatusBadgeProps {
  status?: DeliveryStatus | string
  showTooltip?: boolean
}

export function DeliveryStatusBadge({ status, showTooltip = true }: DeliveryStatusBadgeProps) {
  if (!status || status === 'Not Applicable') {
    return null
  }

  const className = DELIVERY_STATUS_COLORS[status as DeliveryStatus] || DELIVERY_STATUS_COLORS['Not Applicable']
  const description = DELIVERY_STATUS_DESCRIPTION[status as DeliveryStatus]

  const badge = (
    <Badge className={className}>
      {status}
    </Badge>
  )

  if (!showTooltip || !description) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
