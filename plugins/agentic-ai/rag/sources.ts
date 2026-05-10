import type { RagDocument } from './types'

export function getStaticRagDocuments(): RagDocument[] {
  return [
    {
      id: 'docs-project-notes-agentic-ai',
      source: 'docs',
      tenantId: 'global',
      title: 'Project Notes: Agentic AI Direction',
      citation: 'docs/project-notes.md',
      tags: ['agentic-ai', 'workflow', 'mcp', 'openrouter'],
      content:
        'Agentic AI is moving to an independent plugin workflow with route-level entitlements, tool-level entitlements, OpenRouter model access, MCP-style tools, RAG context, approval workflows, and audit logging.',
    },
    {
      id: 'docs-approval-safety',
      source: 'docs',
      tenantId: 'global',
      title: 'Agent Approval Safety',
      citation: 'docs/project-notes.md',
      tags: ['approval', 'audit', 'safety'],
      content:
        'Write and finance actions should produce a pending approval record before execution. Approval should claim the action before calling ERPNext and store final execution status.',
    },
  ]
}

