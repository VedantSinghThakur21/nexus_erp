# ERP Connector & Purchase Order — API Endpoints

**Base URL (Nexus):** `https://{subdomain}.avariq.in` (prod) or `http://{subdomain}.localhost:3000` (dev)  
**Base URL (Frappe):** `{erp_base_url}` per tenant (default: `ERP_NEXT_URL`)  
**Base URL (Provisioning):** `PROVISIONING_SERVICE_URL` (default `http://localhost:8001`)

---

## Authentication

### Nexus (browser / app)

| Mechanism | Where | Used for |
|-----------|-------|----------|
| httpOnly cookies | `tenant_api_key`, `tenant_api_secret`, `sid`, `user_email` | Tenant ERP calls via proxy + server actions |
| Session | NextAuth / login flow | App auth |
| `X-Provisioning-Secret` | Header | Server-to-server provisioning only |

### Frappe (all ERP calls)

```http
Authorization: token {api_key}:{api_secret}
X-Frappe-Site-Name: {erp_site_name}
Content-Type: application/json
Accept: application/json
```

---

## API Key & Secret — Full Lifecycle (MCP Connector)

> **For MCP / external connector builders:** This section documents every way API keys are created, stored, validated, and used in Nexus.

### Credential types (do not confuse these)

| Type | Where stored | Who it belongs to | Used for |
|------|--------------|-------------------|----------|
| **Master API keys** | Nexus env: `ERP_API_KEY`, `ERP_API_SECRET` | Master site admin user | Master DB ops (`SaaS Tenant` CRUD) |
| **Tenant admin keys** | Master `SaaS Tenant.api_key` / `api_secret` | Tenant owner / Administrator | Provisioning, `setup/init`, bootstrap |
| **User session keys** | httpOnly cookies `tenant_api_key` / `tenant_api_secret` | Logged-in user on tenant site | Normal ERP calls via proxy / `frappeRequest` |
| **Provisioning secret** | Nexus env: `PROVISIONING_API_SECRET` | Server-to-server only | Provisioning service auth |

**Important:** Login generates **user** keys (cookies). It does **not** overwrite Master `SaaS Tenant` admin keys.

---

### Flow A — New tenant provision (auto key generation)

```
MCP / Nexus
  → POST {PROVISIONING_SERVICE}/api/v1/provision
      Header: X-Provisioning-Secret
  ← { success, subdomain, api_key, api_secret, site_name }

Provisioning service (inside Frappe bench):
  → frappe.generate_hash() for admin user
  → Saves keys on User doc + Master SaaS Tenant

Provisioning service
  → POST {NEXUS}/api/tenant/update-credentials
      Header: X-Provisioning-Secret
      Body: { tenantName, apiKey, apiSecret, ownerEmail, siteUrl }
```

#### `POST /api/v1/provision`

**Base:** `{PROVISIONING_SERVICE_URL}` (default `http://localhost:8001`)  
**Auth:** `X-Provisioning-Secret: {PROVISIONING_API_SECRET}`

**Request:**

```json
{
  "organization_name": "Acme Corp",
  "admin_email": "admin@acme.com",
  "admin_password": "optional-if-omitted-random",
  "admin_full_name": "Admin User",
  "plan_type": "Free"
}
```

**Response (success):**

```json
{
  "success": true,
  "site_name": "acme.avariq.in",
  "subdomain": "acme",
  "admin_password": "...",
  "api_key": "a1b2c3d4e5f6g7h",
  "api_secret": "x9y8z7w6v5u4t3s",
  "steps_completed": ["site_created", "owner_keys_generated", "master_db_registered"],
  "checks": {
    "site_alive": true,
    "user_exists": true,
    "roles_correct": true,
    "api_key_valid": true,
    "docperms_set": true
  }
}
```

Keys are generated via Frappe `frappe.generate_hash(length=15)` on the **tenant admin user**.

---

#### `POST /api/tenant/update-credentials` (persist keys to Nexus Master DB)

**Base:** Nexus app URL  
**Auth:** `X-Provisioning-Secret: {PROVISIONING_API_SECRET}`  
**Called by:** Provisioning service after site creation (server-to-server only)

**Request:**

```json
{
  "tenantName": "acme",
  "apiKey": "a1b2c3d4e5f6g7h",
  "apiSecret": "x9y8z7w6v5u4t3s",
  "ownerEmail": "admin@acme.com",
  "siteUrl": "https://acme.avariq.in"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Tenant API credentials saved successfully",
  "tenantRecord": "acme",
  "action": "created",
  "setupInit": { "ok": true, "results": { ... } }
}
```

**MCP note:** Your connector should call this (or rely on provisioning service to call it) after generating keys. Never expose `apiSecret` back to end users.

---

### Flow B — Generate keys for an existing user (login / connect)

Used when a user already exists on a tenant site but needs fresh API keys.

#### `POST /api/v1/generate-user-keys/{subdomain}`

**Base:** `{PROVISIONING_SERVICE_URL}`  
**Auth:** `X-Provisioning-Secret: {PROVISIONING_API_SECRET}`

**Request:**

```json
{
  "user_email": "user@acme.com"
}
```

**Response:**

```json
{
  "success": true,
  "api_key": "a1b2c3d4e5f6g7h",
  "api_secret": "x9y8z7w6v5u4t3s"
}
```

**Errors:**

| HTTP | Cause |
|------|-------|
| `400` | Invalid subdomain or missing `user_email` |
| `401` | Wrong `X-Provisioning-Secret` |
| `404` | User not found on tenant site |
| `502` | Frappe script failed / no JSON output |

**Nexus client wrapper:** `lib/provisioning-client.ts` → `generateUserApiKeys(subdomain, userEmail)`

---

### Flow B2 — Login to existing tenant account (automatic API key minting)

This is the **primary path** when a user logs into an **already-provisioned** workspace (e.g. `acme.avariq.in/login`). It is **not** a public REST endpoint — it runs as a **Next.js Server Action**.

**Implementation:** `app/actions/user-auth.ts` → `loginUser(usernameOrEmail, password)`

#### Sequence diagram

```
User submits login form (email + password)
  │
  ▼
Step 1: Resolve tenant (Master DB)
  • From subdomain header (x-tenant-id) if on acme.avariq.in
  • OR from owner_email lookup if logging in on root domain
  • Reject if status = Pending | Suspended | Cancelled
  │
  ▼
Step 2: Authenticate against tenant Frappe site
  POST {ERP_NEXT_URL}/api/method/login
  Header: X-Frappe-Site-Name: {subdomain}.avariq.in  (or .localhost in dev)
  Body: usr={email}&pwd={password}
  → Receives Frappe session cookie (sid) on success
  │
  ▼
Step 3: Mint API keys (parallel with role resolution)
  POST {PROVISIONING_SERVICE}/api/v1/generate-user-keys/{subdomain}
  Header: X-Provisioning-Secret
  Body: { "user_email": "{logged-in user email}" }
  → New api_key + api_secret written to User doc on tenant Frappe site
  │
  ▼
Step 4: Set httpOnly cookies (7-day TTL)
  • sid                    — Frappe session fallback
  • tenant_api_key         — user's API key
  • tenant_api_secret      — user's API secret
  • user_email
  • tenant_subdomain
  • tenant_site_url
  • tenant_role_type       — admin | sales | accounts | projects | member
  • user_type = tenant
  │
  ▼
Step 5: Background bootstrap (fire-and-forget, once per 30 days)
  POST provisioning seed-defaults for tenant
  │
  ▼
Return { success: true, redirectUrl: /dashboard }
```

#### What gets stored where (critical for MCP)

| Data | Stored on login? | Location | Notes |
|------|------------------|----------|-------|
| User `api_key` / `api_secret` | ✅ Yes | httpOnly cookies | Used by `/api/proxy` and `frappeRequest()` |
| User keys on Frappe `User` doc | ✅ Yes | Tenant ERP site | Written by `generate-user-keys` |
| Master `SaaS Tenant.api_key/secret` | ❌ **No** | Master DB | **Not overwritten on login** — stays as tenant **admin** keys from provisioning |

> **Why Master keys are not updated on login:** Overwriting `SaaS Tenant` keys with the logged-in user's keys would break admin bootstrap (`/api/setup/init`). See comment in `user-auth.ts` lines 487–497.

#### Fallback if key mint fails

If `generate-user-keys` fails (provisioning service down, user not found, etc.):

- Login **still succeeds** using `sid` session cookie only
- `tenant_api_key` / `tenant_api_secret` cookies are **not** set
- ERP calls fall back to session auth (may hit permission / whitelist limits)
- Server logs: `[Login] API key generation via provisioning service failed`

#### Skip key minting (dev/E2E)

Set env `NEXUS_FAST_LOGIN=1` → login skips `generate-user-keys` entirely (SID-only auth).

#### MCP connector equivalent

To replicate login behaviour without the Nexus UI:

```
1. Resolve tenant:
   GET Master SaaS Tenant by subdomain or owner_email

2. Authenticate user:
   POST {erp_base_url}/api/method/login
   X-Frappe-Site-Name: {erp_site_name}
   Body: usr + pwd

3. Mint keys (same as Nexus login):
   POST {PROVISIONING_SERVICE}/api/v1/generate-user-keys/{subdomain}
   X-Provisioning-Secret: {PROVISIONING_API_SECRET}
   Body: { "user_email": "user@acme.com" }

4. Store keys securely in MCP connector vault (NOT in Master SaaS Tenant unless tenant-admin keys)

5. Use for ERP calls:
   Authorization: token {api_key}:{api_secret}
   X-Frappe-Site-Name: {erp_site_name}
```

**MCP does not need Nexus cookies.** Steps 2–3 are sufficient to obtain long-lived API credentials for server-side ERP calls.

#### Login entry points

| Entry | URL | Tenant resolution |
|-------|-----|-------------------|
| Tenant subdomain | `https://acme.avariq.in/login` | `x-tenant-id` = `acme` |
| Root domain | `https://avariq.in/login` | Lookup by `owner_email` |

**No dedicated `POST /api/auth/login` REST route** — login is a Server Action called from `components/auth/login-form.tsx`.

---

### Flow C — Connect existing external ERP (user supplies keys OR login)

**Option 1 — User provides existing API keys:**

1. Validate keys against external ERP:
   ```http
   GET {erp_base_url}/api/method/frappe.auth.get_logged_user
   Authorization: token {api_key}:{api_secret}
   X-Frappe-Site-Name: {erp_site_name}
   ```
2. Store on Master `SaaS Tenant` via `update-credentials` or planned `POST /api/erp/connect`.

**Option 2 — User provides email + password (one-time):**

1. Login to external ERP:
   ```http
   POST {erp_base_url}/api/method/login
   Content-Type: application/x-www-form-urlencoded
   X-Frappe-Site-Name: {erp_site_name}

   usr=admin@customer.com&pwd=one-time-password
   ```
2. Generate keys via provisioning service `generate-user-keys` (if subdomain known) **or** Frappe native:
   ```http
   POST {erp_base_url}/api/method/frappe.core.doctype.user.user.generate_keys
   Authorization: Bearer {sid}   # session from login
   X-Frappe-Site-Name: {erp_site_name}

   { "user": "admin@customer.com" }
   ```
3. Store keys on Master DB; discard password.

**Planned Nexus endpoint:** `POST /api/erp/connect` (see §1 below).

---

### Flow D — Retrieve stored tenant credentials (Master DB)

For MCP connector that needs to look up a tenant's ERP connection:

**Via Frappe Master site** (using Master API keys):

```http
GET {ERP_NEXT_URL}/api/method/frappe.client.get_list
  ?doctype=SaaS Tenant
  &filters=[["subdomain","=","acme"]]
  &fields=["name","subdomain","site_url","status","api_key","api_secret","owner_email","site_config"]
  &limit_page_length=1

Authorization: token {ERP_API_KEY}:{ERP_API_SECRET}
X-Frappe-Site-Name: {FRAPPE_SITE_NAME}
```

**Response field usage:**

| Field | Purpose |
|-------|---------|
| `api_key` | Tenant admin API key |
| `api_secret` | Tenant admin API secret (encrypt at rest in V1) |
| `site_url` | Public tenant URL |
| `site_config` | JSON: `connection_type`, `erp_base_url`, `erp_site_name` (when implemented) |

**MCP security rule:** Decrypt `api_secret` only in server memory; never return to client or log.

---

### Validate keys (smoke test)

After obtaining keys, always verify before storing:

```http
GET {erp_base_url}/api/method/frappe.auth.get_logged_user
Authorization: token {api_key}:{api_secret}
X-Frappe-Site-Name: {erp_site_name}
Accept: application/json
```

**Expected:** `200` with `{ "message": "user@example.com" }`

Additional checks:

```http
GET {erp_base_url}/api/method/frappe.ping
→ { "message": "pong" }

GET {erp_base_url}/api/method/frappe.client.get_list?doctype=Purchase+Order&limit_page_length=1
→ 200 (confirms PO read access)
```

---

### Using keys for ERP calls (MCP connector runtime)

**Direct to Frappe (recommended for MCP server-side):**

```http
POST {erp_base_url}/api/method/frappe.client.insert
Authorization: token {api_key}:{api_secret}
X-Frappe-Site-Name: {erp_site_name}
Content-Type: application/json

{ "doc": { "doctype": "Purchase Order", ... } }
```

**Via Nexus proxy (browser / cookie session only):**

```http
POST https://acme.avariq.in/api/proxy/frappe.client.insert
Cookie: tenant_api_key=...; tenant_api_secret=...;  (httpOnly — MCP cannot use from browser)
```

**MCP recommendation:** Call Frappe **directly** with stored tenant keys. Do not depend on Nexus httpOnly cookies.

---

### Auth headers reference (copy-paste for MCP tools)

| Call target | Required headers |
|-------------|------------------|
| **Frappe ERP** | `Authorization: token {key}:{secret}`, `X-Frappe-Site-Name: {site}`, `Content-Type: application/json` |
| **Provisioning service** | `X-Provisioning-Secret: {secret}`, `Content-Type: application/json` |
| **Nexus update-credentials** | `X-Provisioning-Secret: {secret}`, `Content-Type: application/json` |
| **Nexus setup/init** | `x-tenant-api-key` + `x-tenant-api-secret` OR `X-Provisioning-Secret` |
| **Master DB** | Master `ERP_API_KEY`/`ERP_API_SECRET` + `X-Frappe-Site-Name: {FRAPPE_SITE_NAME}` |

---

### MCP connector — recommended tool sequence

```
1. connect_tenant
   Input:  erp_base_url, erp_site_name, email+password OR api_key+api_secret
   Steps:  validate URL → login/test keys → store on Master SaaS Tenant
   Output: { connected: true, subdomain, erp_site_name }  (no secrets)

2. generate_api_keys  (if needed)
   Input:  subdomain, user_email
   Call:   POST /api/v1/generate-user-keys/{subdomain}
   Output: { api_key, api_secret }  (server-side only)

3. validate_connection
   Call:   frappe.auth.get_logged_user + frappe.ping
   Output: { valid: true, user, erpnext_version? }

4. erp_call  (generic)
   Input:  subdomain, method, body
   Steps:  load keys from Master → call {erp_base_url}/api/method/{method}
   Output: Frappe response

5. purchase_order_*  (wrappers around erp_call)
   create_po, list_pos, submit_po, etc.
```

---

### Frappe native key generation (alternative, no provisioning service)

If MCP connects directly to ERPNext and user has System Manager:

```http
POST {erp_base_url}/api/method/frappe.core.doctype.user.user.generate_keys
Authorization: token {existing_key}:{existing_secret}
X-Frappe-Site-Name: {erp_site_name}
Content-Type: application/json

{ "user": "admin@example.com" }
```

**Response:** `{ "message": { "api_key": "...", "api_secret": "..." } }`

Nexus prefers the **provisioning service** path because it uses `ignore_permissions=True` and works without System Manager on the calling user.

---

## 1. Nexus REST API — ERP Connection (existing + planned)

### Existing

#### `POST /api/tenant/update-credentials`

**Auth:** `X-Provisioning-Secret` (provisioning service → Nexus)  
**Purpose:** Save tenant API keys to Master `SaaS Tenant` after provision.

```json
{
  "tenantName": "acme",
  "apiKey": "abc123",
  "apiSecret": "secret456",
  "ownerEmail": "admin@acme.com",
  "siteUrl": "https://acme.avariq.in"
}
```

**Response:** `{ success, tenantRecord, action, setupInit }`

---

#### `POST /api/provision/start`

**Auth:** `pending_tenant_data` cookie  
**Purpose:** Start background tenant provisioning job.

**Response:** `{ jobId, subdomain }`

---

#### `GET /api/provision/status?jobId={id}`

**Auth:** Cookie (sets tenant session cookies on success)  
**Purpose:** Poll provisioning job.

**Response (pending):** `{ done: false, elapsed, subdomain }`  
**Response (success):** `{ done: true, success: true, redirectUrl, subdomain }`

---

#### `GET /api/provisioning-status?tenant={subdomain}`

**Auth:** Logged-in user  
**Purpose:** Check if tenant workspace is ready (Master DB lookup).

**Response:** `{ ready, status, siteName, message }`

---

#### `GET /api/check-site-status?site={siteName}`

**Auth:** Public (infra check)  
**Purpose:** Verify Frappe site exists on bench (Docker).

**Response:** `{ ready, site }`

---

#### `GET /api/setup/init`

**Auth:** One of:
- `X-Provisioning-Secret`
- `x-tenant-api-key` + `x-tenant-api-secret`
- Logged-in user session

**Purpose:** Idempotent tenant seed (price lists, territories, DocPerms, etc.).

**Response:** `{ results: { price_list, territory, ... } }`

---

#### `GET|POST|PUT|PATCH|DELETE /api/proxy/{frappe-method-path}`

**Auth:** httpOnly `tenant_api_key` + `tenant_api_secret` cookies  
**Purpose:** Secure browser → Frappe proxy. Credentials never exposed to JS.

**Examples:**

```http
GET  /api/proxy/frappe.client.get_list?doctype=Purchase+Order&fields=...
POST /api/proxy/frappe.client.insert
     Body: { "doc": { "doctype": "Purchase Order", ... } }
POST /api/proxy/frappe.client.submit
     Body: { "doc": { ...full PO doc... } }
GET  /api/proxy/frappe.auth.get_logged_user
```

Upstream: `{ERP_NEXT_URL}/api/method/{frappe-method-path}`

---

#### `GET /api/subscription/current`

**Auth:** Logged-in user  
**Purpose:** Current org plan (used for PO licensing gates).

---

### Planned (implement per integration guide)

#### `POST /api/erp/connect` *(or Server Action `connectExistingErp`)*

**Auth:** Owner / org admin session  
**Purpose:** Connect existing external ERP site.

```json
{
  "erpBaseUrl": "https://erp.customer.com",
  "erpSiteName": "customer.local",
  "email": "admin@customer.com",
  "password": "one-time-password"
}
```

**Alternative (API keys):**

```json
{
  "erpBaseUrl": "https://erp.customer.com",
  "erpSiteName": "customer.local",
  "apiKey": "...",
  "apiSecret": "..."
}
```

**Response:** `{ success, connectionStatus, erpBaseUrl, erpSiteName }` — never returns `apiSecret`.

---

#### `POST /api/erp/disconnect`

**Auth:** Owner / org admin + password re-confirm  
**Purpose:** Disconnect ERP; clear session credential cookies.

---

#### `GET /api/erp/status`

**Auth:** Logged-in tenant user  
**Purpose:** Connection status for Settings UI.

**Response:**

```json
{
  "connected": true,
  "connectionType": "external",
  "erpBaseUrl": "https://erp.customer.com",
  "erpSiteName": "customer.local",
  "connectedAt": "2026-06-14T10:00:00Z"
}
```

---

## 2. Nexus — Purchase Orders (planned)

Most PO operations use **Server Actions** (not REST), matching Sales Orders. Optional REST routes for client components:

| Method | Path | Purpose | Plan gate |
|--------|------|---------|-----------|
| — | Server Action `getPurchaseOrders()` | List POs | Free+ |
| — | Server Action `getPurchaseOrder(id)` | Get one PO | Free+ |
| — | Server Action `createPurchaseOrder(data)` | Create Draft | Pro+ |
| — | Server Action `updatePurchaseOrder(id, data)` | Update Draft | Pro+ |
| — | Server Action `submitPurchaseOrder(id)` | Submit | Pro+ |
| — | Server Action `cancelPurchaseOrder(id)` | Cancel | Pro+ |
| `POST` | `/api/purchase-orders/[id]/delete` | Delete Draft | Pro+ |

**File to create:** `app/actions/purchase-orders.ts`  
**Delete route pattern:** copy `app/api/sales-orders/[id]/delete/route.ts`

---

## 3. Provisioning Service API (Python)

**Auth:** `X-Provisioning-Secret` on all `/api/v1/*` routes  
**Base:** `{PROVISIONING_SERVICE_URL}`

### ERP connection & tenant lifecycle

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Service health |
| `GET` | `/api/v1/check-subdomain/{subdomain}` | Subdomain availability |
| `POST` | `/api/v1/provision` | Create new Frappe tenant site |
| `DELETE` | `/api/v1/deprovision/{subdomain}` | Delete tenant site |

**`POST /api/v1/provision` body:**

```json
{
  "organization_name": "Acme Corp",
  "admin_email": "admin@acme.com",
  "admin_password": "...",
  "admin_full_name": "Admin User",
  "plan_type": "Free"
}
```

**Response:** `{ success, subdomain, api_key, api_secret, site_name, steps_completed }`

### Tenant setup (run after connect/provision)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/seed-defaults/{subdomain}` | Territories, item groups, price list |
| `POST` | `/api/v1/seed-docperms/{subdomain}` | DocPerm matrix (**includes PO after implementation**) |
| `POST` | `/api/v1/seed-custom-fields/{subdomain}` | Custom fields |
| `POST` | `/api/v1/seed-agent-doctypes/{subdomain}` | Agent doctypes |

### Credentials & roles

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/generate-user-keys/{subdomain}` | Generate API key/secret for user |
| `POST` | `/api/v1/assign-user-roles/{subdomain}` | Assign ERP roles |
| `POST` | `/api/v1/get-user-roles/{subdomain}` | Get user roles |
| `POST` | `/api/v1/create-tenant-user/{subdomain}` | Create ERP user |
| `POST` | `/api/v1/change-tenant-user-role/{subdomain}` | Change user role |

### Planned

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/validate-external-site` | Smoke-test external ERP URL + credentials |

---

## 4. Frappe / ERPNext API — Purchase Orders

All paths relative to `{erp_base_url}/api/method/`.  
Called by Nexus via `frappeRequest()` (server) or `/api/proxy/...` (browser).

### Purchase Order CRUD

| Operation | Frappe method | HTTP | Body / query |
|-----------|---------------|------|--------------|
| **List** | `frappe.client.get_list` | GET | `doctype=Purchase Order`, `fields`, `filters`, `order_by`, `limit_page_length` |
| **Get one** | `frappe.client.get` | GET | `doctype=Purchase Order`, `name={id}` |
| **Create** | `frappe.client.insert` | POST | `{ "doc": { "doctype": "Purchase Order", "supplier", "transaction_date", "schedule_date", "items": [...] } }` |
| **Update** | `frappe.client.save` | POST | `{ "doc": { ...full doc with changes } }` |
| **Submit** | `frappe.client.submit` | POST | `{ "doc": { ...full submitted doc } }` |
| **Cancel** | `frappe.client.cancel` | POST | `{ "doc": { ...full doc } }` |
| **Delete** | `frappe.client.delete` | POST | `{ "doctype": "Purchase Order", "name": "{id}" }` |

### List PO — example

```http
GET /api/method/frappe.client.get_list
  ?doctype=Purchase Order
  &fields=["name","supplier","supplier_name","status","workflow_state","docstatus","transaction_date","schedule_date","grand_total","currency","per_received","per_billed"]
  &order_by=creation desc
  &limit_page_length=100
```

### Create PO — example

```http
POST /api/method/frappe.client.insert
Content-Type: application/json

{
  "doc": {
    "doctype": "Purchase Order",
    "supplier": "Supplier Name",
    "transaction_date": "2026-06-14",
    "schedule_date": "2026-06-21",
    "items": [
      {
        "item_code": "ITEM-001",
        "qty": 10,
        "rate": 100,
        "schedule_date": "2026-06-21",
        "warehouse": "Stores - ACME"
      }
    ]
  }
}
```

### Master data (PO form lookups)

| Resource | Frappe method | Query |
|----------|---------------|-------|
| Suppliers | `frappe.client.get_list` | `doctype=Supplier` |
| Purchase items | `frappe.client.get_list` | `doctype=Item`, `filters=[["is_purchase_item","=",1]]` |
| Warehouses | `frappe.client.get_list` | `doctype=Warehouse`, `filters=[["is_group","=",0]]` |
| Default warehouse | `frappe.client.get_value` | `doctype=Stock Settings`, `fieldname=default_warehouse` |
| Company | `frappe.client.get_list` | `doctype=Company` |

---

## 5. Frappe — ERP Connection validation

Used during connect-existing flow (direct server-side calls, not via proxy).

| Step | Method | Path | Notes |
|------|--------|------|-------|
| Login test | `POST` | `/api/method/login` | `Content-Type: application/x-www-form-urlencoded`, body `usr` + `pwd` |
| API key test | `GET` | `/api/method/frappe.auth.get_logged_user` | `Authorization: token {key}:{secret}` |
| Smoke: company | `GET` | `/api/method/frappe.client.get_list` | `doctype=Company`, `limit_page_length=1` |
| Smoke: PO access | `GET` | `/api/method/frappe.client.get_list` | `doctype=Purchase Order`, `limit_page_length=1` |

---

## 6. Master DB (Frappe Master site)

Accessed via `masterRequest()` with `ERP_API_KEY` / `FRAPPE_SITE_NAME`.

| Operation | Method | Purpose |
|-----------|--------|---------|
| `frappe.client.get_list` | GET | Find `SaaS Tenant` by `subdomain` |
| `frappe.client.insert` | POST | Create `SaaS Tenant` record |
| `frappe.client.set_value` | POST | Update status, credentials |
| `PUT /api/resource/SaaS Tenant/{name}` | PUT | Upsert tenant (used in update-credentials) |

---

## 7. Quick reference — call from browser vs server

| Caller | Use | Example |
|--------|-----|---------|
| **Browser (React)** | `/api/proxy/frappe.client.*` | `fetch('/api/proxy/frappe.client.get_list?...', { credentials: 'include' })` |
| **Server Action / Route** | `frappeRequest()` | `await frappeRequest('frappe.client.insert', 'POST', { doc })` |
| **Master DB ops** | `masterRequest()` | Tenant registry CRUD |
| **Provisioning** | `lib/provisioning-client.ts` | `provisionTenantSite()`, `seedTenantDocPerms()` |

---

## 8. Error codes

| HTTP | Meaning |
|------|---------|
| `401` | Missing/invalid Nexus session or Frappe credentials |
| `403` | ERP DocPerm denied or plan gate (`PLAN_UPGRADE_REQUIRED`) |
| `400` | Validation error (Frappe `ValidationError` message in body) |
| `502` | Nexus proxy cannot reach Frappe |
| `504` | Frappe request timeout |

Frappe error body shape:

```json
{
  "exc_type": "ValidationError",
  "exception": "...",
  "_server_messages": "[\"...\"]"
}
```
