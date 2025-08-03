/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // PERFORMANCE OPTIMIZATIONS for smooth navigation - Simplified for Vercel compatibility
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  
  // Faster builds and better caching
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Enhanced prefetching - Simplified for Vercel
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
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
    ],
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
  },
  
  env: {
    SUPABASE_URL: 'https://bbuxfnchflhtulainndm.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDYzMjYsImV4cCI6MjA2OTQyMjMyNn0.AF6IiaeGB9-8FYZNKQsbnl5yZmSjBMj7Ag4eUunEbtc',
  },
}

module.exports = nextConfig 