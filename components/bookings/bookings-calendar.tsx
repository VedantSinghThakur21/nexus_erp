'use client'

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Filter } from "lucide-react"
import Link from "next/link"

interface Booking {
  name: string
  customer_name: string
  transaction_date: string
  delivery_date: string
  status: string
  po_no: string
  grand_total: number
}

const statusColors: Record<string, string> = {
  'Draft': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  'To Deliver and Bill': 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  'Completed': 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  'Cancelled': 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
}

export function BookingsCalendar({ bookings }: { bookings: Booking[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [statusFilter, setStatusFilter] = useState<string>('All')
  
  const today = new Date()
  
  // Month names
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  
  // Filter bookings by status
  const filteredBookings = useMemo(() => {
    if (statusFilter === 'All') return bookings
    return bookings.filter(b => b.status === statusFilter)
  }, [bookings, statusFilter])
  
  // Get days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  
  // Map bookings to dates
  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {}
    
    filteredBookings.forEach(booking => {
      const start = new Date(booking.transaction_date)
      const end = new Date(booking.delivery_date)
      
      // Add booking to each date in range
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          if (!map[dateKey]) map[dateKey] = []
          map[dateKey].push(booking)
        }
      }
    })
    
    return map
  }, [filteredBookings, currentMonth, currentYear])
  
  // Navigation handlers
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }
  
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }
  
  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }
  
  // Generate calendar days
  const calendarDays = []
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="min-h-[100px] bg-slate-50/50 dark:bg-slate-900/50" />)
  }
  
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayBookings = bookingsByDate[dateKey] || []
    const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear
    
    calendarDays.push(
      <div 
        key={day} 
        className={`min-h-[100px] border border-slate-200 dark:border-slate-800 p-2 ${
          isToday ? 'bg-blue-50 dark:bg-blue-950/20 ring-2 ring-blue-600' : 'bg-white dark:bg-slate-900'
        }`}
      >
        <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
          {day}
        </div>
        <div className="space-y-1">
          {dayBookings.slice(0, 2).map((booking, idx) => (
            <Link key={`${booking.name}-${idx}`} href={`/bookings/${booking.name}`}>
              <div 
                className={`text-xs px-1 py-0.5 rounded truncate hover:shadow-sm cursor-pointer transition-all ${
                  statusColors[booking.status] || 'bg-slate-100 dark:bg-slate-800'
                }`}
                title={`${booking.customer_name} - ${booking.status}`}
              >
                {booking.customer_name}
              </div>
            </Link>
          ))}
          {dayBookings.length > 2 && (
            <div className="text-xs text-slate-500 px-1 font-medium">
              +{dayBookings.length - 2} more
            </div>
          )}
        </div>
      </div>
    )
  }
  
  // Get unique statuses
  const statuses = ['All', ...Array.from(new Set(bookings.map(b => b.status)))]
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle>{monthNames[currentMonth]} {currentYear}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-0">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-sm p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays}
        </div>
        
        {/* Legend */}
        <div className="mt-4 pt-4 border-t flex items-center gap-4 flex-wrap">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${color}`} />
              <span className="text-xs text-slate-600 dark:text-slate-400">{status}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
