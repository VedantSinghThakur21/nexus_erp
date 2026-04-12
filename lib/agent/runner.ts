import Anthropic from '@anthropic-ai/sdk'
import type { AgentRunContext, AgentRunResult, AgentTenantContext, AgentToolCall, AgentToolName } from '@/lib/agent/types'
import { AGENT_TOOLS, executeAgentTool } from '@/lib/agent/tools'

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest'

function clampConfidence(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0.5
  return Math.max(0, Math.min(1, n))
}

function parseFinalJson(text: string): AgentRunResult | null {
  try {
    const parsed = JSON.parse(text) as Partial<AgentRunResult>
    const suggestedActions = Array.isArray(parsed.suggestedActions)
      ? parsed.suggestedActions
          .map((action) => {
            const toolCall = (action as { toolCall?: AgentToolCall }).toolCall
            if (!toolCall?.name || !toolCall?.input) return null
            return {
              title: String((action as { title?: string }).title || 'Suggested action'),
              reason: String((action as { reason?: string }).reason || 'No reason provided'),
              confidence: clampConfidence((action as { confidence?: unknown }).confidence),
              toolCall: {
                name: toolCall.name as AgentToolName,
                input: toolCall.input,
              },
            }
          })
          .filter((value): value is NonNullable<typeof value> => value !== null)
      : []

    return {
      summary: String(parsed.summary || 'No summary produced'),
      observations: Array.isArray(parsed.observations) ? parsed.observations.map(String) : [],
      suggestedActions,
    }
  } catch {
    return null
  }
}

function buildPrompt(context: AgentRunContext, tenant: AgentTenantContext): string {
  return [
    'You are a cautious ERP operations agent.',
    `Tenant: ${tenant.tenantId}`,
    `Objective: ${context.objective}`,
    `Job Type: ${context.jobType}`,
    context.observation ? `Observation: ${context.observation}` : '',
    '',
    'Use provided tools when needed, but never execute irreversible actions without explicit approval.',
    'Return strict JSON only with shape:',
    '{"summary":"string","observations":["string"],"suggestedActions":[{"title":"string","reason":"string","confidence":0.0,"toolCall":{"name":"get_lead|update_lead|get_quotation|create_follow_up_task|get_invoice","input":{}}}]}'
  ].filter(Boolean).join('\n')
}

function fallbackResult(context: AgentRunContext): AgentRunResult {
  return {
    summary: 'Agent runner executed in fallback mode (no Anthropic key configured).',
    observations: ['Set ANTHROPIC_API_KEY to enable LLM planning.'],
    suggestedActions: context.jobType === 'stale_lead_scan'
      ? [
          {
            title: 'Create follow-up task for stale leads',
            reason: 'No model key configured, returning a safe canned suggestion.',
            confidence: 0.42,
            toolCall: {
              name: 'create_follow_up_task',
              input: {
                subject: 'Follow up on stale lead',
                description: 'Contact lead and update current qualification status.',
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              },
            },
          },
        ]
      : [],
  }
}

export async function runAgent(context: AgentRunContext, tenant: AgentTenantContext): Promise<AgentRunResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallbackResult(context)

  const client = new Anthropic({ apiKey })
  const toolResults: Array<{ tool: string; output: unknown }> = []

  let messages: Anthropic.Messages.MessageParam[] = [
    {
      role: 'user',
      content: buildPrompt(context, tenant),
    },
  ]

  for (let i = 0; i < 4; i += 1) {
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1200,
      tools: AGENT_TOOLS,
      messages,
      system: 'Prefer read-only lookups and dry-run previews. Never assume unavailable fields.',
    })

    const assistantBlocks = response.content
    messages.push({ role: 'assistant', content: assistantBlocks })

    const toolUses = assistantBlocks.filter((block) => block.type === 'tool_use')

    if (toolUses.length === 0) {
      const text = assistantBlocks
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')

      const parsed = parseFinalJson(text)
      if (parsed) {
        return {
          ...parsed,
          observations: [...parsed.observations, ...toolResults.map((r) => `Tool ${r.tool} used during planning`)],
        }
      }

      return {
        summary: 'Agent returned a non-JSON response; no suggestions produced.',
        observations: [text.slice(0, 500)],
        suggestedActions: [],
      }
    }

    for (const toolUse of toolUses) {
      const result = await executeAgentTool(
        toolUse.name as AgentToolName,
        (toolUse.input || {}) as Record<string, unknown>,
        tenant,
        { dryRun: true }
      )
      toolResults.push({ tool: toolUse.name, output: result })

      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          },
        ],
      })
    }
  }

  return {
    summary: 'Agent stopped after maximum planning iterations.',
    observations: ['Try simplifying prompt or tool outputs.'],
    suggestedActions: [],
  }
}
