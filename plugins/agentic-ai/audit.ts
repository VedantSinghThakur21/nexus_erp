import { serverFrappeCall } from '@/lib/agent/server-frappe'
import type { MCPToolCall, MCPToolResult } from './mcp/types'
import type { AgenticActionStatus } from './types'

export type PendingAgenticAction = {
  id: string
  toolName: string
  payload: Record<string, unknown>
  status: AgenticActionStatus
  dryRun?: unknown
  createdAt?: string
  approvedBy?: string
  idempotencyKey?: string
}

type AgentActionLogRow = {
  name: string
  tool_name?: string
  action?: string
  payload?: string | Record<string, unknown>
  status?: string
  dry_run?: string | Record<string, unknown>
  creation?: string
  approved_by?: string
  idempotency_key?: string
}

function parseJsonField(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'object') return value as Record<string, unknown>
  if (typeof value !== 'string') return {}
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {}
  }
}

function normalizeAction(row: AgentActionLogRow): PendingAgenticAction {
  return {
    id: row.name,
    toolName: row.tool_name || row.action || 'unknown',
    payload: parseJsonField(row.payload),
    dryRun: parseJsonField(row.dry_run),
    status: (row.status || 'pending_approval') as AgenticActionStatus,
    createdAt: row.creation,
    approvedBy: row.approved_by,
    idempotencyKey: row.idempotency_key,
  }
}

export async function createPendingAgenticAction(input: {
  toolCall: MCPToolCall
  dryRun?: MCPToolResult
  createdBy?: string
  idempotencyKey?: string
}): Promise<{ ok: boolean; action?: PendingAgenticAction; error?: string }> {
  const payload = {
    doctype: 'Agent Action Log',
    tool_name: input.toolCall.name,
    action: input.toolCall.name,
    payload: JSON.stringify(input.toolCall.input),
    dry_run: JSON.stringify(input.dryRun || {}),
    status: 'pending_approval',
    created_by: input.createdBy,
    idempotency_key: input.idempotencyKey,
  }

  try {
    const response = await serverFrappeCall<AgentActionLogRow>('frappe.client.insert', 'POST', {
      doc: payload,
    })
    const row = response
    if (!row?.name) return { ok: false, error: 'Agent Action Log insert returned no record id' }
    return { ok: true, action: normalizeAction(row) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to create pending action' }
  }
}

export async function listPendingAgenticActions(): Promise<{ ok: boolean; actions: PendingAgenticAction[]; error?: string }> {
  try {
    const response = await serverFrappeCall<AgentActionLogRow[]>('frappe.client.get_list', 'POST', {
      doctype: 'Agent Action Log',
      fields: ['name', 'tool_name', 'action', 'payload', 'status', 'dry_run', 'creation', 'approved_by', 'idempotency_key'],
      filters: { status: ['in', ['pending_approval', 'failed']] },
      order_by: 'creation desc',
      limit_page_length: 50,
    })

    return {
      ok: true,
      actions: (response || []).map(normalizeAction),
    }
  } catch (error) {
    return {
      ok: false,
      actions: [],
      error: error instanceof Error ? error.message : 'Failed to fetch pending actions',
    }
  }
}

export async function getAgenticAction(id: string): Promise<PendingAgenticAction | null> {
  const response = await serverFrappeCall<AgentActionLogRow>('frappe.client.get', 'POST', {
    doctype: 'Agent Action Log',
    name: id,
  })
  return response ? normalizeAction(response) : null
}

export async function setAgenticActionStatus(
  id: string,
  status: AgenticActionStatus,
  fields: Record<string, unknown> = {}
) {
  return serverFrappeCall('frappe.client.set_value', 'POST', {
    doctype: 'Agent Action Log',
    name: id,
    fieldname: {
      status,
      ...fields,
    },
  })
}

export async function claimPendingAgenticAction(
  id: string,
  approvedBy: string
): Promise<{ ok: boolean; action?: PendingAgenticAction; conflict?: boolean; error?: string }> {
  const action = await getAgenticAction(id)
  if (!action) return { ok: false, error: 'Action not found' }
  if (action.status !== 'pending_approval') {
    return { ok: false, conflict: true, error: 'This action has already been handled.' }
  }

  await setAgenticActionStatus(id, 'approved', {
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
  })

  const claimed = await getAgenticAction(id)
  if (!claimed || claimed.status !== 'approved') {
    return { ok: false, conflict: true, error: 'Action could not be claimed for approval.' }
  }

  return { ok: true, action: claimed }
}

