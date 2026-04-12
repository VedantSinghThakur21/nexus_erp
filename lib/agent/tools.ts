import { AgentFrappeClient } from '@/lib/agent/frappe'
import type { AgentTenantContext, AgentToolExecutionResult, AgentToolName } from '@/lib/agent/types'

export interface AgentToolDef {
  name: AgentToolName
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const AGENT_TOOLS: AgentToolDef[] = [
  {
    name: 'get_lead',
    description: 'Fetch a lead by id including status, owner, and last modified timestamp.',
    input_schema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
      },
      required: ['leadId'],
    },
  },
  {
    name: 'update_lead',
    description: 'Update lead fields such as status, notes, or contact date.',
    input_schema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        values: { type: 'object' },
      },
      required: ['leadId', 'values'],
    },
  },
  {
    name: 'get_quotation',
    description: 'Fetch a quotation by id with status and financial totals.',
    input_schema: {
      type: 'object',
      properties: {
        quotationId: { type: 'string' },
      },
      required: ['quotationId'],
    },
  },
  {
    name: 'create_follow_up_task',
    description: 'Create a CRM Task for lead or opportunity follow-up.',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        description: { type: 'string' },
        dueDate: { type: 'string' },
        referenceType: { type: 'string' },
        referenceName: { type: 'string' },
      },
      required: ['subject', 'dueDate'],
    },
  },
  {
    name: 'get_invoice',
    description: 'Fetch a sales invoice by id and payment status.',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string' },
      },
      required: ['invoiceId'],
    },
  },
]

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

export async function executeAgentTool(
  name: AgentToolName,
  input: Record<string, unknown>,
  tenant: AgentTenantContext,
  options: { dryRun?: boolean } = {}
): Promise<AgentToolExecutionResult> {
  const client = new AgentFrappeClient({ siteName: tenant.siteName })
  const dryRun = !!options.dryRun

  try {
    switch (name) {
      case 'get_lead': {
        const leadId = String(input.leadId || '')
        const data = await client.getDoc('Lead', leadId)
        return { ok: true, data }
      }
      case 'update_lead': {
        const leadId = String(input.leadId || '')
        const values = asRecord(input.values)
        if (dryRun) {
          return { ok: true, data: { preview: true, doctype: 'Lead', name: leadId, values } }
        }
        const data = await client.setValue('Lead', leadId, values)
        return { ok: true, data }
      }
      case 'get_quotation': {
        const quotationId = String(input.quotationId || '')
        const data = await client.getDoc('Quotation', quotationId)
        return { ok: true, data }
      }
      case 'create_follow_up_task': {
        const doc = {
          doctype: 'Task',
          subject: String(input.subject || 'AI Follow-up'),
          description: String(input.description || ''),
          exp_end_date: String(input.dueDate || ''),
          reference_type: input.referenceType ? String(input.referenceType) : undefined,
          reference_name: input.referenceName ? String(input.referenceName) : undefined,
          status: 'Open',
        }

        if (dryRun) {
          return { ok: true, data: { preview: true, doc } }
        }

        const data = await client.insertDoc(doc)
        return { ok: true, data }
      }
      case 'get_invoice': {
        const invoiceId = String(input.invoiceId || '')
        const data = await client.getDoc('Sales Invoice', invoiceId)
        return { ok: true, data }
      }
      default:
        return { ok: false, error: `Unknown tool: ${name}` }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tool execution failed'
    return { ok: false, error: message }
  }
}
