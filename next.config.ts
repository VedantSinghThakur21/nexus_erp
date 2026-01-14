import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Increase timeout for server actions (provisioning takes ~3 minutes)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      // CRITICAL: Provisioning takes 2-5 minutes, needs extended timeout
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000'],
    },
  },
  
  // Note: For deployment timeout configuration (long-running operations):
  // - Vercel: Add maxDuration to vercel.json
  // - Self-hosted: PM2 handles this via ecosystem.config.js
  
  // Security headers for production
  async headers() {
    return [
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
          }
        ]
      }
    ]
  }
};

export default nextConfig;
