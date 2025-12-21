# ✅ Nexus ERP - Setup & Health Check Checklist

## 📋 Pre-Flight Checklist

### ✅ Phase 1: Environment Setup

- [ ] **Node.js Installed** (v18+ required)
  ```powershell
  node --version  # Should show v18 or higher
  ```

- [ ] **ERPNext Running** (Docker or hosted)
  ```powershell
  # Test ERPNext is accessible
  curl http://127.0.0.1:8080/api/method/frappe.auth.get_logged_user
  ```

- [ ] **Environment Variables Configured**
  - [ ] `.env.local` file created
  - [ ] `ERP_NEXT_URL` set correctly
  - [ ] `ERP_API_KEY` generated from ERPNext
  - [ ] `ERP_API_SECRET` generated from ERPNext
  - [ ] `NEXT_PUBLIC_ERP_NEXT_URL` set for client-side

- [ ] **Dependencies Installed**
  ```powershell
  npm install
  ```

---

### ✅ Phase 2: Code Health Check

- [ ] **No Duplicate Files**
  ```powershell
  # Run cleanup script
  .\cleanup.ps1
  ```
  Expected cleanup:
  - [ ] `app/actions/invoices.t` removed
  - [ ] `app/actions/invoices.tsx` renamed to `.ts` (or removed)
  - [ ] `app/(main)/crm/page.tssx` removed
  - [ ] `app/(main)/crm/[id]/nano` removed

- [ ] **TypeScript Compiles**
  ```powershell
  npm run build
  ```
  Should show: `✓ Compiled successfully`

- [ ] **No ESLint Errors**
  ```powershell
  npm run lint
  ```

---

### ✅ Phase 3: API Connection Test

- [ ] **Test ERPNext API from Command Line**
  ```powershell
  $headers = @{
      "Authorization" = "token YOUR_KEY:YOUR_SECRET"
      "Content-Type" = "application/json"
  }
  Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/method/frappe.auth.get_logged_user" -Headers $headers
  ```
  Expected: Returns your ERPNext user email

- [ ] **Test API Client Function**
  Create `test-api.js`:
  ```javascript
  // test-api.js
  require('dotenv').config({ path: '.env.local' })
  
  async function testAPI() {
    const response = await fetch(`${process.env.ERP_NEXT_URL}/api/method/frappe.auth.get_logged_user`, {
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`
      }
    })
    const data = await response.json()
    console.log('✅ Connected to ERPNext as:', data.message)
  }
  
  testAPI()
  ```
  Run: `node test-api.js`

---

### ✅ Phase 4: Development Server

- [ ] **Start Dev Server**
  ```powershell
  npm run dev
  ```
  Expected: `✓ Ready on http://localhost:3000`

- [ ] **Visit Homepage**
  - [ ] Open: http://localhost:3000
  - [ ] Login page appears (or redirects to dashboard)

- [ ] **Check Browser Console**
  - [ ] No red errors in console (F12)
  - [ ] No "environment variable undefined" errors
  - [ ] No CORS errors

- [ ] **Check Terminal Logs**
  - [ ] No "ERPNext Error" messages
  - [ ] No "Failed to fetch" messages

---

### ✅ Phase 5: Feature Testing

#### Dashboard
- [ ] Visit: http://localhost:3000/dashboard
- [ ] Page loads without errors
- [ ] Charts/metrics display data
- [ ] No console errors

#### Invoices
- [ ] Visit: http://localhost:3000/invoices
- [ ] Invoice list loads from ERPNext
- [ ] "New Invoice" button works
- [ ] Can create a draft invoice
- [ ] Invoice appears in ERPNext backend

#### CRM
- [ ] Visit: http://localhost:3000/crm
- [ ] Kanban board loads
- [ ] Can drag & drop leads
- [ ] Can create new lead
- [ ] Lead syncs to ERPNext

#### Fleet
- [ ] Visit: http://localhost:3000/fleet
- [ ] Vehicle list loads
- [ ] Calendar view works
- [ ] Can create booking

---

### ✅ Phase 6: Print & Export

- [ ] **Invoice Print View**
  - [ ] Visit: http://localhost:3000/print/invoice/[id]
  - [ ] Clean A4 layout (no sidebar)
  - [ ] Print (Ctrl+P) works
  - [ ] PDF download works

- [ ] **Direct PDF Download**
  - [ ] Click "Download" on invoice
  - [ ] Opens ERPNext PDF endpoint
  - [ ] PDF downloads correctly

---

### ✅ Phase 7: Error Handling

- [ ] **404 Handling**
  - [ ] Visit: http://localhost:3000/crm/INVALID-ID
  - [ ] Shows error message (not blank page)

- [ ] **API Error Handling**
  - [ ] Stop ERPNext container
  - [ ] Try to load invoices
  - [ ] Shows user-friendly error (not crash)

- [ ] **Network Errors**
  - [ ] Disconnect internet
  - [ ] Try to create invoice
  - [ ] Shows error message

---

## 🔍 Troubleshooting Guide

### Problem: "Cannot connect to ERPNext"

**Checks:**
```powershell
# 1. Is ERPNext running?
curl http://127.0.0.1:8080

# 2. Is Docker container up?
docker ps | Select-String "erpnext"

# 3. Are ports correct?
# Check .env.local → ERP_NEXT_URL
```

**Solution:**
```powershell
# Start ERPNext (if using Docker)
docker-compose up -d
```

---

### Problem: "Not permitted" error

**Checks:**
```powershell
# Test API key directly
$headers = @{"Authorization" = "token YOUR_KEY:YOUR_SECRET"}
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/resource/User?limit_page_length=1" -Headers $headers
```

**Solution:**
1. Go to ERPNext → User Profile
2. Check user is "System User" (not "Website User")
3. Assign proper roles (Sales Manager, Accounts Manager, etc.)
4. Regenerate API keys
5. Update `.env.local`
6. Restart dev server

---

### Problem: Page loads but no data

**Checks:**
- [ ] Open browser DevTools (F12) → Network tab
- [ ] Look for failed requests (red)
- [ ] Check response body for error messages

**Solution:**
```typescript
// In app/lib/api.ts, add debug logging:
console.log('🔍 Request:', endpoint, method, body)
console.log('🔍 Response:', data)
```

---

### Problem: "Module not found" errors

**Solution:**
```powershell
# Clear cache and reinstall
Remove-Item -Recurse -Force node_modules, .next
npm install
npm run dev
```

---

### Problem: TypeScript errors

**Checks:**
```powershell
# Check for duplicate files
Get-ChildItem -Recurse -Filter "*.tsx","*.ts" | Where-Object { $_.Name -match "\.t$|\.tssx$" }
```

**Solution:**
- Run `.\cleanup.ps1` to remove duplicates
- Rebuild: `npm run build`

---

## 🎯 Production Readiness Checklist

Before deploying to production:

### Security
- [ ] All sensitive data in `.env` (not hardcoded)
- [ ] `.env.local` in `.gitignore`
- [ ] API keys rotated for production
- [ ] HTTPS enabled (no http:// in prod)
- [ ] CORS configured properly in ERPNext

### Performance
- [ ] Images optimized (using `next/image`)
- [ ] Proper caching strategy (revalidate paths)
- [ ] Database indexes in ERPNext
- [ ] API response times < 500ms

### Monitoring
- [ ] Error tracking (Sentry, LogRocket, etc.)
- [ ] Performance monitoring (Vercel Analytics, etc.)
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] ERPNext logs configured

### Testing
- [ ] All CRUD operations tested
- [ ] Edge cases handled (empty states, errors)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive

### Documentation
- [ ] API documentation updated
- [ ] User guide created
- [ ] Deployment guide written
- [ ] Changelog maintained

---

## 📞 Support Checklist

If you need help, gather this information first:

- [ ] **Environment Details**
  ```powershell
  node --version
  npm --version
  Get-Content .env.local | Select-String -Pattern "ERP_NEXT_URL"
  ```

- [ ] **Error Messages**
  - [ ] Browser console errors (screenshot)
  - [ ] Terminal logs (copy full error)
  - [ ] ERPNext error logs

- [ ] **Reproduction Steps**
  1. What did you do?
  2. What did you expect?
  3. What actually happened?

- [ ] **Code Changes**
  - [ ] Recently modified files
  - [ ] Git diff output

---

## ✨ Success Indicators

Your setup is working correctly if:

✅ Dev server starts without errors  
✅ Dashboard loads with data from ERPNext  
✅ Can create/edit/delete invoices  
✅ Changes sync to ERPNext immediately  
✅ Print views work  
✅ No console errors  
✅ API responses < 1 second  

---

**🎉 Congratulations! Your Nexus ERP is ready to use!**

---

## 📝 Post-Setup Tasks

- [ ] Star the repo (if open source)
- [ ] Join community Discord/Slack
- [ ] Read `ARCHITECTURE.md` for deep dive
- [ ] Customize branding (logo, colors)
- [ ] Add your first custom module

---

**Need help? Check:**
- `ARCHITECTURE.md` → Deep technical documentation
- `SETUP_AND_CLEANUP.md` → Setup instructions & debugging
- `README.md` → Quick start guide

