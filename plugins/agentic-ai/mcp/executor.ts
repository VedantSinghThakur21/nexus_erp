import { serverFrappeCall } from '@/lib/agent/server-frappe'
import type { AgenticTenantContext } from '../types'
import { canUseAgenticTool } from '../entitlements'
import { getMcpTool } from './registry'
import type { MCPToolCall, MCPToolName, MCPToolResult } from './types'

type ToolHandler = (input: Record<string, unknown>, dryRun: boolean) => Promise<MCPToolResult>

function dryRunResult(data: unknown): MCPToolResult {
  return { ok: true, dryRun: true, data }
}

async function frappeInsert(doctype: string, doc: Record<string, unknown>, dryRun: boolean): Promise<MCPToolResult> {
  if (dryRun) return dryRunResult({ doctype, doc })
  const response = await serverFrappeCall('frappe.client.insert', 'POST', { doc: { doctype, ...doc } })
  return { ok: true, data: response }
}

async function frappeGet(doctype: string, name: unknown): Promise<MCPToolResult> {
  const response = await serverFrappeCall('frappe.client.get', 'POST', { doctype, name })
  return { ok: true, data: response }
}

async function frappeGetList(doctype: string, filters: unknown, fields: string[]): Promise<MCPToolResult> {
  const response = await serverFrappeCall('frappe.client.get_list', 'POST', {
    doctype,
    fields,
    filters,
    limit_page_length: 20,
  })
  return { ok: true, data: response }
}

async function frappeSetValue(
  doctype: string,
  name: unknown,
  fieldname: Record<string, unknown>,
  dryRun: boolean
): Promise<MCPToolResult> {
  if (dryRun) return dryRunResult({ doctype, name, fieldname })
  const response = await serverFrappeCall('frappe.client.set_value', 'POST', { doctype, name, fieldname })
  return { ok: true, data: response }
}

const handlers: Record<MCPToolName, ToolHandler> = {
  async 'crm.search_leads'(input) {
    const query = String(input.query || '')
    return frappeGetList(
      'Lead',
      [['Lead', 'lead_name', 'like', `%${query}%`]],
      ['name', 'lead_name', 'company_name', 'email_id', 'mobile_no', 'status']
    )
  },
  async 'crm.create_lead'(input, dryRun) {
    return frappeInsert(
      'Lead',
      {
        lead_name: input.lead_name,
        company_name: input.company_name,
        email_id: input.email_id,
        mobile_no: input.mobile_no,
        status: input.status || 'Lead',
      },
      dryRun
    )
  },
  async 'crm.update_lead'(input, dryRun) {
    const { name, ...fields } = input
    return frappeSetValue('Lead', name, fields, dryRun)
  },
  async 'quotes.get_quotation'(input) {
    return frappeGet('Quotation', input.name)
  },
  async 'quotes.create_quotation'(input, dryRun) {
    return frappeInsert(
      'Quotation',
      {
        party_name: input.party_name,
        quotation_to: input.quotation_to || 'Customer',
        valid_till: input.valid_till,
        items: input.items,
      },
      dryRun
    )
  },
  async 'inventory.get_item_availability'(input) {
    return frappeGetList(
      'Bin',
      { item_code: input.item_code, ...(input.warehouse ? { warehouse: input.warehouse } : {}) },
      ['name', 'item_code', 'warehouse', 'actual_qty', 'projected_qty', 'reserved_qty']
    )
  },
  async 'pricing.calculate_rental_pricing'(input) {
    const dailyRate = Number(input.daily_rate || 0)
    const quantity = Number(input.quantity || 1)
    const days = Number(input.days || 1)
    return {
      ok: true,
      data: {
        dailyRate,
        quantity,
        days,
        subtotal: dailyRate * quantity * days,
      },
    }
  },
  async 'invoices.get_invoice'(input) {
    return frappeGet('Sales Invoice', input.name)
  },
  async 'invoices.create_invoice'(input, dryRun) {
    return frappeInsert(
      'Sales Invoice',
      {
        customer: input.customer,
        due_date: input.due_date,
        items: input.items,
      },
      dryRun
    )
  },
  async 'payments.record_payment'(input, dryRun) {
    return frappeInsert(
      'Payment Entry',
      {
        payment_type: input.payment_type || 'Receive',
        party_type: input.party_type || 'Customer',
        party: input.party,
        paid_amount: input.paid_amount,
        received_amount: input.received_amount || input.paid_amount,
        reference_no: input.reference_no,
        reference_date: input.reference_date || new Date().toISOString().slice(0, 10),
      },
      dryRun
    )
  },
  async 'tasks.create_follow_up_task'(input, dryRun) {
    return frappeInsert(
      'ToDo',
      {
        description: input.subject,
        allocated_to: input.assigned_to,
        date: input.date,
        reference_type: input.reference_type,
        reference_name: input.reference_name,
      },
      dryRun
    )
  },
}

export async function executeMcpTool(
  context: AgenticTenantContext,
  toolCall: MCPToolCall,
  options: { dryRun?: boolean } = {}
): Promise<MCPToolResult> {
  const definition = getMcpTool(toolCall.name)
  if (!definition) return { ok: false, error: `Unknown tool: ${toolCall.name}` }

  const entitlement = canUseAgenticTool(context, definition.requiredPlan, definition.requiredFlag)
  if (!entitlement.allowed) return { ok: false, error: entitlement.reason || 'Tool is not enabled for this tenant.' }

  try {
    return await handlers[toolCall.name](toolCall.input, !!options.dryRun)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Tool execution failed' }
  }
}

