import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: (process.env.ALLOWED_ORIGINS || 'localhost:3000').split(','),
    },
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', 'framer-motion'],
  },

  /**
   * Webpack perf budgets removed for Next.js 16 default Turbopack builds.
   * Use Lighthouse CI thresholds (see PERFORMANCE_AUDIT.md) or `next build --webpack`
   * with a migrated webpack.performance block when you ship webpack-only pipelines.
   */

  compress: true,

  // Security headers for production
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.avariq.in wss://*.avariq.in",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          }
        ]
      }
    ]
  }
};

export default nextConfig;
