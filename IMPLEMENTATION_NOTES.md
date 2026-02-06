## Operators Dashboard Migration

### Overview
Migrated the Operators dashboard from static HTML to a fully integrated Next.js TSX implementation. The new dashboard uses real data from ERPNext via `getOperators()` and supports live search, filtering, KPI cards, and modern UI/UX matching the provided HTML reference.

### Files Modified
- **`app/(main)/operators/page.tsx`**
  - Replaced legacy Card grid implementation with a new client-side dashboard (TSX) using React hooks and Tailwind CSS.
  - Integrated real data fetching, search, filters, and KPI cards.
  - All UI controls and actions (add operator, search, filter) are wired to real backend actions.

### Files Created/Removed
- **No new components created**; reused `components/operators/create-operator-dialog.tsx` for operator creation dialog.
- **No legacy operator components found** in `components/operators/` (only the dialog remains and is in use).

### Key Features Implemented
- Modern dashboard UI with KPI cards, header/profile bar, and AI banner.
- Live search, role/status filters, and responsive crew grid.
- Real data integration with backend actions for fetching and creating operators.
- Full dark mode and responsive design support.

### Cleanup
- Removed all legacy code from the old Operators page implementation.
- Verified no unused operator components remain.

---
# CRM Implementation Notes

## Opportunities Page

### Overview
Converted HTML-based opportunities intelligence dashboard to Next.js TSX implementation with full integration to existing ERPNext backend data.

### Files Created

#### New Components
- **`components/crm/opportunities-client.tsx`** (370+ lines)
  - Full client-side implementation of opportunities intelligence dashboard
  - Features: KPI cards, stage-based tabs, table view, search/filter UI, won opportunities grid, pagination (20 per page)
  - Uses React hooks for state management (useState, useRouter)
  - Fully responsive with Tailwind CSS styling matching original HTML design

### Files Modified

#### Updated Pages
- **`app/(main)/crm/opportunities/page.tsx`**
  - **Before**: Complex server component with inline KPI calculations, stage definitions, and UI rendering
  - **After**: Simple server wrapper that fetches data and delegates rendering to OpportunitiesClient
  - **Removed**: All inline UI code (200+ lines), stage definitions, grouped opportunities calculations
  - **Simplified**: Now only calls `getOpportunities()` and passes data to client component

### Files Deprecated (Removed)
- **`components/crm/opportunities-view.tsx`** - Replaced by OpportunitiesClient component
- **`components/crm/opportunities-list.tsx`** - No longer referenced

### Key Features Implemented

#### ✅ Completed Features
- **KPI Cards**: Open Opportunities, Won This Month, Avg Probability (sized to match leads page)
- **Stage-Based Navigation**: Prospecting, Qualification, Proposal, Negotiation, Closed-Won, Closed-Lost tabs
- **Table View**: Full opportunity listing with columns:
  - Customer Name
  - Amount (₹ formatted)
  - Owner (with avatar initials)
  - Status/Stage badges with AI insights
- **Pagination**: 20 opportunities per page with Previous/Next controls and page numbers
- **Search & Filters**: Live search across customer names
- **Won Opportunities Section**: Grid display of closed-won deals
- **Responsive Design**: Mobile-first Tailwind CSS classes
- **Dark Mode Support**: Tailwind dark: variants throughout
- **Header**: Search bar and profile section (AVARIQ logo removed as requested)

#### ⚠️ Partially Implemented Features
- **Owner Data**: Currently using mock initials/names
  - TODO: Wire to actual user data from ERPNext
  - Backend may need to populate `opportunity_owner` or similar field
  - Need to fetch user details (name, email) for avatar display

- **Kanban View**: UI toggle exists but view not implemented
  - TODO: Create kanban board component
  - Should group opportunities by sales_stage
  - Drag-and-drop functionality for stage updates

- **Stage Counts**: Stage tab badges show "(0)" placeholder
  - TODO: Calculate actual counts per stage from opportunities data
  - Filter opportunities by each stage value

#### ❌ Missing from Original HTML
- **Filter Dropdowns**: Amount range, close date filters not implemented yet
- **Bulk Actions**: Select all, bulk delete/update functionality
- **Export**: CSV/Excel export button not implemented
- **Advanced Search**: Original had more sophisticated filtering

---

## Quotations Page

### Overview
Converted HTML-based quotations workspace to Next.js TSX implementation with full integration to existing ERPNext backend data.

### Files Created

#### New Components
- **`components/crm/quotations-client.tsx`** (450+ lines)
  - Full client-side implementation of quotations workspace
  - Features: KPI cards, status tabs, search/filter UI, quotation cards, pagination (5 per page)
  - Uses React hooks for state management (useState, useRouter, useMemo)
  - Fully responsive with Tailwind CSS styling matching original HTML design

### Files Modified

#### Updated Pages
- **`app/(main)/crm/quotations/page.tsx`**
  - **Before**: Server component fetching quotations and opportunities, passing to QuotationsView
  - **After**: Simple server wrapper that fetches only quotations and delegates rendering to QuotationsClient
  - **Removed**: Opportunities fetching, proposal opportunities filtering
  - **Simplified**: Now only calls `getQuotations()` and passes data to client component

### Files Deprecated (Removed)
- **`components/crm/quotations-view.tsx`** - Replaced by QuotationsClient component

### Key Features Implemented

#### ✅ Completed Features
- **KPI Cards**: Total Quotations, Open Quotations, Total Value (sized to match leads page)
- **Status Tabs**: All Quotations, Ready for Quotation, Pending Approval with dynamic counts
- **Quotation Cards**: Large detailed cards showing:
  - Quotation ID and status badge
  - Customer info (name, email)
  - Valid till date with days remaining indicator
  - Amount (₹ formatted with L suffix for lakhs)
  - Items count (SKUs)
  - AI insights badges (Follow-up Recommended, High Win Probability)
  - View Details button
- **Pagination**: 5 quotations per page with Previous/Next controls and page numbers
- **Search & Filters**: Live search across quotation ID, customer name
- **Status Filter**: Dropdown to filter by Draft, Open, Cancelled
- **Date Range Filter**: Dropdown for date filtering (UI only, not functional yet)
- **Responsive Design**: Mobile-first Tailwind CSS classes
- **Dark Mode Support**: Tailwind dark: variants throughout
- **Header**: Search bar and profile section (matching opportunities page design)

#### ⚠️ Partially Implemented Features
- **Date Range Filter**: UI exists but not wired to actual date filtering logic
  - TODO: Implement date range filtering based on transaction_date or valid_till
  
- **More Filters Button**: Button exists but doesn't open filter panel
  - TODO: Create filter panel with advanced options

- **AI Insights**: Basic logic implemented but needs refinement
  - Currently shows "Follow-up Recommended" for Draft quotations
  - Shows "High Win Probability" for Open quotations > ₹25,000
  - TODO: Connect to actual AI service for real insights

- **Items Display**: Shows total SKU count but doesn't list actual items
  - TODO: Fetch and display quotation items (requires additional API call or field in getQuotations)

#### ❌ Missing from Original HTML
- **New Quotation Button**: Intentionally removed (matching opportunities page pattern)
- **Notifications Bell**: Not implemented (would require notification system)
- **Grid View Toggle**: List/Grid view toggle button exists in HTML but not implemented
- **Last Synced Time**: Shows "2m ago" as static text, not real-time sync status
- **View All Won Deals**: No dedicated won/converted quotations section

### Data Integration

#### Backend Actions Used
- `getQuotations()`: Primary data source from `app/actions/quotations.ts`
  - Returns: Array of Quotation objects
  - Fields: name, quotation_to, party_name, customer_name, status, valid_till, grand_total, currency, transaction_date, total_qty, contact_email

#### Data Flow
1. **Server Component** (`app/(main)/crm/quotations/page.tsx`):
   - Calls `getQuotations()` server action
   - Passes raw quotations array to client component
   - No data transformation on server

2. **Client Component** (`components/crm/quotations-client.tsx`):
   - Receives quotations as props
   - Applies client-side filtering (search, status, tab)
   - Calculates KPIs dynamically from filtered data
   - Handles all user interactions (search, filter, navigation, pagination)

### Known Issues & TODOs

#### High Priority
1. **Items Data**: Quotation cards show SKU count but not actual items
   - Need to fetch items array from backend
   - Display item names/descriptions in card or detail view

2. **Date Range Filtering**: UI exists but not functional
   - Implement date filtering logic
   - Support "This Month", "Last 30 Days", "Custom Range"

3. **AI Insights**: Basic placeholder logic only
   - Connect to real AI service for win probability
   - Add more insight types (pricing suggestions, competitor analysis)

#### Medium Priority
4. **More Filters Panel**: Button exists but no panel implemented
   - Create expandable filter panel
   - Add filters for: amount range, customer type, items, territory

5. **Quotation Items**: Need to display actual items in card or separate section
   - May require additional API call to get full quotation with items
   - Or include items in initial getQuotations() response

6. **Status Badge Colors**: Some statuses may need better color coding
   - Add more status types (Replied, Lost, Expired)

#### Low Priority
7. **Grid View**: Toggle exists in original HTML but not implemented
8. **Export Functionality**: Add CSV/Excel export button
9. **Bulk Actions**: Multi-select quotations with bulk operations
10. **Real-time Sync**: Show actual last synced timestamp

### Styling & Design System

#### Tailwind CSS Classes Used
- Layout: `grid`, `flex`, `space-y-*`, `gap-*`
- Colors: `bg-white`, `border-slate-200`, `text-slate-900`, `dark:bg-slate-900`
- Typography: `text-[20px]`, `font-bold`, `tracking-tight`, `uppercase`
- Interactive: `hover:border-blue-600/50`, `cursor-pointer`, `transition-all`
- Card Design: Large detailed cards with icon badges, 4-column grid layout

#### Component Libraries
- **Lucide Icons**: TrendingUp, Wallet, Zap, User, Calendar, DollarSign, Package, ArrowRight, Search, Filter
- **Radix UI** (via shadcn/ui): Not used yet, available for modals, dropdowns

---

## Common Implementation Patterns

### Pagination
Both Opportunities and Quotations pages use similar pagination:
- State: `currentPage`, `ITEMS_PER_PAGE` constant
- Calculations: `totalPages`, `startIndex`, `endIndex`, `paginatedItems`
- Controls: Previous/Next buttons, numbered page buttons (max 5 visible)
- Auto-reset: Page resets to 1 when filters change
- Display: "Showing X to Y of Z results"

### KPI Cards
Consistent sizing and styling across pages:
- Card: `bg-[#111827] p-6 rounded-xl border border-slate-800`
- Title: `text-[12px] font-bold text-slate-400 uppercase tracking-widest`
- Value: `text-[28px] font-bold text-white`
- Progress Bar: `h-1.5 bg-slate-800 rounded-full` with colored fill
- Icons: Lucide icons in colored badge (`bg-blue-500/10 text-blue-500`)

### Search & Filters
- Search: Live filtering with `onChange` handler, no submit button
- Dropdowns: Styled select elements with consistent border/background
- Layout: Flex container with search taking flex-1, filters in gap-3

### Header Design
- Height: `h-20` sticky header with `z-40`
- Search: Full-width input with icon (opportunities) or max-w-xl (quotations)
- Profile: Avatar circle with initials, name, and role
- Border: Bottom border with `border-slate-200 dark:border-slate-800`

---

## Testing Checklist

### Opportunities Page
- [x] Verify KPIs calculate correctly from real data
- [x] Test search functionality across customer names
- [x] Validate pagination works (20 per page)
- [ ] Check won opportunities grid displays correctly
- [ ] Test responsive design on mobile/tablet
- [ ] Verify dark mode styling
- [ ] Test navigation to opportunity detail pages
- [ ] Validate amount formatting (₹ symbol, K/M suffix)

### Quotations Page
- [x] Verify KPIs calculate correctly from real data
- [x] Test search functionality across quotation ID and customer
- [x] Validate pagination works (5 per page)
- [x] Test status filtering (Draft, Open, Cancelled)
- [ ] Check AI insights display correctly
- [ ] Test responsive design on mobile/tablet
- [ ] Verify dark mode styling
- [ ] Test navigation to quotation detail pages
- [ ] Validate amount formatting (₹ symbol, L suffix for lakhs)
- [ ] Check days remaining calculation for valid_till dates

---

## Migration Notes

### Breaking Changes
- **Opportunities**: Removed OpportunitiesView and opportunities-list components
- **Quotations**: Removed QuotationsView component and proposalOpportunities data fetching

### Rollback Plan
If new implementation has issues:

**Opportunities:**
1. Revert `app/(main)/crm/opportunities/page.tsx` to previous version
2. Remove `components/crm/opportunities-client.tsx`
3. Restore OpportunitiesView component

**Quotations:**
1. Revert `app/(main)/crm/quotations/page.tsx` to previous version
2. Remove `components/crm/quotations-client.tsx`
3. Restore QuotationsView component
4. Restore opportunities fetching and proposal filtering

### Performance Considerations
- **Client-Side Filtering**: May be slow with 1000+ items
  - Consider pagination on server with URL query params
  - Or use virtualized lists for large datasets
- **KPI Calculations**: Runs on every render
  - Consider useMemo() for expensive calculations
  - Or pre-calculate on server and pass as props

---

## Sales Orders Page

### Overview
Converted HTML-based sales orders workspace to Next.js TSX implementation with full integration to existing ERPNext backend data and AI-driven insights display.

### Files Created

#### New Components
- **`components/sales-orders/sales-orders-client.tsx`** (570+ lines)
  - Full client-side implementation of sales orders workspace
  - Features: KPI cards, dual tabs (All Sales Orders/Ready for Sales Order), table view with AI columns, search/filter UI, pagination (10 per page)
  - Uses React hooks for state management (useState)
  - Fully responsive with Tailwind CSS styling matching original HTML design
  - AI Fulfillment Risk column with color-coded status indicators
  - AI Insight badges with contextual recommendations

### Files Modified

#### Updated Pages
- **`app/(main)/sales-orders/page.tsx`**
  - **Before**: Complex component using shadcn UI components (Card, Button, Badge, AnimatedCard, Tabs), inline rendering with DeliveryStatusBadge and DeliveryUpdateCard
  - **After**: Simple server wrapper that fetches data and delegates rendering to SalesOrdersClient
  - **Removed**: All UI imports (Card, Button, Badge, Tabs, AnimatedCard, DeliveryStatusBadge, DeliveryUpdateCard)
  - **Removed**: 260+ lines of inline rendering code
  - **Simplified**: Now only calls server actions and passes data to client component (17 lines total)

### Files Deprecated (NOT Removed - Still in Use)
The following components are still used elsewhere in the application and should NOT be removed:
- **`components/sales-orders/delivery-status-badge.tsx`** - Used in individual sales order detail pages
- **`components/sales-orders/delivery-update-card.tsx`** - Used in individual sales order detail pages
- **`components/sales-orders/sales-order-actions.tsx`** - Used in individual sales order detail pages
- **`components/sales-orders/delete-sales-order-button.tsx`** - Used in individual sales order detail pages
- **`components/sales-orders/delivery-status-filter.tsx`** - Used in individual sales order detail pages
- **`components/sales-orders/sales-order-form.tsx`** - Used in sales order creation/edit pages

### Key Features Implemented

#### ✅ Completed Features
- **KPI Cards**: Draft, Confirmed, In Progress, Total Value (exact HTML sizing: h-36, text-[28px], text-[12px] headers)
- **Dual Tab System**: 
  - All Sales Orders tab with table view
  - Ready for Sales Order tab showing submitted quotations
- **Sales Orders Table**: Full listing with columns:
  - Order ID (clickable link to detail page)
  - Customer (name from customer_name or customer field)
  - Order Date (formatted as "Dec 29, 2025")
  - Items (count from total_qty field)
  - Amount (formatted with INR currency symbol)
  - AI Fulfillment Risk (color-coded: On Time/In Progress/Delayed with glowing dot)
  - AI Insight (badge with icon: Ready to Bill/Expedite Shipping/On Track)
  - Status (delivery_status or status field with color-coded badge)
  - Actions (View button + Update button with truck icon)
- **Pagination**: 10 orders per page with Previous/Next controls and showing X of Y entries
- **Search**: Live search across order ID, customer name
- **Filter Button**: UI button ready for filter panel implementation
- **Ready for Sales Order Tab**:
  - Shows submitted quotations not yet converted to sales orders
  - Green highlighted cards with customer, valid till date, value
  - Create Sales Order button linking to `/sales-orders/new?quotation=${quotation.name}`
  - View Quotation button linking to quotation detail page
  - Empty state with "Go to Quotations" CTA when no ready quotations
- **Responsive Design**: Mobile-first Tailwind CSS classes
- **Dark Mode Support**: Tailwind dark: variants throughout
- **Header**: AI search bar with Sparkles icon and "New Sales Order" button (AVARIQ logo removed per requirements)

#### ⚠️ Partially Implemented Features
- **AI Fulfillment Risk Logic**: Currently using mock logic based on per_delivered percentage
  - Shows "On Time" if per_delivered === 100
  - Shows "In Progress" if per_delivered > 0
  - Shows "Delayed" otherwise
  - TODO: Connect to actual AI risk assessment service
  - TODO: Consider delivery_date vs current date for more accurate risk calculation

- **AI Insight Logic**: Currently using mock logic based on order status
  - Shows "Ready to Bill" if per_delivered === 100 and per_billed !== 100
  - Shows "Expedite Shipping" for Draft orders
  - Shows "On Track" otherwise
  - TODO: Connect to actual AI service for real insights
  - TODO: Consider more factors: delivery_date proximity, inventory levels, customer history

- **Filter Functionality**: Filter button exists but doesn't open filter panel
  - TODO: Create filter panel with options for:
    - Status filtering (Draft, Confirmed, In Progress, Fully Delivered)
    - Date range filtering
    - Amount range filtering
    - Customer filtering

- **Update Button**: Exists but not wired to delivery update functionality
  - Original implementation used DeliveryUpdateCard component
  - TODO: Wire to delivery status update modal/dialog
  - TODO: Integrate with existing updateSalesOrder action

#### ❌ Missing from Original HTML
- **Notifications Bell**: Not implemented (would require notification system)
- **Dark Mode Toggle**: Not implemented in header (handled by app-level theme toggle)
- **User Avatar with Real Initials**: Shows "JD" as static, not connected to real user data
- **AI Search Functionality**: Input exists but not connected to AI service
- **More Filters**: Advanced filtering options not implemented

### Data Integration

#### Backend Actions Used
- `getSalesOrders()`: Primary data source from `app/actions/sales-orders.ts`
  - Returns: Array of SalesOrder objects
  - Fields: name, customer, customer_name, status, delivery_status, transaction_date, delivery_date, grand_total, currency, total_qty, per_delivered, per_billed
- `getSalesOrderStats()`: Stats calculation from `app/actions/sales-orders.ts`
  - Returns: Object with draft, confirmed, inProgress, totalValue counts
- `getQuotations()`: For "Ready for Sales Order" tab from `app/actions/quotations.ts`
  - Filtered to show: docstatus === 1 && status !== 'Ordered'

#### Data Flow
1. **Server Component** (`app/(main)/sales-orders/page.tsx`):
   - Calls `getSalesOrders()`, `getSalesOrderStats()`, `getQuotations()` in parallel
   - Filters quotations for ready state
   - Passes all data to SalesOrdersClient component
   - No data transformation on server

2. **Client Component** (`components/sales-orders/sales-orders-client.tsx`):
   - Receives orders, stats, readyQuotations as props
   - Manages search query and pagination state
   - Filters orders based on search query
   - Calculates AI risk and insights per order
   - Renders appropriate tab content based on activeTab state

### Status & Workflow Integration

#### Sales Order Statuses Supported
- **Draft**: New orders not yet submitted
- **To Deliver and Bill**: Confirmed orders awaiting delivery and billing
- **To Bill**: Delivered orders awaiting billing
- **To Deliver**: Billed orders awaiting delivery
- **Fully Delivered**: Completed deliveries
- **Completed**: Fully billed and delivered
- **Cancelled**: Cancelled orders
- **On Hold**: Paused orders

#### Quotation to Sales Order Flow
- Quotations with `docstatus === 1` (submitted) and `status !== 'Ordered'` appear in "Ready for Sales Order" tab
- "Create Sales Order" button links to `/sales-orders/new?quotation=${quotation.name}`
- This preserves existing workflow where sales order creation pulls quotation data

### Testing Checklist

#### Core Functionality
- [ ] KPI cards display correct counts from getSalesOrderStats()
- [ ] Sales orders table loads with real data from ERPNext
- [ ] Search filters orders correctly (by ID, customer name)
- [ ] Pagination works correctly (10 per page)
- [ ] Previous/Next buttons disable appropriately
- [ ] Order ID links navigate to detail page
- [ ] View button navigates to detail page
- [ ] Tab switching works (All Sales Orders ↔ Ready for Sales Order)
- [ ] Ready for Sales Order tab shows submitted quotations
- [ ] Create Sales Order button works with quotation parameter
- [ ] Empty state shows when no ready quotations exist
- [ ] Dark mode styling works correctly

#### AI Features
- [ ] AI Fulfillment Risk shows appropriate color (emerald/blue/red)
- [ ] AI Insight badges display with correct icon
- [ ] Risk glowing dots render correctly
- [ ] Insights update when connected to real AI service

#### Edge Cases
- [ ] Empty search results display properly
- [ ] Orders without customer_name fall back to customer field
- [ ] Orders without delivery_date show "-"
- [ ] Zero total_qty displays as "0 items"
- [ ] Large amounts format correctly with locale

### Known Issues & TODOs

#### High Priority
- **AI Service Integration**: Mock logic needs replacement with real AI service
  - Risk assessment should consider delivery dates, inventory, patterns
  - Insights should provide actionable recommendations
- **Update Button Functionality**: Wire to delivery status update functionality
  - Reuse existing updateSalesOrder action
  - Consider modal/dialog for status update
- **Filter Panel**: Implement full filter functionality
  - Status filters
  - Date range filters
  - Amount range filters

#### Medium Priority
- **User Avatar**: Connect to real user data (current user from auth)
- **AI Search**: Wire search input to AI service for natural language queries
- **Notifications**: Implement notification system if required

#### Low Priority
- **Export**: Add CSV/Excel export for sales orders table
- **Bulk Actions**: Select multiple orders for bulk updates
- **Column Sorting**: Add sorting by date, amount, status
- **Column Customization**: Allow users to show/hide columns

### Design System Consistency

#### Component Sizing (Matching Other Pages)
- **KPI Cards**: `p-6`, `h-36`, `text-[28px]` for values, `text-[12px]` for headers
- **Table Headers**: `text-[12px]`, `font-bold`, `uppercase`, `tracking-wider`
- **Table Cells**: `text-[16px]` for content, `px-8 py-6` padding
- **Status Badges**: `text-[10px]`, `font-bold`, `uppercase`, `px-3 py-1`
- **Buttons**: `px-4 py-2` for table actions, `px-6 py-2.5` for header actions

#### Color Palette (Dark Mode)
- **Cards**: `bg-card-dark` (#111827), `border-slate-800`
- **Headers**: `text-[12px]`, `text-slate-400`
- **Values**: `text-[28px]`, `text-white`
- **Icons**: Status-specific colors (emerald-500, blue-500, red-500, purple-500)

### Integration with Existing Systems

#### Preserved Functionality
- **Sales Order Detail Pages**: Still use individual components (DeliveryStatusBadge, DeliveryUpdateCard, SalesOrderActions)
- **Sales Order Creation**: `/sales-orders/new` page unchanged, accepts quotation parameter
- **Server Actions**: All existing actions (getSalesOrders, getSalesOrderStats, updateSalesOrder) remain functional
- **Print Views**: Print templates for sales orders unaffected
- **Invoice Creation**: Sales Order → Invoice workflow preserved

#### Navigation Flow
- **From CRM Quotations** → Ready for Sales Order tab → Create Sales Order
- **From Sales Orders Table** → View button → Sales Order detail page
- **From Header** → New Sales Order button → Sales order creation form
- **From Ready Tab** → View Quotation → Quotation detail page

### Next Steps

- **Next Action**: "User testing of sales orders page to verify data accuracy and AI features"

---

## Questions for Product Team
1. Should we implement Kanban view for opportunities as priority?
2. What AI service should we connect for real insights?
3. Should quotation items be fetched separately or included in list?
4. Is there a real-time sync requirement or is periodic refresh OK?
5. What permissions/roles should control quotation creation/editing?
6. Should we add email/print functionality for quotations?

---

## Technical Debt
- Reduce component sizes (split into smaller sub-components)
- Extract table/card components for reusability
- Add proper TypeScript types for all component props
- Add error boundaries for graceful error handling
- Implement loading states for async operations
- Add unit tests for filter/pagination logic
- Consider React Query for data fetching and caching

