# Unicorn Studio Integration Guide

This guide shows how to integrate the Unicorn Studio WebGL animated background into your Next.js application.

## Files Created

1. **`components/unicorn-background.tsx`** - Main reusable component
2. **`types/unicorn-studio.d.ts`** - TypeScript type definitions

## Usage Examples

### Example 1: Global Background (Layout)

Add the background to your root layout so it appears on all pages:

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { Providers } from "@/components/providers";
import { FloatingAIChat } from "@/components/ai/floating-chat";
import { UnicornBackground } from "@/components/unicorn-background";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "nexuserp",
  description: "The modern operating system for your business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Unicorn Studio Background - sits behind all content */}
        <UnicornBackground projectId="bmaMERjX2VZDtPrh4Zwx" />
        
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <Providers>
            <ToastProvider>
              {children}
            </ToastProvider>
            <FloatingAIChat />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Example 2: Page-Specific Background

Use the component on a specific page only:

```tsx
// app/page.tsx
import { UnicornBackground } from "@/components/unicorn-background";

export default function HomePage() {
  return (
    <>
      <UnicornBackground projectId="bmaMERjX2VZDtPrh4Zwx" />
      
      <div className="relative z-10">
        {/* Your page content here */}
      </div>
    </>
  );
}
```

### Example 3: With Custom Styling

Apply additional CSS classes:

```tsx
<UnicornBackground 
  projectId="bmaMERjX2VZDtPrh4Zwx"
  className="opacity-80 blur-sm"
/>
```

## Component Features

✅ **Script Deduplication** - Prevents loading the script multiple times
✅ **Memory Leak Prevention** - Properly cleans up when component unmounts
✅ **TypeScript Support** - Full type safety with global declarations
✅ **Error Handling** - Graceful fallback if script fails to load
✅ **SSR Safe** - Works perfectly with Next.js App Router
✅ **Performance Optimized** - Uses requestAnimationFrame for initialization
✅ **Responsive** - Full-screen fixed positioning
✅ **Z-Index Management** - Sits behind all content with proper layering

## How It Works

1. **Client-Only Execution** - Uses `"use client"` directive to run only in the browser
2. **Script Loading** - Dynamically inserts the Unicorn Studio script from CDN
3. **Duplicate Prevention** - Checks if script is already loaded via `window.US_SCRIPT_LOADED`
4. **Safe Initialization** - Uses `requestAnimationFrame` to wait for the library to become available
5. **Cleanup** - Removes script on unmount to prevent memory leaks

## TypeScript Types

The component includes full TypeScript support with global declarations for the Unicorn Studio library:

```typescript
interface UnicornStudioInstance {
  init?: (config?: UnicornStudioConfig) => void;
  destroy?: () => void;
  render?: () => void;
}

declare global {
  interface Window {
    unicornStudio?: UnicornStudioInstance;
    US_SCRIPT_LOADED?: boolean;
  }
}
```

## Configuration

### Change Project ID

Simply update the `projectId` prop:

```tsx
<UnicornBackground projectId="YOUR_PROJECT_ID_HERE" />
```

### Adjust Mask Gradient

The component includes a mask gradient that fades the background:

```
linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)
```

To modify this, edit the `style` object in the component's return statement.

## Browser Compatibility

The component uses standard Web APIs and is compatible with:
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Troubleshooting

### Background Not Showing

1. Check that `projectId` is correct
2. Ensure the CDN URL is accessible
3. Check browser console for errors
4. Verify z-index is negative (should be -z-10)

### Script Load Errors

If the script fails to load:
- Check your internet connection
- Verify the CDN URL is correct
- Check browser console for CORS errors

### Performance Issues

If the animation is laggy:
- Reduce opacity with `className="opacity-50"`
- Add blur effect with `className="blur-md"`
- Consider disabling on mobile devices

## Advanced: Conditional Loading

You can conditionally load the background based on environment or device:

```tsx
import { UnicornBackground } from "@/components/unicorn-background";

export default function Layout({ children }) {
  const isProduction = process.env.NODE_ENV === "production";
  
  return (
    <>
      {isProduction && <UnicornBackground projectId="bmaMERjX2VZDtPrh4Zwx" />}
      {/* Rest of layout */}
    </>
  );
}
```

## Notes

- The component is fully production-ready and optimized
- It handles all edge cases (script loading, cleanup, SSR safety)
- No additional dependencies required beyond React 18+
- Works seamlessly with Next.js App Router
- Proper memory management prevents leaks
