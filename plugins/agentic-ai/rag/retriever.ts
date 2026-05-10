import { getIndexedRagDocuments } from './indexer'
import { getStaticRagDocuments } from './sources'
import type { RagRetriever, RagSource, RetrievedContext } from './types'

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((token) => token.length > 2)
}

function scoreDocument(queryTokens: string[], content: string): number {
  const contentTokens = new Set(tokenize(content))
  return queryTokens.reduce((score, token) => score + (contentTokens.has(token) ? 1 : 0), 0)
}

export class LocalRagRetriever implements RagRetriever {
  async retrieve(
    query: string,
    options: { tenantId: string; limit?: number; sources?: RagSource[] }
  ): Promise<RetrievedContext[]> {
    const limit = options.limit || 5
    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) return []

    const docs = [...getStaticRagDocuments(), ...getIndexedRagDocuments()]
    const allowedSources = new Set(options.sources || ['docs', 'erp', 'agent_logs'])

    return docs
      .filter((doc) => allowedSources.has(doc.source))
      .filter((doc) => doc.tenantId === 'global' || doc.tenantId === options.tenantId)
      .map((doc) => ({
        source: doc.source,
        tenantId: doc.tenantId,
        title: doc.title,
        content: doc.content,
        citation: doc.citation,
        score: scoreDocument(queryTokens, `${doc.title} ${doc.content} ${doc.tags?.join(' ') || ''}`),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
}

export async function retrieveAgenticContext(query: string, tenantId: string): Promise<RetrievedContext[]> {
  return new LocalRagRetriever().retrieve(query, { tenantId, limit: 5 })
}

