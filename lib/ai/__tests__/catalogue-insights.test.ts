import { describe, expect, it } from 'vitest'
import {
  buildCatalogueInsights,
  itemMatchesPriceFilter,
} from '@/lib/ai/catalogue-insights'

describe('catalogue-insights', () => {
  const items = [
    {
      item_code: 'A',
      item_name: 'Crane',
      item_group: 'Heavy',
      standard_rate: 2000,
      stock_qty: null,
      available: true,
    },
    {
      item_code: 'B',
      item_name: 'Excavator',
      item_group: 'Heavy',
      standard_rate: 10000,
      stock_qty: 0,
      available: false,
    },
  ]

  it('filters by price range', () => {
    expect(itemMatchesPriceFilter(items[0], 0, 5000)).toBe(true)
    expect(itemMatchesPriceFilter(items[1], 0, 5000)).toBe(false)
  })

  it('flags out-of-stock items', () => {
    const insights = buildCatalogueInsights(items)
    expect(insights.summary.outOfStock).toBe(1)
    expect(insights.alerts.some((a) => a.title === 'Stock alert')).toBe(true)
  })
})
