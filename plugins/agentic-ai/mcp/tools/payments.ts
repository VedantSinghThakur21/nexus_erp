import { z } from 'zod'
import type { MCPTool } from '../types'
import { frappeInsertDoc, idempotencyKey } from '../tool-runtime'

const PaymentInput = z.object({
  party: z.string().min(1),
  paid_amount: z.number().positive(),
  reference_no: z.string().optional(),
  payment_type: z.string().optional(),
  party_type: z.string().optional(),
  received_amount: z.number().optional(),
  reference_date: z.string().optional(),
})

export const paymentsTools: MCPTool[] = [
  {
    name: 'payments.record_payment',
    description: 'Record a payment entry against an invoice.',
    inputSchema: {
      type: 'object',
      properties: {
        party: { type: 'string' },
        paid_amount: { type: 'number' },
        reference_no: { type: 'string' },
      },
      required: ['party', 'paid_amount'],
    },
    requiredPlan: 'enterprise',
    requiredFlag: 'agentic_finance_enabled',
    requiresApproval: true,
    classification: 'destructive',
    supportsDryRun: true,
    auditPayloadShape: ['party', 'paid_amount'],
    async dryRun(input) {
      const parsed = PaymentInput.safeParse(input)
      if (!parsed.success) {
        return { preview: parsed.error.message, affectedRecords: [], estimatedImpact: 'low' as const }
      }
      return {
        preview: `Would record payment of ${parsed.data.paid_amount} for ${parsed.data.party}`,
        affectedRecords: [parsed.data.party],
        estimatedImpact: 'high',
      }
    },
    async execute(input, context) {
      const parsed = PaymentInput.safeParse(input)
      const key = idempotencyKey('payments.record_payment', input, context.runId)
      if (!parsed.success) return { success: false, error: parsed.error.message, idempotencyKey: key }
      return frappeInsertDoc(
        context,
        'Payment Entry',
        {
          payment_type: parsed.data.payment_type || 'Receive',
          party_type: parsed.data.party_type || 'Customer',
          party: parsed.data.party,
          paid_amount: parsed.data.paid_amount,
          received_amount: parsed.data.received_amount ?? parsed.data.paid_amount,
          reference_no: parsed.data.reference_no,
          reference_date: parsed.data.reference_date || new Date().toISOString().slice(0, 10),
        },
        'payments.record_payment'
      )
    },
  },
]
