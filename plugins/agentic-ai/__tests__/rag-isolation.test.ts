import { describe, expect, it } from 'vitest'
import { retrieve } from '../rag/retriever'
import { indexRagDocuments } from '../rag/indexer'

describe('RAG tenant isolation', () => {
  it('never returns another tenant documents', async () => {
    await indexRagDocuments([
      {
        id: 'a1',
        source: 'docs',
        tenantId: 'tenantA',
        title: 'Secret A',
        content: 'alpha bravo unique keyword alpha',
      },
      {
        id: 'b1',
        source: 'docs',
        tenantId: 'tenantB',
        title: 'Secret B',
        content: 'alpha bravo unique keyword beta',
      },
    ])

    const results = await retrieve('alpha bravo unique keyword', 'tenantA', { minScore: 0.1 })
    expect(results.every((r) => r.tenantId === 'tenantA' || r.tenantId === 'global')).toBe(true)
    expect(results.some((r) => r.tenantId === 'tenantB')).toBe(false)
  })

  it('returns empty when all scores below threshold', async () => {
    const results = await retrieve('zzznomatch', 'tenantA', { minScore: 0.9 })
    expect(results).toEqual([])
  })
})
