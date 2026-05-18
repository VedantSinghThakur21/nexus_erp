import { createHash } from 'crypto'
import { serverFrappeCall } from '@/lib/agent/server-frappe'
import type { MCPToolResult, ToolContext } from './types'

export function idempotencyKey(toolName: string, input: unknown, runId: string): string {
  return createHash('sha256').update(`${toolName}${JSON.stringify(input)}${runId}`).digest('hex')
}

export async function frappeList(
  context: ToolContext,
  doctype: string,
  filters: unknown,
  fields: string[],
  limit = 20
): Promise<MCPToolResult> {
  try {
    const data = await context.frappe('frappe.client.get_list', 'POST', {
      doctype,
      fields,
      filters,
      limit_page_length: limit,
    })
    return { success: true, data, idempotencyKey: idempotencyKey('list', { doctype, filters }, context.runId) }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Frappe request failed',
      idempotencyKey: idempotencyKey('list', { doctype }, context.runId),
    }
  }
}

export async function frappeGetDoc(
  context: ToolContext,
  doctype: string,
  name: string
): Promise<MCPToolResult> {
  try {
    const data = await context.frappe('frappe.client.get', 'POST', { doctype, name })
    return { success: true, data, idempotencyKey: idempotencyKey('get', { doctype, name }, context.runId) }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Frappe request failed',
      idempotencyKey: idempotencyKey('get', { doctype, name }, context.runId),
    }
  }
}

export async function frappeInsertDoc(
  context: ToolContext,
  doctype: string,
  doc: Record<string, unknown>,
  toolName: string
): Promise<MCPToolResult> {
  const key = idempotencyKey(toolName, doc, context.runId)
  try {
    const data = await context.frappe('frappe.client.insert', 'POST', {
      doc: { doctype, ...doc },
    })
    return { success: true, data, idempotencyKey: key }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Frappe request failed',
      idempotencyKey: key,
    }
  }
}

export async function frappeSetDoc(
  context: ToolContext,
  doctype: string,
  name: string,
  fieldname: Record<string, unknown>,
  toolName: string
): Promise<MCPToolResult> {
  const key = idempotencyKey(toolName, { name, fieldname }, context.runId)
  try {
    const data = await context.frappe('frappe.client.set_value', 'POST', { doctype, name, fieldname })
    return { success: true, data, idempotencyKey: key }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Frappe request failed',
      idempotencyKey: key,
    }
  }
}

export function buildToolContext(
  tenantId: string,
  userId: string,
  runId: string
): ToolContext {
  return {
    tenantId,
    userId,
    runId,
    frappe: (method, _path, body) => serverFrappeCall(method, 'POST', body as Record<string, unknown>),
  }
}
