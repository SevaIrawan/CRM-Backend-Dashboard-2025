'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'

interface TableInfo {
  name: string
  count: number
  status: 'loading' | 'success' | 'error'
  error?: string
}

interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

export default function ConnectionTest() {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [tables, setTables] = useState<TableInfo[]>([])
  const [lastUpdate, setLastUpdate] = useState<string>('Loading...')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [lastDataHash, setLastDataHash] = useState<string>('')

  // EXACT table list as requested - no more, no less
  const allTables = [
    { source: 'blue_whale_myr', title: 'Blue Whale MYR' },
    { source: 'blue_whale_usc', title: 'Blue Whale USC' },
    { source: 'blue_whale_sgd', title: 'Blue Whale SGD' },
    { source: 'blue_whale_myr_monthly_summary', title: 'Blue Whale MYR Monthly Summary' },
    { source: 'blue_whale_usc_monthly_summary', title: 'Blue Whale USC Monthly Summary' },
    { source: 'blue_whale_sgd_monthly_summary', title: 'Blue Whale SGD Monthly Summary' },
    { source: 'new_register', title: 'New Register' },
    { source: 'new_register_monthly_mv', title: 'New Register Monthly MV' },
    { source: 'overall_label_myr_mv', title: 'Overall Label MYR MV' },
    { source: 'dbmyr_summary', title: 'DB MYR Summary' },
    { source: 'dbusc_summary', title: 'DB USC Summary' },
    { source: 'dbsgd_summary', title: 'DB SGD Summary' },
    { source: 'page_visibility_config', title: 'Page Visibility Config' },
    { source: 'user_activity_logs', title: 'User Activity Logs' },
    { source: 'users', title: 'Users' }
  ]

  useEffect(() => {
    addLog('🚀 Connection Test Page Loaded', 'info')
    addLog('🔗 Testing Supabase connection...', 'info')
    addLog('📡 URL: https://bbuxfnchflhtulainndm.supabase.co', 'info')
    addLog('🔑 Key: Configured', 'info')
    fetchLastUpdate()
    testConnection()
    // Auto check for database changes every 30 seconds
    const interval = setInterval(checkForChanges, 30000)
    const lastUpdateInterval = setInterval(fetchLastUpdate, 30000)
    return () => {
      clearInterval(interval)
      clearInterval(lastUpdateInterval)
    }
  }, [])

  // Fetch Last Update with the same logic as sidebar
  const fetchLastUpdate = async () => {
    try {
      setIsLoading(true)
      console.log('🔧 Supabase Page - Fetching MAX(date) from blue_whale_myr...')
      
      // Mengambil MAX(date) dari kolom blue_whale_myr
      const { data, error } = await supabase
        .from('blue_whale_myr')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
      
      if (error) {
        console.error('❌ Supabase Page - Error fetching MAX(date):', error)
        setLastUpdate('Error')
        setIsLoading(false)
        return
      }

      if (data && data.length > 0) {
        const maxDate = data[0].date
        console.log('📅 Raw MAX(date) from database:', maxDate)
        
        // Handle different date formats
        let date: Date | null = null
        
        if (typeof maxDate === 'string') {
          // Try different date formats
          const formats = [
            // yyyy-mm-dd (ISO format)
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/, 
            // yyyy/mm/dd
            /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, 
            // dd/mm/yyyy
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, 
            // mm/dd/yyyy
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
          ]
          
          for (const format of formats) {
            const match = maxDate.match(format)
            if (match) {
              const [, first, second, third] = match
              
              // Determine format based on first number
              if (parseInt(first) > 31) {
                // yyyy-mm-dd or yyyy/mm/dd
                date = new Date(parseInt(first), parseInt(second) - 1, parseInt(third))
              } else if (parseInt(third) > 31) {
                // dd/mm/yyyy or mm/dd/yyyy - assume dd/mm/yyyy
                date = new Date(parseInt(third), parseInt(second) - 1, parseInt(first))
              }
              
              if (date && !isNaN(date.getTime())) {
                break
              }
            }
          }
        } else if (maxDate instanceof Date) {
          date = maxDate
        }
        
        if (date && !isNaN(date.getTime())) {
          const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
          
          setLastUpdate(formattedDate)
          setIsLoading(false)
          console.log('✅ Supabase Page - MAX(date) updated:', formattedDate)
        } else {
          console.error('❌ Supabase Page - Invalid date format:', maxDate)
          setLastUpdate('Invalid Date')
          setIsLoading(false)
        }
      } else {
        console.log('⚠️ Supabase Page - No data found in blue_whale_myr')
        setLastUpdate('No Data')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('❌ Supabase Page - Exception fetching MAX(date):', error)
      setLastUpdate('Error')
      setIsLoading(false)
    }
  }

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    
    setLogs(prev => [...prev.slice(-50), { timestamp, message, type }]) // Keep only last 50 logs
  }

  // Check for data changes in database - REAL TIME
  const checkForChanges = async () => {
    try {
      addLog('🔄 Checking for database changes...', 'info')
      
      // Get hash from latest data for comparison - SIMPLIFIED QUERY
      const { data: latestData, error } = await supabase
        .from('blue_whale_myr')
        .select('count')
        .limit(1)

      if (!error && latestData && latestData.length > 0) {
        const currentHash = JSON.stringify(latestData[0])
        
        if (currentHash !== lastDataHash) {
          addLog('🔄 Database changes detected! Auto-updating...', 'warning')
          setLastDataHash(currentHash)
          testConnection()
        } else {
          addLog('✅ No database changes detected', 'success')
        }
      }
    } catch (error) {
      addLog('❌ Error checking for changes', 'error')
    }
  }

  const testConnection = async (retryCount = 0) => {
    setLoading(true)
    addLog('🔄 Testing REAL Supabase connection (NO LIMIT)...', 'info')
    console.log('🔄 Testing REAL Supabase connection (NO LIMIT)...')

    try {
      addLog('📡 Attempting to connect to Supabase...', 'info')
      
      // Test basic connection - SIMPLIFIED QUERY
      const { data: testData, error: testError } = await supabase
        .from('blue_whale_myr')
        .select('count')
        .limit(1)

      if (testError) {
        console.error('❌ Connection failed:', testError)
        addLog(`❌ Connection failed: ${testError.message}`, 'error')
        addLog(`❌ Error code: ${testError.code}`, 'error')
        addLog(`❌ Error details: ${testError.details}`, 'error')
        
        // Retry mechanism
        if (retryCount < 3) {
          addLog(`🔄 Retrying connection... (${retryCount + 1}/3)`, 'warning')
          setTimeout(() => testConnection(retryCount + 1), 2000)
          return
        }
        
        setConnectionStatus('error')
        setLoading(false)
        return
      }

      console.log('✅ Basic connection successful:', testData)
      addLog('✅ Basic connection successful', 'success')
      addLog(`✅ Test data received: ${JSON.stringify(testData)}`, 'success')
      setConnectionStatus('success')

      // Initialize tables array
      const initialTables = allTables.map(table => ({
        name: table.title,
        source: table.source,
        count: 0,
        status: 'loading' as const
      }))
      setTables(initialTables)

      // Test each table - SEMUA DATA TANPA LIMIT
      for (let index = 0; index < allTables.length; index++) {
        const tableInfo = allTables[index]
        try {
          console.log(`🔄 Testing table: ${tableInfo.source} (NO LIMIT)`)
          addLog(`🔄 Testing table: ${tableInfo.source} (NO LIMIT)`, 'info')
          
          // USE RPC FOR EXACT COUNT (direct PostgreSQL COUNT(*))
          // This bypasses PostgREST estimation and gets TRUE row count
          const { data: rpcCount, error: rpcError } = await supabase
            .rpc('get_table_count', { table_name: tableInfo.source })
          
          const count: number = (rpcCount as number) || 0
          const error = rpcError

          if (error) {
            console.error(`❌ Error testing ${tableInfo.source}:`, error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            addLog(`❌ Error testing ${tableInfo.source}: ${errorMessage}`, 'error')
            setTables(prev => prev.map((t, i) => 
              i === index ? { ...t, status: 'error', error: errorMessage } : t
            ))
          } else {
            console.log(`✅ ${tableInfo.source}: ${count?.toLocaleString() || 0} rows (REAL DATA)`)
            addLog(`✅ ${tableInfo.source}: ${count?.toLocaleString() || 0} rows (REAL DATA)`, 'success')
            setTables(prev => prev.map((t, i) => 
              i === index ? { ...t, count: count || 0, status: 'success' } : t
            ))
          }
        } catch (err) {
          console.error(`❌ Exception testing ${tableInfo.source}:`, err)
          addLog(`❌ Exception testing ${tableInfo.source}: Table not found`, 'error')
          setTables(prev => prev.map((t, i) => 
            i === index ? { ...t, status: 'error', error: 'Table not found' } : t
          ))
        }
      }

    } catch (error) {
      console.error('❌ Connection test failed:', error)
      addLog(`❌ Connection test failed: ${error}`, 'error')
      
      // Retry mechanism for general errors
      if (retryCount < 3) {
        addLog(`🔄 Retrying connection... (${retryCount + 1}/3)`, 'warning')
        setTimeout(() => testConnection(retryCount + 1), 2000)
        return
      }
      
      setConnectionStatus('error')
    }

    setLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#10b981'
      case 'error': return '#ef4444'
      case 'loading': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return '✅ Connected'
      case 'error': return '❌ Failed'
      case 'loading': return '🔄 Loading'
      default: return '❓ Unknown'
    }
  }

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return '#10b981'
      case 'error': return '#ef4444'
      case 'warning': return '#f59e0b'
      default: return '#3b82f6'
    }
  }

  const getTableIcon = (title: string) => {
    if (title.includes('Blue Whale')) return '🐋'
    if (title.includes('Summary')) return '📊'
    if (title.includes('New Register')) return '🆕'
    if (title.includes('Overall Label')) return '🏷️'
    if (title.includes('DB') && title.includes('Summary')) return '💾'
    if (title.includes('Page Visibility')) return '👁️'
    if (title.includes('Activity Log')) return '📝'
    if (title.includes('User')) return '👤'
    if (title.includes('MV')) return '📈'
    return '📋'
  }

  return (
    <Layout>
      {/* FULL 1 FRAME - TANPA SCROLL DILUAR - MULTI SUB CONTENT */}
      <div style={{
        width: '100%',
        height: 'calc(100vh - 150px)',
        padding: '24px',
        overflow: 'hidden'
      }}>
        {/* Side by Side Layout: Database Tables + Real Time Logs Chart */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
          height: '100%'
        }}>
          {/* Database Tables Section - Sub Content dengan scroll sendiri */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            {/* Header dengan Last Update - Fixed padding */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 24px 16px 24px',
              borderBottom: '1px solid #e5e7eb',
              flexShrink: 0
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                Database Tables - Supabase
              </h2>
              
              {/* Last Update di kanan atas */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Update: </span>
                {isLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      border: '1px solid #10b981',
                      borderTop: '1px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>Loading...</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#10b981' }}>
                    {lastUpdate}
                  </span>
                )}
              </div>
            </div>

            {/* Content Area dengan scroll sendiri */}
            <div style={{ 
              flex: '1',
              overflow: 'auto',
              padding: '24px'
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  🔄 Testing REAL database connection...
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  height: '100%',
                  overflow: 'auto'
                }}>
                {tables.map((table, index) => (
                  <div key={index} style={{
                    backgroundColor: '#f8f9fa',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                    height: '120px', // Compact height
                    minHeight: '120px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: 0 }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>
                          {getTableIcon(table.name)}
                        </span>
                        <h3 style={{ 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          color: '#1f2937', 
                          margin: 0,
                          lineHeight: '1.2',
                          wordBreak: 'break-word',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {table.name}
                        </h3>
                      </div>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(table.status),
                        flexShrink: 0,
                        marginLeft: '8px'
                      }} />
                    </div>
                    
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: table.status === 'success' ? '#10b981' : '#6b7280', 
                      marginBottom: '6px',
                      lineHeight: '1'
                    }}>
                      {table.count.toLocaleString()}
                    </div>
                    
                    <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '6px' }}>
                      {table.status === 'success' ? 'rows' : getStatusText(table.status)}
                    </div>
                    
                    {table.error && (
                      <div style={{ 
                        fontSize: '8px', 
                        color: '#ef4444', 
                        backgroundColor: '#fef2f2', 
                        padding: '4px 6px', 
                        borderRadius: '4px',
                        marginTop: 'auto'
                      }}>
                        Error: {table.error}
                      </div>
                    )}
                  </div>
                ))}
                </div>
              )}
            </div>
          </div>

          {/* Real Time Logs Chart - Sub Content dengan scroll sendiri */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            {/* Header dengan Connected status - Fixed padding */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 24px 16px 24px',
              borderBottom: '1px solid #e5e7eb',
              flexShrink: 0
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                Real Time Logs Chart
              </h2>
              
              {/* Connected status di kanan atas */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(connectionStatus)
                }} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
                  {getStatusText(connectionStatus)}
                </span>
              </div>
            </div>

            {/* Content Area dengan scroll sendiri */}
            <div style={{ 
              flex: '1',
              overflow: 'auto',
              padding: '24px'
            }}>
              <div style={{
                backgroundColor: '#1f2937',
                borderRadius: '6px',
                padding: '12px',
                height: '100%',
                overflow: 'auto',
                fontFamily: 'monospace'
              }}>
                {logs.length === 0 ? (
                  <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
                    No logs yet...
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      gap: '12px',
                      marginBottom: '8px',
                      fontSize: '11px',
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ 
                        color: '#6b7280', 
                        minWidth: '120px',
                        flexShrink: 0
                      }}>
                        {log.timestamp}
                      </span>
                      <span style={{ 
                        color: getLogColor(log.type),
                        flex: '1',
                        wordBreak: 'break-word'
                      }}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  )
} 