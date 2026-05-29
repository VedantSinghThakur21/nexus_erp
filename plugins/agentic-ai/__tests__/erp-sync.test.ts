import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/agent/server-frappe', () => ({
  serverFrappeCall: vi.fn(),
}))

import { serverFrappeCall } from '@/lib/agent/server-frappe'
import { syncErpDocumentsForTenant } from '../rag/erp-sync'
import { clearTenantRagIndex } from '../rag/indexer'

describe('syncErpDocumentsForTenant', () => {
  beforeEach(() => {
    vi.mocked(serverFrappeCall).mockReset()
    clearTenantRagIndex('tenantA')
  })

  it('builds lead and snapshot documents from Frappe lists', async () => {
    vi.mocked(serverFrappeCall).mockImplementation(async (endpoint, _method, payload) => {
      const doctype = (payload as { doctype?: string })?.doctype
      if (doctype === 'Lead') {
        return [{ name: 'LEAD-001', lead_name: 'Acme Corp', status: 'Open' }]
      }
      if (doctype === 'Customer') return []
      if (doctype === 'Opportunity') return []
      if (doctype === 'Quotation') return []
      if (doctype === 'Sales Order') return []
      if (doctype === 'Sales Invoice') return []
      if (doctype === 'Item') return [{ item_code: 'CRANE-50T', item_name: '50T Crane' }]
      if (doctype === 'Project') return []
      return []
    })

    const docs = await syncErpDocumentsForTenant('tenantA', { includeFinance: true })
    expect(docs.some((d) => d.id === 'erp:snapshot:tenantA')).toBe(true)
    expect(docs.some((d) => d.title.includes('Acme'))).toBe(true)
    expect(docs.some((d) => d.title.includes('50T Crane'))).toBe(true)
    expect(docs.every((d) => d.tenantId === 'tenantA')).toBe(true)
  })
})
