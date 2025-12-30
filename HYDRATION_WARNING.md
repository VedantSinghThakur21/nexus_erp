# Browser Extension Hydration Warning

## Issue
If you see hydration warnings in the console mentioning `bis_skin_checked="1"` attributes, this is caused by a browser extension (commonly Bitdefender Safepay, Avast, or similar security software) that modifies the DOM.

## Solution Options

### Option 1: Disable the extension (Recommended for Development)
1. Open your browser's extension settings
2. Temporarily disable security extensions like:
   - Bitdefender Safepay
   - Avast Online Security
   - AVG SafePrice
   - Similar anti-tracking/security extensions

### Option 2: Use a Different Browser for Development
Use a clean browser profile without extensions installed for development work.

### Option 3: Ignore the Warning (Not Recommended)
The warning doesn't break functionality but can clutter your console and hide real issues.

## Why This Happens
These security extensions inject attributes into HTML elements to track which elements they've processed. React detects this mismatch between server-rendered HTML and client-side HTML, causing hydration warnings.

## Note
This is not an issue with your code - it's a known incompatibility between React's hydration process and certain browser extensions.
