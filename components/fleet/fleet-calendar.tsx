'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths,
  parseISO,
  isWithinInterval,
  startOfDay
} from "date-fns"

interface Booking {
  asset_id: string
  start_date: Date
  end_date: Date
  customer: string
  status: string
}

interface Asset {
  name: string
  item_name: string
  item_code: string
  warehouse: string
}

export function FleetCalendar({ assets, bookings }: { assets: Asset[], bookings: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState("")

  // 1. Calculate Days
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  })

  // 2. Normalize Bookings (Robust Date Parsing)
  const normalizedBookings: Booking[] = bookings.map(b => {
    // Safety check: extract asset ID properly
    const assetId = b.po_no?.replace('RENT-', '') || '';
    
    // Parse dates to start of day to avoid timezone mismatches
    const start = startOfDay(parseISO(b.delivery_date))
    // Handle cases where booking has no end date (default to start date)
    const endRaw = b.items?.[0]?.delivery_date || b.delivery_date
    const end = startOfDay(parseISO(endRaw))

    return {
        asset_id: assetId,
        start_date: start,
        end_date: end,
        customer: b.customer_name,
        status: b.status
    }
  }).filter(b => b.asset_id); // Remove invalid bookings

  // 3. Filter Assets (Solves the "Chaos" problem)
  const filteredAssets = assets.filter(asset => 
    asset.item_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.item_code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  return (
    <Card className="col-span-full border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Title & Navigation */}
            <div className="flex items-center gap-4">
                <CardTitle className="text-lg">Schedule - {format(currentDate, 'MMMM yyyy')}</CardTitle>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Search Filter (The "Anti-Chaos" Tool) */}
            <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Filter by machine..." 
                    className="pl-9 h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 overflow-x-auto">
        <div className="min-w-[1000px]">
            {/* Calendar Header Row */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
                <div className="w-56 shrink-0 p-3 font-medium text-sm bg-slate-50 dark:bg-slate-900 sticky left-0 z-20 border-r border-slate-200 dark:border-slate-800 text-slate-500">
                    Asset
                </div>
                {daysInMonth.map((day) => (
                    <div key={day.toString()} className={`w-10 shrink-0 p-2 text-center border-r border-slate-100 dark:border-slate-800 ${
                        format(day, 'EEE') === 'Sun' || format(day, 'EEE') === 'Sat' ? 'bg-slate-50/50 dark:bg-slate-900/50' : ''
                    }`}>
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{format(day, 'd')}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{format(day, 'EEEEE')}</div>
                    </div>
                ))}
            </div>

            {/* Rows */}
            {filteredAssets.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No machines match your filter.</div>
            ) : (
                filteredAssets.map((asset) => (
                    <div key={asset.name} className="flex border-b border-slate-100 dark:border-slate-800 group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        {/* Sticky Name Column */}
                        <div className="w-56 shrink-0 p-3 sticky left-0 bg-white dark:bg-slate-950 z-10 border-r border-slate-200 dark:border-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 transition-colors">
                            <div className="font-medium text-sm text-slate-900 dark:text-white truncate" title={asset.item_name}>
                                {asset.item_name || asset.item_code}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{asset.name}</span>
                                <span className="text-[10px] text-slate-500 truncate max-w-[80px]" title={asset.warehouse}>{asset.warehouse}</span>
                            </div>
                        </div>
                        
                        {/* Calendar Cells */}
                        {daysInMonth.map((day) => {
                            const dayStart = startOfDay(day);

                            // Find booking for this specific day
                            const booking = normalizedBookings.find(b => 
                                b.asset_id === asset.name && 
                                isWithinInterval(dayStart, { start: b.start_date, end: b.end_date })
                            )

                            // Determine styles based on booking status
                            let barStyle = "";
                            if (booking) {
                                if (booking.status === 'Draft') barStyle = "bg-yellow-400/20 border-yellow-500 text-yellow-700";
                                else if (booking.status === 'Completed') barStyle = "bg-slate-200 border-slate-400 text-slate-600";
                                else barStyle = "bg-blue-500/20 border-blue-500 text-blue-700";
                            }

                            return (
                                <div key={day.toString()} className={`w-10 shrink-0 border-r border-slate-100 dark:border-slate-800 relative h-16 ${
                                    format(day, 'EEE') === 'Sun' || format(day, 'EEE') === 'Sat' ? 'bg-slate-50/30 dark:bg-slate-900/30' : ''
                                }`}>
                                    {booking && (
                                        <div 
                                            className={`absolute top-2 bottom-2 left-0 right-0 border-y ${barStyle} mx-[-1px] z-0 flex items-center justify-center group/booking cursor-help`}
                                           
                                        >
                                            {/* Tooltip on Hover */}
                                            <div className="hidden group-hover/booking:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-xs rounded shadow-xl z-50">
                                                <p className="font-semibold">{booking.customer}</p>
                                                <p className="opacity-80">{format(booking.start_date, 'MMM d')} - {format(booking.end_date, 'MMM d')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ))
            )}
        </div>
      </CardContent>
    </Card>
  )
}

