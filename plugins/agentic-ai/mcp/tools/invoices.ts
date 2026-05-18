import { z } from 'zod'
import type { MCPTool } from '../types'
import { frappeGetDoc, frappeInsertDoc, idempotencyKey } from '../tool-runtime'

const GetInvoiceInput = z.object({ name: z.string().min(1) })
const CreateInvoiceInput = z.object({
  customer: z.string().min(1),
  items: z.array(z.record(z.string(), z.unknown())).min(1),
  due_date: z.string().optional(),
})

const getInvoiceTool: MCPTool = {
  name: 'invoices.get_invoice',
  description: 'Fetch invoice details.',
  inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  requiredPlan: 'pro',
  requiredFlag: 'agentic_finance_enabled',
  requiresApproval: false,
  classification: 'read',
  supportsDryRun: false,
  auditPayloadShape: ['name'],
  async execute(input, context) {
    const parsed = GetInvoiceInput.safeParse(input)
    const key = idempotencyKey('invoices.get_invoice', input, context.runId)
    if (!parsed.success) return { success: false, error: parsed.error.message, idempotencyKey: key }
    return frappeGetDoc(context, 'Sales Invoice', parsed.data.name)
  },
}

const createInvoiceTool: MCPTool = {
  name: 'invoices.create_invoice',
  description: 'Create a sales invoice draft.',
  inputSchema: {
    type: 'object',
    properties: { customer: { type: 'string' }, items: { type: 'array' }, due_date: { type: 'string' } },
    required: ['customer', 'items'],
  },
  requiredPlan: 'enterprise',
  requiredFlag: 'agentic_finance_enabled',
  requiresApproval: true,
  classification: 'write',
  supportsDryRun: true,
  auditPayloadShape: ['customer'],
  async dryRun(input) {
    const parsed = CreateInvoiceInput.safeParse(input)
    if (!parsed.success) {
      return { preview: parsed.error.message, affectedRecords: [], estimatedImpact: 'low' as const }
    }
    return {
      preview: `Would create Sales Invoice for ${parsed.data.customer}`,
      affectedRecords: [],
      estimatedImpact: 'high',
    }
  },
  async execute(input, context) {
    const parsed = CreateInvoiceInput.safeParse(input)
    const key = idempotencyKey('invoices.create_invoice', input, context.runId)
    if (!parsed.success) return { success: false, error: parsed.error.message, idempotencyKey: key }
    return frappeInsertDoc(
      context,
      'Sales Invoice',
      { customer: parsed.data.customer, due_date: parsed.data.due_date, items: parsed.data.items },
      'invoices.create_invoice'
    )
  },
}

export const invoicesTools: MCPTool[] = [getInvoiceTool, createInvoiceTool]
