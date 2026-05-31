/** Parse ERP date strings as local calendar dates (avoids UTC timezone drift). */

export function parseDateOnly(value: string | undefined | null): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  }
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Days from today until target (negative = past). */
export function daysFromToday(value: string | undefined | null): number | null {
  const target = parseDateOnly(value)
  if (!target) return null
  const today = startOfToday()
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function validityLabel(validTill: string | undefined | null): {
  text: string
  color: string
} {
  const days = daysFromToday(validTill)
  if (days === null) return { text: 'No expiry set', color: 'text-muted-foreground' }
  if (days < 0) return { text: 'Expired', color: 'text-red-500' }
  if (days === 0) return { text: 'Expires today', color: 'text-orange-500' }
  if (days <= 7) return { text: `${days} days remaining`, color: 'text-orange-500' }
  return { text: `${days} days remaining`, color: 'text-muted-foreground' }
}

export function isOverdue(dueDate: string | undefined | null, status: string): boolean {
  if (status === 'Paid' || status === 'Cancelled') return false
  const days = daysFromToday(dueDate)
  return days !== null && days < 0
}
