'use client'

import React, { useState, createContext, useContext, useEffect } from 'react'
import Layout from '@/components/Layout'
import MarketingAcquisition from './components/MarketingAcquisition'
import CustomerTierAnalytics from './components/CustomerTierAnalytics'

// ✅ Business Performance Page-Specific Styles (100% ISOLATED - TIDAK GUNAKAN GLOBAL STANDARD)
const businessPerformanceStyles = `
  /* ========================================================================
     BUSINESS PERFORMANCE SPACING STANDARD (KHUSUS PAGE INI SAHAJA)
     ======================================================================== */
  
  /* ========================================================================
     1. SUBHEADER CONFIGURATION
     ======================================================================== */
  /* Subheader tinggi 120px (BP Standard) */
  :global(.bp-subheader-wrapper .subheader) {
    height: 120px !important;
    min-height: 120px !important;
  }
  
  /* Dashboard subheader tinggi 120px (BP Standard) */
  :global(.bp-subheader-wrapper .dashboard-subheader) {
    height: 120px !important;
    min-height: 120px !important;
    padding: 12px 24px !important; /* BP Standard: Vertical + Horizontal padding */
  }
  
  /* ========================================================================
     2. MAIN CONTENT POSITIONING
     ======================================================================== */
  /* Main content top position (Header 90px + Subheader 120px = 210px) */
  :global(.bp-subheader-wrapper .main-content.has-subheader) {
    top: 210px !important; /* BP Standard: 210px from top */
  }
  
  :global(.bp-subheader-wrapper .main-content.has-subheader.collapsed) {
    top: 210px !important; /* BP Standard: Same when sidebar collapsed */
  }
  
  /* ========================================================================
     3. FRAME CONFIGURATION (BP STANDARD - TIDAK GUNA GLOBAL .standard-frame)
     ======================================================================== */
  :global(.bp-subheader-wrapper .standard-frame) {
    /* Height calculation */
    height: calc(100vh - 210px) !important; /* BP Standard: Full height minus header+subheader */
    
    /* Overflow behavior */
    overflow-y: scroll !important; /* BP Standard: Always show scrollbar */
    overflow-x: hidden !important; /* BP Standard: No horizontal scroll */
    -webkit-overflow-scrolling: touch !important; /* BP Standard: Smooth scrolling */
    
    /* Frame padding */
    padding: 20px !important; /* BP Standard: 20px all sides */
    padding-bottom: 60px !important; /* BP Standard: Extra bottom for footer visibility */
    
    /* Gap control */
    gap: 0 !important; /* BP Standard: No gap at frame level (controlled by child) */
    
    /* Display */
    display: flex !important;
    flex-direction: column !important;
  }
  
  /* ========================================================================
     4. FRAME CONTENT CONFIGURATION (BP STANDARD)
     ======================================================================== */
  /* Direct child of frame */
  :global(.bp-subheader-wrapper .standard-frame > *) {
    min-height: auto !important; /* BP Standard: Auto height */
    flex-shrink: 0 !important; /* BP Standard: No shrinking */
  }
  
  /* Content wrapper inside frame (controls actual metric row spacing) */
  :global(.bp-subheader-wrapper .standard-frame > div) {
    display: flex !important;
    flex-direction: column !important;
    gap: 32px !important; /* BP Standard: 32px between metric rows/canvas (LUAS!) */
    margin-top: 20px !important; /* BP Standard: 20px top spacing */
    margin-bottom: 32px !important; /* BP Standard: 32px bottom spacing */
    width: 100% !important;
  }
`

type TabType = 'marketing' | 'tier-analytics'

// Context to share activeTab state with child components
const TabContext = createContext<{
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
}>({
  activeTab: 'tier-analytics',
  setActiveTab: () => {}
})

export const useTabContext = () => useContext(TabContext)

export default function USCBusinessPerformancePage() {
  const [activeTab, setActiveTab] = useState<TabType>('tier-analytics')
  
  // ============================================================================
  // SLICER STATES - HANYA UNTUK "Customer Tier Analytics" TAB
  // ============================================================================
  // NOTE: "Marketing Acquisition" dan "Customer Tier Analytics" adalah PAGE YANG BERBEDA
  // dengan layout dan insight yang berbeda, sehingga slicer yang digunakan juga berbeda.
  // 
  // - Customer Tier Analytics: Menggunakan Compare Period (Monthly, 3 Month, 6 Month)
  // - Marketing Acquisition: Bisa menggunakan Date Range (di dalam component sendiri)
  // ============================================================================
  const [dateRange, setDateRange] = useState<string>('Last 7 Days') // Custom, Last 7 Days, Last 30 Days
  const [brand, setBrand] = useState<string>('All') // Default to 'All' to match API
  const [squadLead, setSquadLead] = useState<string>('All')
  const [channel, setChannel] = useState<string>('All')
  const [brandOptions, setBrandOptions] = useState<string[]>([])
  const [squadLeadOptions, setSquadLeadOptions] = useState<string[]>([])
  const [channelOptions, setChannelOptions] = useState<string[]>([])
  const [tierNameOptions, setTierNameOptions] = useState<Array<{ name: string; group: string | null }>>([])
  const [loadingSlicers, setLoadingSlicers] = useState(false)
  const [searchTrigger, setSearchTrigger] = useState<number>(0) // Counter untuk trigger search
  
  // Notification counts for each tab/bookmark
  const notificationCounts = {
    marketing: 3,
    tierAnalytics: 4
  }
  
  // Fetch slicer options from API (blue_whale_usc)
  useEffect(() => {
    const fetchSlicerOptions = async () => {
      setLoadingSlicers(true)
      try {
        const userAllowedBrands = localStorage.getItem('user_allowed_brands')
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        }
        
        if (userAllowedBrands) {
          headers['x-user-allowed-brands'] = userAllowedBrands
        }
        
        const response = await fetch('/api/usc-business-performance/slicer-options', {
          headers
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('🔍 [BP Page] API Response:', result)
          
          if (result.success && result.data) {
            // Set Brand/Line options
            if (result.data.lines) {
              const lines = result.data.lines
              setBrandOptions(lines)
              
              // Set default brand if current is 'All' and lines available
              if (lines.length > 0 && brand === 'All') {
                // Use 'All' if available, otherwise use first option
                const defaultBrand = lines.includes('All') ? 'All' : lines[0]
                setBrand(defaultBrand)
              }
            }
            
            // Set Squad Lead options
            if (result.data.squadLeads) {
              setSquadLeadOptions(result.data.squadLeads)
              if (result.data.defaults?.squadLead) {
                setSquadLead(result.data.defaults.squadLead)
              }
            }
            
            // Channel removed from UI, but keep state as 'All' for API compatibility
            setChannel('All')
            
            // Set Tier Name options (from database)
            if (result.data.tierNames) {
              setTierNameOptions(result.data.tierNames)
              console.log('✅ [BP Page] Tier Names loaded from database:', result.data.tierNames)
            }
          } else {
            console.error('❌ [BP Page] Invalid API response structure:', result)
          }
        } else {
          console.error('❌ [BP Page] API response not OK:', response.status)
        }
      } catch (error) {
        console.error('❌ [BP Page] Error fetching slicer options from blue_whale_usc:', error)
      } finally {
        setLoadingSlicers(false)
      }
    }
    
    fetchSlicerOptions()
  }, [])
  
  // Update notification count in localStorage when tab changes (for Header to read)
  React.useEffect(() => {
    const currentCount = activeTab === 'marketing' 
      ? notificationCounts.marketing 
      : notificationCounts.tierAnalytics
      
    try {
      localStorage.setItem('business_performance_notification', JSON.stringify({ 
        count: currentCount,
        tab: activeTab,
        marketing: notificationCounts.marketing,
        tierAnalytics: notificationCounts.tierAnalytics
      }))
    } catch (e) {
      console.error('Error saving notification count:', e)
    }
  }, [activeTab])
  
  
  // ✅ Set subheader tinggi 120px hanya untuk Business Performance USC
  useEffect(() => {
    const setSubheaderHeight = () => {
      const subheader = document.querySelector('.bp-subheader-wrapper .subheader')
      if (subheader) {
        (subheader as HTMLElement).style.height = '120px'
        ;(subheader as HTMLElement).style.minHeight = '120px'
      }
      
      const mainContent = document.querySelector('.bp-subheader-wrapper .main-content.has-subheader')
      if (mainContent) {
        (mainContent as HTMLElement).style.top = '210px' // Header (90px) + Subheader (120px)
      }
      
      const mainContentCollapsed = document.querySelector('.bp-subheader-wrapper .main-content.has-subheader.collapsed')
      if (mainContentCollapsed) {
        (mainContentCollapsed as HTMLElement).style.top = '210px'
      }
    }
    
    setSubheaderHeight()
    
    // Watch for DOM changes
    const observer = new MutationObserver(setSubheaderHeight)
    const wrapper = document.querySelector('.bp-subheader-wrapper')
    if (wrapper) {
      observer.observe(wrapper, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      })
    }
    
    return () => observer.disconnect()
  }, [])
  
  // Handle search button click
  const handleSearch = () => {
    console.log('Search clicked with filters:', {
      dateRange,
      brand,
      squadLead,
      channel
    })
    // Trigger search di CustomerTierTrends dengan increment counter
    setSearchTrigger(prev => prev + 1)
  }

  // Get title and subtitle based on active tab
  const getTabInfo = () => {
    switch (activeTab) {
      case 'marketing':
        return {
          title: 'Growth Performance',
          subtitle: 'Daily Review Dashboard for Marketing Efficiency & Customer Quality'
        }
      case 'tier-analytics':
        return {
          title: 'Customer Tier Analytics',
          subtitle: 'Tier structure analysis and performance metrics'
        }
      default:
        return {
          title: '',
          subtitle: ''
        }
    }
  }

  const tabInfo = getTabInfo()

  const customSubHeader = (
    <div className="dashboard-subheader" style={{ height: '120px', minHeight: '120px', display: 'flex', flexDirection: 'column', padding: '12px 24px' }}>
      {/* Top Row: Title/Subtitle (kiri) dan Bookmark Tabs (kanan) - sejajar dengan baris slicer */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        width: '100%'
      }}>
        {/* Title dan Subtitle - Kiri Atas */}
        <div className="subheader-title" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px',
          alignItems: 'flex-start',
          flex: '0 0 auto'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#1f2937',
            margin: 0,
            lineHeight: '1.2'
          }}>
            {tabInfo.title}
          </h2>
          <p style={{
            fontSize: '13px',
            fontWeight: 400,
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.4'
          }}>
            {tabInfo.subtitle}
          </p>
        </div>
        
        {/* Bookmark Tabs - Kanan Atas, alignment right di atas button Search */}
        <div className="subheader-controls" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginLeft: 'auto',
          flex: '0 0 auto'
        }}>
          {/* Marketing & Acquisition Tab */}
          <button
            onClick={() => setActiveTab('marketing')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              backgroundColor: activeTab === 'marketing' ? '#3b82f6' : 'transparent',
              color: activeTab === 'marketing' ? 'white' : '#374151'
            }}
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke={activeTab === 'marketing' ? 'white' : 'currentColor'} 
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Marketing & Acquisition</span>
          </button>

          {/* Customer Tier Analytics Tab */}
          <button
            onClick={() => setActiveTab('tier-analytics')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              backgroundColor: activeTab === 'tier-analytics' ? '#3b82f6' : 'transparent',
              color: activeTab === 'tier-analytics' ? 'white' : '#374151'
            }}
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke={activeTab === 'tier-analytics' ? 'white' : 'currentColor'} 
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Customer Tier Analytics</span>
          </button>
        </div>
      </div>

      {/* ============================================================================
          BOTTOM ROW: SLICERS + SEARCH BUTTON
          HANYA UNTUK "Customer Tier Analytics" TAB
          ============================================================================
          Marketing Acquisition tab akan punya slicer sendiri di dalam component-nya
          (bisa menggunakan Date Range atau slicer lainnya sesuai kebutuhan)
          ============================================================================ */}
      {activeTab === 'tier-analytics' && (
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '12px',
        width: '100%'
      }}>
        {/* Date Range Slicer */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row',
          alignItems: 'center',
          gap: '8px',
          flex: '1 1 0'
        }}>
          <label style={{ 
            fontSize: '12px', 
            fontWeight: 500, 
            color: '#374151',
            whiteSpace: 'nowrap'
          }}>Date Range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '2px solid #e5e7eb',
              fontSize: '13px',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              flex: '1',
              minWidth: 0
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          >
            <option value="Custom">Custom</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
          </select>
        </div>

        {/* Squad Lead Slicer */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row',
          alignItems: 'center',
          gap: '8px',
          flex: '1 1 0'
        }}>
          <label style={{ 
            fontSize: '12px', 
            fontWeight: 500, 
            color: '#374151',
            whiteSpace: 'nowrap'
          }}>Squad Lead</label>
          <select
            value={squadLead}
            onChange={(e) => setSquadLead(e.target.value)}
            disabled={loadingSlicers}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '2px solid #e5e7eb',
              fontSize: '13px',
              backgroundColor: loadingSlicers ? '#f3f4f6' : 'white',
              color: '#374151',
              cursor: loadingSlicers ? 'not-allowed' : 'pointer',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              flex: '1',
              minWidth: 0
            }}
            onFocus={(e) => !loadingSlicers && (e.target.style.borderColor = '#3b82f6')}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          >
            {loadingSlicers ? (
              <option>Loading...</option>
            ) : (
              squadLeadOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))
            )}
          </select>
        </div>

        {/* Brand/Line Slicer */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row',
          alignItems: 'center',
          gap: '8px',
          flex: '1 1 0'
        }}>
          <label style={{ 
            fontSize: '12px', 
            fontWeight: 500, 
            color: '#374151',
            whiteSpace: 'nowrap'
          }}>Brand</label>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            disabled={loadingSlicers}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '2px solid #e5e7eb',
              fontSize: '13px',
              backgroundColor: loadingSlicers ? '#f3f4f6' : 'white',
              color: '#374151',
              cursor: loadingSlicers ? 'not-allowed' : 'pointer',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              flex: '1',
              minWidth: 0
            }}
            onFocus={(e) => !loadingSlicers && (e.target.style.borderColor = '#3b82f6')}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          >
            {loadingSlicers ? (
              <option>Loading...</option>
            ) : (
              brandOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))
            )}
          </select>
        </div>

        {/* Search Button */}
        <div style={{ 
          marginLeft: '12px',
          display: 'flex', 
          alignItems: 'center',
          flex: '0 0 auto'
        }}>
          <button
            onClick={handleSearch}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#10b981',
              color: 'white',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              height: '36px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <span>Search</span>
          </button>
        </div>
      </div>
      )}
    </div>
  )

  // Render component based on active tab - each has its own Layout and Frame
  const renderTabContent = () => {
    switch (activeTab) {
      case 'marketing':
        return <MarketingAcquisition />
      case 'tier-analytics':
        return (
          <CustomerTierAnalytics 
            dateRange={dateRange}
            brand={brand}
            squadLead={squadLead}
            channel={channel}
            searchTrigger={searchTrigger}
            tierNameOptions={tierNameOptions}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* ✅ Business Performance Page-Specific Styles (Isolated from other pages) */}
      <style jsx>{businessPerformanceStyles}</style>
      
      <TabContext.Provider value={{ activeTab, setActiveTab }}>
        <div className="bp-subheader-wrapper">
          <Layout customSubHeader={customSubHeader}>
            {/* Each tab component will render its own content with Layout and Frame */}
            {renderTabContent()}
          </Layout>
        </div>
      </TabContext.Provider>
    </>
  )
}

