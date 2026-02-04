"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { CreateBookingDialog } from "./create-booking-dialog"

interface Booking {
  name: string
  customer: string
  customer_name: string
  transaction_date: string
  delivery_date: string
  grand_total: number
  status: string
  po_no: string
  items: any[]
  docstatus: number
  per_delivered: number
}

interface BookingsClientProps {
  bookings: Booking[]
}

export function BookingsClient({ bookings }: BookingsClientProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses')

  const today = new Date()
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Calculate KPIs
  const totalBookings = bookings.length
  const activeRentals = bookings.filter(b => b.status === 'To Deliver and Bill' || b.per_delivered > 0).length
  const revenueMTD = bookings
    .filter(b => {
      const transactionDate = new Date(b.transaction_date)
      return transactionDate.getMonth() === today.getMonth() && 
             transactionDate.getFullYear() === today.getFullYear()
    })
    .reduce((sum, b) => sum + b.grand_total, 0)

  // AI Occupancy Forecast (mock for now)
  const aiOccupancyForecast = 88

  // Filter bookings by status
  const filteredBookings = useMemo(() => {
    if (statusFilter === 'All Statuses') return bookings
    if (statusFilter === 'Draft') return bookings.filter(b => b.status === 'Draft')
    if (statusFilter === 'Active') return bookings.filter(b => b.status === 'To Deliver and Bill')
    if (statusFilter === 'Completed') return bookings.filter(b => b.status === 'Completed')
    return bookings
  }, [bookings, statusFilter])

  // Get days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()

  // Map bookings to dates
  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {}
    
    bookings.forEach(booking => {
      try {
        const start = new Date(booking.transaction_date)
        const end = new Date(booking.delivery_date)
        
        // Add booking to each date in range
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            if (!map[dateKey]) map[dateKey] = []
            if (!map[dateKey].find(b => b.name === booking.name)) {
              map[dateKey].push(booking)
            }
          }
        }
      } catch (e) {
        // Skip invalid dates
      }
    })
    
    return map
  }, [bookings, currentMonth, currentYear])

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

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
      case 'To Deliver and Bill': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
      case 'Completed': return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
      case 'Cancelled': return 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400'
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
    }
  }

  // Get sentiment (mock for now - based on total)
  const getSentiment = (booking: Booking) => {
    if (booking.grand_total > 30000) return { text: '92% Positive Sentiment', color: 'emerald', icon: 'sentiment_satisfied_alt' }
    if (booking.grand_total > 10000) return { text: '75% Positive Sentiment', color: 'blue', icon: 'sentiment_satisfied' }
    return { text: '65% Neutral Sentiment', color: 'amber', icon: 'sentiment_neutral' }
  }

  // Render calendar grid
  const renderCalendar = () => {
    const cells = []
    
    // Empty cells for days before first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-cell bg-white dark:bg-navy-900 p-3"></div>)
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayBookings = bookingsByDate[dateKey] || []
      const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
      
      cells.push(
        <div 
          key={day} 
          className={`calendar-cell bg-white dark:bg-navy-900 p-3 text-sm ${isToday ? 'text-blue-500 font-bold border-l-4 border-primary' : ''}`}
        >
          {day}
          <div className="mt-2 space-y-1">
            {dayBookings.slice(0, 2).map((booking, idx) => (
              <Link key={`${booking.name}-${idx}`} href={`/bookings/${booking.name}`}>
                <div className={`${getStatusColor(booking.status)} text-[10px] p-1 rounded font-medium truncate cursor-pointer hover:opacity-80`}>
                  {booking.customer_name}
                </div>
              </Link>
            ))}
            {dayBookings.length > 2 && (
              <div className="text-[9px] text-slate-400 font-semibold">+{dayBookings.length - 2} more</div>
            )}
          </div>
        </div>
      )
    }
    
    return cells
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center flex-1 max-w-2xl">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">auto_awesome</span>
              <input 
                className="w-full pl-12 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm focus:ring-2 focus:ring-primary placeholder:text-slate-500 outline-none" 
                placeholder="Ask AI anything about your bookings..." 
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/catalogue">
              <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                <span className="material-icons-round text-lg">add</span>
                New Booking
              </button>
            </Link>
            <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-800 pl-6">
              <button className="text-slate-500 hover:text-primary relative transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-navy-900"></span>
              </button>
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">person</span>
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-sm font-semibold leading-tight">Admin Workspace</p>
                  <p className="text-xs text-slate-500 leading-tight">Enterprise Tier</p>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600 transition-colors">expand_more</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-8 py-8 flex flex-col gap-8 max-w-[1920px] mx-auto w-full">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Rental Bookings Workspace</h1>
          <p className="text-slate-500 dark:text-slate-400">Real-time scheduling intelligence and availability monitoring.</p>
        </div>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-navy-900 p-6 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="material-icons-round text-blue-400 bg-blue-400/10 p-2 rounded-lg">event_note</span>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">+12% vs LY</span>
            </div>
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">Total Bookings</p>
            <h3 className="text-3xl font-bold text-white mt-1">{totalBookings}</h3>
          </div>

          <div className="bg-navy-900 p-6 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="material-icons-round text-emerald-400 bg-emerald-400/10 p-2 rounded-lg">history_toggle_off</span>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">Live</span>
            </div>
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">Active Rentals</p>
            <h3 className="text-3xl font-bold text-white mt-1">{activeRentals}</h3>
          </div>

          <div className="bg-navy-900 p-6 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="material-icons-round text-purple-400 bg-purple-400/10 p-2 rounded-lg">payments</span>
              <span className="text-xs font-medium text-purple-400 bg-purple-400/10 px-2 py-1 rounded-md">Monthly</span>
            </div>
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">Revenue MTD</p>
            <h3 className="text-3xl font-bold text-white mt-1">₹{(revenueMTD / 100000).toFixed(1)}L</h3>
          </div>

          <div className="bg-navy-900 p-6 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="material-icons-round text-amber-400 bg-amber-400/10 p-2 rounded-lg">trending_up</span>
              <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-1 rounded-md">AI Predicted</span>
            </div>
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">AI Occupancy Forecast</p>
            <h3 className="text-3xl font-bold text-white mt-1">{aiOccupancyForecast}%</h3>
          </div>
        </section>

        {/* AI Alert Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-5 rounded-xl flex items-center gap-5 shadow-sm">
          <div className="bg-amber-100 dark:bg-amber-800/40 p-3 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">auto_awesome</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              AI AVAILABILITY ALERT
              <span className="bg-amber-200 dark:bg-amber-800 text-[10px] px-1.5 py-0.5 rounded uppercase">High Priority</span>
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-400/90 mt-0.5">
              Peak demand predicted for Feb 14-18. 4 potential double-bookings detected. Mitigation plan generated for buffer time adjustment.
            </p>
          </div>
          <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            View Mitigation Plan
          </button>
        </div>

        {/* Calendar Section */}
        <section className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-6">
              <h3 className="text-xl font-bold">{monthNames[currentMonth]} {currentYear}</h3>
              <div className="flex items-center bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-1">
                <button 
                  onClick={goToPreviousMonth}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all text-slate-600 dark:text-slate-300"
                >
                  <span className="material-icons-round text-lg leading-none">chevron_left</span>
                </button>
                <button 
                  onClick={goToToday}
                  className="px-4 py-1 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all uppercase tracking-wide"
                >
                  Today
                </button>
                <button 
                  onClick={goToNextMonth}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all text-slate-600 dark:text-slate-300"
                >
                  <span className="material-icons-round text-lg leading-none">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-10 py-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary appearance-none cursor-pointer outline-none"
                >
                  <option>All Statuses</option>
                  <option>Draft</option>
                  <option>Active</option>
                  <option>Completed</option>
                </select>
                <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">filter_alt</span>
                <span className="material-icons-round absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">expand_more</span>
              </div>
              <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500">
                <span className="material-symbols-outlined text-xl">settings</span>
              </button>
            </div>
          </div>

          {/* Calendar Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/80">
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Sunday</div>
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Monday</div>
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Tuesday</div>
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Wednesday</div>
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Thursday</div>
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Friday</div>
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Saturday</div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 bg-slate-200 dark:bg-slate-800 gap-[1px]" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {renderCalendar()}
          </div>

          {/* Calendar Legend */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-center gap-10 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Calendar Legend:</span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Draft</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">To Deliver and Bill</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Cancelled</span>
            </div>
          </div>
        </section>

        {/* All Bookings List */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-xl font-bold">All Bookings</h3>
              <p className="text-sm text-slate-500">Overview of recent and pending reservations</p>
            </div>
            <button className="text-primary hover:text-blue-700 text-sm font-bold uppercase tracking-wide border-b border-primary/20 pb-0.5">
              View Complete Archive
            </button>
          </div>

          <div className="grid gap-4">
            {filteredBookings.length === 0 ? (
              <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                <p className="text-slate-500">No bookings found</p>
                <p className="text-sm text-slate-400 mt-1">Adjust filters or create a new booking</p>
              </div>
            ) : (
              filteredBookings.slice(0, 10).map((booking) => {
                const sentiment = getSentiment(booking)
                const itemCount = booking.items?.length || 0

                return (
                  <Link key={booking.name} href={`/bookings/${booking.name}`}>
                    <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between gap-6 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900/50 transition-all group cursor-pointer">
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white">{booking.customer_name}</h4>
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                          <div className={`flex items-center gap-2 px-3 py-1 bg-${sentiment.color}-50 dark:bg-${sentiment.color}-900/20 text-${sentiment.color}-600 dark:text-${sentiment.color}-400 rounded-full text-xs font-semibold border border-${sentiment.color}-100 dark:border-${sentiment.color}-800/50`}>
                            <span className="material-icons-round text-sm">{sentiment.icon}</span>
                            {sentiment.text}
                          </div>
                        </div>
                        <div className="flex items-center gap-8 text-sm text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <span className="material-icons-round text-base text-slate-400">qr_code</span>
                            <span className="font-mono">{booking.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-icons-round text-base text-slate-400">calendar_today</span>
                            {booking.transaction_date} → {booking.delivery_date}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-icons-round text-base text-slate-400">home_repair_service</span>
                            {itemCount} Items Scheduled
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-10">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            ₹{booking.grand_total.toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Grand Total</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.preventDefault(); /* Edit logic */ }}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={(e) => { e.preventDefault(); /* More options */ }}
                            className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all"
                          >
                            <span className="material-icons-round">more_vert</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </section>
      </div>

      {/* Floating Dark Mode Toggle */}
      <button 
        className="fixed bottom-8 right-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-50 ring-4 ring-white/20 dark:ring-black/20"
        onClick={() => document.documentElement.classList.toggle('dark')}
      >
        <span className="material-icons-round text-2xl">dark_mode</span>
      </button>
    </div>
  )
}
