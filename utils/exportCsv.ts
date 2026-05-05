/**
 * CSV Export Utility
 * ==================
 * Converts tabular data to CSV and triggers browser download.
 * Handles commas, quotes, and newlines in cell values per RFC 4180.
 */

/**
 * Escape a cell value for CSV.
 * If the value contains commas, quotes, or newlines, wrap it in double quotes
 * and double any existing quotes.
 */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Convert columns and rows (positional arrays) to a CSV string.
 *
 * @param columns - Column header names
 * @param rows    - Array of row arrays (positional, matching columns order)
 * @returns Valid CSV string
 */
export function jsonToCsv(columns: string[], rows: any[][]): string {
  const headerLine = columns.map(escapeCell).join(',')
  const dataLines = rows.map(row =>
    row.map(escapeCell).join(',')
  )
  return [headerLine, ...dataLines].join('\n')
}

/**
 * Trigger a browser download of a CSV file.
 *
 * @param filename  - Download filename (e.g. "invoices.csv")
 * @param csvString - The CSV content string
 */
export function downloadCsv(filename: string, csvString: string): void {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
