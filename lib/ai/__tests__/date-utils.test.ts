import { describe, expect, it } from 'vitest'
import { daysFromToday, parseDateOnly, validityLabel } from '@/lib/ai/date-utils'

describe('date-utils', () => {
  it('parses ISO dates as local calendar days', () => {
    const d = parseDateOnly('2026-05-20')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(4)
    expect(d?.getDate()).toBe(20)
  })

  it('does not mark same-day validity as expired', () => {
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(validityLabel(iso).text).toBe('Expires today')
    expect(daysFromToday(iso)).toBe(0)
  })
})
