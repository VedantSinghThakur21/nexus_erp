/**
 * In-memory provisioning job store.
 *
 * Tracks background provisioning tasks kicked off from /api/provision/start.
 * Valid only within a single Node.js process lifetime (survives page refreshes,
 * but not PM2 restarts / server redeploys).
 *
 * If a job is lost (404 on status poll), the provisioning page falls back to
 * a "check your email" message so the user always knows what happened.
 */

export interface ProvisionJobState {
  id: string
  status: 'pending' | 'success' | 'error'
  subdomain: string
  email: string
  startedAt: number
  completedAt?: number
  redirectUrl?: string
  apiKey?: string
  apiSecret?: string
  error?: string
}

// Module-level singleton (shared within one process)
const store = new Map<string, ProvisionJobState>()

// Also index by subdomain so the start route can detect already-running jobs
const bySubdomain = new Map<string, string>() // subdomain → jobId

/**
 * Create a new pending job and return it.
 * If there is already a pending job for this subdomain, return that job instead
 * to prevent duplicate provisioning on page refresh.
 */
export function createJob(subdomain: string, email: string): ProvisionJobState {
  const existingId = bySubdomain.get(subdomain)
  if (existingId) {
    const existing = store.get(existingId)
    if (existing && existing.status === 'pending') return existing
  }

  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  const job: ProvisionJobState = {
    id,
    status: 'pending',
    subdomain,
    email,
    startedAt: Date.now(),
  }
  store.set(id, job)
  bySubdomain.set(subdomain, id)
  return job
}

export function completeJob(
  id: string,
  data: { redirectUrl: string; apiKey?: string; apiSecret?: string },
): void {
  const job = store.get(id)
  if (!job) return
  const updated = { ...job, status: 'success' as const, completedAt: Date.now(), ...data }
  store.set(id, updated)
}

export function failJob(id: string, error: string): void {
  const job = store.get(id)
  if (!job) return
  store.set(id, { ...job, status: 'error' as const, completedAt: Date.now(), error })
  bySubdomain.delete(job.subdomain)
}

export function getJob(id: string): ProvisionJobState | undefined {
  return store.get(id)
}

/** Remove completed/failed/stale jobs older than 2 hours to avoid memory leaks. */
export function pruneJobs(): void {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000
  for (const [id, job] of store.entries()) {
    if (job.startedAt < cutoff) {
      store.delete(id)
      bySubdomain.delete(job.subdomain)
    }
  }
}
