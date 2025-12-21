# Nexus ERP - Cleanup & Setup Guide

## ✅ Issues Fixed

### 1. Environment Variables Created
- Created `.env.local` with required variables
- Created `.env.example` as template
- Fixed client component to use `NEXT_PUBLIC_ERP_NEXT_URL`

### 2. Files to Delete (Duplicates/Malformed)

Run these PowerShell commands to clean up:

```powershell
# Delete empty/malformed files
Remove-Item "app\actions\invoices.t" -ErrorAction SilentlyContinue
Remove-Item "app\(main)\crm\page.tssx" -ErrorAction SilentlyContinue
Remove-Item "app\(main)\crm\[id]\nano" -ErrorAction SilentlyContinue
```

### 3. Duplicate invoices.tsx File

You have TWO invoice action files:
- `app/actions/invoices.ts` (246 lines) ✅ **Keep this one**
- `app/actions/invoices.tsx` (325 lines) ❌ **Delete this one**

**Decision needed:** Check which file is actually imported in your code. Run:
```powershell
Select-String -Path "app\**\*.tsx","app\**\*.ts" -Pattern "from.*invoices" | Select-Object Path, Line
```

Then delete the unused one.

---

## 🔧 Setup Instructions

### Step 1: Configure ERPNext Connection

Edit `.env.local` and add your actual ERPNext credentials:

```env
ERP_NEXT_URL=http://127.0.0.1:8080  # Your ERPNext instance
ERP_API_KEY=your_actual_api_key
ERP_API_SECRET=your_actual_api_secret
NEXT_PUBLIC_ERP_NEXT_URL=http://127.0.0.1:8080
```

**How to get API Keys from ERPNext:**
1. Login to ERPNext
2. Go to User Profile → API Access
3. Generate API Key/Secret pair
4. Copy and paste into `.env.local`

### Step 2: Install Dependencies

```powershell
npm install
```

### Step 3: Run Development Server

```powershell
npm run dev
```

### Step 4: Verify Connection

Visit `http://localhost:3000` and check:
- Dashboard loads without errors
- Can fetch data from ERPNext
- Check browser console for any API errors

---

## 📋 Architecture Quick Reference

### Data Flow Pattern

```
User Action (UI)
    ↓
Client Component (useState, forms)
    ↓
Server Action ('use server' function)
    ↓
frappeRequest (app/lib/api.ts)
    ↓
ERPNext API (Docker container)
    ↓
MySQL Database
```

### File Organization

```
app/
├── actions/          → Server Actions (Backend Logic)
├── lib/              → Utilities (API client)
├── (main)/           → Protected Routes (Dashboard area)
│   ├── layout.tsx    → Sidebar wrapper
│   ├── dashboard/
│   ├── invoices/
│   ├── crm/
│   └── fleet/
├── print/            → Print layouts (no sidebar)
└── login/            → Auth page

components/
├── ui/               → Reusable primitives (Shadcn)
├── invoices/         → Invoice-specific logic
├── crm/              → CRM components (Kanban, etc.)
└── fleet/            → Fleet management
```

### Key Conventions

1. **Server Actions** → Always in `app/actions/*.ts` with `'use server'`
2. **Client Components** → Use `'use client'` for interactivity
3. **Server Components** → Default in `page.tsx` files (fetch data, pass props)
4. **Dynamic Routes** → `[id]` folders for `/crm/LEAD-001` style URLs

---

## 🐛 Common Pitfalls to Avoid

1. **Environment Variables in Client Components**
   - ❌ `process.env.ERP_NEXT_URL` (undefined in browser)
   - ✅ `process.env.NEXT_PUBLIC_ERP_NEXT_URL` (exposed to browser)

2. **Using Server Actions**
   - ✅ Call from Client Components: `await createInvoice(data)`
   - ❌ Don't try to import `frappeRequest` directly in client code

3. **Caching Issues**
   - Use `revalidatePath()` after mutations
   - Set `cache: 'no-store'` in fetch for real-time data

4. **TypeScript Errors**
   - Always define interfaces for ERPNext responses
   - Use proper typing for Server Actions

---

## 📝 Next Steps

1. **Authentication System**
   - Currently using API Keys (good for service-to-service)
   - Consider adding user sessions if needed
   - Check `app/actions/auth.ts` for login logic

2. **Error Handling**
   - Add toast notifications for user feedback
   - Implement retry logic for failed requests
   - Add loading states for better UX

3. **Type Generation**
   - Consider auto-generating TypeScript types from ERPNext DocTypes
   - Use Zod for runtime validation

4. **Testing**
   - Add unit tests for Server Actions
   - Test ERPNext API integration
   - E2E tests for critical flows

---

## 🔍 Debugging Tips

**Check ERPNext Connection:**
```powershell
# Test from command line
curl -H "Authorization: token YOUR_KEY:YOUR_SECRET" http://127.0.0.1:8080/api/method/frappe.auth.get_logged_user
```

**View Next.js Server Logs:**
- Run `npm run dev` and watch the terminal
- Server Actions errors appear here (not in browser console)

**Common Error Messages:**
- `"Not permitted"` → Check API Key permissions in ERPNext
- `"DocType not found"` → Verify DocType name spelling
- `CORS errors` → ERPNext not allowing requests (check site_config.json)

---

## 📞 Need Help?

- Check ERPNext API docs: https://frappeframework.com/docs/user/en/api
- Next.js Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
- Frappe Forum: https://discuss.frappe.io/

