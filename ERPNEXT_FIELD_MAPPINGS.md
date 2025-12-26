# ERPNext Field Mappings - Nexus ERP

## 📋 Overview
This document maps all input fields in Nexus ERP forms to their corresponding ERPNext doctype structures with proper field types, options, and validations.

---

## 🔵 Lead Doctype Fields

### Basic Information

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `salutation` | Select | No | Mr, Ms, Mrs, Dr, Prof |
| `first_name` | Data | **Yes** | Max 140 chars |
| `middle_name` | Data | No | Max 140 chars |
| `last_name` | Data | No | Max 140 chars |
| `email_id` | Data | **Yes** | **Must be unique**, email validation |
| `mobile_no` | Data | **Yes** | Phone format |
| `phone` | Data | No | Phone format |
| `gender` | Select | No | Male, Female, Other |
| `job_title` | Data | No | Max 140 chars |

### Company Information

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `company_name` | Data | **Yes** | Max 140 chars |
| `website` | Data | No | URL format |
| `industry` | Link | **Yes** | Links to Industry Type doctype (32 standard values) |
| `no_of_employees` | Select | No | **Must be:** "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+" |
| `annual_revenue` | Currency | No | Numeric value |

#### Industry Type Options (ERPNext Standard):
```
Aerospace, Agriculture, Airline, Automobile, Banking, Biotechnology, 
Chemicals, Consulting, Consumer Goods, Education, Electronics, Energy, 
Engineering, Entertainment, Environmental, Finance, Food and Beverage, 
Government, Healthcare, Hospitality, Insurance, Machinery, Manufacturing, 
Media, Not For Profit, Recreation, Retail, Shipping, Technology, 
Telecommunications, Transportation, Utilities
```

### Lead Tracking

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `source` | Link | **Yes** | Links to Lead Source doctype |
| `status` | Select | No | Default: "Lead" |
| `lead_owner` | Link | No | Links to User doctype |
| `territory` | Link | No | Links to Territory doctype |

#### Lead Source Options (ERPNext Standard):
```
Existing Customer, Reference, Advertisement, Cold Calling, Exhibition,
Supplier Reference, Mass Mailing, Customer's Vendor, Campaign, Walk In
```

#### Lead Status Options (ERPNext Standard):
```
Lead, Open, Replied, Opportunity, Quotation, Lost Quotation, 
Interested, Converted, Do Not Contact
```

### Address Details

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `address_line1` | Data | No | Max 140 chars |
| `address_line2` | Data | No | Max 140 chars |
| `city` | Data | **Yes** | Max 140 chars |
| `state` | Data | **Yes** | Max 140 chars |
| `country` | Link | **Yes** | Links to Country doctype |
| `pincode` | Data | No | Max 140 chars |

### Internal Notes

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `notes` | Text | No | Long text field |

---

## 🔵 Quotation Doctype Fields

### Header Fields

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `quotation_to` | Select | **Yes** | "Customer" or "Lead" |
| `party_name` | Dynamic Link | **Yes** | Customer or Lead based on quotation_to |
| `customer_name` | Data | No | Auto-fetched from Customer |
| `transaction_date` | Date | **Yes** | Default: Today |
| `valid_till` | Date | No | Expiry date |
| `order_type` | Select | No | "Sales", "Maintenance", "Shopping Cart" |
| `currency` | Link | **Yes** | Default: Company currency |
| `conversion_rate` | Float | No | For multi-currency |
| `selling_price_list` | Link | No | Price list to use |
| `price_list_currency` | Link | No | Currency of price list |

### Customer Details

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `customer_group` | Link | No | Links to Customer Group |
| `territory` | Link | No | Links to Territory |
| `contact_person` | Link | No | Links to Contact |
| `contact_email` | Data | No | Email ID |
| `contact_mobile` | Data | No | Mobile No |
| `contact_display` | Data | No | Contact Name |

### Item Table (Child Table)

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `item_code` | Link | **Yes** | Links to Item |
| `item_name` | Data | No | Auto-fetched |
| `description` | Text Editor | No | Auto-fetched |
| `item_group` | Link | No | Auto-fetched |
| `qty` | Float | **Yes** | Quantity |
| `uom` | Link | **Yes** | Unit of Measure (Nos, Kg, etc.) |
| `stock_uom` | Link | No | Stock UOM |
| `conversion_factor` | Float | No | UOM conversion |
| `price_list_rate` | Currency | No | Base rate |
| `rate` | Currency | **Yes** | Selling rate |
| `discount_percentage` | Percent | No | 0-100 |
| `discount_amount` | Currency | No | Fixed discount |
| `amount` | Currency | Read-only | qty * rate - discount |
| `pricing_rules` | Small Text | Read-only | Applied pricing rules |
| `warehouse` | Link | No | Source warehouse |
| `delivery_date` | Date | No | Expected delivery |

### Taxes and Charges

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `taxes_and_charges` | Link | No | Links to Sales Taxes and Charges Template |
| `tax_category` | Link | No | Tax category |
| `shipping_rule` | Link | No | Shipping charges |

### Terms and Conditions

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `tc_name` | Link | No | Terms and Conditions template |
| `terms` | Text Editor | No | Terms text |
| `payment_terms_template` | Link | No | Payment terms |

### Totals (Read-Only)

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `total_qty` | Float | Read-only | Sum of all qtys |
| `total` | Currency | Read-only | Sum of all amounts |
| `net_total` | Currency | Read-only | Total before taxes |
| `total_taxes_and_charges` | Currency | Read-only | Total tax amount |
| `grand_total` | Currency | Read-only | Net total + taxes |
| `rounded_total` | Currency | Read-only | Rounded grand total |
| `in_words` | Data | Read-only | Amount in words |

---

## 🔵 Sales Order Doctype Fields

### Header Fields (Similar to Quotation)

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `customer` | Link | **Yes** | Links to Customer |
| `customer_name` | Data | No | Auto-fetched |
| `order_type` | Select | **Yes** | "Sales", "Maintenance", "Shopping Cart" |
| `transaction_date` | Date | **Yes** | Default: Today |
| `delivery_date` | Date | **Yes** | Expected delivery |
| `po_no` | Data | No | Customer's PO number |
| `po_date` | Date | No | Customer's PO date |
| `currency` | Link | **Yes** | Default: Company currency |
| `selling_price_list` | Link | No | Price list |

### Workflow Status

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `status` | Select | Read-only | Draft, To Deliver and Bill, To Bill, To Deliver, Completed, Cancelled, Closed, On Hold |

---

## 🔵 Customer Doctype Fields

### Basic Information

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `customer_name` | Data | **Yes** | Max 140 chars, **Must be unique** |
| `customer_type` | Select | **Yes** | "Company" or "Individual" |
| `customer_group` | Link | **Yes** | Default: "Commercial" |
| `territory` | Link | **Yes** | Default: "All Territories" |
| `gender` | Link | No | Male, Female, Other (if Individual) |
| `salutation` | Select | No | Mr, Ms, Mrs, Dr, Prof (if Individual) |

### Contact Details

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `email_id` | Data | No | Email validation |
| `mobile_no` | Data | No | Phone format |
| `phone_no` | Data | No | Phone format |
| `website` | Data | No | URL format |

### Business Details

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `industry` | Link | No | Links to Industry Type |
| `market_segment` | Link | No | Market segment |
| `account_manager` | Link | No | Links to User |
| `default_price_list` | Link | No | Default price list for customer |
| `default_currency` | Link | No | Preferred currency |
| `payment_terms` | Link | No | Payment terms template |
| `credit_limit` | Currency | No | Credit limit amount |
| `is_frozen` | Check | No | Block transactions if frozen |

---

## 🔵 Item Doctype Fields

### Basic Information

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `item_code` | Data | **Yes** | Max 140 chars, **Must be unique** |
| `item_name` | Data | **Yes** | Max 140 chars |
| `item_group` | Link | **Yes** | Links to Item Group |
| `stock_uom` | Link | **Yes** | Default: "Nos" |
| `is_stock_item` | Check | No | Default: 1 (Yes) |
| `is_sales_item` | Check | No | Default: 1 (Yes) |
| `is_purchase_item` | Check | No | Default: 1 (Yes) |

### Description

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `description` | Text Editor | No | HTML supported |
| `brand` | Link | No | Item brand |
| `image` | Attach Image | No | Item image |

### Pricing

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `valuation_rate` | Currency | Read-only | Average cost |
| `standard_rate` | Currency | No | Default selling rate |
| `opening_stock` | Float | No | Initial stock quantity |
| `is_fixed_asset` | Check | No | Asset item |

### Inventory

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `default_warehouse` | Link | No | Default storage location |
| `shelf_life_in_days` | Int | No | Expiry tracking |
| `has_batch_no` | Check | No | Batch tracking |
| `has_serial_no` | Check | No | Serial number tracking |
| `warranty_period` | Data | No | Warranty duration |

---

## 🔵 Pricing Rule Doctype Fields

### Rule Conditions

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `title` | Data | **Yes** | Rule name |
| `apply_on` | Select | **Yes** | "Item Code", "Item Group", "Brand", "Transaction" |
| `applicable_for` | Select | No | "", "Customer", "Customer Group", "Territory", "Sales Partner", "Campaign" |
| `selling` | Check | No | Apply to sales transactions |
| `buying` | Check | No | Apply to purchase transactions |

### Price/Discount

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `rate_or_discount` | Select | **Yes** | "Rate", "Discount Percentage", "Discount Amount" |
| `rate` | Currency | No | Fixed price |
| `discount_percentage` | Percent | No | 0-100 |
| `discount_amount` | Currency | No | Fixed discount |
| `price_or_product_discount` | Select | **Yes** | "Price" or "Product" |

### Validity

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `valid_from` | Date | No | Start date |
| `valid_upto` | Date | No | End date |
| `disable` | Check | No | Inactive rule |
| `priority` | Int | No | Higher = more important |

### Quantity Conditions

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| `min_qty` | Float | No | Minimum quantity |
| `max_qty` | Float | No | Maximum quantity |
| `min_amt` | Currency | No | Minimum transaction amount |
| `max_amt` | Currency | No | Maximum transaction amount |

---

## 🔵 Territory Doctype

**Type:** Tree Doctype (Hierarchical)

Default territories in ERPNext:
```
All Territories
├── India
├── United States
└── Rest Of The World
```

---

## 🔵 Common Field Types in ERPNext

### 1. **Data**
- Plain text input
- Max 140 characters default
- Use for: Names, IDs, Short text

### 2. **Select**
- Dropdown with predefined options
- Options defined in doctype or as "\n" separated string
- Single selection only

### 3. **Link**
- Reference to another doctype
- Must be valid doctype name
- Creates relationship between doctypes

### 4. **Dynamic Link**
- Link type determined by another field
- Example: `party_name` type determined by `quotation_to`

### 5. **Currency**
- Numeric with decimal precision
- Formatted based on currency settings
- Default precision: 2 decimal places

### 6. **Float**
- Numeric with decimals
- Precision configurable (default: 6)
- Use for: Quantities, measurements

### 7. **Int**
- Whole numbers only
- No decimal places
- Use for: Counts, priorities

### 8. **Percent**
- Float displayed as percentage
- Stored as decimal (15% = 0.15)
- Range: 0-100

### 9. **Date**
- Date picker
- Format: YYYY-MM-DD
- Can set min/max dates

### 10. **Datetime**
- Date + Time picker
- Format: YYYY-MM-DD HH:MM:SS
- Timezone aware

### 11. **Text**
- Multi-line plain text
- No character limit
- Use for: Notes, descriptions

### 12. **Text Editor**
- Rich text with HTML
- Supports formatting
- Use for: Terms, detailed descriptions

### 13. **Check**
- Boolean (0 or 1)
- Displayed as checkbox
- Use for: Flags, toggles

### 14. **Table**
- Child table
- Links to child doctype
- Multiple rows

### 15. **Small Text**
- Multi-line text
- Smaller than Text
- Max ~64KB

---

## 🛠️ Implementation Guidelines

### 1. **Always Validate Options**
When using Select/Link fields:
- Fetch actual values from ERPNext API
- Don't hardcode options that might change
- Use `frappe.client.get_list` for Link fields

### 2. **Handle Unique Fields**
Fields that must be unique:
- `email_id` in Lead
- `customer_name` in Customer
- `item_code` in Item

### 3. **Required Fields**
Mark fields as required in both:
- Frontend (HTML `required` attribute)
- Backend validation (JavaScript)

### 4. **Currency Handling**
- Always use Currency type for money
- Respect precision settings
- Handle multi-currency if enabled

### 5. **Date Handling**
- Always use YYYY-MM-DD format
- Validate date ranges
- Handle timezone conversion

---

## 📝 Best Practices

1. **Fetch Dynamic Data**: Use API to get current options for Link fields
2. **Validate on Frontend**: Catch errors before API call
3. **Parse Error Messages**: Show user-friendly errors
4. **Match Field Names Exactly**: ERPNext field names are case-sensitive
5. **Test with ERPNext First**: Create records in ERPNext UI to understand validation
6. **Check DocType JSON**: Reference `/api/resource/DocType/{name}` for field definitions
7. **Handle Optional Fields**: Only send fields with values to avoid validation issues
8. **Respect Field Dependencies**: Some fields depend on others (e.g., Dynamic Link)

---

## 🔗 Useful ERPNext API Endpoints

```
GET  /api/resource/{doctype}                    - List records
GET  /api/resource/{doctype}/{name}             - Get single record
POST /api/resource/{doctype}                    - Create record
PUT  /api/resource/{doctype}/{name}             - Update record
DELETE /api/resource/{doctype}/{name}           - Delete record

GET  /api/resource/DocType/{doctype}            - Get doctype definition
GET  /api/method/frappe.client.get_list         - Advanced query
POST /api/method/frappe.client.insert           - Create with validation
POST /api/method/frappe.client.set_value        - Update specific fields
```

---

## 🎯 Checklist for New Forms

- [ ] Map all fields to correct ERPNext field types
- [ ] Use Select/Link for constrained fields
- [ ] Validate unique fields (email, codes)
- [ ] Mark required fields properly
- [ ] Test create/update operations
- [ ] Handle error messages gracefully
- [ ] Add field-level validation
- [ ] Document any custom fields added

---

**Last Updated:** December 26, 2025
**ERPNext Version:** 15.x
**Nexus ERP Version:** 1.0
