# Bookings Page - Implementation Notes

## Removed/Deprecated Components

* `CreateBookingDialog` component import - replaced with simple button
* Extra z-index and positioning overrides from previous fixes
* Complex booking code splitting logic - reverted to simple display
* Accessibility attributes (aria-label, sr-only) - matched HTML exactly

## Features Present in HTML but Missing or Simplified in TSX

* Profile image in header - HTML shows an actual image URL, TSX uses icon
* Calendar grid uses custom `calendar-grid` CSS class (defined in HTML `<style>`)
* Sentiment badges use dynamic color classes that may not work with Tailwind's JIT
* No actual navigation/functionality wired to "New Booking" button

## Features Present in TSX but Not in HTML

* Real data integration (bookings from props)
* KPI calculations (totalBookings, activeRentals, revenueMTD, aiOccupancyForecast)
* Status filter functionality
* Month navigation (prev/next/today)
* Dynamic calendar rendering with booking data
* Sentiment calculation based on booking total
* Link navigation to individual booking pages

## Assumptions Made

* `calendar-grid` class exists in global CSS (from HTML example)
* Material Icons and Material Symbols fonts are loaded globally
* `navy-900` Tailwind color is defined in tailwind config
* Sentiment color classes (bg-emerald-50, etc.) work with dynamic values
* No backend mutation functions needed for UI-only elements

## Known Gaps / TODOs

* [ ] "New Booking" button should navigate or open dialog - currently non-functional
* [ ] Profile image needs actual user data/image URL
* [ ] Sentiment badges may not render correctly with dynamic Tailwind classes
* [ ] "View Mitigation Plan" button has no action
* [ ] "Edit" buttons in booking cards have no functionality
* [ ] More options menu (three dots) has no dropdown
* [ ] Calendar date cells need hover/click interactions
* [ ] Status filter should support all booking statuses (currently limited)
* [ ] Calendar legend colors should match actual booking statuses dynamically

## CSS Dependencies

The page expects these custom CSS rules (from HTML example):

```css
.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
}
.calendar-cell {
    min-height: 120px;
}
```

These should be added to `app/globals.css` if not already present.
