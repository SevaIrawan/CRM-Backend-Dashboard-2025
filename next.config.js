/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,  // ✅ DISABLE to prevent double render flicker
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
            value: 'public, max-age=0, must-revalidate'
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
  
  // Environment variables now loaded from .env.local (not committed to Git)
  // env: {} removed for security - use NEXT_PUBLIC_ prefix in .env.local
}

module.exports = nextConfig 