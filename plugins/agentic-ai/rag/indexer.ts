import type { RagDocument, RagIndexer } from './types'

const inMemoryIndex = new Map<string, RagDocument>()

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

export async function indexRagDocuments(documents: RagDocument[]) {
  return new InMemoryRagIndexer().index(documents)
}

