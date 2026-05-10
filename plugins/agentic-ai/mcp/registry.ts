import { AGENTIC_BASE_FLAG, AGENTIC_DESTRUCTIVE_FLAG, AGENTIC_FINANCE_FLAG } from '../config'
import type { AgenticTenantContext } from '../types'
import { canUseAgenticTool } from '../entitlements'
import type { MCPTool, MCPToolName } from './types'

const stringSchema = { type: 'string' }
const numberSchema = { type: 'number' }

export const AGENTIC_MCP_TOOLS: MCPTool[] = [
  {
    name: 'crm.search_leads',
    description: 'Search CRM leads by name, email, company, status, or owner.',
    inputSchema: {
      type: 'object',
      properties: { query: stringSchema, limit: numberSchema },
      required: ['query'],
    },
    requiredPlan: 'pro',
    requiredFlag: AGENTIC_BASE_FLAG,
    requiresApproval: false,
    classification: 'read',
    dryRunSupported: true,
  },
  {
    name: 'crm.create_lead',
    description: 'Create a CRM lead with contact and company details.',
    inputSchema: {
      type: 'object',
      properties: { lead_name: stringSchema, company_name: stringSchema, email_id: stringSchema, mobile_no: stringSchema },
      required: ['lead_name'],
    },
    requiredPlan: 'pro',
    requiredFlag: AGENTIC_BASE_FLAG,
    requiresApproval: true,
    classification: 'write',
    dryRunSupported: true,
  },
  {
    name: 'crm.update_lead',
    description: 'Update fields on an existing CRM lead.',
    inputSchema: {
      type: 'object',
      properties: { name: stringSchema, status: stringSchema, notes: stringSchema },
      required: ['name'],
    },
    requiredPlan: 'pro',
    requiredFlag: AGENTIC_BASE_FLAG,
    requiresApproval: true,
    classification: 'write',
    dryRunSupported: true,
  },
  {
    name: 'quotes.get_quotation',
    description: 'Fetch quotation details.',
    inputSchema: {
      type: 'object',
      properties: { name: stringSchema },
      required: ['name'],
    },
    requiredPlan: 'pro',
    requiredFlag: AGENTIC_BASE_FLAG,
    requiresApproval: false,
    classification: 'read',
    dryRunSupported: true,
  },
  {
    name: 'quotes.create_quotation',
    description: 'Create a quotation draft for a customer and items.',
    inputSchema: {
      type: 'object',
      properties: { party_name: stringSchema, items: { type: 'array' }, valid_till: stringSchema },
      required: ['party_name', 'items'],
    },
    requiredPlan: 'pro',
    requiredFlag: AGENTIC_BASE_FLAG,
    requiresApproval: true,
    classification: 'write',
    dryRunSupported: true,
  },
  {
    name: 'inventory.get_item_availability',
    description: 'Check stock availability for an item code.',
    inputSchema: {
      type: 'object',
      properties: { item_code: stringSchema, warehouse: stringSchema },
      required: ['item_code'],
    },
    requiredPlan: 'pro',
    requiredFlag: AGENTIC_BASE_FLAG,
    requiresApproval: false,
    classification: 'read',
    dryRunSupported: true,
  },
  {
    name: 'pricing.calculate_rental_pricing',
    description: 'Calculate rental pricing from rate, quantity, and rental period.',
    inputSchema: {
      type: 'object',
      properties: { daily_rate: numberSchema, quantity: numberSchema, days: numberSchema },
      required: ['daily_rate', 'quantity', 'days'],
    },
    requiredPlan: 'pro',
    requiredFlag: AGENTIC_BASE_FLAG,
    requiresApproval: false,
    classification: 'read',
    dryRunSupported: true,
  },
  {
    name: 'invoices.get_invoice',
    description: 'Fetch invoice details.',
    inputSchema: {
      type: 'object',
      properties: { name: stringSchema },
      required: ['name'],
    },
    requiredPlan: 'pro',
    requiredFlag: AGENTIC_FINANCE_FLAG,
    requiresApproval: false,
    classification: 'read',
    dryRunSupported: true,
  },
  {
    name: 'invoices.create_invoice',
    description: 'Create a sales invoice draft.',
    inputSchema: {
      type: 'object',
      properties: { customer: stringSchema, items: { type: 'array' }, due_date: stringSchema },
      required: ['customer', 'items'],
    },
    requiredPlan: 'enterprise',
    requiredFlag: AGENTIC_FINANCE_FLAG,
    requiresApproval: true,
    classification: 'write',
    dryRunSupported: true,
  },
  {
    name: 'payments.record_payment',
    description: 'Record a payment entry against an invoice.',
    inputSchema: {
      type: 'object',
      properties: { party: stringSchema, paid_amount: numberSchema, reference_no: stringSchema },
      required: ['party', 'paid_amount'],
    },
    requiredPlan: 'enterprise',
    requiredFlag: AGENTIC_FINANCE_FLAG,
    requiresApproval: true,
    classification: 'write',
    dryRunSupported: true,
  },
  {
    name: 'tasks.create_follow_up_task',
    description: 'Create a follow-up task for a user.',
    inputSchema: {
      type: 'object',
      properties: { subject: stringSchema, assigned_to: stringSchema, date: stringSchema, reference_name: stringSchema },
      required: ['subject'],
    },
    requiredPlan: 'pro',
    requiredFlag: AGENTIC_BASE_FLAG,
    requiresApproval: true,
    classification: 'write',
    dryRunSupported: true,
  },
]

export function getMcpTool(name: MCPToolName): MCPTool | undefined {
  return AGENTIC_MCP_TOOLS.find((tool) => tool.name === name)
}

export function listMcpToolsForTenant(context: AgenticTenantContext) {
  return AGENTIC_MCP_TOOLS.map((tool) => {
    const entitlement = canUseAgenticTool(context, tool.requiredPlan, tool.requiredFlag)
    const destructiveBlocked =
      tool.classification === 'destructive' && !context.flags[AGENTIC_DESTRUCTIVE_FLAG]

    return {
      ...tool,
      enabled: entitlement.allowed && !destructiveBlocked,
      disabledReason: destructiveBlocked
        ? `This tool requires ${AGENTIC_DESTRUCTIVE_FLAG}.`
        : entitlement.reason,
    }
  })
}

