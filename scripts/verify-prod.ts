import { loadVerifyProdConfig } from './verify-prod.config'

type CheckResult = { name: string; ok: boolean; details?: string }

function assertUrl(url: string) {
  try {
    new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(t)
  }
}

async function checkHttp(
  name: string,
  url: string,
  {
    timeoutMs,
    expectStatus,
    headers,
    allowRedirect = true,
  }: {
    timeoutMs: number
    expectStatus?: number[]
    headers?: Record<string, string>
    allowRedirect?: boolean
  }
): Promise<CheckResult> {
  try {
    const resp = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        redirect: allowRedirect ? 'follow' : 'manual',
        headers,
      },
      timeoutMs
    )

    if (expectStatus && !expectStatus.includes(resp.status)) {
      return {
        name,
        ok: false,
        details: `Unexpected status ${resp.status} for ${url}`,
      }
    }

    return { name, ok: true, details: `status=${resp.status}` }
  } catch (e: any) {
    return { name, ok: false, details: e?.message ?? String(e) }
  }
}

function headerPresent(resp: Response, key: string) {
  return Boolean(resp.headers.get(key))
}

async function checkSecurityHeaders(
  baseUrl: string,
  timeoutMs: number
): Promise<CheckResult[]> {
  const url = `${baseUrl}/login`
  try {
    const resp = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' }, timeoutMs)

    const checks: Array<[string, boolean, string]> = [
      ['strict-transport-security', headerPresent(resp, 'strict-transport-security'), 'HSTS (HTTPS only)'],
      ['content-security-policy', headerPresent(resp, 'content-security-policy'), 'CSP'],
      ['referrer-policy', headerPresent(resp, 'referrer-policy'), 'Referrer-Policy'],
    ]

    // One of these should exist (modern sites tend to prefer CSP frame-ancestors)
    const hasFrameGuard =
      headerPresent(resp, 'x-frame-options') || headerPresent(resp, 'content-security-policy')

    const results: CheckResult[] = checks.map(([k, ok, label]) => ({
      name: `security-header:${k}`,
      ok,
      details: label,
    }))

    results.push({
      name: 'security-header:frame-guard',
      ok: hasFrameGuard,
      details: 'x-frame-options or CSP present',
    })

    return results
  } catch (e: any) {
    return [
      {
        name: 'security-headers',
        ok: false,
        details: e?.message ?? String(e),
      },
    ]
  }
}

async function main() {
  const cfg = loadVerifyProdConfig()
  assertUrl(cfg.baseUrl)
  if (cfg.erpNextUrl) assertUrl(cfg.erpNextUrl)

  const mode = process.argv.includes('--pre')
    ? 'pre'
    : process.argv.includes('--post')
      ? 'post'
      : 'post'

  const results: CheckResult[] = []

  // Basic availability
  results.push(
    await checkHttp('app:GET /', `${cfg.baseUrl}/`, {
      timeoutMs: cfg.timeoutMs,
      expectStatus: [200],
    })
  )

  results.push(
    await checkHttp('app:GET /login', `${cfg.baseUrl}/login`, {
      timeoutMs: cfg.timeoutMs,
      expectStatus: [200],
    })
  )

  // Unauthed dashboard should redirect or show login
  results.push(
    await checkHttp('app:GET /dashboard (unauth)', `${cfg.baseUrl}/dashboard`, {
      timeoutMs: cfg.timeoutMs,
      expectStatus: [200, 302, 307, 308],
    })
  )

  // Optional backend reachability
  if (cfg.erpNextUrl) {
    results.push(
      await checkHttp('erpnext:reachable', `${cfg.erpNextUrl}/api/method/ping`, {
        timeoutMs: cfg.timeoutMs,
        expectStatus: [200, 401, 403, 404],
      })
    )
  }

  if (cfg.requireSecurityHeaders) {
    results.push(...(await checkSecurityHeaders(cfg.baseUrl, cfg.timeoutMs)))
  }

  // Output
  const failed = results.filter((r) => !r.ok)
  const okCount = results.length - failed.length

  console.log(`verify-prod (${mode}): ${okCount}/${results.length} checks passed`)
  for (const r of results) {
    console.log(`${r.ok ? 'OK ' : 'FAIL'} ${r.name}${r.details ? ` — ${r.details}` : ''}`)
  }

  if (failed.length > 0) {
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})

