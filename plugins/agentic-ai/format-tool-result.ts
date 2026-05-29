import type { MCPToolResult } from './mcp/types'

type LeadRow = {
  name?: string
  lead_name?: string
  status?: string
  email_id?: string
  mobile_no?: string
}

export function formatToolResultForChat(toolName: string, result: MCPToolResult): string {
  if (!result.success) {
    return `I couldn't pull that from your CRM right now — ${result.error || 'please try again in a moment.'}`
  }

  const data = result.data

  if (toolName === 'crm.search_leads') {
    const rows = Array.isArray(data) ? (data as LeadRow[]) : []
    if (rows.length === 0) {
      return "I checked your CRM and didn't find any leads matching that."
    }
    const lines = rows.map((lead, i) => {
      const title = lead.lead_name || lead.name || 'Unnamed'
      const status = lead.status ? ` (${lead.status})` : ''
      const contact = [lead.email_id, lead.mobile_no].filter(Boolean).join(' · ')
      return `${i + 1}. ${title}${status}${contact ? ` — ${contact}` : ''}`
    })
    const header =
      rows.length === 1 ? "Here's the lead I found:" : `Here are ${rows.length} leads I found:`
    return `${header}\n\n${lines.join('\n')}`
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return "That search didn't return any records."
    const lines = data.slice(0, 15).map((row, i) => {
      if (row && typeof row === 'object') {
        const r = row as Record<string, unknown>
        const label = String(r.name ?? r.lead_name ?? r.title ?? `Item ${i + 1}`)
        return `${i + 1}. ${label}`
      }
      return `${i + 1}. ${String(row)}`
    })
    return `I found ${data.length} record(s):\n\n${lines.join('\n')}`
  }

  return 'Done — I pulled the latest data from your CRM.'
}
