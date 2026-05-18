import { z } from 'zod'
import type { MCPTool } from '../types'
import { frappeInsertDoc, frappeList, frappeSetDoc, idempotencyKey } from '../tool-runtime'

const SearchLeadsInput = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
})

const CreateLeadInput = z.object({
  lead_name: z.string().min(1),
  company_name: z.string().optional(),
  email_id: z.string().optional(),
  mobile_no: z.string().optional(),
  status: z.string().optional(),
})

const UpdateLeadInput = z.object({
  name: z.string().min(1),
  status: z.string().optional(),
  notes: z.string().optional(),
})

const searchLeadsTool: MCPTool = {
  name: 'crm.search_leads',
  description: 'Search and filter leads from the CRM.',
  inputSchema: {
    type: 'object',
    properties: { status: { type: 'string' }, search: { type: 'string' }, limit: { type: 'number' } },
  },
  requiredPlan: 'pro',
  requiredFlag: 'agentic_ai_enabled',
  requiresApproval: false,
  classification: 'read',
  supportsDryRun: false,
  auditPayloadShape: ['status', 'search', 'limit'],
  async execute(input, context) {
    const parsed = SearchLeadsInput.safeParse(input)
    const key = idempotencyKey('crm.search_leads', input, context.runId)
    if (!parsed.success) return { success: false, error: parsed.error.message, idempotencyKey: key }
    const filters: unknown[] = []
    if (parsed.data.status) filters.push(['status', '=', parsed.data.status])
    if (parsed.data.search) filters.push(['lead_name', 'like', `%${parsed.data.search}%`])
    const result = await frappeList(
      context,
      'Lead',
      filters.length ? filters : undefined,
      ['name', 'lead_name', 'status', 'email_id', 'mobile_no'],
      parsed.data.limit
    )
    return { ...result, idempotencyKey: key }
  },
}

const createLeadTool: MCPTool = {
  name: 'crm.create_lead',
  description: 'Create a CRM lead with contact and company details.',
  inputSchema: {
    type: 'object',
    properties: {
      lead_name: { type: 'string' },
      company_name: { type: 'string' },
      email_id: { type: 'string' },
      mobile_no: { type: 'string' },
    },
    required: ['lead_name'],
  },
  requiredPlan: 'pro',
  requiredFlag: 'agentic_ai_enabled',
  requiresApproval: true,
  classification: 'write',
  supportsDryRun: true,
  auditPayloadShape: ['lead_name', 'company_name'],
  async dryRun(input) {
    const parsed = CreateLeadInput.safeParse(input)
    if (!parsed.success) {
      return { preview: parsed.error.message, affectedRecords: [], estimatedImpact: 'low' as const }
    }
    return {
      preview: `Would create Lead "${parsed.data.lead_name}"`,
      affectedRecords: [],
      estimatedImpact: 'medium',
    }
  },
  async execute(input, context) {
    const parsed = CreateLeadInput.safeParse(input)
    const key = idempotencyKey('crm.create_lead', input, context.runId)
    if (!parsed.success) return { success: false, error: parsed.error.message, idempotencyKey: key }
    return frappeInsertDoc(
      context,
      'Lead',
      {
        lead_name: parsed.data.lead_name,
        company_name: parsed.data.company_name,
        email_id: parsed.data.email_id,
        mobile_no: parsed.data.mobile_no,
        status: parsed.data.status || 'Lead',
      },
      'crm.create_lead'
    )
  },
}

const updateLeadTool: MCPTool = {
  name: 'crm.update_lead',
  description: 'Update fields on an existing CRM lead.',
  inputSchema: {
    type: 'object',
    properties: { name: { type: 'string' }, status: { type: 'string' }, notes: { type: 'string' } },
    required: ['name'],
  },
  requiredPlan: 'pro',
  requiredFlag: 'agentic_ai_enabled',
  requiresApproval: true,
  classification: 'write',
  supportsDryRun: true,
  auditPayloadShape: ['name', 'status'],
  async dryRun(input) {
    const parsed = UpdateLeadInput.safeParse(input)
    if (!parsed.success) {
      return { preview: parsed.error.message, affectedRecords: [], estimatedImpact: 'low' as const }
    }
    return {
      preview: `Would update Lead ${parsed.data.name}`,
      affectedRecords: [parsed.data.name],
      estimatedImpact: 'medium',
    }
  },
  async execute(input, context) {
    const parsed = UpdateLeadInput.safeParse(input)
    const key = idempotencyKey('crm.update_lead', input, context.runId)
    if (!parsed.success) return { success: false, error: parsed.error.message, idempotencyKey: key }
    const { name, ...fields } = parsed.data
    return frappeSetDoc(context, 'Lead', name, fields, 'crm.update_lead')
  },
}

export const crmTools: MCPTool[] = [searchLeadsTool, createLeadTool, updateLeadTool]
