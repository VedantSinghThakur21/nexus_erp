'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { Filter, Check } from 'lucide-react'
import { DeliveryStatus, DELIVERY_STATUS_COLORS } from '@/lib/delivery-status'

const DELIVERY_STATUSES: DeliveryStatus[] = [
  'Not Delivered',
  'Partly Delivered',
  'Fully Delivered',
  'Closed',
  'Not Applicable'
]

interface DeliveryStatusFilterProps {
  selectedStatuses?: string[]
  onStatusesChange?: (statuses: string[]) => void
}

export function DeliveryStatusFilter({ selectedStatuses = [], onStatusesChange }: DeliveryStatusFilterProps) {
  const [selected, setSelected] = useState<string[]>(selectedStatuses)

  const handleToggle = (status: string) => {
    const newSelected = selected.includes(status)
      ? selected.filter(s => s !== status)
      : [...selected, status]
    setSelected(newSelected)
    onStatusesChange?.(newSelected)
  }

  const handleClear = () => {
    setSelected([])
    onStatusesChange?.([])
  }

  const activeCount = selected.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Delivery Status
          {activeCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium dark:bg-blue-900 dark:text-blue-200">
              {activeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {DELIVERY_STATUSES.map((status) => (
          <DropdownMenuCheckboxItem
            key={status}
            checked={selected.includes(status)}
            onCheckedChange={() => handleToggle(status)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className={`px-2 py-1 rounded text-xs font-medium ${DELIVERY_STATUS_COLORS[status]}`}>
              {status}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClear} className="text-slate-600 dark:text-slate-400 cursor-pointer">
              Clear all
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
