import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import { Plus, Package, Clock, CheckCircle, XCircle, Search, Filter, TrendingUp } from "lucide-react"
import Link from "next/link"

export default async function SalesOrdersPage() {
  // Mock data
  const orders = [
    {
      id: "SO-2024-001",
      customer: "Acme Corporation",
      date: "Oct 24, 2023",
      deliveryDate: "Nov 15, 2023",
      total: 9990.00,
      status: "Draft",
      items: 2,
      quotation: "QT-9821"
    },
    {
      id: "SO-2024-002",
      customer: "BuildTech Solutions",
      date: "Oct 25, 2023",
      deliveryDate: "Nov 20, 2023",
      total: 15600.00,
      status: "Confirmed",
      items: 5,
      quotation: "QT-9822"
    },
    {
      id: "SO-2024-003",
      customer: "Infrastructure Inc",
      date: "Oct 26, 2023",
      deliveryDate: "Nov 25, 2023",
      total: 45000.00,
      status: "In Progress",
      items: 8,
      quotation: "QT-9823"
    }
  ]

  const stats = {
    draft: orders.filter(o => o.status === "Draft").length,
    confirmed: orders.filter(o => o.status === "Confirmed").length,
    inProgress: orders.filter(o => o.status === "In Progress").length,
    totalValue: orders.reduce((sum, o) => sum + o.total, 0)
  }

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
                ${stats.totalValue.toLocaleString()}
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
            <div className="grid grid-cols-8 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400">
              <div>ORDER ID</div>
              <div>CUSTOMER</div>
              <div>ORDER DATE</div>
              <div>DELIVERY DATE</div>
              <div>ITEMS</div>
              <div>FROM QUOTE</div>
              <div>AMOUNT</div>
              <div>STATUS</div>
            </div>

            {/* Table Rows */}
            {orders.map((order, idx) => (
              <Link key={idx} href={`/sales-orders/${order.id}`}>
                <div className="grid grid-cols-8 gap-4 py-3 text-sm items-center hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer">
                  <div className="font-medium text-blue-600 dark:text-blue-400">{order.id}</div>
                  <div className="text-slate-900 dark:text-white">{order.customer}</div>
                  <div className="text-slate-600 dark:text-slate-400">{order.date}</div>
                  <div className="text-slate-600 dark:text-slate-400">{order.deliveryDate}</div>
                  <div className="text-slate-600 dark:text-slate-400">{order.items} items</div>
                  <div className="text-blue-600 dark:text-blue-400 text-xs">{order.quotation}</div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    ${order.total.toLocaleString()}
                  </div>
                  <div>
                    <Badge
                      variant="outline"
                      className={
                        order.status === "Draft"
                          ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          : order.status === "Confirmed"
                          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
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
