# PRICING_RULES_IMPLEMENTATION_NOTES.md

## Migration Summary
HTML Pricing Rules page converted to TSX client component, fully wired to real data from Frappe ERPNext backend.

---

## Old Implementation Files Removed/Deprecated

- Old pricing rules page implementation (app/(main)/pricing-rules/page.tsx) completely replaced
- Removed imports: Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge, Input, Select components
- Removed Lucide icons: Plus, Search, Settings, TrendingUp, AlertCircle, CheckCircle2, Clock (replaced with Material Symbols)
- Removed gradient background wrapper and shadcn/ui component dependencies

---

## Features Present in Old Implementation But Missing in New TSX Version

- shadcn/ui Card, Button, Badge, Input, Select components (replaced with custom HTML matching design)
- Gradient background effect (from-slate-50 to-slate-100) replaced with flat background-light
- FilterRules Card section wrapper (simplified to inline search/filter bar)
- Business Type filter functionality (UI present but filter logic not yet wired)

---

## Features Present in New Implementation But Not Yet Wired to Real Data

- **Business Type filter dropdown**: UI present but no filter logic applied (hardcoded options: "B2B Enterprise", "SMB Retail")
- **User avatar and name**: Hardcoded "Alex Thompson" / "AT" from original HTML
- **Notification badge**: Display only, not functional
- **Keyboard shortcut indicator (⌘ K)**: Display only in search bar, not functional
- **Dark mode toggle button**: Not present in new implementation (removed from HTML)

---

## Assumptions Made During Conversion

1. PricingRule data structure matches actions/pricing-rules.ts interface
2. `disable` field meanings: 0 = Active, 1 = Inactive
3. Material Symbols icons are available globally (via HTML link in layout)
4. Dark mode classes follow existing Tailwind dark: pattern
5. Business Type filter is cosmetic for now (no real data mapping)
6. All currency values use INR (₹ symbol)
7. Status filter options: "All Status", "Active", "Inactive"
8. Toggle status mutation is handled via passed onToggleStatus prop

---

## Known Gaps and TODOs

- [ ] Wire Business Type filter to actual rule categorization or metadata
- [ ] Replace hardcoded user info (Alex Thompson) with actual auth context
- [ ] Add keyboard shortcut handler for search field
- [ ] Wire notification icon to actual notification system
- [ ] Add loading skeleton/states for better UX during data fetch
- [ ] Add error boundaries and error handling UI
- [ ] Add sorting functionality for rules list (by date, priority, status)
- [ ] Add bulk actions (enable/disable multiple rules)
- [ ] Add export functionality for rules list
- [ ] Link to individual rule detail/edit pages (already implemented via Edit button)
- [ ] Add confirmation dialog for enable/disable actions
- [ ] Add toast/snackbar notifications for success/error states
- [ ] Add empty state animation or illustration
- [ ] Consider pagination if rules list grows large (currently showing all)

---

## Data Integration Status

✅ **Fully Wired:**
- Pricing rules list from getPricingRules()
- Active rules count
- Discount rules count
- Total rules count
- Search by rule name/title
- Status filter (All/Active/Inactive)
- Rule details display: title, apply_on, discount, rate, customer_group, territory, min_qty, dates
- Enable/Disable toggle functionality
- Navigation to edit pages
- Loading state handling
- Empty state handling

❌ **Not Wired:**
- Business Type filter logic
- Real-time updates/polling
- Bulk operations
- Rule priority ordering/sorting
- Advanced filtering (by date range, discount range, etc.)
- Rule duplication/cloning
- Rule templates or presets

---

## UI/UX Notes

- Design matches provided HTML exactly (dark card backgrounds, Material icons, specific spacing)
- Responsive breakpoints preserved from original HTML
- Hover states and transitions implemented as per design
- Empty state with icon and CTA button
- Compact filter bar with inline search and selects
- Rule cards show all metadata in organized layout
- Status badges use color coding (green = active, gray = inactive)
- Edit and Enable/Disable buttons aligned to right on desktop, stacked on mobile

---

## Testing Recommendations

1. Test with 0 rules (empty state)
2. Test with only active rules
3. Test with only inactive rules
4. Test search with special characters
5. Test enable/disable toggle
6. Test dark mode toggle
7. Test responsive layout on mobile/tablet
8. Verify navigation to edit pages
9. Verify Material Symbols icons load correctly
10. Test with rules having various metadata combinations (dates, territories, etc.)
