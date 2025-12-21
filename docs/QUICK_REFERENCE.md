# 🚀 Nexus ERP - Developer Quick Reference Card

## 📋 Daily Commands

```powershell
# Start development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint

# Clean and reinstall
Remove-Item -Recurse -Force node_modules, .next; npm install
```

---

## 🗂️ File Organization Cheat Sheet

```
Need to...                          → Edit this file
─────────────────────────────────────────────────────────────
Add API logic                       → app/actions/[feature].ts
Fetch data for a page               → app/(main)/[page]/page.tsx
Create interactive UI               → components/[feature]/component.tsx
Modify API client                   → app/lib/api.ts
Add sidebar link                    → components/app-sidebar.tsx
Change environment variables        → .env.local
```

---

## 🎯 Common Code Patterns

### Pattern: Create a New Page

```typescript
// app/(main)/quotations/page.tsx
import { getQuotations } from '@/app/actions/quotations'

export default async function QuotationsPage() {
  const quotations = await getQuotations()
  return <QuotationList quotations={quotations} />
}
```

### Pattern: Create a Server Action

```typescript
// app/actions/quotations.ts
'use server'

import { frappeRequest } from '@/app/lib/api'
import { revalidatePath } from 'next/cache'

export async function getQuotations() {
  return await frappeRequest('frappe.client.get_list', 'GET', {
    doctype: 'Quotation',
    fields: '["name", "customer_name", "grand_total"]',
    order_by: 'creation desc',
  })
}

export async function createQuotation(data: any) {
  const result = await frappeRequest('frappe.client.insert', 'POST', {
    doc: {
      doctype: 'Quotation',
      ...data,
    }
  })
  revalidatePath('/quotations') // Refresh cache!
  return result
}
```

### Pattern: Create a Client Component

```typescript
// components/quotations/create-quotation-dialog.tsx
'use client'

import { useState } from 'react'
import { createQuotation } from '@/app/actions/quotations'
import { Button } from '@/components/ui/button'

export function CreateQuotationDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const data = Object.fromEntries(formData)
      
      await createQuotation(data)
      setIsOpen(false)
      // Show success toast
    } catch (error) {
      console.error(error)
      // Show error toast
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Dialog content */}
    </Dialog>
  )
}
```

### Pattern: Dynamic Route (Detail Page)

```typescript
// app/(main)/quotations/[id]/page.tsx
import { getQuotationDetails } from '@/app/actions/quotations'

export default async function QuotationDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const quotation = await getQuotationDetails(params.id)
  return <QuotationDetail quotation={quotation} />
}
```

---

## 🔧 ERPNext API Patterns

### Get List of Documents

```typescript
await frappeRequest('frappe.client.get_list', 'GET', {
  doctype: 'Sales Invoice',
  fields: '["name", "customer", "grand_total", "status"]',
  filters: [['status', '=', 'Unpaid']],
  order_by: 'posting_date desc',
  limit_page_length: 50,
})
```

### Get Single Document

```typescript
await frappeRequest('frappe.client.get', 'GET', {
  doctype: 'Sales Invoice',
  name: 'INV-001',
})
```

### Create Document

```typescript
await frappeRequest('frappe.client.insert', 'POST', {
  doc: {
    doctype: 'Sales Invoice',
    customer: 'CUST-001',
    posting_date: '2025-01-01',
    items: [
      { item_code: 'ITEM-001', qty: 2, rate: 100 }
    ]
  }
})
```

### Update Document

```typescript
await frappeRequest('frappe.client.set_value', 'POST', {
  doctype: 'Sales Invoice',
  name: 'INV-001',
  fieldname: 'status',
  value: 'Paid'
})
```

### Delete Document

```typescript
await frappeRequest('frappe.client.delete', 'POST', {
  doctype: 'Sales Invoice',
  name: 'INV-001',
})
```

### Submit Document (Workflow)

```typescript
await frappeRequest('frappe.client.submit', 'POST', {
  doc: {
    doctype: 'Sales Invoice',
    name: 'INV-001',
  }
})
```

### Search Documents

```typescript
await frappeRequest('frappe.client.get_list', 'GET', {
  doctype: 'Customer',
  fields: '["name", "customer_name"]',
  filters: [
    ['customer_name', 'like', '%john%']
  ],
  limit_page_length: 20,
})
```

---

## 🐛 Debugging Checklist

```
❌ Issue: Page not loading
   ✅ Check: Terminal for server errors
   ✅ Check: Browser console (F12)
   ✅ Check: Network tab for failed requests

❌ Issue: "Not permitted" error
   ✅ Check: API keys in .env.local
   ✅ Check: User roles in ERPNext
   ✅ Try: Regenerate API keys

❌ Issue: Stale data
   ✅ Add: revalidatePath('/your-route')
   ✅ Or: cache: 'no-store' in fetch

❌ Issue: Environment variable undefined
   ✅ Check: Prefix with NEXT_PUBLIC_ for client
   ✅ Restart: npm run dev after .env changes

❌ Issue: TypeScript errors
   ✅ Run: npm run build
   ✅ Check: For duplicate files (*.t, *.tssx)
   ✅ Fix: Run cleanup.ps1
```

---

## 📞 Quick Test Commands

```powershell
# Test ERPNext connection
$headers = @{"Authorization" = "token YOUR_KEY:YOUR_SECRET"}
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/method/frappe.auth.get_logged_user" -Headers $headers

# Check if ERPNext is running
curl http://127.0.0.1:8080

# Check if Next.js is running
curl http://localhost:3000

# View environment variables (safe check)
Get-Content .env.local | Select-String -Pattern "ERP_NEXT_URL"
```

---

## 🎨 Styling Quick Reference

### Tailwind Utility Classes

```tsx
// Layout
className="flex items-center justify-between"
className="grid grid-cols-3 gap-4"
className="container mx-auto px-4"

// Spacing
className="p-4"        // padding: 1rem
className="mt-8"       // margin-top: 2rem
className="space-y-4"  // gap between children

// Colors
className="bg-blue-500 text-white"
className="hover:bg-blue-600"
className="dark:bg-slate-800"

// Typography
className="text-lg font-bold"
className="text-sm text-gray-500"

// Responsive
className="hidden md:block"  // Hide on mobile, show on desktop
className="grid grid-cols-1 md:grid-cols-3"
```

### Shadcn Components

```tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

<Button variant="default" size="lg">Submit</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
```

---

## 🔐 Security Reminders

```
✅ DO:
   • Store secrets in .env.local
   • Use NEXT_PUBLIC_ prefix ONLY for non-sensitive data
   • Keep API keys server-side
   • Validate user inputs
   • Use Server Actions for mutations

❌ DON'T:
   • Commit .env.local to git
   • Expose API keys in client code
   • Trust client-side data without validation
   • Use process.env.ERP_API_KEY in Client Components
```

---

## 📊 Performance Tips

```typescript
// ✅ Good: Parallel fetching
const [customers, items] = await Promise.all([
  getCustomers(),
  getItems(),
])

// ❌ Bad: Sequential fetching
const customers = await getCustomers()
const items = await getItems()

// ✅ Good: Server Component for static content
export default async function Page() {
  const data = await getData()
  return <StaticTable data={data} />
}

// ❌ Bad: Client Component for static content
'use client'
export default function Page() {
  const [data, setData] = useState([])
  useEffect(() => {
    fetchData().then(setData)
  }, [])
  return <StaticTable data={data} />
}
```

---

## 🎯 Git Workflow

```powershell
# Create feature branch
git checkout -b feature/add-quotations

# Stage changes
git add .

# Commit
git commit -m "feat: Add quotations module"

# Push
git push origin feature/add-quotations

# Merge to main (via PR)
```

### Commit Message Convention

```
feat: Add new feature
fix: Fix bug
refactor: Code refactoring
docs: Documentation update
style: Code style changes (formatting)
test: Add tests
chore: Maintenance tasks
```

---

## 📚 Documentation Files

```
README.md              → Quick start & overview
ARCHITECTURE.md        → Deep technical documentation
VISUAL_ARCHITECTURE.md → Diagrams & visual guides
CHECKLIST.md           → Setup verification steps
SETUP_AND_CLEANUP.md   → Troubleshooting guide
SUMMARY.md             → What was done & next steps
QUICK_REFERENCE.md     → This file (daily use)
```

---

## 🔗 Useful Links

- **Next.js Docs:** https://nextjs.org/docs
- **ERPNext API:** https://frappeframework.com/docs/user/en/api
- **Shadcn UI:** https://ui.shadcn.com
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TypeScript:** https://www.typescriptlang.org/docs

---

## 💡 Pro Tips

1. **Use Server Components by default** → Only add `'use client'` when needed
2. **Always revalidate after mutations** → `revalidatePath('/your-page')`
3. **Parallel fetch when possible** → `Promise.all([...])`
4. **Type everything** → Avoid `any`, use interfaces
5. **Test locally first** → Before pushing to production
6. **Keep .env.local safe** → Never commit it

---

## 🆘 Emergency Recovery

```powershell
# If everything breaks, nuclear option:

# 1. Clean everything
Remove-Item -Recurse -Force node_modules, .next, .turbo

# 2. Reinstall
npm install

# 3. Rebuild
npm run build

# 4. Restart
npm run dev

# 5. If still broken, check:
#    - .env.local has correct values
#    - ERPNext is running (curl http://127.0.0.1:8080)
#    - No TypeScript errors (npm run build)
```

---

**📌 Keep this file open while coding for quick reference!**

**Need more details? Check ARCHITECTURE.md for deep dives.**
