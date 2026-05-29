import { describe, expect, it } from 'vitest'
import { retrieve } from '../rag/retriever'
import { indexTenantRagDocuments } from '../rag/indexer'

describe('RAG tenant isolation', () => {
  it('never returns another tenant documents', async () => {
    indexTenantRagDocuments('tenantA', [
      {
        id: 'a1',
        source: 'erp',
        tenantId: 'tenantA',
        title: 'Secret A',
        content: 'alpha bravo unique keyword alpha',
      },
    ])
    indexTenantRagDocuments('tenantB', [
      {
        id: 'b1',
        source: 'erp',
        tenantId: 'tenantB',
        title: 'Secret B',
        content: 'alpha bravo unique keyword beta',
      },
    ])

    const results = await retrieve('alpha bravo unique keyword', 'tenantA', {
      minScore: 0.1,
      syncErp: false,
    })
    expect(results.every((r) => r.tenantId === 'tenantA' || r.tenantId === 'global')).toBe(true)
    expect(results.some((r) => r.tenantId === 'tenantB')).toBe(false)
  })

  it('returns empty when all scores below threshold', async () => {
    const results = await retrieve('zzznomatch', 'tenantA', { minScore: 0.9, syncErp: false })
    expect(results).toEqual([])
  })
})
