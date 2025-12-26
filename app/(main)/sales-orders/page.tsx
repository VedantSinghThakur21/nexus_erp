import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import { Plus, Package, Clock, CheckCircle, XCircle, Search, Filter, TrendingUp } from "lucide-react"
import Link from "next/link"
import { getSalesOrders, getSalesOrderStats } from "@/app/actions/sales-orders"

export default async function SalesOrdersPage() {
  // Fetch real data from ERPNext
  const orders = await getSalesOrders()
  const stats = await getSalesOrderStats()

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold text-slate-900 dark:text-white">
            Sales Orders
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage sales orders and track fulfillment
          </p>
        </div>
        <Link href="/sales-orders/new">
          <AnimatedButton variant="neon" className="gap-2">
            <Plus className="h-4 w-4" /> New Sales Order
          </AnimatedButton>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <AnimatedCard className="p-4" variant="glass" delay={0}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Draft</p>
              <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stats.draft}</p>
            </div>
            <Package className="h-5 w-5 text-slate-400" />
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-4" variant="glass" delay={0.1}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Confirmed</p>
              <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stats.confirmed}</p>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-4" variant="glass" delay={0.2}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">In Progress</p>
              <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stats.inProgress}</p>
            </div>
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-4" variant="glass" delay={0.3}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Value</p>
              <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                ₹{stats.totalValue.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </div>
        </AnimatedCard>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search sales orders..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" /> Filter
        </Button>
      </div>

      {/* Orders Table */}
      <AnimatedCard variant="glass" delay={0.4}>
        <CardContent className="p-6">
          <div className="space-y-3">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400">
              <div>ORDER ID</div>
              <div>CUSTOMER</div>
              <div>ORDER DATE</div>
              <div>DELIVERY DATE</div>
              <div>ITEMS</div>
              <div>AMOUNT</div>
              <div>STATUS</div>
            </div>

            {/* Table Rows */}
            {orders.map((order) => (
              <Link key={order.name} href={`/sales-orders/${order.name}`}>
                <div className="grid grid-cols-7 gap-4 py-3 text-sm items-center hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer">
                  <div className="font-medium text-blue-600 dark:text-blue-400">{order.name}</div>
                  <div className="text-slate-900 dark:text-white">{order.customer_name || order.customer}</div>
                  <div className="text-slate-600 dark:text-slate-400">
                    {new Date(order.transaction_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    }) : '-'}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">{order.total_qty || 0} items</div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {order.currency} {order.grand_total.toLocaleString()}
                  </div>
                  <div>
                    <Badge
                      variant="outline"
                      className={
                        order.status === "Draft"
                          ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          : ["To Deliver and Bill", "To Bill", "To Deliver"].includes(order.status)
                          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300"
                          : order.status === "Completed"
                          ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </AnimatedCard>
    </div>
  )
}
