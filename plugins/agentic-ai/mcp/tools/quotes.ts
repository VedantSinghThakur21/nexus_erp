import { z } from 'zod'
import type { MCPTool } from '../types'
import { frappeGetDoc, frappeInsertDoc, idempotencyKey } from '../tool-runtime'

const GetQuotationInput = z.object({ name: z.string().min(1) })
const CreateQuotationInput = z.object({
  party_name: z.string().min(1),
  items: z.array(z.record(z.string(), z.unknown())).min(1),
  valid_till: z.string().optional(),
  quotation_to: z.string().optional(),
})

const getQuotationTool: MCPTool = {
  name: 'quotes.get_quotation',
  description: 'Fetch quotation details.',
  inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  requiredPlan: 'pro',
  requiredFlag: 'agentic_ai_enabled',
  requiresApproval: false,
  classification: 'read',
  supportsDryRun: false,
  auditPayloadShape: ['name'],
  async execute(input, context) {
    const parsed = GetQuotationInput.safeParse(input)
    const key = idempotencyKey('quotes.get_quotation', input, context.runId)
    if (!parsed.success) return { success: false, error: parsed.error.message, idempotencyKey: key }
    return frappeGetDoc(context, 'Quotation', parsed.data.name)
  },
}

const createQuotationTool: MCPTool = {
  name: 'quotes.create_quotation',
  description: 'Create a quotation draft for a customer and items.',
  inputSchema: {
    type: 'object',
    properties: { party_name: { type: 'string' }, items: { type: 'array' }, valid_till: { type: 'string' } },
    required: ['party_name', 'items'],
  },
  requiredPlan: 'pro',
  requiredFlag: 'agentic_ai_enabled',
  requiresApproval: true,
  classification: 'write',
  supportsDryRun: true,
  auditPayloadShape: ['party_name'],
  async dryRun(input) {
    const parsed = CreateQuotationInput.safeParse(input)
    if (!parsed.success) {
      return { preview: parsed.error.message, affectedRecords: [], estimatedImpact: 'low' as const }
    }
    return {
      preview: `Would create Quotation for ${parsed.data.party_name}`,
      affectedRecords: [],
      estimatedImpact: 'medium',
    }
  },
  async execute(input, context) {
    const parsed = CreateQuotationInput.safeParse(input)
    const key = idempotencyKey('quotes.create_quotation', input, context.runId)
    if (!parsed.success) return { success: false, error: parsed.error.message, idempotencyKey: key }
    return frappeInsertDoc(
      context,
      'Quotation',
      {
        party_name: parsed.data.party_name,
        quotation_to: parsed.data.quotation_to || 'Customer',
        valid_till: parsed.data.valid_till,
        items: parsed.data.items,
      },
      'quotes.create_quotation'
    )
  },
}

export const quotesTools: MCPTool[] = [getQuotationTool, createQuotationTool]
