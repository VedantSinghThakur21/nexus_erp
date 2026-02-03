import { getSalesOrders, getSalesOrderStats } from "@/app/actions/sales-orders"
import { getQuotations } from "@/app/actions/quotations"
import { SalesOrdersClient } from "@/components/sales-orders/sales-orders-client"

export const dynamic = 'force-dynamic'

export default async function SalesOrdersPage() {
  const [orders, stats, quotations] = await Promise.all([
    getSalesOrders(),
    getSalesOrderStats(),
    getQuotations()
  ])
  
  const readyQuotations = quotations.filter(q => q.docstatus === 1 && q.status !== 'Ordered')

  return <SalesOrdersClient orders={orders} stats={stats} readyQuotations={readyQuotations} />
}
