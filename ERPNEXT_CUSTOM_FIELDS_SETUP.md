# ERPNext Custom Fields Setup for Rental Pricing System

## Overview

This document provides the complete setup instructions for adding custom fields to ERPNext to support the Rental Pricing System for heavy equipment quotations, sales orders, and invoices.

---

## 🔧 Custom Fields Required

### Quotation Item (Child Table: `Quotation Item`)

These fields need to be added to the **Quotation Item** doctype to store rental pricing information.

#### Method 1: Using ERPNext UI

Navigate to: **Customize Form** → Select **Quotation Item**

Add the following custom fields:

| Label | Fieldname | Field Type | Options/Settings |
|-------|-----------|------------|------------------|
| **Is Rental** | `custom_is_rental` | Check | Default: 0 |
| **Rental Type** | `custom_rental_type` | Select | Options: Hours\nDays\nMonths |
| **Rental Duration** | `custom_rental_duration` | Int | Read Only: 0 |
| **Rental Start Date** | `custom_rental_start_date` | Date | Depends On: `eval:doc.custom_is_rental==1` |
| **Rental End Date** | `custom_rental_end_date` | Date | Depends On: `eval:doc.custom_is_rental==1` |
| **Rental Start Time** | `custom_rental_start_time` | Time | Depends On: `eval:doc.custom_rental_type=='Hours'` |
| **Rental End Time** | `custom_rental_end_time` | Time | Depends On: `eval:doc.custom_rental_type=='Hours'` |
| **Operator Included** | `custom_operator_included` | Check | Default: 0, Depends On: `eval:doc.custom_is_rental==1` |
| **Base Rental Cost** | `custom_base_rental_cost` | Currency | Depends On: `eval:doc.custom_is_rental==1` |
| **Accommodation Charges** | `custom_accommodation_charges` | Currency | Depends On: `eval:doc.custom_is_rental==1` |
| **Usage Charges** | `custom_usage_charges` | Currency | Depends On: `eval:doc.custom_is_rental==1` |
| **Fuel Charges** | `custom_fuel_charges` | Currency | Depends On: `eval:doc.custom_is_rental==1` |
| **Elongation Charges** | `custom_elongation_charges` | Currency | Depends On: `eval:doc.custom_is_rental==1` |
| **Risk Charges** | `custom_risk_charges` | Currency | Depends On: `eval:doc.custom_is_rental==1` |
| **Commercial Charges** | `custom_commercial_charges` | Currency | Depends On: `eval:doc.custom_is_rental==1` |
| **Incidental Charges** | `custom_incidental_charges` | Currency | Depends On: `eval:doc.custom_is_rental==1` |
| **Other Charges** | `custom_other_charges` | Currency | Depends On: `eval:doc.custom_is_rental==1` |
| **Total Rental Cost** | `custom_total_rental_cost` | Currency | Read Only: 1, Depends On: `eval:doc.custom_is_rental==1` |
| **Rental Data (JSON)** | `custom_rental_data` | Long Text | Hidden: 1 |

#### Method 2: Using Bench Command (Faster for bulk setup)

Create a file named `rental_custom_fields.py` in your ERPNext app custom scripts folder:

```python
import frappe

def create_rental_custom_fields():
    """Create custom fields for rental pricing system"""
    
    # Quotation Item Custom Fields
    quotation_item_fields = [
        {
            'fieldname': 'custom_is_rental',
            'label': 'Is Rental',
            'fieldtype': 'Check',
            'insert_after': 'item_code',
            'default': 0
        },
        {
            'fieldname': 'custom_rental_type',
            'label': 'Rental Type',
            'fieldtype': 'Select',
            'options': 'Hours\\nDays\\nMonths',
            'insert_after': 'custom_is_rental',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_rental_duration',
            'label': 'Rental Duration',
            'fieldtype': 'Int',
            'insert_after': 'custom_rental_type',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_rental_start_date',
            'label': 'Rental Start Date',
            'fieldtype': 'Date',
            'insert_after': 'custom_rental_duration',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_rental_end_date',
            'label': 'Rental End Date',
            'fieldtype': 'Date',
            'insert_after': 'custom_rental_start_date',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_rental_start_time',
            'label': 'Rental Start Time',
            'fieldtype': 'Time',
            'insert_after': 'custom_rental_end_date',
            'depends_on': 'eval:doc.custom_rental_type=="Hours"'
        },
        {
            'fieldname': 'custom_rental_end_time',
            'label': 'Rental End Time',
            'fieldtype': 'Time',
            'insert_after': 'custom_rental_start_time',
            'depends_on': 'eval:doc.custom_rental_type=="Hours"'
        },
        {
            'fieldname': 'custom_operator_included',
            'label': 'Operator Included',
            'fieldtype': 'Check',
            'insert_after': 'custom_rental_end_time',
            'default': 0,
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_base_rental_cost',
            'label': 'Base Rental Cost',
            'fieldtype': 'Currency',
            'insert_after': 'custom_operator_included',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_accommodation_charges',
            'label': 'Accommodation Charges',
            'fieldtype': 'Currency',
            'insert_after': 'custom_base_rental_cost',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_usage_charges',
            'label': 'Usage Charges',
            'fieldtype': 'Currency',
            'insert_after': 'custom_accommodation_charges',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_fuel_charges',
            'label': 'Fuel Charges',
            'fieldtype': 'Currency',
            'insert_after': 'custom_usage_charges',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_elongation_charges',
            'label': 'Elongation Charges',
            'fieldtype': 'Currency',
            'insert_after': 'custom_fuel_charges',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_risk_charges',
            'label': 'Risk Charges',
            'fieldtype': 'Currency',
            'insert_after': 'custom_elongation_charges',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_commercial_charges',
            'label': 'Commercial Charges',
            'fieldtype': 'Currency',
            'insert_after': 'custom_risk_charges',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_incidental_charges',
            'label': 'Incidental Charges',
            'fieldtype': 'Currency',
            'insert_after': 'custom_commercial_charges',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_other_charges',
            'label': 'Other Charges',
            'fieldtype': 'Currency',
            'insert_after': 'custom_incidental_charges',
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_total_rental_cost',
            'label': 'Total Rental Cost',
            'fieldtype': 'Currency',
            'insert_after': 'custom_other_charges',
            'read_only': 1,
            'depends_on': 'eval:doc.custom_is_rental==1'
        },
        {
            'fieldname': 'custom_rental_data',
            'label': 'Rental Data (JSON)',
            'fieldtype': 'Long Text',
            'insert_after': 'custom_total_rental_cost',
            'hidden': 1
        }
    ]
    
    # Create fields for Quotation Item
    for field in quotation_item_fields:
        create_custom_field('Quotation Item', field)
    
    # Copy same fields to Sales Order Item
    for field in quotation_item_fields:
        create_custom_field('Sales Order Item', field)
    
    # Copy same fields to Sales Invoice Item
    for field in quotation_item_fields:
        create_custom_field('Sales Invoice Item', field)
    
    print("✅ Rental pricing custom fields created successfully!")

def create_custom_field(doctype, field_config):
    """Helper to create a custom field"""
    try:
        if not frappe.db.exists('Custom Field', {
            'dt': doctype,
            'fieldname': field_config['fieldname']
        }):
            custom_field = frappe.get_doc({
                'doctype': 'Custom Field',
                'dt': doctype,
                **field_config
            })
            custom_field.insert()
            frappe.db.commit()
            print(f"✅ Created field: {field_config['fieldname']} in {doctype}")
        else:
            print(f"⏭️  Field {field_config['fieldname']} already exists in {doctype}")
    except Exception as e:
        print(f"❌ Error creating field {field_config['fieldname']} in {doctype}: {str(e)}")

# Run the function
if __name__ == '__main__':
    create_rental_custom_fields()
```

Run the script:

```bash
cd frappe-bench
bench --site [your-site-name] execute rental_custom_fields.create_rental_custom_fields
```

---

## 📋 Field Details and Usage

### 1. `custom_is_rental` (Check)
- **Purpose**: Flag to identify if this item is a rental
- **Usage**: When creating quotations in Nexus ERP, items with rental pricing will have this set to `1`
- **Required**: Yes (for rental items)

### 2. `custom_rental_type` (Select)
- **Purpose**: Type of rental period
- **Options**: 
  - Hours (for short-term rentals)
  - Days (most common)
  - Months (long-term contracts)
- **Usage**: Determines duration calculation method
- **Required**: Yes (if is_rental = 1)

### 3. `custom_rental_duration` (Int)
- **Purpose**: Calculated number of rental periods
- **Example**: 5 (days), 120 (hours), 3 (months)
- **Usage**: Auto-calculated from start/end dates
- **Required**: Yes (if is_rental = 1)

### 4. `custom_rental_start_date` (Date)
- **Purpose**: Equipment rental start date
- **Format**: YYYY-MM-DD
- **Usage**: Beginning of rental period
- **Required**: Yes (if is_rental = 1)

### 5. `custom_rental_end_date` (Date)
- **Purpose**: Equipment rental end date
- **Format**: YYYY-MM-DD
- **Usage**: End of rental period
- **Required**: Yes (if is_rental = 1)

### 6. `custom_rental_start_time` (Time)
- **Purpose**: Precise start time for hourly rentals
- **Format**: HH:MM:SS
- **Usage**: Used for equipment categories that support hourly pricing
- **Required**: No (only for hourly rentals)
- **Visibility**: Shows only when rental_type = "Hours"

### 7. `custom_rental_end_time` (Time)
- **Purpose**: Precise end time for hourly rentals
- **Format**: HH:MM:SS
- **Usage**: Used for equipment categories that support hourly pricing
- **Required**: No (only for hourly rentals)
- **Visibility**: Shows only when rental_type = "Hours"

### 8. `custom_operator_included` (Check)
- **Purpose**: Indicates if equipment operator is included in price
- **Usage**: Important for costing and operations planning
- **Required**: No
- **Default**: 0 (not included)

### 9. `custom_total_rental_cost` (Currency)
- **Purpose**: Sum of all rental pricing components
- **Usage**: Displayed for reference, synced to `rate` field
- **Required**: Yes (if is_rental = 1)
- **Read Only**: Yes (calculated field)

### 10. `custom_rental_data` (Long Text)
- **Purpose**: JSON storage of complete rental pricing breakdown
- **Content**: Stores all pricing components (base, accommodation, usage, fuel, etc.)
- **Usage**: For detailed reporting and auditing
- **Required**: Yes (if is_rental = 1)
- **Visibility**: Hidden (backend use only)

**Example JSON Structure:**
```json
{
  "is_rental": true,
  "rental_type": "days",
  "rental_duration": 7,
  "rental_start_date": "2025-01-15",
  "rental_end_date": "2025-01-22",
  "requires_operator": true,
  "operator_included": true,
  "operator_name": "John Doe",
  "pricing_components": {
    "base_cost": 50000,
    "accommodation_charges": 5000,
    "usage_charges": 2000,
    "fuel_charges": 3000,
    "elongation_charges": 0,
    "risk_charges": 1000,
    "commercial_charges": 500,
    "incidental_charges": 500,
    "other_charges": 0
  },
  "total_rental_cost": 62000
}
```

---

## 🔄 Data Flow Across Doctypes

### Quotation → Sales Order → Sales Invoice

1. **Quotation Created** (in Nexus ERP)
   - User fills rental details
   - Custom fields populated
   - `custom_rental_data` stores complete breakdown

2. **Convert to Sales Order**
   - All `custom_*` fields copied from Quotation Item
   - Rental data preserved
   - Duration and dates maintained

3. **Create Invoice from Sales Order**
   - Rental fields flow to Sales Invoice Item
   - Billing reflects rental period
   - Pricing breakdown available for customer

---

## ✅ Validation Rules

### Field Dependencies

```python
# custom_rental_type visibility
depends_on = 'eval:doc.custom_is_rental==1'

# Time fields visibility  
depends_on = 'eval:doc.custom_rental_type=="Hours"'

# Operator fields visibility
depends_on = 'eval:doc.custom_is_rental==1'
```

### Required Field Logic

In Nexus ERP frontend:
- If `is_rental` = true, then:
  - `rental_type` → Required
  - `rental_start_date` → Required
  - `rental_end_date` → Required
  - `pricing_components.base_cost` → Required (must be > 0)

---

## 🛠️ Troubleshooting

### Issue 1: Custom Fields Not Appearing
**Solution**: 
1. Clear cache: `bench --site [site-name] clear-cache`
2. Reload doctype: `bench --site [site-name] reload-doc frappe Custom Field`
3. Restart bench: `bench restart`

### Issue 2: Rental Data Not Saving
**Cause**: JSON validation error or missing required fields

**Solution**:
1. Check `custom_rental_data` field is Long Text type
2. Ensure JSON is valid before saving
3. Verify all required rental fields are filled

### Issue 3: Fields Not Copying to Sales Order
**Cause**: Field mapping not configured

**Solution**:
Verify fields exist in all three doctypes:
```bash
bench --site [site-name] console
```

```python
frappe.db.get_value('Custom Field', 
    {'dt': 'Quotation Item', 'fieldname': 'custom_is_rental'}, 
    'name')
```

---

## 📊 Reporting and Analytics

### Custom Reports

Create custom reports in ERPNext to analyze rental data:

#### Rental Revenue Report
```sql
SELECT 
    qi.parent as quotation_id,
    qi.item_name,
    qi.custom_rental_type as rental_type,
    qi.custom_rental_duration as duration,
    qi.custom_rental_start_date as start_date,
    qi.custom_rental_end_date as end_date,
    qi.custom_total_rental_cost as rental_cost,
    q.grand_total,
    q.status
FROM `tabQuotation Item` qi
INNER JOIN `tabQuotation` q ON qi.parent = q.name
WHERE qi.custom_is_rental = 1
ORDER BY qi.custom_rental_start_date DESC
```

#### Equipment Utilization Report
```sql
SELECT 
    soi.item_code,
    soi.item_name,
    COUNT(*) as rental_count,
    SUM(soi.custom_rental_duration) as total_days_rented,
    AVG(soi.custom_rental_duration) as avg_rental_duration,
    SUM(soi.custom_total_rental_cost) as total_revenue
FROM `tabSales Order Item` soi
INNER JOIN `tabSales Order` so ON soi.parent = so.name
WHERE soi.custom_is_rental = 1
AND so.docstatus = 1
GROUP BY soi.item_code
ORDER BY total_revenue DESC
```

---

## 🔐 Permissions

Ensure users have permissions to view/edit custom fields:

```python
# Add role permissions for custom fields
frappe.permissions.add_permission({
    'doctype': 'Quotation Item',
    'role': 'Sales User',
    'permlevel': 0,
    'read': 1,
    'write': 1
})
```

---

## 📦 Backup and Migration

### Export Custom Fields
```bash
bench --site [site-name] export-fixtures Custom Field
```

### Import to Another Site
```bash
bench --site [new-site-name] import-fixtures
```

---

## 🎯 Testing Checklist

- [ ] Create quotation with rental item in Nexus ERP
- [ ] Verify all custom fields save correctly
- [ ] Check `custom_rental_data` JSON is valid
- [ ] Convert quotation to Sales Order
- [ ] Verify rental fields copied to Sales Order Item
- [ ] Create invoice from Sales Order
- [ ] Verify rental fields copied to Sales Invoice Item
- [ ] Test print formats show rental breakdown
- [ ] Verify reports filter by rental items correctly
- [ ] Test with hourly, daily, and monthly rentals
- [ ] Test operator included/not included scenarios

---

## 📞 Support

For issues with ERPNext custom fields:
- ERPNext Forum: https://discuss.frappe.io/
- Documentation: https://docs.erpnext.com/docs/v14/user/manual/en/customize-erpnext/custom-field
- GitHub Issues: https://github.com/frappe/erpnext/issues

---

**Document Version**: 1.0  
**Last Updated**: December 26, 2025  
**Compatible with**: ERPNext v14, v15  
**System**: Nexus ERP - Heavy Equipment Rental Management
