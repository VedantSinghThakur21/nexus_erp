# Nexus ERP — Performance audit (2026)

**Stack:** Next.js 16 (App Router), React 19, Frappe/ERPNext REST, BullMQ + Redis, MariaDB (Frappe). **Deployment:** not fixed in-repo (Vercel vs Docker vs VPS affects CDN compression, edge, and `compress`).

This document lists findings by severity, what was implemented in code, and what still needs product/infra decisions.

---

## 1. Severity matrix (issues and impact)

| ID | Area | Severity | Problem | Fix (status) | Expected gain |
|----|------|----------|---------|----------------|---------------|
| A1 | Subscription API | **Critical** | Every `GET /api/subscription/current` called `syncSubscriptionFromSaasTenant` (writes + multiple master Frappe calls). | `unstable_cache` + tag `subscription:{tenant}`; `revalidateTag(tag, 'max')` from Stripe webhook. | Cuts redundant master writes and reads on hot path; **~200–800ms+ per request** when master was cold (order of magnitude under load). |
| A2 | Dashboard server actions | **High** | `getDashboardStats` / funnel / activities used long **sequential** `frappeRequest` chains. | `Promise.all` for independent counts/lists in `app/actions/dashboard.ts`. | **~30–60%** less wall-clock for those actions when ERP latency is additive (e.g. 4×150ms sequential → ~150ms parallel). |
| A3 | Agentic entitlements | **High** | `fetchTenantPlanRow` ran SaaS Tenant + Organization queries **sequentially**; `getEntitlement` could call `fetchTenantPlanRow` **three times**. | Parallel tenant + org fetch; `dedupeInFlight` for concurrent identical tenant reads. | Fewer duplicate round-trips; **~150–400ms** saved under parallel agentic checks. |
| A4 | Frappe proxy route | **Medium** | `getAuthHeader()` then `getSiteName()` awaited one after another. | `Promise.all` in `app/api/proxy/[...path]/route.ts`. | **~0–20ms** (saves one async tick + any cookie/header contention). |
| A5 | Dashboard UX | **Medium** | Client page **polls every 60s** + focus/visibility refetch for full dashboard bundle. | Not replaced with SSE (see backlog); still acceptable for low-frequency. | SSE would reduce idle traffic; polling removed = infra-dependent. |
| A6 | App shell | **Medium** | Subscription plan fetched only inside `SubscriptionProvider` `useEffect` (waterfall after paint). | Warm `fetch('/api/subscription/current')` from `components/providers.tsx` on mount. | Overlaps network with first paint; **~50–200ms** perceived faster plan gating. |
| A7 | `getTenantContext` | **Medium** | `await headers()` then `await cookies()` always sequential in `app/lib/api.ts`. | Not changed (Next `cookies()`/`headers()` semantics); optional micro-parallel only where both needed without ordering. | Small; **risk** if Next expects ordering. |
| A8 | Client dashboard | **Medium** | Entire dashboard is `"use client"` + six server actions in `Promise.all` (good) but no RSC streaming. | Backlog: RSC page + Suspense sections. | **Largest** remaining win for TTFB + LCP vs current pattern. |
| A9 | Charts | **Medium** | `recharts` in sync client graphs pulls JS for dashboard-heavy routes. | Backlog: `next/dynamic` for chart components. | **~20–80KB** gzip-class savings on routes that do not need charts above fold. |
| A10 | Middleware | **High (ops)** | Repo ships `proxy.ts` but **no `middleware.ts`** in workspace snapshot; tenant headers may be environment-specific. | Verify production wires `proxy` as Next middleware. | Without it, `x-tenant-id` and multi-tenant API routing can be wrong (**functional**, not just perf). |
| A11 | Frappe HTTP cache | **Medium** | Next cannot safely add `Cache-Control` on behalf of Frappe for authenticated tenant data. | Document: cache at Next (`unstable_cache` / route headers) or nginx in front of Frappe for anonymous assets only. | **Infra** — do not break REST contracts. |
| A12 | BullMQ job progress | **Medium** | No streaming progress for agent scan jobs. | **`GET /api/agent/jobs/[id]/stream`** SSE + `streamUrl` on `POST /api/agent/scan` response. | Real-time UX; removes need for blind polling if UI adopts EventSource. |
| A13 | Web Vitals | **Low** | No in-app regression signal for LCP/INP/CLS. | `web-vitals` + `WebVitalsReporter`; optional `NEXT_PUBLIC_ANALYTICS_WEB_VITALS` beacon URL. | Observability; no direct latency cut. |
| A14 | MariaDB indexes | **Medium** | SaaS multi-tenant filters (`subdomain`, `slug`) should be indexed in Frappe. | **Recommendations** below; apply in Frappe custom app / site. | Faster master reads for subscription sync. |

---

## 2. Implemented code changes (summary)

| Deliverable | Implementation |
|-------------|----------------|
| Promise.all refactors | `app/actions/dashboard.ts` (stats, pipeline, CRM counts, activities, funnel, deals-by-stage); `plugins/agentic-ai/entitlements.ts` (tenant ∥ org). |
| Caching (Layer 2 + invalidation) | `lib/subscription/cached-subscription-read.ts` + `app/api/subscription/current/route.ts` (`X-Response-Time`, `Cache-Control` hints); `app/api/billing/webhook/route.ts` → `revalidateTag(..., 'max')`. |
| Request deduplication | `lib/performance/in-flight-dedupe.ts` used in `fetchTenantPlanRow`. |
| SSE (BullMQ) | `app/api/agent/jobs/[id]/stream/route.ts`; `app/api/agent/scan/route.ts` returns `streamUrl`. |
| Web Vitals | `components/web-vitals-reporter.tsx`, `app/layout.tsx`, dependency `web-vitals`. |
| Skeletons | `components/ui/list-view-skeleton.tsx`; `app/(main)/loading.tsx`, `app/tenant/(main)/loading.tsx`. |
| Optimistic UI | `components/crm/opportunity-actions.tsx` (stage/status); `components/invoices/invoice-actions.tsx` + `payment-dialog.tsx` (cancel / payment outstanding). Kanban already optimistic. |
| Static asset headers | `next.config.ts` — `/_next/static` immutable `Cache-Control`. |
| In-memory TTL helper | `lib/performance/ttl-memory-cache.ts` (`createTtlMemoryCache`) for future 60s/5m caches. |

---

## 3. RSC migration plan (page-by-page)

| Route / area | Current | Recommended | Notes |
|--------------|---------|-------------|-------|
| `app/(main)/dashboard/page.tsx` | Client; 6 server actions on mount | **Server page** + small client widgets; **Suspense** per chart/table | Largest win: move stats fetch to RSC; keep framer-motion tables as client islands. |
| `app/(main)/sales-orders/*` | Mixed (some RSC data) | Keep RSC list fetch; dynamic charts only | Already closer to ideal. |
| `app/(main)/invoices/*` | Mixed | Same | Ensure actions stay server. |
| `app/(main)/crm/leads` (kanban) | Client (DnD) | RSC fetch **leads**; client **only** board | Reduces client waterfall. |
| Marketing `app/site/*` | Mostly static | `generateStaticParams` where dynamic slugs exist | PPR if mixing auth islands later. |
| Agent pages | Client-heavy | Dynamic import agent plugin when `agentic_ai_enabled` | entitlement already gated. |

**PPR:** Enable only after Next config + route segmentation plan; not toggled in this pass.

---

## 4. Bundle analysis

- **Not run in CI** in this change set (Next 16 defaults to **Turbopack**; webpack-only `@next/bundle-analyzer` needs `next build --webpack` or Turbopack-native analyzer when stable).
- **Action:** add `@next/bundle-analyzer` and script `ANALYZE=true next build --webpack` if you keep a webpack analysis pipeline.

**Likely chunk wins (backlog):** dynamic `import()` for `recharts`, heavy CRM sheets, agentic plugin entry.

---

## 5. Frappe / MariaDB recommendations

**Master site (SaaS Tenant, Organization):**

- Index on `tabSaaS Tenant` **subdomain** (unique where business rules allow).
- Index on `tabOrganization` **slug** (tenant key).

**Tenant sites (list views):**

- Index fields used in standard filters: `modified`, `status`, `posting_date`, `owner`, `customer_name` / link fields per high-traffic DocType (Lead, Quotation, Sales Order, Sales Invoice).

**Query style:** keep `limit_page_length`; avoid `get_all` for large sets; keep explicit `fields: [...]` (already used in many calls).

---

## 6. Infrastructure (compression, CDN, Frappe)

| Topic | Note |
|-------|------|
| **Brotli/gzip** | Next `compress: true` enables response compression for the Node server. **Vercel** adds CDN compression automatically. **Docker/nginx** in front of Frappe should enable `gzip` / `brotli` for `/api` if not already. |
| **ETag on Frappe** | Configure at reverse-proxy or Frappe layer for static files; **do not** blindly ETag user-specific JSON from generic whitelisted methods. |
| **Redis cache layer** | `unstable_cache` uses Next’s Data Cache (filesystem in standalone). For **multi-instance** invalidation consistency, add Redis cache wrapper or shared tag store (**infra**). |

---

## 7. Backlog (high value)

1. Replace dashboard 60s polling with **SSE or Frappe realtime** for “fresh enough” metrics.
2. **Error boundaries** + retry per dashboard section.
3. **Lighthouse CI** in PR (Performance ≥90, A11y ≥95) — thresholds in workflow YAML.
4. **`app/lib/api.ts`**: optional request coalescing map keyed by `site + endpoint + body hash` with short TTL (careful with mutations).

---

## 8. Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_ANALYTICS_WEB_VITALS` | Optional POST URL for Web Vitals beacon (same-origin or CORS-enabled). |

---

## 9. Client: consume BullMQ SSE

After `POST /api/agent/scan`, connect:

```ts
const es = new EventSource(streamUrl, { withCredentials: true })
es.addEventListener('tick', (e) => { /* JSON.parse(e.data) */ })
es.addEventListener('completed', () => { es.close() })
```

---

*This audit is a living doc; update when middleware deployment, hosting, and Frappe versions change.*
