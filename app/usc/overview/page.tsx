'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'

import StatCard from '@/components/StatCard'
import LineChart from '@/components/LineChart'
import BarChart from '@/components/BarChart'
import DonutChart from '@/components/DonutChart'
import StandardChart from '@/components/StandardChart'
import StandardChartGrid from '@/components/StandardChartGrid'
import Frame from '@/components/Frame'

import { getChartIcon } from '@/lib/CentralIcon'
import { USCKPIData, USCKPIMoM, getAllUSCKPIsWithMoM, getAllUSCKPIsWithDailyAverage } from '@/lib/USCLogic'

export default function USCOverview() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedYear, setSelectedYear] = useState('2025')
  const [selectedMonth, setSelectedMonth] = useState('January')
  const [selectedCurrency, setSelectedCurrency] = useState('USC') // Hidden but active
  const [selectedLine, setSelectedLine] = useState('All')
  const [selectedStartDate, setSelectedStartDate] = useState('')
  const [selectedEndDate, setSelectedEndDate] = useState('')
  const [slicerMode, setSlicerMode] = useState<'month' | 'range'>('month') // 'month' or 'range'
  const [loading, setLoading] = useState(true)
  const [yearOptions, setYearOptions] = useState<string[]>(['2025'])
  const [monthOptions, setMonthOptions] = useState<string[]>(['January'])
  const [currencyOptions, setCurrencyOptions] = useState<string[]>(['All'])
  const [lineOptions, setLineOptions] = useState<string[]>(['All'])

  // USC KPI Data from Supabase
  const [uscData, setUscData] = useState<USCKPIData>({
    depositAmount: 0,
    depositCases: 0,
    withdrawAmount: 0,
    withdrawCases: 0,
    addTransaction: 0,
    deductTransaction: 0,
    ggr: 0,
    netProfit: 0,
    activeMember: 0,
    ggrUser: 0,
    daUser: 0,
    newMember: 0,
    averageTransactionValue: 0,
    purchaseFrequency: 0
  })

  // USC MoM Data from Supabase
  const [momData, setMomData] = useState<USCKPIMoM>({
    depositAmount: 0,
    depositCases: 0,
    withdrawAmount: 0,
    withdrawCases: 0,
    addTransaction: 0,
    deductTransaction: 0,
    ggr: 0,
    netProfit: 0,
    activeMember: 0,
    ggrUser: 0,
    daUser: 0,
    newMember: 0,
    averageTransactionValue: 0,
    purchaseFrequency: 0
  })

     // USC Daily Average Data from Supabase
   const [dailyAverages, setDailyAverages] = useState<USCKPIData>({
     depositAmount: 0,
     depositCases: 0,
     withdrawAmount: 0,
     withdrawCases: 0,
     addTransaction: 0,
     deductTransaction: 0,
     ggr: 0,
     netProfit: 0,
     activeMember: 0,
     ggrUser: 0,
     daUser: 0,
     newMember: 0,
     averageTransactionValue: 0,
     purchaseFrequency: 0
   })

       // USC Chart Data from Supabase
    const [chartData, setChartData] = useState<any>({
      ggrUserTrend: {
        series: [{ name: 'GGR User Trend', data: [0, 0, 0, 0, 0, 0] }],
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      },
      daUserTrend: {
        series: [{ name: 'DA User Trend', data: [0, 0, 0, 0, 0, 0] }],
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      },
      atvTrend: {
        series: [{ name: 'Average Transaction Value Trend', data: [0, 0, 0, 0, 0, 0] }],
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      },
      pfTrend: {
        series: [{ name: 'Purchase Frequency Trend', data: [0, 0, 0, 0, 0, 0] }],
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      }
    })

  const handleLogout = () => {
    console.log('Logout clicked')
  }

  // Fetch USC slicer options
  const fetchUSCSlicerOptions = async () => {
    try {
      console.log('🔍 [USC Overview] Fetching slicer options')

      // Fetch all slicer options from USC API
      const slicerResponse = await fetch('/api/usc/slicer-options')
      if (slicerResponse.ok) {
        const slicerResult = await slicerResponse.json()
        if (slicerResult.success) {
          setYearOptions(slicerResult.data.years)
          setMonthOptions(slicerResult.data.months)
          setCurrencyOptions(slicerResult.data.currencies)
        }
      }

      // Fetch line options
      const lineResponse = await fetch('/api/usc/line-options')
      if (lineResponse.ok) {
        const lineResult = await lineResponse.json()
        if (lineResult.success) {
          setLineOptions(lineResult.data.lines)
        }
      }

      console.log('✅ [USC Overview] Slicer options loaded')
    } catch (error) {
      console.error('❌ [USC Overview] Slicer options error:', error)
    }
  }

  // Fetch USC data from API
  const fetchUSCData = async () => {
    try {
      setLoading(true)
             console.log('🔍 [USC Overview] Fetching data:', { 
         selectedYear, 
         selectedMonth, 
         selectedCurrency, 
         selectedLine, 
         selectedStartDate, 
         selectedEndDate, 
         slicerMode 
       })

       // Build API URL based on slicer mode
       let apiUrl = `/api/usc/data?year=${selectedYear}&currency=${selectedCurrency}&line=${selectedLine}`
       
       if (slicerMode === 'month') {
         apiUrl += `&month=${selectedMonth}`
       } else if (slicerMode === 'range' && selectedStartDate) {
         apiUrl += `&startDate=${selectedStartDate}`
         if (selectedEndDate) {
           apiUrl += `&endDate=${selectedEndDate}`
         }
       }

      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error('Failed to fetch USC data')
      }

      const result = await response.json()

                   if (result.success) {
        setUscData(result.data.kpi)
        // Remove setting MoM and Daily Average from API response
        // Now we calculate them separately using USC functions
        setChartData(result.data.chart)
        console.log('✅ [USC Overview] Data loaded successfully')
        console.log('🔍 [USC Overview] KPI Data:', result.data.kpi)
        console.log('🔍 [USC Overview] Chart Data:', result.data.chart)
        console.log('🔍 [USC Overview] Current selectedCurrency:', selectedCurrency)
        console.log('🔍 [USC Overview] Setting uscData state to:', result.data.kpi)
      } else {
        console.error('❌ [USC Overview] API error:', result.error)
      }
    } catch (error) {
      console.error('❌ [USC Overview] Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUSCSlicerOptions()
  }, [])

  useEffect(() => {
    fetchUSCData()
  }, [selectedYear, selectedMonth, selectedCurrency, selectedLine, selectedStartDate, selectedEndDate, slicerMode])

  // Remove the old useEffect that was calling API for MoM and Daily Average
  // Now we call the functions directly in separate useEffects above

  // Calculate Daily Averages when KPI data changes
  useEffect(() => {
    console.log('🔍 [USC Overview] useEffect Daily Average triggered:', { 
      uscData: !!uscData, 
      selectedYear, 
      selectedMonth, 
      selectedStartDate, 
      selectedEndDate 
    })
    console.log('🔍 [USC Overview] uscData details:', uscData)
    
    const calculateDailyAverages = async () => {
      if (uscData && selectedYear && selectedMonth) {
        try {
          console.log('🔄 [USC Overview] Using USC Daily Average function...')
          
          // Use USC central function - sama seperti getAllUSCKPIsWithMoM
          const result = await getAllUSCKPIsWithDailyAverage(uscData, selectedYear, selectedMonth, selectedStartDate, selectedEndDate)
          
          setDailyAverages(result.dailyAverage)
          
          console.log('✅ [USC Overview] USC Daily Average applied to all KPIs')
          
        } catch (error) {
          console.error('❌ [USC Overview] Error with USC Daily Average:', error)
        }
      } else {
        console.log('⚠️ [USC Overview] Daily Average calculation skipped:', { 
          uscData: !!uscData, 
          selectedYear, 
          selectedMonth 
        })
      }
    }

    calculateDailyAverages()
  }, [uscData, selectedYear, selectedMonth, selectedStartDate, selectedEndDate])

  // Calculate MoM when KPI data changes
  useEffect(() => {
    console.log('🔍 [USC Overview] useEffect MoM triggered:', { 
      uscData: !!uscData, 
      selectedYear, 
      selectedMonth, 
      selectedCurrency, 
      selectedLine, 
      selectedStartDate, 
      selectedEndDate 
    })
    console.log('🔍 [USC Overview] uscData details for MoM:', uscData)
    
    const calculateMoM = async () => {
      if (uscData && selectedYear && selectedMonth) {
        try {
          console.log('🔄 [USC Overview] Using USC MoM function...')
          
          // Use USC central function untuk MoM
          const result = await getAllUSCKPIsWithMoM(selectedYear, selectedMonth, selectedCurrency, selectedLine, selectedStartDate, selectedEndDate)
          
          setMomData(result.mom)
          
          console.log('✅ [USC Overview] USC MoM applied to all KPIs')
          
        } catch (error) {
          console.error('❌ [USC Overview] Error with USC MoM:', error)
        }
      } else {
        console.log('⚠️ [USC Overview] MoM calculation skipped:', { 
          uscData: !!uscData, 
          selectedYear, 
          selectedMonth 
        })
      }
    }

    calculateMoM()
  }, [uscData, selectedYear, selectedMonth, selectedCurrency, selectedLine, selectedStartDate, selectedEndDate])

  // Format functions (standard like other pages)
  const formatCurrency = (value: number): string => {
    console.log('🔍 [USC Overview] formatCurrency called with:', { value, selectedCurrency })
    const currencySymbol = selectedCurrency === 'MYR' ? 'RM' : selectedCurrency === 'USC' ? 'USD' : selectedCurrency === 'SGD' ? 'SGD' : 'RM'
    console.log('🔍 [USC Overview] currencySymbol determined:', currencySymbol)
    return `${currencySymbol} ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)}`
  }

  const formatNumber = (value: number, decimals: number = 0): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value)
  }

  const formatMoM = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

                       // Real chart data from USC Logic
           const ggrUserTrendData = {
        series: [
          { name: 'GGR User', data: chartData?.ggrUserTrend?.series?.[0]?.data || [0, 0, 0, 0, 0, 0] }
        ],
        categories: chartData?.ggrUserTrend?.categories || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        currency: selectedCurrency
      }

      const daUserTrendData = {
        series: [
          { name: 'DA User', data: chartData?.daUserTrend?.series?.[0]?.data || [0, 0, 0, 0, 0, 0] }
        ],
        categories: chartData?.daUserTrend?.categories || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        currency: selectedCurrency
      }

     const atvTrendData = {
       series: [
         { name: 'Average Transaction Value', data: chartData?.atvTrend?.series?.[0]?.data || [0, 0, 0, 0, 0, 0] }
       ],
       categories: chartData?.atvTrend?.categories || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
     }

     const pfTrendData = {
       series: [
         { name: 'Purchase Frequency', data: chartData?.pfTrend?.series?.[0]?.data || [0, 0, 0, 0, 0, 0] }
       ],
       categories: chartData?.pfTrend?.categories || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
     }

  // Remove mock data - use real data from chartData when available
  const pieChartData = chartData?.pieChartData || [
    { name: 'Category A', data: [400] },
    { name: 'Category B', data: [300] },
    { name: 'Category C', data: [300] },
    { name: 'Category D', data: [200] }
  ]

  const barChartData = chartData?.barChartData || [
    { name: 'Product 1', data: [400] },
    { name: 'Product 2', data: [300] },
    { name: 'Product 3', data: [600] },
    { name: 'Product 4', data: [800] },
    { name: 'Product 5', data: [500] }
  ]

  const tableData = chartData?.tableData || [
    { id: 1, name: 'Customer A', value: 1000, status: 'Active' },
    { id: 2, name: 'Customer B', value: 2000, status: 'Active' },
    { id: 3, name: 'Customer C', value: 1500, status: 'Inactive' },
    { id: 4, name: 'Customer D', value: 3000, status: 'Active' },
    { id: 5, name: 'Customer E', value: 2500, status: 'Active' }
  ]

  return (
    <Layout
      pageTitle="USC Overview"
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={() => setDarkMode(!darkMode)}
      onLogout={handleLogout}
      customSubHeader={
        <div className="dashboard-subheader">
          <div className="subheader-title">
            
          </div>
          
                     <div className="subheader-controls">
             {/* Line Slicer */}
             <div className="slicer-group">
               <label className="slicer-label">LINE:</label>
               <select 
                 value={selectedLine} 
                 onChange={(e) => setSelectedLine(e.target.value)}
                 style={{
                   padding: '8px 12px',
                   border: '1px solid #d1d5db',
                   borderRadius: '6px',
                   fontSize: '14px',
                   backgroundColor: 'white',
                   minWidth: '120px'
                 }}
               >
                 {lineOptions.map((line) => (
                   <option key={line} value={line}>
                     {line === 'All' ? 'All Lines' : line}
                   </option>
                 ))}
               </select>
             </div>
             
             {/* Year Slicer */}
             <div className="slicer-group">
               <label className="slicer-label">YEAR:</label>
               <select 
                 value={selectedYear} 
                 onChange={(e) => setSelectedYear(e.target.value)}
                 style={{
                   padding: '8px 12px',
                   border: '1px solid #d1d5db',
                   borderRadius: '6px',
                   fontSize: '14px',
                   backgroundColor: 'white',
                   minWidth: '120px'
                 }}
               >
                 {yearOptions.map((year) => (
                   <option key={year} value={year}>{year}</option>
                 ))}
               </select>
             </div>
             
                           {/* Month Slicer */}
              <div className="slicer-group">
                <label className="slicer-label">MONTH:</label>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  disabled={slicerMode === 'range'}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: slicerMode === 'range' ? '#f3f4f6' : 'white',
                    color: slicerMode === 'range' ? '#9ca3af' : '#374151',
                    minWidth: '120px',
                    cursor: slicerMode === 'range' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              
              {/* Date Range Checkbox */}
              <div className="slicer-group">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={slicerMode === 'range'}
                    onChange={(e) => setSlicerMode(e.target.checked ? 'range' : 'month')}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}>
                    DATE RANGE
                  </label>
                </div>
              </div>
              
              {/* Start Date Input */}
              <div className="slicer-group">
                <input 
                  type="date" 
                  value={selectedStartDate} 
                  onChange={(e) => setSelectedStartDate(e.target.value)}
                  disabled={slicerMode === 'month'}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: slicerMode === 'month' ? '#f3f4f6' : 'white',
                    color: slicerMode === 'month' ? '#9ca3af' : '#374151',
                    minWidth: '120px',
                    cursor: slicerMode === 'month' ? 'not-allowed' : 'pointer'
                  }}
                />
              </div>
              
              {/* End Date Input */}
              <div className="slicer-group">
                <input 
                  type="date" 
                  value={selectedEndDate} 
                  onChange={(e) => setSelectedEndDate(e.target.value)}
                  disabled={slicerMode === 'month'}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: slicerMode === 'month' ? '#f3f4f6' : 'white',
                    color: slicerMode === 'month' ? '#9ca3af' : '#374151',
                    minWidth: '120px',
                    cursor: slicerMode === 'month' ? 'not-allowed' : 'pointer'
                  }}
                />
              </div>
           </div>
        </div>
      }
    >
      {/* Single Frame with 2 Sections */}
      <Frame variant="standard">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '40px',
          marginTop: '20px',
          marginBottom: '20px'
        }}>
          {/* Section 1: Overall Trend Monitoring */}
          <div>
            {/* Section Title */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#3b82f6',
                borderRadius: '6px'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3v18h18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 17V9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 17V5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 17v-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>Overall Trend Monitoring</h2>
            </div>

            {/* Section Content */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
                                                           {/* Row 1: 4 KPI Cards */}
                <div className="kpi-row">
                                    <div className="usc-stat-card">
                     <StatCard
                       title="GGR User"
                       value={formatCurrency(uscData.ggrUser)}
                       icon="GGR User"
                       additionalKpi={{
                         label: "DAILY AVERAGE",
                         value: formatCurrency(dailyAverages.ggrUser)
                       }}
                       comparison={{
                         percentage: formatMoM(momData.ggrUser),
                         isPositive: momData.ggrUser > 0
                       }}
                     />
                   </div>
                   <div className="usc-stat-card">
                     <StatCard
                       title="Deposit Amount User"
                       value={formatCurrency(uscData.daUser)}
                       icon="Deposit Amount User"
                       additionalKpi={{
                         label: "DAILY AVERAGE",
                         value: formatCurrency(dailyAverages.daUser)
                       }}
                       comparison={{
                         percentage: formatMoM(momData.daUser),
                         isPositive: momData.daUser > 0
                       }}
                     />
                   </div>
                   <div className="usc-stat-card">
                     <StatCard
                       title="Average Transaction Value"
                       value={formatCurrency(uscData.averageTransactionValue)}
                       icon="Average Transaction Value"
                       additionalKpi={{
                         label: "DAILY AVERAGE",
                         value: formatCurrency(dailyAverages.averageTransactionValue)
                       }}
                       comparison={{
                         percentage: formatMoM(momData.averageTransactionValue),
                         isPositive: momData.averageTransactionValue > 0
                       }}
                     />
                   </div>
                   <div className="usc-stat-card">
                     <StatCard
                       title="Purchase Frequency"
                       value={formatNumber(uscData.purchaseFrequency, 2)}
                       icon="Purchase Frequency"
                       additionalKpi={{
                         label: "DAILY AVERAGE",
                         value: formatNumber(dailyAverages.purchaseFrequency, 2)
                       }}
                       comparison={{
                         percentage: formatMoM(momData.purchaseFrequency),
                         isPositive: momData.purchaseFrequency > 0
                       }}
                     />
                   </div>
                </div>

                                            {/* Row 2: 2 Line Charts */}
                <div className="chart-row">
                                     <div className="usc-chart">
                     <LineChart
                       series={ggrUserTrendData.series}
                       categories={ggrUserTrendData.categories}
                       title="GGR User Trend"
                       currency={ggrUserTrendData.currency}
                       chartIcon={getChartIcon('GGR User Trend')}
                     />
                   </div>
                   <div className="usc-chart">
                     <LineChart
                       series={daUserTrendData.series}
                       categories={daUserTrendData.categories}
                       title="DA User Trend"
                       currency={daUserTrendData.currency}
                       chartIcon={getChartIcon('DA User Trend')}
                     />
                   </div>
                </div>

                {/* Row 3: 2 Line Charts */}
                <div className="chart-row">
                  <div className="usc-chart">
                    <LineChart
                      series={atvTrendData.series}
                      categories={atvTrendData.categories}
                      title="Average Transaction Value Trend"
                      currency={selectedCurrency}
                      chartIcon={getChartIcon('Average Transaction Value Trend')}
                    />
                  </div>
                  <div className="usc-chart">
                    <LineChart
                      series={pfTrendData.series}
                      categories={pfTrendData.categories}
                      title="Purchase Frequency"
                      currency={selectedCurrency}
                      chartIcon={getChartIcon('Purchase Frequency')}
                    />
                  </div>
                </div>
            </div>
          </div>

          {/* Section 2: Customer Structure & Performance Contribution Analysis */}
          <div>
            {/* Section Title */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#10b981',
                borderRadius: '6px'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>Customer Structure & Performance Contribution Analysis</h2>
            </div>

            {/* Section Content */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>

                     {/* Row 1: 4 KPI Cards */}
           <div className="kpi-row">
             <div className="usc-stat-card">
               <StatCard
                 title="Net Profit"
                 value={formatCurrency(uscData.netProfit)}
                 icon="Net Profit"
                 additionalKpi={{
                   label: "DAILY AVERAGE",
                   value: formatCurrency(dailyAverages.netProfit)
                 }}
                 comparison={{
                   percentage: formatMoM(momData.netProfit),
                   isPositive: momData.netProfit > 0
                 }}
               />
             </div>
             <div className="usc-stat-card">
               <StatCard
                 title="New Customer"
                 value={formatNumber(uscData.newMember)}
                 icon="New Customer"
                 additionalKpi={{
                   label: "DAILY AVERAGE",
                   value: formatNumber(Math.round(dailyAverages.newMember))
                 }}
                 comparison={{
                   percentage: formatMoM(momData.newMember),
                   isPositive: momData.newMember > 0
                 }}
               />
             </div>
             <div className="usc-stat-card">
               <StatCard
                 title="Active Member"
                 value={formatNumber(uscData.activeMember)}
                 icon="Active Member"
                 additionalKpi={{
                   label: "DAILY AVERAGE",
                   value: formatNumber(Math.round(dailyAverages.activeMember))
                 }}
                 comparison={{
                   percentage: formatMoM(momData.activeMember),
                   isPositive: momData.activeMember > 0
                 }}
               />
             </div>
             <div className="usc-stat-card">
               <StatCard
                 title="Deposit Amount"
                 value={formatCurrency(uscData.depositAmount)}
                 icon="Deposit Amount"
                 additionalKpi={{
                   label: "DAILY AVERAGE",
                   value: formatCurrency(dailyAverages.depositAmount)
                 }}
                 comparison={{
                   percentage: formatMoM(momData.depositAmount),
                   isPositive: momData.depositAmount > 0
                 }}
               />
             </div>
           </div>

          {/* Row 2: 1 Pie Chart + 1 Bar Chart */}
          <div className="chart-row">
            <div className="usc-chart">
              <DonutChart
                title="USC Category Distribution"
                series={pieChartData}
                chartIcon={getChartIcon('USC Category Distribution')}
              />
            </div>
            <div className="usc-chart">
              <BarChart
                title="USC Product Performance"
                series={barChartData}
                categories={['Product 1', 'Product 2', 'Product 3', 'Product 4', 'Product 5']}
                chartIcon={getChartIcon('USC Product Performance')}
              />
            </div>
          </div>

                     {/* Row 3: 1 Table Chart */}
           <div className="table-row">
             <div className="table-container">
               <div style={{
                 backgroundColor: '#ffffff',
                 borderRadius: '12px',
                 padding: '20px',
                 boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                 border: '1px solid #e2e8f0',
                 transition: 'all 0.3s ease',
                 cursor: 'pointer'
               }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.transform = 'translateY(-3px)';
                 e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.08)';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.transform = 'translateY(0)';
                 e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
               }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }} dangerouslySetInnerHTML={{ __html: getChartIcon('USC Customer List') }} />
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: 0
                  }}>USC Customer List</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>ID</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Value</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                      </tr>
                    </thead>
                                         <tbody>
                       {tableData.map((row: any) => (
                         <tr 
                           key={row.id} 
                           style={{ 
                             borderBottom: '1px solid #f3f4f6',
                             transition: 'background-color 0.2s ease',
                             cursor: 'pointer',
                             backgroundColor: 'transparent'
                           }}
                           onMouseEnter={(e) => {
                             e.currentTarget.style.backgroundColor = '#f8fafc'
                           }}
                           onMouseLeave={(e) => {
                             e.currentTarget.style.backgroundColor = 'transparent'
                           }}
                         >
                           <td style={{ padding: '12px' }}>{row.id}</td>
                           <td style={{ padding: '12px' }}>{row.name}</td>
                           <td style={{ padding: '12px' }}>{row.value.toLocaleString()}</td>
                           <td style={{ padding: '12px' }}>
                             <span style={{
                               padding: '4px 8px',
                               borderRadius: '4px',
                               fontSize: '12px',
                               fontWeight: '500',
                               backgroundColor: row.status === 'Active' ? '#dcfce7' : '#fef2f2',
                               color: row.status === 'Active' ? '#166534' : '#dc2626'
                             }}>
                               {row.status}
                             </span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
           </div>

                       {/* Row 4: 2 Line Charts */}
          <div className="chart-row">
                         <div className="usc-chart">
               <LineChart
                 series={ggrUserTrendData.series}
                 categories={ggrUserTrendData.categories}
                 title="USC Monthly Sales"
                 currency={ggrUserTrendData.currency}
                 chartIcon={getChartIcon('USC Monthly Sales')}
               />
             </div>
             <div className="usc-chart">
               <LineChart
                 series={daUserTrendData.series}
                 categories={daUserTrendData.categories}
                 title="USC Customer Retention"
                 currency={daUserTrendData.currency}
                 chartIcon={getChartIcon('USC Customer Retention')}
               />
             </div>
          </div>

                     {/* Row 5: 1 Table Chart */}
           <div className="table-row">
             <div className="table-container">
               <div style={{
                 backgroundColor: '#ffffff',
                 borderRadius: '12px',
                 padding: '20px',
                 boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                 border: '1px solid #e2e8f0',
                 transition: 'all 0.3s ease',
                 cursor: 'pointer'
               }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.transform = 'translateY(-3px)';
                 e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.08)';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.transform = 'translateY(0)';
                 e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
               }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }} dangerouslySetInnerHTML={{ __html: getChartIcon('USC Performance Summary') }} />
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: 0
                  }}>USC Performance Summary</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>ID</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Value</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                      </tr>
                    </thead>
                                         <tbody>
                       {tableData.map((row: any) => (
                         <tr 
                           key={row.id} 
                           style={{ 
                             borderBottom: '1px solid #f3f4f6',
                             transition: 'background-color 0.2s ease',
                             cursor: 'pointer',
                             backgroundColor: 'transparent'
                           }}
                           onMouseEnter={(e) => {
                             e.currentTarget.style.backgroundColor = '#f8fafc'
                           }}
                           onMouseLeave={(e) => {
                             e.currentTarget.style.backgroundColor = 'transparent'
                           }}
                         >
                           <td style={{ padding: '12px' }}>{row.id}</td>
                           <td style={{ padding: '12px' }}>{row.name}</td>
                           <td style={{ padding: '12px' }}>{row.value.toLocaleString()}</td>
                           <td style={{ padding: '12px' }}>
                             <span style={{
                               padding: '4px 8px',
                               borderRadius: '4px',
                               fontSize: '12px',
                               fontWeight: '500',
                               backgroundColor: row.status === 'Active' ? '#dcfce7' : '#fef2f2',
                               color: row.status === 'Active' ? '#166534' : '#dc2626'
                             }}>
                               {row.status}
                             </span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
           </div>

                       {/* Row 6: 2 Line Charts */}
          <div className="chart-row">
            <div className="usc-chart">
              <LineChart
                series={atvTrendData.series}
                categories={atvTrendData.categories}
                title="USC Market Share"
                currency={selectedCurrency}
                chartIcon={getChartIcon('USC Market Share')}
              />
            </div>
            <div className="usc-chart">
              <LineChart
                series={pfTrendData.series}
                categories={pfTrendData.categories}
                title="USC Growth Rate"
                currency={selectedCurrency}
                chartIcon={getChartIcon('USC Growth Rate')}
              />
            </div>
          </div>

                     {/* Row 7: 2 Line Charts */}
           <div className="chart-row">
                           <div className="usc-chart">
                <LineChart
                  series={ggrUserTrendData.series}
                  categories={ggrUserTrendData.categories}
                  title="USC Regional Performance"
                  currency={ggrUserTrendData.currency}
                  chartIcon={getChartIcon('USC Regional Performance')}
                />
              </div>
              <div className="usc-chart">
                <LineChart
                  series={daUserTrendData.series}
                  categories={daUserTrendData.categories}
                  title="USC Seasonal Trends"
                  currency={daUserTrendData.currency}
                  chartIcon={getChartIcon('USC Seasonal Trends')}
                />
              </div>
           </div>
             </div>
                       </div>
          </div>

                                  {/* Slicer Info */}
             <div className="slicer-info">
                               <p>
                  Showing data for: {selectedYear} | {selectedLine} | {selectedCurrency} | 
                  {slicerMode === 'month' ? ` ${selectedMonth}` : ` Range: ${selectedStartDate}${selectedEndDate ? ` - ${selectedEndDate}` : ''}`} 
                  | Mode: {slicerMode === 'month' ? 'Monthly' : 'Daily'}
                </p>
             </div>
        </Frame>

       <style jsx>{`
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin-bottom: 20px;
        }

        .chart-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          margin-bottom: 20px;
        }

        .chart-row:last-of-type {
          margin-bottom: 0;
        }

        .table-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          margin-bottom: 20px;
        }

        .table-container {
          width: 100%;
        }

        @media (max-width: 1024px) {
          .kpi-row {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .chart-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .kpi-row {
            grid-template-columns: 1fr;
          }
        }

                 

         .slicer-info {
           background: #f3f4f6;
           padding: 16px;
           border-radius: 8px;
           border: 1px solid #e5e7eb;
           text-align: center;
           margin-top: 20px;
         }

         .slicer-info p {
           margin: 0;
           color: #6b7280;
           font-size: 14px;
         }
       `}</style>
    </Layout>
  )
} 