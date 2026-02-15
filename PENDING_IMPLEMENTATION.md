# Nexus ERP - Pending Implementation & Future Enhancements

This document consolidates all known gaps, TODOs, and future enhancements from previous implementation notes as of February 2026.

## 🟢 Dashboard
- [ ] Wire search bar to actual filter/search functionality
- [ ] Replace hardcoded "Adrian Chen" with actual user profile data
- [ ] Make footer links functional (currently static)
- [ ] Add export/download functionality for dashboard data
- [ ] Add date range selector for dashboard metrics
- [ ] Implement drill-down interactions for funnel stages
- [ ] Add refresh button or auto-refresh functionality

## 📅 Bookings
- [ ] Wire AI search input (customer, PO, date)
- [ ] Implement real AI Occupancy Forecast calculation
- [ ] Calculate sentiment from real customer feedback
- [ ] Wire "View Mitigation Plan" button to AI insights
- [ ] Make AI alert banner dynamic
- [ ] Add calendar settings modal/panel
- [ ] Add edit booking dialog functionality
- [ ] Connect notifications to real notification system
- [ ] Show real-time "Live" indicator for active rentals
- [ ] Add export functionality (CSV, Excel, PDF)

## 📦 Catalogue
- [ ] **Connect AI service** - Wire AI Insight card to real predictions
- [ ] **Implement Book Now action** - Open CreateBookingDialog
- [ ] Add Material Symbols to app globally
- [ ] Implement price slider visual sync
- [ ] Add inventory status filters (In Stock, Low Stock)
- [ ] Pagination or infinite scroll for large catalogs
- [ ] Add sorting options (price, name, availability)

## 📋 Inspections
- [ ] Wire AI search to actual AI backend
- [ ] Implement "Import History" functionality
- [ ] Add real AI Risk Score calculation (ML integration)
- [ ] Populate Fleet Health Trend with actual metrics
- [ ] Add user profile section back to global header
- [ ] Add pagination for large inspection lists
- [ ] Export functionality for inspection reports

## 🧾 Invoices
- [ ] Wire up user profile data from auth context
- [ ] Implement dark mode toggle functionality
- [ ] Add download invoice handler (PDF)
- [ ] Implement filter modal (status, date, amount)
- [ ] Add AI chatbot functionality or remove button
- [ ] Calculate actual month-over-month growth
- [ ] Implement bulk actions

## 👥 Operators
- [ ] Wire AI search to actual AI backend
- [ ] Implement real AI Efficiency Score calculation
- [ ] Add GPS/location tracking for on-field operators
- [ ] Connect "Optimize crew assignment" to AI engine
- [ ] Implement advanced filters modal
- [ ] Create operator detail page
- [ ] **ERPNext**: Create custom fields for license tracking (`custom_license_number`, `custom_license_expiry`)

## 💳 Payments
- [ ] Wire Filter button to actual filter dialog
- [ ] Wire Export button to CSV/PDF
- [ ] Implement real AI fraud detection
- [ ] notification icon to actual system
- [ ] Add date range selector for "Settled" period
- [ ] Add ability to create new payment entries

## 🏷️ Pricing Rules
- [ ] Wire Business Type filter
- [ ] Add bulk actions (enable/disable multiple rules)
- [ ] Add export functionality
- [ ] Add rule duplication/cloning
- [ ] Add rule templates

## 🚀 Projects
- [ ] Wire search input
- [ ] Implement real notification system
- [ ] Add dropdown menu for "More options"
- [ ] Wire dark mode toggle to theme provider
- [ ] Refine AI Insight algorithms
- [ ] Add project health status to backend
- [ ] Wire AI Project Pulse intelligence banner

## 👥 Team
- [ ] Create `/team/invite` page or integrate InviteTeamMemberDialog
- [ ] Wire Edit Permissions button
- [ ] Implement pending invitations tracking
- [ ] Get team member limits from subscription data
- [ ] Add filter/sort functionality
- [ ] Implement real-time updates via websockets

## 🤖 Agents (AI Chat)
- [ ] **Real-time KPIs**: Connect to analytics backend
- [ ] **Context-aware Sidebar**: Show relevant module info
- [ ] **Voice Input**: Add microphone button
- [ ] **File Attachments**: Implement attach_file button
- [ ] **Conversation History**: Save/load previous chats
- [ ] **Export Chat**: Download as PDF/MD
- [ ] **KPI Accuracy**: Implement real performance tracking

## ➕ Add Operator (Specific)
- [ ] Add gender selector to form
- [ ] Implement skill certifications multi-select
- [ ] Add experience level selection
- [ ] Implement batch import
- [ ] Add operator photo/avatar upload

## General / System-Wide
- [ ] **User Context**: Replace all hardcoded user profiles with `useAuth` context
- [ ] **Dark Mode**: Ensure consistent ThemeProvider integration across all pages
- [ ] **Notifications**: Implement a real global notification system
- [ ] **AI Backend**: Connect all "AI Search" and "AI Insight" placeholders to the Python/Dify backend
- [ ] **Error Boundaries**: Add proper error handling UI for all client components
