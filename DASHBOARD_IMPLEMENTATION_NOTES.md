# Dashboard Implementation Notes

## Migration Summary
Converted HTML dashboard design to Next.js TSX for `app/(main)/dashboard/page.tsx`.

## Files Modified
- **app/(main)/dashboard/page.tsx** - Complete rewrite from shadcn/ui Card-based layout to custom Tailwind HTML-inspired design

## Components/UI Removed
- `@/components/ui/card` (Card, CardContent, CardHeader, CardTitle)
- `@/components/ui/badge` (Badge)
- All Lucide icons (TrendingUp, Zap, BarChart3, Users, Search, Bell, Lightbulb, Mail, Calendar, CheckCircle, UserPlus, MessageSquare, AlertTriangle, Activity)
- shadcn/ui styling and component patterns

## Components/UI Added
- Material Symbols Outlined icons throughout
- Custom Tailwind-only layout with `bg-[#111827]` KPI cards matching design system
- Donut chart visualization using CSS `conic-gradient`
- Direct DOM elements instead of abstracted Card components

## Data Integration (Preserved)
- ✅ `getDashboardStats()` - Win rate, pipeline value, revenue MTD, active leads
- ✅ `getOpportunities()` - High-probability opportunities table
- ✅ `getRecentActivities()` - Team performance section
- ✅ `getAtRiskDeals()` - AI Insights "Deal at Risk" banner
- ✅ `getLeadsBySource()` - Lead source donut chart data
- ✅ `formatIndianCurrency()` - Currency formatting

## Features Preserved
- ✅ Real-time dashboard data loading with loading state
- ✅ High-probability opportunities filtering (>= 70% confidence)
- ✅ Sales funnel calculation by ERPNext sales stages
- ✅ Lead source distribution visualization
- ✅ Team activity feed with action types
- ✅ At-risk deal detection and display
- ✅ Click-through navigation to opportunity details
- ✅ Responsive grid layouts for all screen sizes

## Features Modified
- **KPI Cards**: Changed from individual Card components to unified `bg-[#111827]` dark cards with consistent styling across all pages
- **Header**: Simplified search bar, removed complex state, added Material Symbols icons
- **Sales Funnel**: Changed from percentage-based to deal count-based bars with gradient colors
- **Lead Source Chart**: Implemented pure CSS donut chart instead of Chart.js or similar library
- **AI Insights**: Enhanced visual design with larger CTA button and better contrast
- **Team Performance**: Grid layout with icon badges instead of list layout

## Features Not Implemented from HTML (Mock Data)
- **Pipeline Value Progress Bar**: HTML showed 65% progress toward $20M target - currently calculated but target is hardcoded
- **Revenue MTD Dots Animation**: HTML showed 4 dots with animation - preserved in new implementation
- **AI Confidence Badge**: HTML showed "AI Confidence High" badge - preserved for active leads KPI
- **Footer Links**: HTML showed "API Documentation", "Technical Support", "Security Policy" - added as static links (not functional)
- **User Profile**: HTML showed static "Adrian Chen" user - should be replaced with actual logged-in user data
- **Search Functionality**: Search bar is present but not yet wired to actual search/filter logic

## Features Present in Old Implementation But Not in HTML Template
- **Detailed Loading State**: Old implementation had comprehensive error handling - preserved
- **Dynamic Sales Funnel Mapping**: Old implementation mapped ERPNext stages to funnel stages - preserved and enhanced
- **Win Rate Change Calculation**: Old implementation calculated month-over-month change - preserved
- **Leads Change Percentage**: Old implementation tracked lead growth - data available but not prominently displayed in new UI

## Known Gaps/TODOs
- [ ] Wire search bar to actual filter/search functionality
- [ ] Replace hardcoded "Adrian Chen" with actual user profile data from authentication
- [ ] Make footer links functional (currently static)
- [ ] Consider adding export/download functionality for dashboard data
- [ ] Add date range selector for dashboard metrics
- [ ] Implement drill-down interactions for funnel stages
- [ ] Add hover tooltips for KPI cards showing trend details
- [ ] Consider adding refresh button or auto-refresh functionality
- [ ] Optimize donut chart SVG for better browser compatibility
- [ ] Add loading skeletons for individual sections instead of full-page loader

## Assumptions Made
- Currency display uses Indian Rupees (formatIndianCurrency) - HTML showed $ but codebase uses ₹
- Win rate calculation based on Converted vs Lost opportunities in current month
- High-probability threshold set at 70% (filtered opportunities)
- Team activity shows most recent 4 items
- Lead source percentages default to 65% direct / 20% referral when no data available
- Sales funnel stages mapped: Discovery (Prospecting/Lead), Proposal (Qualification/Proposal/Price Quote), Negotiation (Negotiation/Review)
- At-risk deals defined by days_since_activity threshold (from backend logic)

## Design System Alignment
- ✅ KPI cards match `bg-[#111827]` standard used across Inspections, Operators, Team, Agents, Settings pages
- ✅ Header height standardized at `h-16`
- ✅ Border colors use `border-slate-800` in dark mode
- ✅ Shadow styling uses `shadow-xl` for elevated cards
- ✅ Typography follows consistent `text-[12px]` for labels, `text-[32px]` for KPI values
- ✅ Material Symbols icons used exclusively (no Lucide icons)
- ✅ Dark mode support with `dark:` prefixes throughout

## Breaking Changes
- **Component API**: Completely different component structure - not compatible with old dashboard code
- **Props/State**: Different state management approach - removed intermediate abstractions
- **Styling**: Complete departure from shadcn/ui theme - now uses raw Tailwind classes
- **Icons**: All Lucide icons replaced with Material Symbols - icon names are different
- **Grid System**: Different responsive breakpoints and column counts

## Migration Path for Dependent Code
If any other pages import or reference the old dashboard:
1. Update imports to remove shadcn/ui Card and Badge references
2. Replace Lucide icons with Material Symbols equivalents
3. Adapt any dashboard-specific utility functions (getStageColor, getConfidenceColor, etc.)
4. Test responsive layouts across all breakpoints
5. Verify dark mode styling is consistent

## Performance Considerations
- New implementation uses fewer component layers (no Card abstractions)
- CSS-only donut chart avoids JavaScript charting library overhead
- Material Symbols icons loaded once via CDN (ensure included in layout)
- Single useEffect for data loading reduces re-render complexity
- Inline styles used sparingly only for dynamic width calculations

## Accessibility Notes
- Search input has proper placeholder text
- All interactive elements have hover states
- Color contrast verified for dark mode text on dark backgrounds
- Icon-only buttons may need aria-labels (TODO)
- Table headers use semantic `<thead>` and `<th>` tags
- Loading state provides user feedback

## Testing Recommendations
1. Test with empty data arrays (no opportunities, activities, leads)
2. Verify currency formatting with various amounts (lakhs, crores)
3. Test responsive layouts at 640px, 768px, 1024px, 1280px breakpoints
4. Verify dark mode styling in all sections
5. Test click-through navigation to opportunity details
6. Verify loading state behavior and timing
7. Test with long company names and text truncation
8. Verify donut chart rendering in different browsers
9. Test with very high/low percentages in funnel and confidence bars
10. Validate that at-risk deal banner shows/hides correctly based on data
