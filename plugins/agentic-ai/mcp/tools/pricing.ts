import { z } from 'zod'
import type { MCPTool } from '../types'
import { idempotencyKey } from '../tool-runtime'

const PricingInput = z.object({
  daily_rate: z.number(),
  quantity: z.number().default(1),
  days: z.number().default(1),
})

export const pricingTools: MCPTool[] = [
  {
    name: 'pricing.calculate_rental_pricing',
    description: 'Calculate rental pricing from rate, quantity, and rental period.',
    inputSchema: {
      type: 'object',
      properties: { daily_rate: { type: 'number' }, quantity: { type: 'number' }, days: { type: 'number' } },
      required: ['daily_rate', 'quantity', 'days'],
    },
    requiredPlan: 'pro',
    requiredFlag: 'agentic_ai_enabled',
    requiresApproval: false,
    classification: 'read',
    supportsDryRun: false,
    auditPayloadShape: ['daily_rate', 'quantity', 'days'],
    async execute(input, context) {
      const parsed = PricingInput.safeParse(input)
      const key = idempotencyKey('pricing.calculate_rental_pricing', input, context.runId)
      if (!parsed.success) return { success: false, error: parsed.error.message, idempotencyKey: key }
      const { daily_rate, quantity, days } = parsed.data
      return {
        success: true,
        data: { daily_rate, quantity, days, subtotal: daily_rate * quantity * days },
        idempotencyKey: key,
      }
    },
  },
]
