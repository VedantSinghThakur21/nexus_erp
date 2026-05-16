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
| A5 | Dashboard UX | **Medium** | Client page **polled every 60s** + refetched six server actions on mount. | **RSC** page + `loadDashboardData`; refresh via `router.refresh()` on tab focus only (no idle poll). | Removes **~6×** client→server action round-trips on first paint; idle **60s** ERP traffic eliminated. |
| A6 | App shell | **Medium** | Subscription plan fetched only inside `SubscriptionProvider` `useEffect` (waterfall after paint). | Warm `fetch('/api/subscription/current')` from `components/providers.tsx` on mount. | Overlaps network with first paint; **~50–200ms** perceived faster plan gating. |
| A7 | `getTenantContext` | **Medium** | `await headers()` then `await cookies()` were sequential. | `Promise.all([headers(), cookies()])` + `sessionId` on context so `frappeRequest` skips a second `cookies()` read. | **~0–15ms** per Frappe hop + less async overhead under load. |
| A7b | `frappeRequest` GET storm | **High** | Identical GETs from the same user could hit ERP in parallel (dashboard, tables). | Per-process **coalesce** keyed by site + endpoint + params + **auth fingerprint** (`lib/performance/frappe-get-coalesce.ts`). | Collapses N concurrent identical GETs to **1** ERP round-trip (e.g. **−(N−1)×RTT** when components mount together). |
| A7c | `getDashboardStats` | **High** | Win-rate, pipeline, revenue, and lead blocks ran **one after another**. | Single `Promise.all` across four independent async segments in `app/actions/dashboard.ts`. | Removes **~3×** sequential ERP latency vs prior chain when all modules enabled (e.g. **~300–600ms** if each segment was ~150ms). |
| A8 | Client dashboard | **Medium** | Entire dashboard was `"use client"` + six server actions on mount. | `app/(main)/dashboard/page.tsx` (RSC) + `DashboardView` client island; `Promise.allSettled` per section in `loadDashboardData`. | Faster TTFB; partial failures don’t blank the page. |
| A9 | Charts | **Medium** | `recharts` in sync client graphs. | `components/dashboard/charts-lazy.tsx` — `next/dynamic` exports (use when wiring charts). | **~20–80KB** gzip on routes that import lazy charts only. |
| A10 | Middleware | **Resolved** | Audit assumed `middleware.ts` was missing. | **Next.js 16** uses **`proxy.ts`** as the middleware entry (do not add `middleware.ts` — build fails). | Tenant routing via `proxy.ts` + `config.matcher`. |
| A11 | Frappe HTTP cache | **Medium** | Next cannot safely add `Cache-Control` on behalf of Frappe for authenticated tenant data. | Document: cache at Next (`unstable_cache` / route headers) or nginx in front of Frappe for anonymous assets only. | **Infra** — do not break REST contracts. |
| A12 | BullMQ job progress | **Medium** | No streaming progress for agent scan jobs. | **`GET /api/agent/jobs/[id]/stream`** SSE (shared `lib/agent/bullmq-job-sse.ts`) + **`GET /api/agentic/runs/[id]/stream`** alias; `POST /api/agent/scan` returns `streamUrl` and `streamUrlAgentic`; `AbortSignal` ends the stream when the client disconnects. | Real-time UX; removes blind polling when the UI uses `EventSource`. |
| A13 | Web Vitals | **Low** | No in-app regression signal for LCP/INP/CLS. | `web-vitals` + `WebVitalsReporter`; optional `NEXT_PUBLIC_ANALYTICS_WEB_VITALS` beacon URL. | Observability; no direct latency cut. |
| A14 | MariaDB indexes | **Medium** | SaaS multi-tenant filters (`subdomain`, `slug`) should be indexed in Frappe. | **Recommendations** below; apply in Frappe custom app / site. | Faster master reads for subscription sync. |

---

## 2. Implemented code changes (summary)

| Deliverable | Implementation |
|-------------|----------------|
| Promise.all refactors | `app/actions/dashboard.ts` (stats, pipeline, CRM counts, activities, funnel, deals-by-stage); `plugins/agentic-ai/entitlements.ts` (tenant ∥ org). |
| Caching (Layer 2 + invalidation) | `lib/subscription/cached-subscription-read.ts` + `app/api/subscription/current/route.ts` (`X-Response-Time`, `Cache-Control` hints); `app/api/billing/webhook/route.ts` → `revalidateTag(..., 'max')`. |
| Request deduplication | `lib/performance/in-flight-dedupe.ts` used in `fetchTenantPlanRow`. **Also:** `lib/performance/frappe-get-coalesce.ts` for identical in-flight **GET** `frappeRequest` calls (auth-scoped key). |
| SSE (BullMQ) | `lib/agent/bullmq-job-sse.ts`; `app/api/agent/jobs/[id]/stream/route.ts`; `app/api/agentic/runs/[id]/stream/route.ts` (alias); `app/api/agent/scan/route.ts` returns `streamUrl` + `streamUrlAgentic`. |
| Web Vitals | `components/web-vitals-reporter.tsx`, `app/layout.tsx`, dependency `web-vitals`. |
| Skeletons | `components/ui/list-view-skeleton.tsx`; `app/(main)/loading.tsx`, `app/tenant/(main)/loading.tsx`. |
| Optimistic UI | `components/crm/opportunity-actions.tsx` (stage/status); `components/invoices/invoice-actions.tsx` + `payment-dialog.tsx` (cancel / payment outstanding). Kanban already optimistic. **Also:** `app/(main)/agent/page.tsx` (inbox approve/reject); `components/crm/delete-quotation-button.tsx` + `delete-opportunity-form.tsx` (navigate first, rollback on failure). |
| Static asset headers | `next.config.ts` — `/_next/static` immutable `Cache-Control`. |
| In-memory TTL helper | `lib/performance/ttl-memory-cache.ts`; **60s** agentic entitlement (`lib/cache/entitlement-cache.ts`); **30s** Frappe GET response cache (`FRAPPE_GET_CACHE_MS`, default 30000). |
| Middleware | `proxy.ts` only (Next 16; no `middleware.ts`). |
| Dashboard RSC | `app/(main)/dashboard/page.tsx`, `components/dashboard/dashboard-view.tsx`, `lib/dashboard/load-dashboard-data.ts`, `app/(main)/dashboard/error.tsx`. |
| Section errors | `DashboardSectionFailed`, `SectionErrorBoundary`, per-section `Promise.allSettled`. |
| Charts lazy | `components/dashboard/charts-lazy.tsx`. |
| Sidebar inbox | Visibility + `nexus-agent-inbox-changed` event (no 30s poll); entitlement prefetch on agent nav hover. |
| Agent scan SSE | `app/(main)/agent/page.tsx` uses `POST /api/agent/scan` + `useBullmqJobStream`. |
| Lighthouse CI | `.github/workflows/lighthouse.yml` + `lighthouserc.json` (perf ≥90, a11y ≥95 on `/site`). |
| Proxy timing | `X-Response-Time` on `/api/proxy/*` responses. |
| Redis GET cache | `lib/performance/frappe-get-redis-cache.ts` (optional multi-instance). |
| Agents RSC | `app/(main)/agents/page.tsx` + `AgentsChatClient`; lazy `react-markdown`. |
| Floating AI lazy | `FloatingAIChatLazy` in main layout. |
| Leads list cache | `getCachedLeads` + `revalidateLeadsListCache` (30s, tag per site). |
| Package imports | `optimizePackageImports` in `next.config.ts` for lucide, recharts, date-fns, framer-motion. |
| Warm prefetch | `/api/agentic/entitlement` alongside subscription in `Providers`. |

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

1. ~~**Multi-instance GET cache**~~ **Done** when `FRAPPE_REDIS_URL` / `FRAPPE_REDIS_HOST` is set (`lib/performance/frappe-get-redis-cache.ts`).
2. **PPR** on marketing + mixed static/dynamic routes when Next config is ready.
3. **Frappe realtime** for dashboard metrics (optional; focus/refresh is sufficient for most tenants).
4. Wire **`charts-lazy`** on pages that mount `DashboardCharts` / animated charts (exports ready in `charts-lazy.tsx`).

---

## 8. Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_ANALYTICS_WEB_VITALS` | Optional POST URL for Web Vitals beacon (same-origin or CORS-enabled). |
| `FRAPPE_GET_CACHE_MS` | TTL for successful Frappe GET cache (default `30000`; set `0` to disable). |
| `ENTITLEMENT_CACHE_MS` | Agentic entitlement in-memory TTL (default `60000`). |

---

## 9. Client: consume BullMQ SSE

After `POST /api/agent/scan`, connect using either `streamUrl` or `streamUrlAgentic` (same events):

```ts
const es = new EventSource(streamUrl, { withCredentials: true })
es.addEventListener('tick', (e) => { /* JSON.parse(e.data) */ })
es.addEventListener('completed', () => { es.close() })
```

Closing the tab aborts the underlying fetch on modern browsers; the route passes `request.signal` into the stream loop.

---

*This audit is a living doc; update when middleware deployment, hosting, and Frappe versions change.*
