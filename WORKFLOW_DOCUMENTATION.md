# Production-Grade Sales Order to Invoice Workflow

## 🏗️ Architecture Overview

This implementation follows ERPNext best practices for the Sales Order → Invoice workflow, with proper status management and validation at every step.

---

## 📊 ERPNext Status Lifecycle

### Sales Order Status (Calculated, Not Manual)

ERPNext calculates SO status based on TWO key metrics:
- **`per_delivered`**: Percentage of items delivered (0-100%)
- **`per_billed`**: Percentage of items invoiced (0-100%)

### Status Mapping Table

| per_billed | per_delivered | Status | Invoice Eligible |
|-----------|---------------|--------|------------------|
| 0% | 0% | **To Deliver and Bill** | ✅ YES (if submitted) |
| 0%-99% | 0%-100% | **To Deliver and Bill** | ✅ YES (if delivered) |
| 0%-99% | 100% | **To Deliver and Bill** | ✅ YES |
| 100% | 0%-99% | **To Deliver** | ❌ NO (fully billed) |
| 100% | 100% | **Completed** | ❌ NO (fully billed) |
| N/A | N/A | **Draft** | ❌ NO (not submitted) |
| N/A | N/A | **Cancelled** | ❌ NO (terminal state) |
| N/A | N/A | **On Hold** | ❌ NO (blocked) |

---

## 🔄 Workflow Steps

### Step 1: Create Sales Order (Draft)
```typescript
// Create SO from Quotation
await createSalesOrderFromQuotation(quotationId)
// Status: Draft (docstatus=0)
```

### Step 2: Submit Sales Order
```typescript
// In UI: Click "Submit" button
// After submission: docstatus=1, status="To Deliver and Bill"
```

### Step 3: (Optional) Create Delivery Note
```typescript
// For rental or item-based SOs with delivery tracking
// Creates Delivery Note, updates per_delivered
```

### Step 4: Prepare for Invoice (New "Ready for Invoice" Pane)
```typescript
// Check eligibility
const eligibility = await checkSalesOrderInvoiceEligibility(soId)

if (eligibility.eligible) {
  // Show "Create Invoice" button
}
```

### Step 5: Create Invoice
```typescript
// Production-grade function
const result = await createInvoiceFromSalesOrderProdReady(soId, {
  postingDate: '2025-01-24',
  dueDate: '2025-02-24',
  description: 'Invoice for Project XYZ'
})

// Returns: Invoice ID + status updates
// ERPNext automatically updates per_billed
```

### Step 6: ERPNext Auto-Updates Status
```
After invoice creation:
- per_billed = 50% → status stays "To Deliver and Bill"
- per_billed = 100% → status changes to "To Deliver" (if not fully delivered)
                    → status changes to "Completed" (if fully delivered)
```

### Step 7: Submit Invoice
```typescript
// In UI: Click "Submit" on Invoice
// Invoice becomes locked, payment can be recorded
```

---

## 🎯 Invoice Creation Functions

### Option 1: From "Ready for Invoice" Pane (Recommended)

**Function**: `createInvoiceFromSalesOrderProdReady(salesOrderId, options?)`

**Usage**:
```typescript
const result = await createInvoiceFromSalesOrderProdReady('SO-2025-00001', {
  postingDate: '2025-01-24',
  dueDate: '2025-02-24'
})

if (result.success) {
  console.log('Invoice created:', result.invoiceName)
} else {
  console.error('Validation failed:', result.validation.issues)
}
```

**Returns**:
```typescript
{
  success: true,
  invoiceName: "ACC-SINV-2025-00001",
  validation: { passed: true }
}
// OR
{
  error: "No items have been delivered yet",
  validation: {
    passed: false,
    issues: ["Create a Delivery Note first"],
    recommendations: ["Create DN for items", "Then create partial invoice"]
  }
}
```

### Option 2: Direct Creation (Legacy)

**Function**: `createInvoiceFromOrder(salesOrderId)`

⚠️ **Note**: Use `createInvoiceFromSalesOrderProdReady` instead - it's more robust.

---

## ✅ Validation Rules

### Pre-Invoice Eligibility Check

```typescript
checkSalesOrderInvoiceEligibility(soId) returns:

✓ ELIGIBLE IF:
  - docstatus = 1 (submitted)
  - per_billed < 100 (not fully billed)
  - status NOT IN [Draft, Cancelled, On Hold]
  - If "To Deliver and Bill": at least some items delivered

✗ NOT ELIGIBLE IF:
  - docstatus ≠ 1
  - per_billed >= 100
  - status = Draft/Cancelled/On Hold/To Deliver
```

### Error Responses with Recommendations

```typescript
{
  error: "No items have been delivered yet",
  reason: "To Deliver and Bill status requires delivery first",
  canPartiallyBill: false,
  recommendations: [
    "Create a Delivery Note for at least some items",
    "Then create a partial invoice for delivered items"
  ]
}
```

---

## 📱 UI Implementation (Sales Orders Page)

### Old Flow
```
Sales Order → "Create Invoice" button → Manual form
```

### New Flow (Ready for Invoice Pane)
```
┌─────────────────────────────────────┐
│ READY FOR INVOICE                   │
├─────────────────────────────────────┤
│                                      │
│ SO-2025-00001  | To Deliver and Bill│
│ Customer: Vedant | ₹45,000         │
│ Delivery: 50% | Billed: 0%         │
│                                      │
│ ✓ ELIGIBLE - Ready to invoice       │
│                                      │
│ [Create Invoice] [Skip]              │
│                                      │
└─────────────────────────────────────┘

OR (if not eligible)

┌─────────────────────────────────────┐
│ NOT READY FOR INVOICE               │
├─────────────────────────────────────┤
│                                      │
│ SO-2025-00002                        │
│ ❌ No items delivered yet            │
│                                      │
│ Recommendations:                     │
│ • Create Delivery Note first         │
│ • Then come back to create invoice   │
│                                      │
│ [Create Delivery Note]               │
│                                      │
└─────────────────────────────────────┘
```

---

## 🔧 Backend Architecture

### Key Files

1. **`app/actions/sales-orders.ts`**
   - `checkSalesOrderInvoiceEligibility()` - Comprehensive validation
   - `refreshSalesOrderStatus()` - Sync status from ERPNext
   - `createInvoiceFromReadySalesOrder()` - Legacy helper
   - `getSalesOrdersEligibleForInvoice()` - List for pane

2. **`app/actions/invoices.ts`**
   - `getSalesOrdersReadyForInvoicePane()` - UI data source
   - `createInvoiceFromSalesOrderProdReady()` - Main function ⭐
   - `createInvoice()` - Generic invoice creation

3. **`app/lib/api.ts`**
   - `frappeRequest()` - ERPNext API client

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│                     UI (React)                      │
│            Ready for Invoice Pane Component         │
│                  ↓ (user clicks)                    │
│          createInvoiceFromSalesOrderProdReady()     │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│              Backend (Next.js Server Action)        │
│                                                     │
│  1. checkSalesOrderInvoiceEligibility()             │
│     ↓ [Validate SO status, per_billed, etc]        │
│                                                     │
│  2. frappeRequest(make_sales_invoice, SO)          │
│     ↓ [Get invoice template from ERPNext]          │
│                                                     │
│  3. frappeRequest(insert, invoice_doc)             │
│     ↓ [Create invoice draft in ERPNext]            │
│                                                     │
│  4. refreshSalesOrderStatus()                      │
│     ↓ [Sync per_billed from ERPNext]               │
│                                                     │
│  5. revalidatePath() - Cache invalidation          │
│                                                     │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│            ERPNext Backend (Frappe)                 │
│                                                     │
│  • Sales Order (SO)                                │
│  • Sales Invoice (SI)                              │
│  • Delivery Note (DN)                              │
│                                                     │
│  Automatic calculations:                           │
│  • per_billed = sum(invoice_qty) / sum(so_qty)     │
│  • per_delivered = sum(dn_qty) / sum(so_qty)       │
│  • status = CASE WHEN per_billed=100...            │
│                                                     │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│              Database (MariaDB)                     │
│                                                     │
│  Sales Order:                                      │
│    - docstatus, status, per_billed, per_delivered  │
│  Sales Invoice:                                    │
│    - sales_order (FK), docstatus, posting_date     │
│  Delivery Note:                                    │
│    - sales_order (FK), per_delivered               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Production Deployment Checklist

- ✅ Status mapping validated against ERPNext v14+
- ✅ Comprehensive error messages for all scenarios
- ✅ Graceful fallbacks if ERPNext status updates fail
- ✅ Usage limits check before invoice creation
- ✅ Proper logging for debugging
- ✅ Cache invalidation on successful operations
- ✅ Transaction safety (atomic operations)
- ✅ Multi-tenancy support (organization_slug)

---

## 📝 Testing Scenarios

### Scenario 1: Fully Eligible
```typescript
SO-2025-00001
├─ docstatus: 1 (submitted)
├─ status: "To Deliver and Bill"
├─ per_billed: 0%
├─ per_delivered: 100% (fully delivered)
└─ Expected: ✅ CAN CREATE INVOICE
```

### Scenario 2: Partial Delivery
```typescript
SO-2025-00002
├─ docstatus: 1 (submitted)
├─ status: "To Deliver and Bill"
├─ per_billed: 0%
├─ per_delivered: 50% (partial delivery)
└─ Expected: ✅ CAN CREATE PARTIAL INVOICE
```

### Scenario 3: Already Billed
```typescript
SO-2025-00003
├─ docstatus: 1 (submitted)
├─ status: "To Deliver"
├─ per_billed: 100% (fully billed)
├─ per_delivered: 50%
└─ Expected: ❌ CANNOT CREATE - FULLY BILLED
```

### Scenario 4: Not Delivered Yet
```typescript
SO-2025-00004
├─ docstatus: 1 (submitted)
├─ status: "To Deliver and Bill"
├─ per_billed: 0%
├─ per_delivered: 0% (no delivery)
└─ Expected: ❌ CANNOT CREATE - NEEDS DELIVERY NOTE
```

### Scenario 5: Draft
```typescript
SO-2025-00005
├─ docstatus: 0 (draft)
├─ status: "Draft"
├─ per_billed: 0%
├─ per_delivered: 0%
└─ Expected: ❌ CANNOT CREATE - NOT SUBMITTED
```

---

## 🎓 Senior Developer Notes

1. **Status is Calculated, Not Manual**
   - Never manually SET `status` field
   - Let ERPNext calculate it from `per_billed` + `per_delivered`
   - Only READ the status for validation

2. **per_billed Updates Automatically**
   - When Invoice is created, ERPNext calculates `per_billed`
   - When Invoice is submitted, `per_billed` may update
   - Call `refreshSalesOrderStatus()` to sync

3. **Idempotency**
   - Creating multiple invoices from same SO is safe
   - ERPNext tracks `per_billed` correctly
   - Cannot create invoice if `per_billed >= 100`

4. **Partial Invoicing**
   - Users can create partial invoices for partially delivered items
   - Our validation handles this via `canPartiallyBill` flag
   - ERPNext's `make_sales_invoice` method handles line-item filtering

5. **Error Handling**
   - Always provide recommendations to users
   - Don't fail silently - log everything
   - Distinguish between validation errors vs system errors

---

## 🔗 Related Documentation

- [ERPNext Sales Order](https://docs.erpnext.com/docs/user/manual/en/selling/sales-order)
- [ERPNext Sales Invoice](https://docs.erpnext.com/docs/user/manual/en/accounts/sales-invoice)
- [ERPNext Delivery Note](https://docs.erpnext.com/docs/user/manual/en/stock/delivery-note)
- Nexus ERP Architecture: See `AGENTS.md`
