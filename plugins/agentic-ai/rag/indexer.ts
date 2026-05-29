import type { RagDocument, RagIndexer } from './types'

const inMemoryIndex = new Map<string, RagDocument>()
const tenantIndexes = new Map<string, { syncedAt: number; documents: RagDocument[] }>()

export class InMemoryRagIndexer implements RagIndexer {
  async index(documents: RagDocument[]): Promise<{ indexed: number }> {
    for (const doc of documents) {
      inMemoryIndex.set(`${doc.tenantId}:${doc.id}`, doc)
    }
    return { indexed: documents.length }
  }
}

export function getIndexedRagDocuments(): RagDocument[] {
  return Array.from(inMemoryIndex.values())
}

export function indexRagDocuments(documents: RagDocument[]) {
  return new InMemoryRagIndexer().index(documents)
}

/** Replace per-tenant ERP RAG corpus (called after sync). */
export function indexTenantRagDocuments(tenantId: string, documents: RagDocument[]): void {
  tenantIndexes.set(tenantId, {
    syncedAt: Date.now(),
    documents,
  })
}

export function getTenantRagDocuments(tenantId: string): RagDocument[] {
  return tenantIndexes.get(tenantId)?.documents ?? []
}

export function getTenantIndexMeta(tenantId: string): { syncedAt: number; count: number } | null {
  const row = tenantIndexes.get(tenantId)
  if (!row) return null
  return { syncedAt: row.syncedAt, count: row.documents.length }
}

export function clearTenantRagIndex(tenantId: string): void {
  tenantIndexes.delete(tenantId)
}
