"use client"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Loader2 } from "lucide-react"

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
  delivery_status?: string
}

interface BookingsClientProps {
  bookings: Booking[]
}

export function BookingsClient({ bookings }: BookingsClientProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses')

  // AI State
  const [aiLoading, setAiLoading] = useState(false)
  const [aiForecast, setAiForecast] = useState<any>(null)

  const today = new Date()
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Fetch AI Forecast
  useEffect(() => {
    const fetchForecast = async () => {
      setAiLoading(true)
      try {
        const res = await fetch('/api/ai/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             inputs: {
                target_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                booking_history: JSON.stringify({
                   total: bookings.length,
                   active: bookings.filter(b => b.status === 'To Deliver and Bill' || b.per_delivered > 0).length
                })
             }
          })
        })
        if (res.ok) {
           const data = await res.json()
           setAiForecast(data.result)
        }
      } catch (err) {
         console.error("Failed to fetch AI forecast", err)
      } finally {
         setAiLoading(false)
      }
    }
    
    fetchForecast()
  }, [])

  // Calculate KPIs
  const totalBookings = bookings.length
  const activeRentals = bookings.filter(b => b.status === 'To Deliver and Bill' || b.per_delivered > 0 || (b.delivery_status && b.delivery_status !== 'Not Delivered')).length
  const revenueMTD = bookings
    .filter(b => {
      const transactionDate = new Date(b.transaction_date)
      return transactionDate.getMonth() === today.getMonth() &&
        transactionDate.getFullYear() === today.getFullYear()
    })
    .reduce((sum, b) => sum + b.grand_total, 0)

  // AI Occupancy Forecast (dynamic or fallback)
  const aiOccupancyForecast = aiForecast?.predicted_occupancy_rate ?? '--'

  // Filter bookings by status
  const filteredBookings = useMemo(() => {
    if (statusFilter === 'All Statuses') return bookings
    if (statusFilter === 'Draft') return bookings.filter(b => b.status === 'Draft')
    if (statusFilter === 'Active') return bookings.filter(b => b.status === 'To Deliver and Bill' || b.status === 'To Deliver' || (b.per_delivered > 0 && b.status !== 'Completed') || b.delivery_status === 'Fully Delivered')
    if (statusFilter === 'Completed') return bookings.filter(b => b.status === 'Completed' || (b.delivery_status === 'Fully Delivered' && b.status === 'Completed'))
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
  const getStatusColor = (booking: Booking) => {
    if (booking.status === 'Completed') return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
    if (booking.status === 'Cancelled') return 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400'
    if (booking.per_delivered >= 100) return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400'
    if (booking.status === 'Draft') return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
    return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' // Default to "To Deliver"
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
      cells.push(<div key={`empty-${i}`} className="calendar-cell bg-card p-3 border-l-2 border-transparent"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayBookings = bookingsByDate[dateKey] || []
      const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()

      cells.push(
        <div
          key={day}
          className={`calendar-cell bg-card p-3 text-sm border-l-2 ${isToday ? 'text-blue-500 font-semibold border-blue-500' : 'border-transparent'}`}
        >
          {day}
          <div className="mt-2 space-y-1">
            {dayBookings.slice(0, 2).map((booking, idx) => (
              <Link key={`${booking.name}-${idx}`} href={`/bookings/${booking.name}`}>
                <div className={`${getStatusColor(booking)} text-[10px] p-1 rounded font-medium truncate cursor-pointer hover:opacity-80`}>
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
    <div className="app-shell flex flex-col">
      {/* Header */}
      <PageHeader searchPlaceholder="Ask AI anything about your bookings..." />

      {/* Main Content */}
      <main className="app-content">
        <div className="app-container flex w-full flex-col gap-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">Rental Bookings Workspace</h1>
            <p className="text-sm text-muted-foreground">Real-time scheduling intelligence and availability monitoring.</p>
          </div>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <span className="material-icons-round text-blue-400 text-xl">description</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">+12% vs LY</span>
            </div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Bookings</div>
            <div className="text-2xl font-medium text-foreground">{totalBookings}</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="bg-teal-500/10 p-2 rounded-lg">
                <span className="material-icons-round text-teal-400 text-xl">schedule</span>
              </div>
              <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-1 rounded">Live</span>
            </div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Active Rentals</div>
            <div className="text-2xl font-medium text-foreground">{activeRentals}</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="bg-purple-500/10 p-2 rounded-lg">
                <span className="material-icons-round text-purple-400 text-xl">account_balance_wallet</span>
              </div>
              <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded">Monthly</span>
            </div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Revenue MTD</div>
            <div className="text-2xl font-medium text-foreground">₹{(revenueMTD / 100000).toFixed(1)}L</div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between mb-3 relative z-10">
              <div className="bg-amber-500/10 p-2 rounded-lg">
                <span className="material-icons-round text-amber-400 text-xl">trending_up</span>
              </div>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1">
                 <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                 AI Predicted
              </span>
            </div>
            <div className="relative z-10 mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">AI Occupancy Forecast</div>
            <div className="relative z-10 flex items-center gap-3 text-2xl font-medium text-foreground">
                {aiLoading ? <Loader2 className="h-6 w-6 animate-spin text-amber-400" /> : <>{aiOccupancyForecast}{aiOccupancyForecast !== '--' && '%'}</>}
            </div>
          </div>
        </section>

        {/* AI Alert Banner */}
        {aiLoading ? (
            <div className="bg-slate-50 dark:bg-background border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center gap-5 shadow-sm animate-pulse">
                <div className="bg-slate-200 dark:bg-slate-800 h-10 w-10 rounded-full"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                </div>
            </div>
        ) : aiForecast?.analysis ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-5 rounded-xl flex items-center gap-5 shadow-sm">
              <div className="bg-amber-100 dark:bg-amber-800/40 p-3 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">insights</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                  AI OUTLOOK
                  <span className="bg-amber-200 dark:bg-amber-800 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold text-amber-700 dark:text-amber-400">Insight</span>
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-400/90 mt-0.5">
                  {aiForecast.analysis}
                </p>
              </div>
              {aiForecast.pricing_suggestion && (
                  <button 
                     className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0"
                     title={String(aiForecast.pricing_suggestion)}
                  >
                    View Pricing Strategy
                  </button>
              )}
            </div>
        ) : null}

        {/* Calendar Section */}
        <section className="rounded-xl border border-border bg-card shadow-none overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800/50 flex justify-between items-center">
            <div className="flex items-center gap-6">
              <h3 className="text-xl font-bold">{monthNames[currentMonth]} {currentYear}</h3>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-1 gap-1">
                <button
                  onClick={goToPreviousMonth}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-all text-slate-600 "
                >
                  <span className="material-icons-round text-base leading-none">chevron_left</span>
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-1 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-all uppercase tracking-wide"
                >
                  TODAY
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-all text-slate-600 "
                >
                  <span className="material-icons-round text-base leading-none">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-8 pr-9 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option>All Statuses</option>
                  <option>Draft</option>
                  <option>Active</option>
                  <option>Completed</option>
                </select>
                <span className="material-icons-round absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">filter_alt</span>
                <span className="material-icons-round absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">expand_more</span>
              </div>
              <button className="p-2 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-muted-foreground">
                <span className="material-symbols-outlined text-lg">settings</span>
              </button>
            </div>
          </div>

          {/* Calendar Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-background/30">
            <div className="py-2.5 text-center text-[10px] font-bold text-muted-foreground  uppercase tracking-widest">SUNDAY</div>
            <div className="py-2.5 text-center text-[10px] font-bold text-muted-foreground  uppercase tracking-widest">MONDAY</div>
            <div className="py-2.5 text-center text-[10px] font-bold text-muted-foreground  uppercase tracking-widest">TUESDAY</div>
            <div className="py-2.5 text-center text-[10px] font-bold text-muted-foreground  uppercase tracking-widest">WEDNESDAY</div>
            <div className="py-2.5 text-center text-[10px] font-bold text-muted-foreground  uppercase tracking-widest">THURSDAY</div>
            <div className="py-2.5 text-center text-[10px] font-bold text-muted-foreground  uppercase tracking-widest">FRIDAY</div>
            <div className="py-2.5 text-center text-[10px] font-bold text-muted-foreground  uppercase tracking-widest">SATURDAY</div>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid bg-slate-100 dark:bg-background/30 gap-[1px]">
            {renderCalendar()}
          </div>

          {/* Calendar Legend */}
          <div className="p-4 bg-slate-50 dark:bg-background/30 flex items-center justify-center gap-8 border-t border-border/40 dark:border-slate-800/50">
            <span className="text-[10px] font-bold text-muted-foreground  uppercase tracking-widest">CALENDAR LEGEND:</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-xs text-slate-600  font-medium">Draft</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span className="text-xs text-slate-600 font-medium">To Deliver</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span className="text-xs text-slate-600 font-medium">Deployed (On Rent)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-xs text-slate-600 font-medium">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span className="text-xs text-slate-600  font-medium">Cancelled</span>
            </div>
          </div>
        </section>

        {/* All Bookings List */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-xl font-bold">All Bookings</h3>
              <p className="text-sm text-muted-foreground">Overview of recent and pending reservations</p>
            </div>
            <button className="text-primary hover:text-blue-700 text-sm font-bold uppercase tracking-wide border-b border-primary/20 pb-0.5">
              View Complete Archive
            </button>
          </div>

          <div className="grid gap-4">
            {filteredBookings.length === 0 ? (
              <div className="bg-card dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                <p className="text-muted-foreground">No bookings found</p>
                <p className="text-sm text-slate-400 mt-1">Adjust filters or create a new booking</p>
              </div>
            ) : (
              filteredBookings.slice(0, 10).map((booking) => {
                const sentiment = getSentiment(booking)
                const itemCount = booking.items?.length || 0

                const formatDate = (dateStr: string) => {
                  const date = new Date(dateStr)
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                }

                return (
                  <Link key={booking.name} href={`/bookings/${booking.name}`} className="block">
                  <div className="rounded-lg border border-border bg-card p-4 hover:border-blue-400 transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-base font-semibold text-slate-900 dark:text-white">{booking.customer_name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            booking.status === 'Completed' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' :
                            booking.per_delivered >= 100 ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' :
                            booking.status === 'Draft' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' :
                            'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                          }`}>
                            {booking.status === 'Completed' ? 'COMPLETED / RETURNED' : 
                             booking.per_delivered >= 100 ? 'DEPLOYED (ON RENT)' :
                             booking.status === 'Draft' ? 'DRAFT' : 'TO DELIVER'}
                          </span>
                          {sentiment.text && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sentiment.color === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : sentiment.color === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                              <span className="material-icons-round text-xs">{sentiment.icon}</span>
                              {sentiment.text}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-xs text-muted-foreground ">
                          <div className="flex items-center gap-1.5">
                            <span className="material-icons-round text-sm">badge</span>
                            <span className="font-mono">{booking.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="material-icons-round text-sm">calendar_today</span>
                            <span>{formatDate(booking.transaction_date)} → {formatDate(booking.delivery_date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="material-icons-round text-sm">inventory_2</span>
                            <span>{itemCount} Items Scheduled</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xl font-bold text-slate-900 dark:text-white">₹{booking.grand_total.toLocaleString('en-IN')}</div>
                          <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">GRAND TOTAL</div>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
                          <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 text-slate-700  rounded text-xs font-medium">
                            View
                          </span>
                        </div>
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
      </main>

    </div>
  )
}
