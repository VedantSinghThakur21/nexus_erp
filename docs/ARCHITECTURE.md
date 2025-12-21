# 🏢 Nexus ERP - Headless ERP Architecture Documentation

> A modern, custom frontend for ERPNext built with Next.js 14+ (App Router)

---

## 🎯 Architecture Overview

**Nexus ERP** is a **Headless ERP** implementation that provides a sleek, modern UI layer on top of ERPNext's powerful backend engine.

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                        │
│  (React Server Components + Client Components)             │
│                                                              │
│  ┌────────────────┐         ┌──────────────────┐          │
│  │   UI Layer     │────────▶│  Server Actions  │          │
│  │ (Components)   │         │  (API Bridge)    │          │
│  └────────────────┘         └──────────────────┘          │
│                                      │                      │
└──────────────────────────────────────┼──────────────────────┘
                                       │
                                       │ HTTP/REST
                                       │
                          ┌────────────▼─────────────┐
                          │   ERPNext Backend        │
                          │  (Frappe Framework)      │
                          │                           │
                          │  ┌────────────────────┐  │
                          │  │   MySQL Database   │  │
                          │  └────────────────────┘  │
                          └──────────────────────────┘
                                (Docker Container)
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | Next.js 14+ (App Router) | React-based UI with SSR/RSC |
| **UI Components** | Shadcn UI + Tailwind CSS | Enterprise-grade design system |
| **Backend** | ERPNext (Frappe Framework) | Business logic & data storage |
| **Communication** | Server Actions + REST API | Bridge between Next.js ↔ ERPNext |
| **Authentication** | API Key/Secret | Secure service-to-service auth |
| **Database** | MySQL (via ERPNext) | Persistence layer |

---

## 📂 Project Structure

### `/app` Directory (Next.js App Router)

```
app/
├── actions/              ⚡ Server Actions (The Logic Layer)
│   ├── invoices.ts       → Invoice CRUD operations
│   ├── crm.ts            → Lead & opportunity management
│   ├── fleet.ts          → Vehicle/asset management
│   ├── bookings.ts       → Booking operations
│   ├── auth.ts           → Authentication logic
│   └── ...
│
├── lib/                  🔧 Utility Functions
│   └── api.ts            → Core ERPNext API client (frappeRequest)
│
├── (main)/               🏠 Protected Dashboard Area (Route Group)
│   ├── layout.tsx        → Sidebar wrapper (applies to all pages)
│   ├── loading.tsx       → Loading UI
│   ├── dashboard/        → Main dashboard
│   ├── invoices/         → Invoice management
│   │   ├── page.tsx      → List view
│   │   ├── [id]/         → Detail view (dynamic route)
│   │   └── new/          → Create invoice
│   ├── crm/              → Customer relationship management
│   ├── fleet/            → Fleet management
│   ├── projects/         → Project tracking
│   └── ...
│
├── print/                🖨️ Print Layouts (No Sidebar)
│   └── invoice/[id]/     → Clean A4 invoice print view
│
├── login/                🔐 Authentication
│   └── page.tsx          → Login form
│
└── api/                  🌐 API Routes
    └── chat/route.ts     → AI chat endpoint
```

### `/components` Directory

```
components/
├── ui/                   🧱 Reusable Primitives (Shadcn)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   └── ...               → Generic UI components
│
├── invoices/             📄 Invoice-Specific Components
│   ├── create-invoice-sheet.tsx
│   ├── invoice-actions.tsx
│   ├── customer-search.tsx
│   └── item-search.tsx
│
├── crm/                  👥 CRM Components
│   ├── kanban-board.tsx  → Drag & drop board
│   ├── create-lead-dialog.tsx
│   └── edit-lead-sheet.tsx
│
├── fleet/                🚗 Fleet Components
│   ├── fleet-calendar.tsx
│   └── booking-dialog.tsx
│
└── app-sidebar.tsx       📌 Main navigation sidebar
```

---

## 🔄 Data Flow (Request Lifecycle)

### Example: Creating an Invoice

```
1️⃣ USER ACTION
   └─▶ User fills form in NewInvoicePage (Client Component)

2️⃣ CLIENT COMPONENT
   └─▶ React state collects data
       └─▶ Calls: await createInvoice(payload)

3️⃣ SERVER ACTION (app/actions/invoices.ts)
   └─▶ Function: createInvoice(data)
       └─▶ Transforms data to ERPNext format
           └─▶ Calls: frappeRequest(...)

4️⃣ API CLIENT (app/lib/api.ts)
   └─▶ Function: frappeRequest()
       └─▶ Builds HTTP request with auth headers
           └─▶ Sends POST to ERPNext API

5️⃣ ERPNEXT BACKEND
   └─▶ Validates data
       └─▶ Runs business logic (tax calculations, etc.)
           └─▶ Saves to MySQL
               └─▶ Returns response

6️⃣ RESPONSE FLOW
   └─▶ frappeRequest parses JSON
       └─▶ Server Action returns success/error
           └─▶ Client Component updates UI
               └─▶ Router refreshes page
                   └─▶ New data appears in list
```

---

## 🔑 Key Architectural Patterns

### 1. **Server Actions as API Bridge**

Server Actions (`'use server'`) act as the **middleware** between your UI and ERPNext.

**Why Server Actions?**
- ✅ Keeps API keys secret (never exposed to browser)
- ✅ Simplifies authentication (no CORS issues)
- ✅ Type-safe function calls from client components
- ✅ Automatic error handling

**Example:**
```typescript
// app/actions/invoices.ts
'use server'

export async function getInvoices() {
  const response = await frappeRequest('frappe.client.get_list', 'GET', {
    doctype: 'Sales Invoice',
    fields: '["name", "customer_name", "grand_total"]',
  })
  return response
}
```

**Usage in Component:**
```typescript
// app/(main)/invoices/page.tsx
import { getInvoices } from '@/app/actions/invoices'

export default async function InvoicesPage() {
  const invoices = await getInvoices() // Direct function call!
  return <InvoiceList invoices={invoices} />
}
```

---

### 2. **Server Components by Default**

All `page.tsx` files are **Server Components** by default.

**Responsibilities:**
- Fetch data using Server Actions
- Pass props to Client Components
- NO browser APIs (useState, onClick, etc.)

**When to use Client Components:**
Add `'use client'` directive when you need:
- ✅ React hooks (useState, useEffect)
- ✅ Event handlers (onClick, onChange)
- ✅ Browser APIs (localStorage, window)
- ✅ Third-party libraries that use hooks

---

### 3. **Route Groups with `(main)`**

The `(main)` folder is a **Route Group** (parentheses indicate this).

**Benefits:**
- ❌ Does NOT add `/main` to URLs
- ✅ Applies shared layout (sidebar) to all child routes
- ✅ `/dashboard`, `/invoices`, `/crm` (not `/main/dashboard`)

**File Structure:**
```
app/
└── (main)/
    ├── layout.tsx     → Sidebar wrapper
    ├── dashboard/
    │   └── page.tsx   → URL: /dashboard
    └── invoices/
        └── page.tsx   → URL: /invoices
```

---

### 4. **Dynamic Routes with `[id]`**

Folders with square brackets create **dynamic segments**.

**Example:**
```
app/
└── (main)/
    └── crm/
        ├── page.tsx           → /crm (list view)
        └── [id]/
            └── page.tsx       → /crm/LEAD-001 (detail view)
```

**Accessing the ID:**
```typescript
// app/(main)/crm/[id]/page.tsx
export default async function LeadDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const leadId = params.id // "LEAD-001"
  const lead = await getLeadDetails(leadId)
  return <LeadDetail lead={lead} />
}
```

---

### 5. **API Client (`frappeRequest`)**

The `frappeRequest` function in `app/lib/api.ts` is the **single source of truth** for ERPNext communication.

**Features:**
- ✅ Automatic authentication (API Key/Secret)
- ✅ Error parsing (handles Frappe's nested error structure)
- ✅ GET/POST handling (query params vs. body)
- ✅ Caching control (`cache: 'no-store'`)

**Usage:**
```typescript
// GET request
const invoices = await frappeRequest('frappe.client.get_list', 'GET', {
  doctype: 'Sales Invoice',
  fields: '["name", "customer"]',
})

// POST request
const newInvoice = await frappeRequest('frappe.client.insert', 'POST', {
  doc: {
    doctype: 'Sales Invoice',
    customer: 'CUST-001',
    // ...
  }
})
```

---

## 🔐 Authentication & Security

### API Key/Secret Method (Current Implementation)

**Pros:**
- ✅ Stable (no session expiry issues)
- ✅ Bypasses CSRF tokens
- ✅ Easy to set up

**Cons:**
- ❌ All requests use same credentials
- ❌ No per-user permissions (all requests as admin)

**How to Generate API Keys:**
1. Login to ERPNext
2. Go to: User Profile → API Access
3. Click "Generate Keys"
4. Copy to `.env.local`:
   ```env
   ERP_API_KEY=abc123...
   ERP_API_SECRET=xyz789...
   ```

**Security Best Practices:**
- ✅ Never commit `.env.local` (add to `.gitignore`)
- ✅ Use `NEXT_PUBLIC_*` prefix ONLY for client-side URLs
- ✅ Rotate API keys regularly
- ✅ Use separate keys for dev/staging/prod

---

## 🎨 UI Component Pattern

### Composition Pattern

**Server Component (Fetches Data):**
```typescript
// app/(main)/invoices/page.tsx
import { getInvoices } from '@/app/actions/invoices'
import { InvoiceTable } from '@/components/invoices/invoice-table'

export default async function InvoicesPage() {
  const invoices = await getInvoices()
  return <InvoiceTable invoices={invoices} /> // Pass as prop
}
```

**Client Component (Interactive):**
```typescript
// components/invoices/invoice-table.tsx
'use client'

import { useState } from 'react'

export function InvoiceTable({ invoices }) {
  const [selected, setSelected] = useState<string[]>([])
  
  return (
    <table>
      {invoices.map(inv => (
        <tr key={inv.name} onClick={() => setSelected([...selected, inv.name])}>
          {/* ... */}
        </tr>
      ))}
    </table>
  )
}
```

---

## 🚀 Development Workflow

### 1. **Setting Up Environment**

```powershell
# 1. Install dependencies
npm install

# 2. Configure ERPNext connection
# Edit .env.local with your credentials

# 3. Start dev server
npm run dev

# 4. Open browser
# Visit: http://localhost:3000
```

### 2. **Adding a New Feature**

**Example: Adding "Quotations" Module**

```
1️⃣ Create Server Actions
   → app/actions/quotations.ts
     └─▶ getQuotations(), createQuotation(), etc.

2️⃣ Create Pages
   → app/(main)/quotations/page.tsx (list)
   → app/(main)/quotations/[id]/page.tsx (detail)
   → app/(main)/quotations/new/page.tsx (create)

3️⃣ Create Components
   → components/quotations/quotation-form.tsx
   → components/quotations/quotation-table.tsx

4️⃣ Add to Sidebar
   → Edit: components/app-sidebar.tsx
     └─▶ Add navigation link

5️⃣ Test
   → Verify CRUD operations work
   → Check ERPNext data is synced
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Environment variable undefined"

**Error:**
```
TypeError: Cannot read property 'split' of undefined
```

**Cause:** Using `process.env.ERP_NEXT_URL` in Client Component.

**Solution:**
```typescript
// ❌ Wrong (in client component)
const url = process.env.ERP_NEXT_URL

// ✅ Correct
const url = process.env.NEXT_PUBLIC_ERP_NEXT_URL
```

---

### Issue 2: "Not permitted" from ERPNext

**Cause:** API Key lacks permissions for the DocType.

**Solution:**
1. Go to ERPNext → User Profile
2. Check "User Type" (must be "System User")
3. Assign proper roles (e.g., "Sales Manager")
4. Regenerate API keys

---

### Issue 3: Stale data after mutation

**Cause:** Next.js caching response.

**Solution:**
```typescript
// In your Server Action
import { revalidatePath } from 'next/cache'

export async function createInvoice(data) {
  const result = await frappeRequest(...)
  revalidatePath('/invoices') // 👈 Refresh cache
  return result
}
```

---

### Issue 4: CORS errors

**Cause:** ERPNext not allowing requests from Next.js origin.

**Solution:**
Edit `site_config.json` in ERPNext:
```json
{
  "allow_cors": "*",
  "cors_headers": ["Authorization", "Content-Type"]
}
```

---

## 📊 Performance Optimizations

### 1. **Server Components for Data Fetching**
- ✅ Fetch data on server (faster, no client waterfalls)
- ✅ Reduce JavaScript bundle size

### 2. **Selective Client Components**
- ✅ Only mark interactive parts as `'use client'`
- ✅ Keep large components as Server Components

### 3. **Caching Strategy**
```typescript
// Real-time data (invoices, dashboards)
cache: 'no-store'

// Static data (company settings)
cache: 'force-cache'

// Revalidate after mutations
revalidatePath('/invoices')
```

### 4. **Parallel Data Fetching**
```typescript
// ❌ Sequential (slow)
const customers = await getCustomers()
const items = await getItems()

// ✅ Parallel (fast)
const [customers, items] = await Promise.all([
  getCustomers(),
  getItems(),
])
```

---

## 🧪 Testing Recommendations

### 1. **Unit Tests (Server Actions)**
```typescript
import { getInvoices } from '@/app/actions/invoices'

test('fetches invoices successfully', async () => {
  const invoices = await getInvoices()
  expect(invoices).toHaveLength(50)
  expect(invoices[0]).toHaveProperty('name')
})
```

### 2. **Integration Tests (API Client)**
```typescript
import { frappeRequest } from '@/app/lib/api'

test('handles 404 errors gracefully', async () => {
  await expect(
    frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Invoice',
      name: 'INVALID-ID'
    })
  ).rejects.toThrow('not found')
})
```

### 3. **E2E Tests (Critical Flows)**
```typescript
test('user can create invoice', async () => {
  await page.goto('/invoices/new')
  await page.fill('#customer', 'CUST-001')
  await page.fill('#amount', '1000')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/invoices\/INV-/)
})
```

---

## 📚 Additional Resources

- **Next.js Docs:** https://nextjs.org/docs
- **ERPNext API Docs:** https://frappeframework.com/docs/user/en/api
- **Shadcn UI:** https://ui.shadcn.com
- **Frappe Forum:** https://discuss.frappe.io

---

## 🤝 Contributing Guidelines

1. **Branch Naming:**
   - `feature/invoice-enhancements`
   - `bugfix/crm-kanban-drag`
   - `refactor/api-client`

2. **Commit Messages:**
   - `feat: Add tax template selection`
   - `fix: Resolve currency formatting issue`
   - `refactor: Extract common API logic`

3. **Code Style:**
   - Use TypeScript (avoid `any` when possible)
   - Follow existing file structure
   - Add JSDoc comments for complex functions

---

## 📝 License

[Add your license here]

---

**Built with ❤️ using Next.js & ERPNext**
