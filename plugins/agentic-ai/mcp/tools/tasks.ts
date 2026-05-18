import { z } from 'zod'
import type { MCPTool } from '../types'
import { frappeInsertDoc, idempotencyKey } from '../tool-runtime'

const TaskInput = z.object({
  subject: z.string().min(1),
  assigned_to: z.string().optional(),
  date: z.string().optional(),
  reference_name: z.string().optional(),
  reference_type: z.string().optional(),
})

export const tasksTools: MCPTool[] = [
  {
    name: 'tasks.create_follow_up_task',
    description: 'Create a follow-up task for a user.',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        assigned_to: { type: 'string' },
        date: { type: 'string' },
        reference_name: { type: 'string' },
      },
      required: ['subject'],
    },
    requiredPlan: 'pro',
    requiredFlag: 'agentic_ai_enabled',
    requiresApproval: true,
    classification: 'write',
    supportsDryRun: true,
    auditPayloadShape: ['subject', 'assigned_to'],
    async dryRun(input) {
      const parsed = TaskInput.safeParse(input)
      if (!parsed.success) {
        return { preview: parsed.error.message, affectedRecords: [], estimatedImpact: 'low' as const }
      }
      return {
        preview: `Would create ToDo: ${parsed.data.subject}`,
        affectedRecords: [],
        estimatedImpact: 'low',
      }
    },
    async execute(input, context) {
      const parsed = TaskInput.safeParse(input)
      const key = idempotencyKey('tasks.create_follow_up_task', input, context.runId)
      if (!parsed.success) return { success: false, error: parsed.error.message, idempotencyKey: key }
      return frappeInsertDoc(
        context,
        'ToDo',
        {
          description: parsed.data.subject,
          allocated_to: parsed.data.assigned_to,
          date: parsed.data.date,
          reference_type: parsed.data.reference_type,
          reference_name: parsed.data.reference_name,
        },
        'tasks.create_follow_up_task'
      )
    },
  },
]
