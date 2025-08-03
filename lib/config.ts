// Configuration file untuk mengatasi masalah .env.local yang terblokir
export const config = {
  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bbuxfnchflhtulainndm.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDYzMjYsImV4cCI6MjA2OTQyMjMyNn0.AF6IiaeGB9-8FYZNKQsbnl5yZmSjBMj7Ag4eUunEbtc'
  },
  
  // App Configuration
  app: {
    name: 'NEXMAX Dashboard',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  
  // Database Tables
  tables: {
    memberReportMonthly: 'member_report_monthly',
    users: 'users',
    transactions: 'transactions'
  }
}

// Helper function untuk mendapatkan konfigurasi
export const getConfig = () => {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (envUrl && envKey) {
    console.log('✅ Using environment variables for Supabase config')
    return {
      url: envUrl,
      key: envKey
    }
  }
  
  console.log('⚠️ Using fallback Supabase config (env vars not available)')
  return {
    url: config.supabase.url,
    key: config.supabase.anonKey
  }
} 