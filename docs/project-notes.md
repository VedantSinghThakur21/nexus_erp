# Nexus ERP Project Notes

This document consolidates durable project notes that were previously spread across one-off checklists, implementation summaries, and workflow notes.

## Agentic Workflow Direction

Nexus ERP should use **OpenRouter + MCP** for scalable agentic workflows:

- **OpenRouter** provides model access and model choice.
- **MCP** standardizes how agents access tools, data, and business actions.
- Simple UI intent shortcuts should stay deterministic in the app.
- Real business operations should be exposed as MCP tools.

Recommended high-level shape:

```text
Nexus ERP UI
  -> Agent Orchestrator
    -> OpenRouter model call
    -> MCP tools/servers
      -> ERPNext/Frappe actions
      -> CRM actions
      -> quoting and invoicing actions
      -> pricing, availability, and analytics context
```

Current deterministic intent layer:

- The shared `PageHeader` recognizes common action intent from the search box.
- Example intents: create lead, create quote, create sales order, create invoice, add item, create project.
- These route directly to existing workflows and do not require an LLM or MCP.

Future MCP tool candidates:

- `create_lead`
- `search_lead`
- `search_customer`
- `create_quotation`
- `get_item_availability`
- `calculate_rental_pricing`
- `convert_quote_to_sales_order`
- `create_invoice`
- `summarize_customer_activity`
- `follow_up_stale_quotes`

Implementation guidance:

- Keep simple navigation intents deterministic.
- Use MCP when the assistant needs to inspect business data or mutate ERP state.
- Require user confirmation before destructive or high-impact actions.
- Return structured tool results so the assistant can explain what changed.
- Log tool calls for auditability.

### Agentic AI Plugin Implementation

The in-repo plugin boundary now lives under `plugins/agentic-ai/` so the workflow can later move into a standalone service without coupling every route to app code.

Implemented plugin pieces:

- Route-level entitlement requires `pro` or `enterprise` plus `agentic_ai_enabled`.
- MCP-style tools declare required plan, required flag, approval requirement, read/write/destructive classification, and dry-run support.
- Finance tools are separately gated with `agentic_finance_enabled`; invoice creation and payment recording require Enterprise.
- OpenRouter access is normalized through a model adapter with per-tier policy and fallback model support.
- RAG uses provider-style interfaces with tenant filtering and citation-aware context injection.
- New routes are available at `/api/agentic/chat`, `/api/agentic/runs`, `/api/agentic/inbox`, `/api/agentic/actions/[id]`, and `/api/agentic/entitlement`.
- `/agents` now behaves as the Agentic AI plugin workspace and shows a locked state when the plan or feature flag is missing.
- `/agent` uses the plugin approval inbox workflow; pending write actions must be approved before execution.

Operational requirements:

- Set `OPENROUTER_API_KEY` before expecting live model responses.
- Optionally set `OPENROUTER_AGENT_MODEL`, `OPENROUTER_AGENT_FALLBACK_MODEL`, `OPENROUTER_ENTERPRISE_AGENT_MODEL`, and `OPENROUTER_ENTERPRISE_AGENT_FALLBACK_MODEL`.
- Add `agentic_ai_enabled`, `agentic_finance_enabled`, and `agentic_destructive_tools_enabled` fields to the master `Tenant` DocType, or use the temporary env allowlists `AGENTIC_AGENTIC_AI_ENABLED_TENANTS`, `AGENTIC_AGENTIC_FINANCE_ENABLED_TENANTS`, and `AGENTIC_AGENTIC_DESTRUCTIVE_TOOLS_ENABLED_TENANTS`.
- Ensure the tenant has the `Agent Action Log` DocType and permissions for approval/audit persistence.

## Production Verification

The deploy verification runbook lives in `docs/production-verification.md`.

Topology assumptions:

- Single VM
- Nginx in front
- Next.js app managed by PM2
- ERPNext/Frappe backend reachable from the VM
- Manual SSH deployments

Useful commands:

```bash
npm run verify:prod:pre
npm run verify:prod:post
npm run test:e2e
npm run test:e2e:prod-smoke
```

Important test environment inputs:

- `PLAYWRIGHT_BASE_URL`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `ERP_NEXT_URL`
- `NEXT_PUBLIC_ROOT_DOMAIN`
- `NEXUS_FAST_LOGIN=1` for faster E2E login in non-production test runs

## E2E Testing Approach

The Playwright suite now has a CI-safe default:

- Normal run: `npm run test:e2e`
- Full login redirect smoke: `RUN_LOGIN_E2E=1 npm run test:e2e -- e2e/login.spec.ts`
- Strict security headers: `STRICT_SECURITY_HEADERS=1 npm run test:e2e -- --project=prod-smoke`

Default skipped tests are environment-dependent:

- RBAC tests require read-only or non-admin credentials.
- Tenant isolation tests require tenant A and tenant B URLs/resources.
- API CRUD/order tests require proxy auth/API credentials.
- The full login redirect smoke is opt-in because deployed login can be slow/flaky.

Recommended Playwright practices:

- Prefer role/label/test-id selectors over brittle CSS selectors.
- Keep tests independent and avoid shared mutable fixtures.
- Create unique records per test and clean them up when practical.
- Avoid fixed sleeps; wait for UI, URL, dialog, or network state.
- Use production smoke tests for read-only checks against real deployments.

## Provisioning v2

Provisioning moved from fragile `docker exec + bench console` calls to a Python FastAPI provisioning service.

Old approach:

```text
Node.js -> docker exec bench console -> parse output with regex
```

New approach:

```text
Next.js HTTP client -> Python FastAPI service -> bench/frappe operations -> JSON response
```

Benefits:

- Cleaner subprocess handling
- JSON responses
- Better rollback behavior
- Cleaner secrets and environment boundaries
- Easier health checking

Key files:

- `provisioning-service/app.py`
- `provisioning-service/Dockerfile`
- `provisioning-service/docker-compose.yml`
- `lib/provisioning-client.ts`
- `app/actions/signup.ts`
- `app/actions/provision.ts`

Deployment checklist:

1. Back up the database and environment files.
2. Build/deploy the provisioning service.
3. Configure `PROVISIONING_SERVICE_URL` and `PROVISIONING_API_SECRET`.
4. Verify `/health`.
5. Run a test signup/provisioning flow.
6. Monitor logs and rollback on provisioning failures.

## Workspace Ready Email

Workspace provisioning sends a ready email after successful background provisioning.

Purpose:

- Users do not need to keep the browser open for 8-12 minutes.
- Browser/proxy timeouts no longer break the user journey.
- The workspace link arrives when provisioning is complete.

Key behavior:

- Email sends after successful provisioning.
- Email failure does not fail provisioning.
- Logs indicate whether email delivery was attempted/succeeded.

Required SMTP configuration:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_EMAIL=no-reply@avariq.in
SMTP_PASSWORD=your_smtp_password_or_api_key
SMTP_DISPLAY_NAME=Nexus ERP
```

Recommended production email setup:

- Verified sender/domain
- SPF/DKIM configured
- Provider such as SendGrid, Mailgun, AWS SES, Postmark, or any SMTP server

## Role-Based Access Control

Nexus ERP maps app roles to Frappe/ERPNext roles.

Core role mappings:

| App Role | Frappe Role |
|---|---|
| Admin | System Manager |
| Sales Manager | Sales Manager |
| Sales | Sales User |
| Accounts Manager | Accounts Manager |
| Accounts | Accounts User |
| Projects Manager | Projects Manager |
| Projects | Projects User |
| Stock Manager | Stock Manager |
| Stock | Stock User |
| Member | Employee |

Access model:

- Sidebar modules are filtered by role.
- Page guards protect direct URL access.
- Frappe permissions remain the backend source of truth for API access.
- UI hiding is convenience only; server/backend checks must still enforce access.

Important module expectations:

- Admin can access all modules including tenant administration and settings.
- Sales roles cover CRM, quotations, sales orders, bookings, and catalogue visibility.
- Accounts roles cover invoices, payments, and related order visibility.
- Project roles cover projects, bookings, and inspections.
- Stock roles cover catalogue, operators/agents, and inspections.

## Sales Order to Invoice Workflow

Sales invoices are created from eligible sales orders after delivery/billing readiness.

Delivery status states:

| Status | Invoice Ready |
|---|---|
| Not Delivered | No |
| Partly Delivered | No |
| Fully Delivered | Yes |
| Closed | No |
| Not Applicable | No |

Invoice eligibility:

- `delivery_status = Fully Delivered`
- `docstatus = 1`
- status is `To Bill`, `To Deliver and Bill`, or `Completed`

Workflow:

1. Create sales order from quotation or manually.
2. Submit order.
3. Track delivery through delivery notes.
4. Show eligible orders in the invoice workflow.
5. Create sales invoice from eligible delivered order.

## Current Product Gaps

Known future work:

- Wire AI/search inputs to actual agent or intent handling across modules.
- Add stable `data-testid` attributes to critical workflows.
- Add cleanup helpers for E2E-created records.
- Add export/download behavior where buttons already exist.
- Implement real notification center behind notification icons.
- Add real AI calculations for forecasting, risk, pricing, and customer insights.
- Complete advanced filters and bulk actions across modules.
- Improve booking edit/new booking actions.
- Add stronger API-level tests once stable proxy auth credentials are available.

## Frontend/UX Notes

Material Symbols are used across the UI and should remain globally available.

The Unicorn Studio background is implemented via:

- `components/unicorn-background.tsx`
- `types/unicorn-studio.d.ts`

Keep animated backgrounds behind content and avoid allowing them to interfere with form input, focus, or tests.
