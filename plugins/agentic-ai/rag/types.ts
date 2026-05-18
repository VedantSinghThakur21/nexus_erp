export type RagSource = 'docs' | 'erp' | 'agent_logs'

export type RetrievedContext = {
  source: RagSource
  tenantId: string
  title: string
  content: string
  score: number
  citation?: string
}

export type RagDocument = {
  id: string
  source: RagSource
  tenantId: string
  title: string
  content: string
  citation?: string
  tags?: string[]
}

export interface RagRetriever {
  retrieve(query: string, options: { tenantId: string; limit?: number; sources?: RagSource[] }): Promise<RetrievedContext[]>
}

export interface RagIndexer {
  index(documents: RagDocument[]): Promise<{ indexed: number }>
}

export type RetrieveOpts = {
  topK?: number
  minScore?: number
}

