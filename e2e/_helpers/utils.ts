export function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

