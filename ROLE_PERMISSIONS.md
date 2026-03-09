# Role-Based Access Control — Nexus ERP

This document describes what each Frappe role can see and do in Nexus ERP.

---

## Role Definitions

| App Role | Maps to Frappe Role | Invited via `type` field |
|---|---|---|
| **Admin** | `System Manager` | `admin` |
| **Sales Manager** | `Sales Manager` | `sales` |
| **Sales** (view-only) | `Sales User` | — (assigned directly) |
| **Accounts Manager** | `Accounts Manager` | `accounts` |
| **Accounts** (view-only) | `Accounts User` | — |
| **Projects Manager** | `Projects Manager` | `projects` |
| **Projects** (view-only) | `Projects User` | — |
| **Stock Manager** | `Stock Manager` | — |
| **Stock** (view-only) | `Stock User` | — |
| **Member** | `Employee` | `member` |

---

## Module Access (Sidebar Visibility)

A ✅ means the role can see and navigate to the module.

| Module | Admin | Sales Manager | Sales | Accounts Manager | Accounts | Projects Manager | Projects | Stock Manager | Stock |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CRM | ✅ | ✅ | ✅ | | | | | | |
| Quotations | ✅ | ✅ | ✅ | ✅ | | | | | |
| Sales Orders | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | | |
| Invoices | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | | |
| Payments | ✅ | ✅ | | ✅ | ✅ | ✅ | | | |
| Projects | ✅ | ✅ | | ✅ | | ✅ | ✅ | | |
| Bookings | ✅ | ✅ | ✅ | ✅ | | ✅ | ✅ | ✅ | |
| Catalogue | ✅ | ✅ | ✅ | | | ✅ | ✅ | ✅ | ✅ |
| Operators | ✅ | | | | | ✅ | | ✅ | ✅ |
| Agents | ✅ | | | | | ✅ | | ✅ | ✅ |
| Inspections | ✅ | | | | | ✅ | ✅ | ✅ | ✅ |
| Pricing Rules | ✅ | ✅ | | ✅ | | | | | |
| Team | ✅ | ✅ | | | | ✅ | | ✅ | |
| Admin / Tenants | ✅ | | | | | | | | |
| Settings | ✅ | | | | | | | | |

---

## Action Permissions (per Module)

Legend: **C** = Create · **E** = Edit · **D** = Delete · **X** = Convert/Special

### CRM (Leads & Opportunities)

| Action | Admin | Sales Manager | Sales (view) |
|---|:---:|:---:|:---:|
| View | ✅ | ✅ | ✅ |
| Create Lead / Opportunity | ✅ | ✅ | ❌ |
| Edit / Change Status | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ❌ |
| Convert Lead → Opportunity | ✅ | ✅ | ❌ |
| Drag & Drop (Kanban) | ✅ | ✅ | ❌ |

### Quotations

| Action | Admin | Sales Manager | Sales | Accounts Manager |
|---|:---:|:---:|:---:|:---:|
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ | ❌ |
| Edit | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |

### Sales Orders

| Action | Admin | Sales Manager | Sales | Accounts Manager | Accounts |
|---|:---:|:---:|:---:|:---:|:---:|
| View | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ |
| Edit | ✅ | ✅ | ❌ | ✅ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ |

### Invoices

| Action | Admin | Sales Manager | Sales | Accounts Manager | Accounts |
|---|:---:|:---:|:---:|:---:|:---:|
| View | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ |
| Edit | ✅ | ✅ | ❌ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ | ✅ | ❌ |

### Payments

| Action | Admin | Sales Manager | Accounts Manager | Accounts |
|---|:---:|:---:|:---:|:---:|
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ❌ | ✅ | ❌ |
| Edit | ✅ | ❌ | ✅ | ❌ |
| Delete | ✅ | ❌ | ✅ | ❌ |

### Projects

| Action | Admin | Sales Manager | Accounts Manager | Projects Manager | Projects |
|---|:---:|:---:|:---:|:---:|:---:|
| View | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ❌ | ❌ | ✅ | ❌ |
| Edit | ✅ | ✅ | ❌ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ | ✅ | ❌ |

### Bookings

| Action | Admin | Sales Manager | Sales | Accounts Manager | Projects Manager | Projects | Stock Manager |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Edit | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |

### Catalogue (Fleet/Equipment)

| Action | Admin | Sales Manager | Sales | Projects Manager | Projects | Stock Manager | Stock |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Edit | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

### Team Management

| Action | Admin | Sales Manager | Projects Manager | Stock Manager |
|---|:---:|:---:|:---:|:---:|
| View members | ✅ | ✅ | ✅ | ✅ |
| Invite members | ✅ | ✅ | ✅ | ✅ |
| Edit roles | ✅ | ✅ | ✅ | ✅ |
| Remove members | ✅ | ✅ | ✅ | ✅ |

---

## Permission Logic

Permissions are implemented in three layers:

1. **Route guard** (`middleware.ts`): unauthenticated users are redirected to `/login`.
2. **Module guard** (`lib/role-permissions.ts` → `MODULE_PERMISSIONS`): controls sidebar visibility and redirects to `/access-denied` for routes the user's roles cannot access.
3. **Action guard** (`lib/role-permissions.ts` → `ACTION_PERMISSIONS`): controls individual UI elements (buttons, dropdowns, drag handles) via `canPerform(module, action)` from `useUser()`.

> **System Manager** bypasses all action checks — always has full access everywhere.
>
> **Manager roles** (Sales Manager, Accounts Manager, Projects Manager, Stock Manager) have full **C/E/D** access to the modules they manage.
>
> **User roles** (Sales User, Accounts User, Projects User, Stock User) have **view-only** access — they can browse records but cannot create, edit, delete, or trigger conversions.
