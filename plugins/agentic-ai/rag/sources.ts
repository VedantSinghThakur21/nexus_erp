import type { RagDocument } from './types'

export function getStaticRagDocuments(): RagDocument[] {
  return [
    {
      id: 'docs-nexus-domain',
      source: 'docs',
      tenantId: 'global',
      title: 'Nexus ERP domain (equipment rental)',
      citation: 'docs/domain',
      tags: ['rental', 'crane', 'equipment', 'booking', 'project', 'lead', 'quotation'],
      content: [
        'Nexus is an equipment rental and project operations ERP built on ERPNext.',
        'Core objects: Leads and Opportunities in CRM; Customers; Quotations and Sales Orders; Sales Invoices and payments;',
        'Items (equipment catalogue, e.g. cranes with tonnage); Projects and bookings; inspections and operators.',
        'Open leads are CRM Lead records not yet converted. Quotes become Sales Orders then Invoices.',
        'Stock availability is checked per item code and warehouse. Changes that write data require human approval in the Agent inbox.',
      ].join(' '),
    },
    {
      id: 'docs-agent-approval',
      source: 'docs',
      tenantId: 'global',
      title: 'Agent approval workflow',
      citation: 'docs/approval',
      tags: ['approval', 'audit', 'safety', 'inbox'],
      content:
        'Write actions (create lead, invoice, payment, etc.) create a pending record in Agent Action Log. A teammate approves or rejects in the Agent inbox before ERPNext is updated. Read-only lookups do not need approval.',
    },
    {
      id: 'docs-project-notes-agentic-ai',
      source: 'docs',
      tenantId: 'global',
      title: 'Agentic AI capabilities',
      citation: 'docs/project-notes.md',
      tags: ['agentic-ai', 'workflow', 'mcp', 'openrouter'],
      content:
        'The agent can search leads, check item availability, view quotations and invoices, and propose writes for approval. Answers combine live ERP data with indexed CRM snapshots.',
    },
  ]
}
