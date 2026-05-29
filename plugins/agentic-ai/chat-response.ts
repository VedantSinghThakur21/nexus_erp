import type { MCPToolName } from './mcp/types'

const WRITE_PROMPTS: Partial<Record<MCPToolName, string>> = {
  'crm.create_lead':
    "I'd be happy to add a new lead. Tell me the contact or company name, and any email or phone you have — I'll queue it for your team to approve before it goes into the CRM.",
  'crm.update_lead':
    "I can update that lead once you tell me which one and what should change. Updates are sent for approval before they're saved.",
  'quotes.create_quotation':
    "I can help draft a quotation. Share the customer and what you need quoted, and I'll prepare it for approval.",
  'invoices.create_invoice':
    "I can help with a new invoice. Share the customer and line items, and I'll prepare it for your team to review.",
  'payments.record_payment':
    "I can record a payment once you share the invoice and amount — it'll go through approval before posting.",
  'tasks.create_follow_up_task':
    "I can set up a follow-up task. Tell me who it's for and when it's due, and I'll add it for approval.",
}

/** Strip internal tool names and dev jargon from text shown to users. */
export function sanitizeUserFacingResponse(text: string): string {
  return text
    .replace(/`?(?:crm|quotes|invoices|inventory|pricing|payments|tasks)\.[a-z_]+`?/gi, '')
    .replace(/\b(?:srchld|crtld|updld|getquo|mkquot|invavl|calcpr|getinv|mkinv|payrec|foltsk)\b/gi, '')
    .replace(/\s*in Plan or Act mode\.?/gi, '.')
    .replace(/\bPlan or Act mode\b/gi, 'the approval workflow')
    .replace(/\bERPNext\b/g, 'your CRM')
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s*[.,]\s*/gm, '')
    .trim()
}

export function friendlyWriteBlockedMessage(toolName: string): string {
  return (
    WRITE_PROMPTS[toolName as MCPToolName] ??
    "I can help with that. Share the details and I'll route it for your team to approve before anything is saved in the CRM."
  )
}

const FILLER_PATTERN =
  /^(okay[,.]?\s*|sure[,.]?\s*|certainly[,.]?\s*|of course[,.]?\s*)?(let me|i'll|i will|allow me to|i can)\b/i

/** Combine model prose with tool output without duplicate filler or leaked internals. */
export function mergeChatResponse(
  modelText: string,
  dataNotes: string[],
  actionNotes: string[]
): string {
  const model = modelText.trim()
  const parts: string[] = []

  if (dataNotes.length > 0) {
    const isFiller = !model || model.length < 180 || FILLER_PATTERN.test(model)
    if (isFiller) {
      parts.push(...dataNotes)
    } else {
      parts.push(model)
      for (const note of dataNotes) {
        const snippet = note.slice(0, 48)
        if (!model.includes(snippet)) parts.push(note)
      }
    }
  } else if (model) {
    parts.push(model)
  }

  parts.push(...actionNotes)

  const merged = parts.filter(Boolean).join('\n\n')
  return sanitizeUserFacingResponse(merged) || "I'm not sure how to answer that — could you rephrase?"
}
