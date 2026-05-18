import { z } from 'zod'
import type { MCPTool } from '../types'
import { frappeList, idempotencyKey } from '../tool-runtime'

const AvailabilityInput = z.object({
  item_code: z.string().min(1),
  warehouse: z.string().optional(),
})

export const inventoryTools: MCPTool[] = [
  {
    name: 'inventory.get_item_availability',
    description: 'Check stock availability for an item code.',
    inputSchema: {
      type: 'object',
      properties: { item_code: { type: 'string' }, warehouse: { type: 'string' } },
      required: ['item_code'],
    },
    requiredPlan: 'pro',
    requiredFlag: 'agentic_ai_enabled',
    requiresApproval: false,
    classification: 'read',
    supportsDryRun: false,
    auditPayloadShape: ['item_code', 'warehouse'],
    async execute(input, context) {
      const parsed = AvailabilityInput.safeParse(input)
      const key = idempotencyKey('inventory.get_item_availability', input, context.runId)
      if (!parsed.success) return { success: false, error: parsed.error.message, idempotencyKey: key }
      const filters: Record<string, string> = { item_code: parsed.data.item_code }
      if (parsed.data.warehouse) filters.warehouse = parsed.data.warehouse
      return frappeList(
        context,
        'Bin',
        filters,
        ['name', 'item_code', 'warehouse', 'actual_qty', 'projected_qty', 'reserved_qty']
      )
    },
  },
]
