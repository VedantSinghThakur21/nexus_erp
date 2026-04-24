export type VerifyProdConfig = {
  baseUrl: string
  erpNextUrl?: string
  rootDomain?: string
  tenantHost?: string
  timeoutMs: number
  requireSecurityHeaders: boolean
}

export function loadVerifyProdConfig(): VerifyProdConfig {
  const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || '').replace(/\/+$/, '')
  if (!baseUrl) {
    throw new Error('PLAYWRIGHT_BASE_URL is required for production verification')
  }

  const erpNextUrl = process.env.ERP_NEXT_URL?.replace(/\/+$/, '')
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
  const tenantHost = process.env.VERIFY_TENANT_HOST

  return {
    baseUrl,
    erpNextUrl,
    rootDomain,
    tenantHost,
    timeoutMs: Number(process.env.VERIFY_TIMEOUT_MS || '20000'),
    requireSecurityHeaders: process.env.VERIFY_SECURITY_HEADERS !== '0',
  }
}

