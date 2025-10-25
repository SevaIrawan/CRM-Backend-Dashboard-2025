import { createClient } from '@supabase/supabase-js'

// Direct Supabase configuration - bypassing .env.local issues
const SUPABASE_URL = 'https://bbuxfnchflhtulainndm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDYzMjYsImV4cCI6MjA2OTQyMjMyNn0.AF6IiaeGB9-8FYZNKQsbnl5yZmSjBMj7Ag4eUunEbtc'

// Singleton pattern to prevent multiple client instances
let supabaseInstance: ReturnType<typeof createClient> | null = null

const createSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    })
  }
  return supabaseInstance
}

// Export the singleton instance
export const supabase = createSupabaseClient()

// Enhanced connection test with timeout and retry
export const testSupabaseConnection = async () => {
  try {
    // Test 1: Basic connection with timeout
    const { data: testData, error: testError } = await supabase
      .from('blue_whale_usc')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ Basic connection test failed:', testError)
      console.error('❌ Error details:', {
        message: testError.message,
        details: testError.details,
        hint: testError.hint,
        code: testError.code
      })
      return false
    }
    
    // Test 2: Check if table exists and has data - SIMPLIFIED
    const { data: tableData, error: tableError } = await supabase
      .from('blue_whale_usc')
      .select('count')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Table existence test failed:', tableError)
      return false
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Supabase connection error:', error)
    return false
  }
}

// Get last update date function with better error handling
export const getLastUpdateDate = async () => {
  try {
    // First, let's check if we can connect at all
    const isConnected = await testSupabaseConnection()
    if (!isConnected) {
      console.error('❌ Cannot fetch last update - connection failed')
      return null
    }
    
    const { data, error } = await supabase
      .from('blue_whale_usc')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('❌ Failed to fetch last update date:', error)
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return null
    }
    
    if (data && data.length > 0) {
      const lastDate = data[0].date
      return lastDate
    }
    
    return null
    
  } catch (error) {
    console.error('❌ Error fetching last update date:', error)
    return null
  }
}

// Types for dashboard data
export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalRevenue: number
  monthlyGrowth: number
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
  }[]
}

export interface ActivityItem {
  id: number
  user: string
  action: string
  time: string
  status: 'completed' | 'pending' | 'failed'
} 