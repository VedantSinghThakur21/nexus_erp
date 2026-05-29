import { getIndexedRagDocuments, getTenantRagDocuments } from './indexer'
import { ensureTenantRagIndexed } from './erp-sync'
import { getStaticRagDocuments } from './sources'
import type { RagRetriever, RagSource, RetrievedContext, RetrieveOpts } from './types'

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((token) => token.length > 2)
}

function cosineSimilarity(query: string, content: string): number {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return 0
  const contentTokens = new Set(tokenize(content))
  const hits = queryTokens.filter((t) => contentTokens.has(t)).length
  return hits / queryTokens.length
}

export function formatContextForPrompt(chunks: RetrievedContext[]): string {
  if (chunks.length === 0) return ''
  return chunks.map((c, i) => `[${i + 1}] ${c.title} (${c.source})\n${c.content}`).join('\n\n---\n\n')
}

/**
 * Tenant isolation: only docs matching tenantId or global are returned.
 */
export async function retrieve(
  query: string,
  tenantId: string,
  opts: RetrieveOpts = {}
): Promise<RetrievedContext[]> {
  const topK = opts.topK ?? 8
  const minScore = opts.minScore ?? 0.2

  if (tenantId && tenantId !== 'master' && opts.syncErp !== false) {
    await ensureTenantRagIndexed(tenantId, {
      includeFinance: opts.includeFinance,
    }).catch(() => undefined)
  }

  const tenantDocs = [
    ...getStaticRagDocuments(),
    ...getTenantRagDocuments(tenantId),
    ...getIndexedRagDocuments().filter((d) => d.tenantId === tenantId),
  ]

  const scored = tenantDocs
    .filter((doc) => doc.tenantId === 'global' || doc.tenantId === tenantId)
    .map((doc) => ({
      source: doc.source,
      tenantId: doc.tenantId,
      title: doc.title,
      content: doc.content.slice(0, 2000),
      citation: doc.citation,
      score: cosineSimilarity(query, `${doc.title} ${doc.content} ${doc.tags?.join(' ') || ''}`),
    }))
    .filter((d) => d.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return scored
}

export class LocalRagRetriever implements RagRetriever {
  async retrieve(
    query: string,
    options: { tenantId: string; limit?: number; sources?: RagSource[] }
  ): Promise<RetrievedContext[]> {
    const chunks = await retrieve(query, options.tenantId, { topK: options.limit ?? 5 })
    if (!options.sources) return chunks
    const allowed = new Set(options.sources)
    return chunks.filter((c) => allowed.has(c.source))
  }
}

export async function retrieveAgenticContext(query: string, tenantId: string): Promise<RetrievedContext[]> {
  return retrieve(query, tenantId, { topK: 5, minScore: 0.3 })
}
