# Custom Frappe DocTypes for Nexus ERP

This directory contains JSON definitions for custom DocTypes that need to be imported into ERPNext.

## Installation Instructions

### Option 1: Import via UI (Recommended)

1. **Login to ERPNext** as Administrator at `http://127.0.0.1:8080`

2. **Import Subscription Plan Feature (Child Table First)**:
   - Go to: **Home → Customization → DocType List → Menu → Import**
   - Upload: `subscription_plan_feature.json`
   - Click **Import**

3. **Import Subscription Plan (Parent DocType)**:
   - Go to: **Home → Customization → DocType List → Menu → Import**
   - Upload: `subscription_plan.json`
   - Click **Import**

4. **Verify Installation**:
   - Go to: **Home → Customization → DocType List**
   - Search for "Subscription Plan"
   - Open and verify all fields are present

### Option 2: Import via bench CLI

```bash
# SSH into your Ubuntu VM
cd ~/frappe-bench

# Import child table first
bench --site erp.local import-doc subscription_plan_feature.json

# Import parent DocType
bench --site erp.local import-doc subscription_plan.json

# Clear cache
bench --site erp.local clear-cache
```

## Creating Sample Plans

After importing, create sample subscription plans:

### Free Plan
```
Plan Name: Free Plan
Plan Slug: free
Monthly Price: 0
Yearly Price: 0
Max Users: 3
Max Storage (GB): 5
Max Bookings Per Month: 20
Max Invoices Per Month: 50
Enabled Features: CRM, Bookings, Invoices
```

### Professional Plan
```
Plan Name: Professional
Plan Slug: pro
Monthly Price: 49
Yearly Price: 490 (2 months free)
Max Users: 10
Max Storage (GB): 50
Max Bookings Per Month: 200
Max Invoices Per Month: 500
Enabled Features: All features enabled
```

### Enterprise Plan
```
Plan Name: Enterprise
Plan Slug: enterprise
Monthly Price: 199
Yearly Price: 1990
Max Users: 999
Max Storage (GB): 500
Max Bookings Per Month: 9999
Max Invoices Per Month: 9999
Enabled Features: All features enabled
```

## DocType Structure

### Subscription Plan
- **Module**: Custom
- **Naming**: Auto-name by `plan_slug` field
- **Track Changes**: Yes
- **Permissions**: System Manager (full), All (read)

### Subscription Plan Feature (Child Table)
- **Module**: Custom
- **Is Table**: Yes (child table)
- **Parent**: Subscription Plan

## Integration with Tenant

After creating plans, add a `subscription_plan` Link field to the **Tenant** DocType:

```json
{
  "fieldname": "subscription_plan",
  "fieldtype": "Link",
  "label": "Subscription Plan",
  "options": "Subscription Plan",
  "reqd": 1
}
```

## Next Steps

1. **Import DocTypes** using instructions above
2. **Create sample plans** in ERPNext
3. **Link to Tenant**: Add `subscription_plan` field to Tenant DocType
4. **Update signup flow**: Allow users to select plan during signup
5. **Implement limits**: Check limits in Next.js Server Actions before operations
6. **Add upgrade prompts**: Show upgrade UI when limits are reached

## Files

- `subscription_plan.json` - Parent DocType definition
- `subscription_plan_feature.json` - Child table for features
- `README.md` - This file
