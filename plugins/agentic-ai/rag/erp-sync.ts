import { serverFrappeCall } from '@/lib/agent/server-frappe'
import { indexTenantRagDocuments } from './indexer'
import type { RagDocument } from './types'

const SYNC_TTL_MS = Number(process.env.AGENTIC_RAG_SYNC_TTL_MS || 15 * 60 * 1000)
const syncInflight = new Map<string, Promise<void>>()

type Row = Record<string, unknown>

function str(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function money(value: unknown): string {
  const n = Number(value)
  if (Number.isNaN(n)) return str(value)
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

async function frappeList(
  doctype: string,
  fields: string[],
  options: { filters?: unknown[]; limit?: number; orderBy?: string } = {}
): Promise<Row[]> {
  try {
    const data = await serverFrappeCall<Row[]>('frappe.client.get_list', 'POST', {
      doctype,
      fields,
      filters: options.filters,
      limit_page_length: options.limit ?? 40,
      order_by: options.orderBy ?? 'modified desc',
    })
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function leadDoc(tenantId: string, row: Row): RagDocument {
  const name = str(row.name)
  const leadName = str(row.lead_name) || name
  const status = str(row.status)
  const company = str(row.company_name)
  const email = str(row.email_id)
  const phone = str(row.mobile_no)
  return {
    id: `erp:lead:${name}`,
    source: 'erp',
    tenantId,
    title: `Lead: ${leadName}`,
    citation: `Lead/${name}`,
    tags: ['lead', 'crm', status.toLowerCase(), company.toLowerCase()].filter(Boolean),
    content: [
      `Lead ${leadName} (${name})`,
      status && `Status: ${status}`,
      company && `Company: ${company}`,
      email && `Email: ${email}`,
      phone && `Phone: ${phone}`,
      row.territory && `Territory: ${str(row.territory)}`,
      row.source && `Source: ${str(row.source)}`,
    ]
      .filter(Boolean)
      .join('. '),
  }
}

function customerDoc(tenantId: string, row: Row): RagDocument {
  const name = str(row.name)
  const label = str(row.customer_name) || name
  return {
    id: `erp:customer:${name}`,
    source: 'erp',
    tenantId,
    title: `Customer: ${label}`,
    citation: `Customer/${name}`,
    tags: ['customer', 'crm', str(row.customer_type).toLowerCase()],
    content: [
      `Customer ${label} (${name})`,
      row.customer_type && `Type: ${str(row.customer_type)}`,
      row.territory && `Territory: ${str(row.territory)}`,
      row.customer_group && `Group: ${str(row.customer_group)}`,
    ]
      .filter(Boolean)
      .join('. '),
  }
}

function opportunityDoc(tenantId: string, row: Row): RagDocument {
  const name = str(row.name)
  const title = str(row.title) || str(row.party_name) || name
  return {
    id: `erp:opportunity:${name}`,
    source: 'erp',
    tenantId,
    title: `Opportunity: ${title}`,
    citation: `Opportunity/${name}`,
    tags: ['opportunity', 'crm', str(row.status).toLowerCase()],
    content: [
      `Opportunity ${title} (${name})`,
      row.status && `Status: ${str(row.status)}`,
      row.party_name && `Party: ${str(row.party_name)}`,
      row.opportunity_amount != null && `Amount: ${money(row.opportunity_amount)}`,
      row.probability != null && `Probability: ${str(row.probability)}%`,
    ]
      .filter(Boolean)
      .join('. '),
  }
}

function quotationDoc(tenantId: string, row: Row): RagDocument {
  const name = str(row.name)
  const party = str(row.party_name) || str(row.customer_name)
  return {
    id: `erp:quotation:${name}`,
    source: 'erp',
    tenantId,
    title: `Quotation: ${name}`,
    citation: `Quotation/${name}`,
    tags: ['quotation', 'quote', 'sales', str(row.status).toLowerCase()],
    content: [
      `Quotation ${name}`,
      party && `Customer: ${party}`,
      row.status && `Status: ${str(row.status)}`,
      row.grand_total != null && `Total: ${money(row.grand_total)}`,
      row.valid_till && `Valid till: ${str(row.valid_till)}`,
    ]
      .filter(Boolean)
      .join('. '),
  }
}

function salesOrderDoc(tenantId: string, row: Row): RagDocument {
  const name = str(row.name)
  const customer = str(row.customer)
  return {
    id: `erp:sales-order:${name}`,
    source: 'erp',
    tenantId,
    title: `Sales order: ${name}`,
    citation: `Sales Order/${name}`,
    tags: ['sales order', 'order', str(row.status).toLowerCase()],
    content: [
      `Sales Order ${name}`,
      customer && `Customer: ${customer}`,
      row.status && `Status: ${str(row.status)}`,
      row.delivery_date && `Delivery: ${str(row.delivery_date)}`,
      row.grand_total != null && `Total: ${money(row.grand_total)}`,
    ]
      .filter(Boolean)
      .join('. '),
  }
}

function invoiceDoc(tenantId: string, row: Row): RagDocument {
  const name = str(row.name)
  const customer = str(row.customer)
  return {
    id: `erp:invoice:${name}`,
    source: 'erp',
    tenantId,
    title: `Invoice: ${name}`,
    citation: `Sales Invoice/${name}`,
    tags: ['invoice', 'finance', str(row.status).toLowerCase()],
    content: [
      `Sales Invoice ${name}`,
      customer && `Customer: ${customer}`,
      row.status && `Status: ${str(row.status)}`,
      row.posting_date && `Date: ${str(row.posting_date)}`,
      row.grand_total != null && `Total: ${money(row.grand_total)}`,
      row.outstanding_amount != null && `Outstanding: ${money(row.outstanding_amount)}`,
    ]
      .filter(Boolean)
      .join('. '),
  }
}

function itemDoc(tenantId: string, row: Row): RagDocument {
  const code = str(row.item_code) || str(row.name)
  const label = str(row.item_name) || code
  return {
    id: `erp:item:${code}`,
    source: 'erp',
    tenantId,
    title: `Item: ${label}`,
    citation: `Item/${code}`,
    tags: ['item', 'inventory', 'equipment', str(row.item_group).toLowerCase()],
    content: [
      `Item ${label} (code ${code})`,
      row.item_group && `Group: ${str(row.item_group)}`,
      row.stock_uom && `UOM: ${str(row.stock_uom)}`,
      row.standard_rate != null && `Rate: ${money(row.standard_rate)}`,
      row.description && `Description: ${str(row.description).slice(0, 200)}`,
    ]
      .filter(Boolean)
      .join('. '),
  }
}

function projectDoc(tenantId: string, row: Row): RagDocument {
  const name = str(row.name)
  const label = str(row.project_name) || name
  return {
    id: `erp:project:${name}`,
    source: 'erp',
    tenantId,
    title: `Project: ${label}`,
    citation: `Project/${name}`,
    tags: ['project', str(row.status).toLowerCase()],
    content: [
      `Project ${label} (${name})`,
      row.status && `Status: ${str(row.status)}`,
      row.customer && `Customer: ${str(row.customer)}`,
      row.expected_start_date && `Start: ${str(row.expected_start_date)}`,
      row.expected_end_date && `End: ${str(row.expected_end_date)}`,
    ]
      .filter(Boolean)
      .join('. '),
  }
}

function snapshotDoc(
  tenantId: string,
  counts: Record<string, number>
): RagDocument {
  const lines = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}: ${n}`)
  return {
    id: `erp:snapshot:${tenantId}`,
    source: 'erp',
    tenantId,
    title: 'CRM & operations snapshot',
    citation: 'erp/snapshot',
    tags: ['snapshot', 'summary', 'crm', 'inventory', 'finance'],
    content: [
      'Current indexed records in this tenant CRM (equipment rental / project ERP):',
      lines.join(', ') || 'No records indexed yet.',
      'Use specific questions about leads, customers, quotes, orders, invoices, items, or projects.',
    ].join(' '),
  }
}

export type ErpSyncOptions = {
  includeFinance?: boolean
}

export async function syncErpDocumentsForTenant(
  tenantId: string,
  options: ErpSyncOptions = {}
): Promise<RagDocument[]> {
  if (!tenantId || tenantId === 'master') {
    return []
  }

  const includeFinance = options.includeFinance !== false

  const [
    leads,
    customers,
    opportunities,
    quotations,
    salesOrders,
    invoices,
    items,
    projects,
  ] = await Promise.all([
    frappeList(
      'Lead',
      ['name', 'lead_name', 'status', 'company_name', 'email_id', 'mobile_no', 'territory', 'source'],
      { limit: 50 }
    ),
    frappeList('Customer', ['name', 'customer_name', 'customer_type', 'territory', 'customer_group'], {
      limit: 40,
    }),
    frappeList(
      'Opportunity',
      ['name', 'title', 'party_name', 'status', 'opportunity_amount', 'probability'],
      { limit: 40 }
    ),
    frappeList(
      'Quotation',
      ['name', 'party_name', 'status', 'grand_total', 'valid_till'],
      { limit: 40 }
    ),
    frappeList('Sales Order', ['name', 'customer', 'status', 'delivery_date', 'grand_total'], { limit: 40 }),
    includeFinance
      ? frappeList(
          'Sales Invoice',
          ['name', 'customer', 'status', 'posting_date', 'grand_total', 'outstanding_amount'],
          { limit: 40, filters: [['docstatus', '!=', 2]] }
        )
      : Promise.resolve([]),
    frappeList('Item', ['name', 'item_code', 'item_name', 'item_group', 'stock_uom', 'standard_rate', 'description'], {
      limit: 60,
      filters: [['disabled', '=', 0]],
    }),
    frappeList('Project', ['name', 'project_name', 'status', 'customer', 'expected_start_date', 'expected_end_date'], {
      limit: 30,
    }),
  ])

  const docs: RagDocument[] = [
    snapshotDoc(tenantId, {
      leads: leads.length,
      customers: customers.length,
      opportunities: opportunities.length,
      quotations: quotations.length,
      salesOrders: salesOrders.length,
      invoices: invoices.length,
      items: items.length,
      projects: projects.length,
    }),
    ...leads.map((r) => leadDoc(tenantId, r)),
    ...customers.map((r) => customerDoc(tenantId, r)),
    ...opportunities.map((r) => opportunityDoc(tenantId, r)),
    ...quotations.map((r) => quotationDoc(tenantId, r)),
    ...salesOrders.map((r) => salesOrderDoc(tenantId, r)),
    ...invoices.map((r) => invoiceDoc(tenantId, r)),
    ...items.map((r) => itemDoc(tenantId, r)),
    ...projects.map((r) => projectDoc(tenantId, r)),
  ]

  return docs
}

export async function ensureTenantRagIndexed(
  tenantId: string,
  options: ErpSyncOptions = {}
): Promise<{ indexed: number; fromCache: boolean }> {
  if (!tenantId || tenantId === 'master') {
    return { indexed: 0, fromCache: true }
  }

  const { getTenantIndexMeta } = await import('./indexer')
  const meta = getTenantIndexMeta(tenantId)
  if (meta && Date.now() - meta.syncedAt < SYNC_TTL_MS) {
    return { indexed: meta.count, fromCache: true }
  }

  const inflight = syncInflight.get(tenantId)
  if (inflight) {
    await inflight
    const after = getTenantIndexMeta(tenantId)
    return { indexed: after?.count ?? 0, fromCache: true }
  }

  const job = (async () => {
    const documents = await syncErpDocumentsForTenant(tenantId, options)
    indexTenantRagDocuments(tenantId, documents)
  })()

  syncInflight.set(tenantId, job)
  try {
    await job
  } finally {
    syncInflight.delete(tenantId)
  }

  const after = getTenantIndexMeta(tenantId)
  return { indexed: after?.count ?? 0, fromCache: false }
}
