# AGENTS.md - Nexus ERP

## Commands
- **Dev**: `npm run dev` | **Build**: `npm run build` | **Lint**: `npm run lint`
- No test framework configured yet

## Architecture
- **Next.js 16** (App Router) multi-tenant SaaS ERP for equipment rental/projects
- **Frontend**: React 19, Tailwind CSS 4, Radix UI, shadcn/ui components
- **Backend**: Frappe ERPNext (external) - accessed via `app/lib/api.ts` REST calls
- **Multi-tenancy**: Subdomain-based (`tenant1.avariq.in` → `X-Frappe-Site-Name: tenant1.avariq.in`)
- **Auth**: API tokens stored in httpOnly cookies, set during login from Master DB

## Key Environment Variables
- `NEXT_PUBLIC_ROOT_DOMAIN` - Root domain for cookie scope (e.g., `avariq.in`)
- `ERP_NEXT_URL` - Frappe backend URL (e.g., `http://127.0.0.1:8080`)
- `ERP_API_KEY` / `ERP_API_SECRET` - Master site API credentials
- `FRAPPE_SITE_NAME` - Master site name (e.g., `erp.localhost`)

## Key Directories
- `app/` - Next.js App Router pages and API routes
- `components/ui/` - shadcn/ui primitives | `components/*/` - feature components
- `lib/` - utilities: `api-client.ts` (API), `tenant.ts` (multi-tenancy), `utils.ts` (cn helper)
- `contexts/` - React context providers | `types/` - TypeScript definitions

## Code Style
- TypeScript strict mode with `@/*` path aliases
- Use `cn()` from `lib/utils.ts` for className merging
- Prefer `api.get/post/put/patch/delete` from `lib/api-client.ts` for backend calls
- Server: use `getTenant()` from `lib/tenant.ts` | Client: use `useClientTenant()`
- Components use Radix + Tailwind; follow existing patterns in `components/ui/`
