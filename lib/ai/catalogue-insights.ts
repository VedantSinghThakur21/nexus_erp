/** Heuristic catalogue / inventory insights from item data. */

export type CatalogueItemInput = {
  item_code: string
  item_name: string
  item_group: string
  standard_rate?: number
  stock_qty?: number | null
  available: boolean
  is_stock_item?: number
}

export type CatalogueInsightAlert = {
  title: string
  body: string
  tone: 'info' | 'warning' | 'success'
}

export type CatalogueInsights = {
  alerts: CatalogueInsightAlert[]
  summary: {
    total: number
    available: number
    outOfStock: number
    services: number
    avgRate: number
    topCategory: string | null
  }
}

export function buildCatalogueInsights(items: CatalogueItemInput[]): CatalogueInsights {
  const available = items.filter((i) => i.available)
  const stockItems = items.filter((i) => i.stock_qty !== null)
  const outOfStock = stockItems.filter((i) => !i.available)
  const services = items.filter((i) => i.stock_qty === null)

  const rates = items.map((i) => i.standard_rate || 0).filter((r) => r > 0)
  const avgRate =
    rates.length > 0 ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length) : 0

  const groupCounts = new Map<string, number>()
  for (const item of items) {
    const g = item.item_group || 'Uncategorized'
    groupCounts.set(g, (groupCounts.get(g) || 0) + 1)
  }
  const topCategory =
    groupCounts.size > 0
      ? [...groupCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : null

  const alerts: CatalogueInsightAlert[] = []

  if (topCategory && items.length > 0) {
    const share = Math.round(((groupCounts.get(topCategory) || 0) / items.length) * 100)
    alerts.push({
      title: 'Category concentration',
      body: `${share}% of your catalogue is "${topCategory}" (${groupCounts.get(topCategory)} items). Consider diversifying or promoting high-margin lines.`,
      tone: 'info',
    })
  }

  if (outOfStock.length > 0) {
    alerts.push({
      title: 'Stock alert',
      body: `${outOfStock.length} stocked item${outOfStock.length === 1 ? '' : 's'} ${outOfStock.length === 1 ? 'is' : 'are'} out of stock${outOfStock.length <= 3 ? `: ${outOfStock.map((i) => i.item_name).join(', ')}` : ''}. Restock or mark unavailable for booking.`,
      tone: 'warning',
    })
  }

  if (services.length > 0 && available.length > 0) {
    const bookableServices = services.filter((i) => i.available).length
    if (bookableServices > 0) {
      alerts.push({
        title: 'Service revenue',
        body: `${bookableServices} service${bookableServices === 1 ? '' : 's'} ready to book now. Avg rate across catalogue is ₹${avgRate.toLocaleString('en-IN')}.`,
        tone: 'success',
      })
    }
  }

  const premium = items.filter((i) => (i.standard_rate || 0) > avgRate * 1.5 && avgRate > 0)
  if (premium.length > 0 && premium.length <= 5) {
    alerts.push({
      title: 'Pricing opportunity',
      body: `${premium.length} premium item${premium.length === 1 ? '' : 's'} priced above 1.5× average — ensure availability and sales focus on ${premium.map((i) => i.item_name).slice(0, 2).join(', ')}${premium.length > 2 ? '…' : ''}.`,
      tone: 'info',
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      title: 'Catalogue snapshot',
      body:
        items.length === 0
          ? 'Add items to your catalogue to unlock inventory intelligence.'
          : `${items.length} items tracked · ${available.length} available for booking.`,
      tone: 'info',
    })
  }

  return {
    alerts: alerts.slice(0, 3),
    summary: {
      total: items.length,
      available: available.length,
      outOfStock: outOfStock.length,
      services: services.length,
      avgRate,
      topCategory,
    },
  }
}

export function itemRate(item: CatalogueItemInput): number {
  return item.standard_rate || 0
}

export function itemMatchesPriceFilter(
  item: CatalogueItemInput,
  minPrice: number,
  maxPrice: number
): boolean {
  const rate = itemRate(item)
  return rate >= minPrice && rate <= maxPrice
}

export function catalogueHealthScore(items: CatalogueItemInput[]): number {
  if (items.length === 0) return 0
  const available = items.filter((i) => i.available).length
  const stockItems = items.filter((i) => i.stock_qty !== null)
  const outOfStock = stockItems.filter((i) => !i.available).length
  const availabilityRatio = available / items.length
  const stockPenalty = stockItems.length > 0 ? outOfStock / stockItems.length : 0
  const score = Math.round(availabilityRatio * 70 + 30 - stockPenalty * 25)
  return Math.min(100, Math.max(0, score))
}

export function catalogueHealthLabel(score: number): string {
  if (score >= 75) return 'Strong availability'
  if (score >= 50) return 'Moderate capacity'
  if (score > 0) return 'Needs restock'
  return 'Empty catalogue'
}

export function bookableItems(items: CatalogueItemInput[]): CatalogueItemInput[] {
  return items
    .filter((i) => i.available)
    .sort((a, b) => (b.standard_rate || 0) - (a.standard_rate || 0))
}

export function outOfStockItems(items: CatalogueItemInput[]): CatalogueItemInput[] {
  return items.filter((i) => i.stock_qty !== null && !i.available)
}
