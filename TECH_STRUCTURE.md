# Technical Structure Documentation

## Overview
This document provides a comprehensive overview of the technical architecture, stack, and design patterns used in the Nexus ERP project.

---

## 1. Tech Stack
- **Frontend:** Next.js 15 (App Router, Server Actions, Server/Client Components)
- **Backend:** ERPNext (Frappe) via REST API
- **Database:** MariaDB (via ERPNext)
- **Styling:** Tailwind CSS, Shadcn UI
- **Icons:** Lucide React
- **Authentication:** Custom (ERPNext session/cookies)
- **State Management:** React state/hooks, server actions
- **PDF/Print:** Custom print templates, client PrintButton

---

## 2. Folder Structure
- `/app` - Next.js app directory (routes, server actions, API, pages)
- `/components` - Reusable React components (forms, UI, domain logic)
- `/lib` - Utility functions (API wrappers, helpers)
- `/public` - Static assets
- `/docs` - (Removed, see this file for architecture)

---

## 3. Key Patterns
- **Server Actions:** Used for all data mutations (CRUD, status updates)
- **Server Components:** Default for all pages, fetch data, render static content
- **Client Components:** For interactivity (forms, print, dialogs)
- **Hydration Fix:** `suppressHydrationWarning` for browser extension compatibility
- **ERPNext Integration:**
  - All data via `frappeRequest` (REST API)
  - Custom fields prefixed with `custom_`
  - Rental pricing: 9 components per item, mapped to custom fields
- **Print Templates:**
  - Located in `/app/print/{doctype}/[id]/page.tsx`
  - Use client PrintButton for printing

---

## 4. Rental Pricing System
- **Editable in Quotation, Sales Order, Invoice forms**
- **9 Pricing Components:** base, accommodation, usage, fuel, elongation, risk, commercial, incidental, other
- **Auto-calculation:** Total rental cost auto-updates on change
- **Breakdown Display:** RentalPricingBreakdown component shows all details
- **Data Flow:** Quotation → Sales Order → Invoice (all pricing preserved)

---

## 5. Status Management
- **Sales Order:** Inline dropdown for status (To Bill, To Deliver, etc.)
- **Invoice:** Submit/Cancel actions, payment dialog
- **Ready for Invoice:** Sales orders filtered by status

---

## 6. Print System
- **PrintButton:** Client component for window.print()
- **Consistent UI:** All print pages use same button
- **No onClick in server components**

---

## 7. Miscellaneous
- **TypeScript:** Used throughout
- **ESLint/Prettier:** Enforced code style
- **No extraneous markdowns:** Only README.md and this file

---

## 8. Deployment
- **Build:** Next.js build
- **ERPNext:** Hosted separately, API URL in env
- **Static Export:** Not supported (SSR required)

---

## 9. Contribution
- See README.md for getting started, setup, and contribution guidelines.
