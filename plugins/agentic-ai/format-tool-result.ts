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
    return `Could not run **${toolName}**: ${result.error || 'Unknown error'}`
  }

  const data = result.data

  if (toolName === 'crm.search_leads') {
    const rows = Array.isArray(data) ? (data as LeadRow[]) : []
    if (rows.length === 0) {
      return 'No leads found in your CRM for that query.'
    }
    const lines = rows.map((lead, i) => {
      const title = lead.lead_name || lead.name || 'Unnamed'
      const status = lead.status ? ` · ${lead.status}` : ''
      const contact = [lead.email_id, lead.mobile_no].filter(Boolean).join(' · ')
      return `${i + 1}. **${title}**${status}${contact ? ` — ${contact}` : ''}`
    })
    return `Here are **${rows.length}** lead(s) from ERPNext:\n\n${lines.join('\n')}`
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return `**${toolName}** returned no records.`
    const preview = JSON.stringify(data.slice(0, 10), null, 2)
    return `**${toolName}** returned ${data.length} record(s):\n\`\`\`json\n${preview}\n\`\`\``
  }

  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  return `**${toolName}** result:\n\`\`\`\n${text.slice(0, 3500)}\n\`\`\``
}
