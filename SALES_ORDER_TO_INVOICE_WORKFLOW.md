# Sales Order to Sales Invoice Workflow

## Overview
This document describes the sales order to sales invoice workflow implemented in Nexus ERP, following ERPNext standards.

## Delivery Status States

The workflow uses delivery status to track order fulfillment:

| Status | Description | Color | Invoice Ready |
|--------|-------------|-------|----------------|
| **Not Delivered** | No items have been delivered | Red | ❌ No |
| **Partly Delivered** | Some items have been delivered | Yellow | ❌ No |
| **Fully Delivered** | All items have been delivered | Green | ✅ Yes |
| **Closed** | Order is closed | Gray | ❌ No |
| **Not Applicable** | Order doesn't require delivery | Gray | ❌ No |

## Order Status States

Standard ERPNext sales order statuses:
- **Draft** - Order not yet submitted
- **To Deliver and Bill** - Order needs both delivery and billing
- **To Bill** - Order delivered, awaiting billing
- **To Deliver** - Order awaiting delivery
- **Completed** - Order fully delivered and billed
- **Cancelled** - Order cancelled
- **On Hold** - Order temporarily on hold

## Workflow Logic

### Sales Order Creation
1. Sales order is created from quotation or manually
2. Status: `Draft`, Delivery Status: `Not Applicable`
3. Order contains items with quantities to be delivered

### Order Submission
1. Order is submitted (docstatus = 1)
2. Status changes to `To Deliver and Bill` or `To Bill` depending on items
3. System automatically sets delivery_status based on `per_delivered` field

### Delivery Tracking
1. Items are delivered through Delivery Note creation
2. `per_delivered` field updates as delivery notes are created
3. Delivery status updates automatically:
   - 0% delivered → `Not Delivered`
   - 1-99% delivered → `Partly Delivered`
   - 100% delivered → `Fully Delivered`

### Invoice Eligibility
An order is **ready for invoicing** when:
- ✅ `delivery_status` = `Fully Delivered`
- ✅ `status` = `To Bill` OR `To Deliver and Bill` OR `Completed`
- ✅ `docstatus` = 1 (submitted)

### Invoice Creation
1. Navigate to Invoices page
2. "Ready for Invoice" section shows eligible orders
3. Click "Create Invoice" to generate sales invoice
4. Invoice items are populated from delivery notes
5. Order status changes to `Completed` when fully billed

## UI Components

### DeliveryStatusBadge
Displays delivery status with color coding and tooltip explaining readiness

```tsx
<DeliveryStatusBadge status={order.delivery_status} showTooltip={true} />
```

### DeliveryStatusFilter
Dropdown filter to show/hide orders by delivery status

```tsx
<DeliveryStatusFilter 
  selectedStatuses={selected}
  onStatusesChange={handleStatusChange}
/>
```

## API Endpoints

### Get Sales Orders with Delivery Status
```
GET /api/resource/Sales Order
Fields: name, customer_name, status, delivery_status, per_delivered, per_billed
```

### Get Orders Ready for Invoice
```
GET /api/resource/Sales Order?
  filters=[["delivery_status", "=", "Fully Delivered"], ["status", "in", ["To Bill", "To Deliver and Bill", "Completed"]]]
```

## User Journey

### As a Sales Manager
1. **Create Sales Order** from quotation
2. **Track Delivery** by creating delivery notes
3. **Monitor Progress** via Sales Orders page showing delivery status
4. **Invoice When Ready** by navigating to Invoices → Ready for Invoice section
5. **Create Invoice** from fully delivered orders

### Visibility
- Sales Orders page shows all orders with delivery status column
- Invoices page highlights "Ready for Invoice" orders with green styling
- Delivery status badges provide at-a-glance status understanding

## ERPNext Compatibility
This workflow aligns with ERPNext's native:
- Delivery status calculation (based on Delivery Notes)
- Order status progression
- Multi-step order fulfillment process
- Built-in delivery and billing tracking

## Future Enhancements
- [ ] Partial invoicing support
- [ ] Automatic delivery status sync from Delivery Notes
- [ ] Email notifications when order becomes invoice-ready
- [ ] Bulk invoice creation for multiple orders
