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
import YearSlicer from '@/components/slicers/YearSlicer'
import MonthSlicer from '@/components/slicers/MonthSlicer'
import CurrencySlicer from '@/components/slicers/CurrencySlicer'
import { getChartIcon } from '@/lib/CentralIcon'

export default function USCOverview() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedYear, setSelectedYear] = useState('2025')
  const [selectedMonth, setSelectedMonth] = useState('January')
  const [selectedCurrency, setSelectedCurrency] = useState('MYR')
  const [loading, setLoading] = useState(true)

  // Mock data for USC KPIs (8 KPIs)
  const [uscData, setUscData] = useState({
    kpi1: 1250000,  // USC Revenue
    kpi2: 850000,   // USC Profit
    kpi3: 92.5,     // USC Conversion
    kpi4: 1250,     // USC Customers
    kpi5: 750000,   // USC Sales
    kpi6: 85.2,     // USC Retention
    kpi7: 3200,     // USC Transactions
    kpi8: 15.8      // USC Growth Rate
  })

  // Mock MoM data (8 KPIs)
  const [momData, setMomData] = useState({
    kpi1: 12.5,
    kpi2: 8.3,
    kpi3: 2.1,
    kpi4: 15.2,
    kpi5: 9.7,
    kpi6: 1.8,
    kpi7: 22.4,
    kpi8: 3.5
  })

  // Mock Daily Average data (8 KPIs)
  const [dailyAverages, setDailyAverages] = useState({
    kpi1: 40322.58,
    kpi2: 27419.35,
    kpi3: 2.98,
    kpi4: 40.32,
    kpi5: 24193.55,
    kpi6: 2.75,
    kpi7: 103.23,
    kpi8: 0.51
  })

  const handleLogout = () => {
    console.log('Logout clicked')
  }

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }, [])

  // Format functions (standard like other pages)
  const formatCurrency = (value: number): string => {
    return `RM ${value.toLocaleString()}`
  }

  const formatNumber = (value: number): string => {
    return value.toLocaleString()
  }

  const formatMoM = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  // Mock chart data with standard format
  const lineChartData1 = {
    series: [
      { name: 'USC Revenue', data: [400, 300, 600, 800, 500, 700] }
    ],
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  }

  const lineChartData2 = {
    series: [
      { name: 'USC Customer Growth', data: [200, 400, 300, 600, 800, 500] }
    ],
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  }

  const pieChartData = [
    { name: 'Category A', data: [400] },
    { name: 'Category B', data: [300] },
    { name: 'Category C', data: [300] },
    { name: 'Category D', data: [200] }
  ]

  const barChartData = [
    { name: 'Product 1', data: [400] },
    { name: 'Product 2', data: [300] },
    { name: 'Product 3', data: [600] },
    { name: 'Product 4', data: [800] },
    { name: 'Product 5', data: [500] }
  ]

  const tableData = [
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
            Customer
          </div>
          
          <div className="subheader-controls">
            <div className="slicer-group">
              <label className="slicer-label">YEAR:</label>
              <YearSlicer 
                value={selectedYear} 
                onChange={setSelectedYear}
              />
            </div>
            
            <div className="slicer-group">
              <label className="slicer-label">CURRENCY:</label>
              <CurrencySlicer 
                value={selectedCurrency} 
                onChange={setSelectedCurrency}
              />
            </div>
            
            <div className="slicer-group">
              <label className="slicer-label">MONTH:</label>
              <MonthSlicer 
                value={selectedMonth} 
                onChange={setSelectedMonth}
                selectedYear={selectedYear}
                selectedCurrency={selectedCurrency}
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
                    title="USC Revenue"
                    value={formatCurrency(uscData.kpi1)}
                    icon="USC Revenue"
                    additionalKpi={{
                      label: "DAILY AVERAGE",
                      value: formatCurrency(dailyAverages.kpi1)
                    }}
                    comparison={{
                      percentage: formatMoM(momData.kpi1),
                      isPositive: momData.kpi1 > 0
                    }}
                  />
                </div>
                <div className="usc-stat-card">
                  <StatCard
                    title="USC Profit"
                    value={formatCurrency(uscData.kpi2)}
                    icon="USC Profit"
                    additionalKpi={{
                      label: "DAILY AVERAGE",
                      value: formatCurrency(dailyAverages.kpi2)
                    }}
                    comparison={{
                      percentage: formatMoM(momData.kpi2),
                      isPositive: momData.kpi2 > 0
                    }}
                  />
                </div>
                <div className="usc-stat-card">
                  <StatCard
                    title="USC Conversion"
                    value={`${uscData.kpi3.toFixed(2)}%`}
                    icon="USC Conversion"
                    additionalKpi={{
                      label: "DAILY AVERAGE",
                      value: `${dailyAverages.kpi3.toFixed(2)}%`
                    }}
                    comparison={{
                      percentage: formatMoM(momData.kpi3),
                      isPositive: momData.kpi3 > 0
                    }}
                  />
                </div>
                <div className="usc-stat-card">
                  <StatCard
                    title="USC Customers"
                    value={formatNumber(uscData.kpi4)}
                    icon="USC Customers"
                    additionalKpi={{
                      label: "DAILY AVERAGE",
                      value: formatNumber(Math.round(dailyAverages.kpi4))
                    }}
                    comparison={{
                      percentage: formatMoM(momData.kpi4),
                      isPositive: momData.kpi4 > 0
                    }}
                  />
                </div>
              </div>

              {/* Row 2: 2 Line Charts */}
              <div className="chart-row">
                <div className="usc-chart">
                  <LineChart
                    series={lineChartData1.series}
                    categories={lineChartData1.categories}
                    title="USC Revenue Trend"
                    currency={selectedCurrency}
                    chartIcon={getChartIcon('USC Revenue Trend')}
                  />
                </div>
                <div className="usc-chart">
                  <LineChart
                    series={lineChartData2.series}
                    categories={lineChartData2.categories}
                    title="USC Customer Growth"
                    currency={selectedCurrency}
                    chartIcon={getChartIcon('USC Customer Growth')}
                  />
                </div>
              </div>

              {/* Row 3: 2 Line Charts */}
              <div className="chart-row">
                <div className="usc-chart">
                  <LineChart
                    series={lineChartData1.series}
                    categories={lineChartData1.categories}
                    title="USC Profit Trend"
                    currency={selectedCurrency}
                    chartIcon={getChartIcon('USC Profit Trend')}
                  />
                </div>
                <div className="usc-chart">
                  <LineChart
                    series={lineChartData2.series}
                    categories={lineChartData2.categories}
                    title="USC Conversion Rate"
                    currency={selectedCurrency}
                    chartIcon={getChartIcon('USC Conversion Rate')}
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
                title="USC Sales"
                value={formatCurrency(uscData.kpi5)}
                icon="USC Sales"
                additionalKpi={{
                  label: "DAILY AVERAGE",
                  value: formatCurrency(dailyAverages.kpi5)
                }}
                comparison={{
                  percentage: formatMoM(momData.kpi5),
                  isPositive: momData.kpi5 > 0
                }}
              />
            </div>
            <div className="usc-stat-card">
              <StatCard
                title="USC Retention"
                value={`${uscData.kpi6.toFixed(1)}%`}
                icon="USC Retention"
                additionalKpi={{
                  label: "DAILY AVERAGE",
                  value: `${dailyAverages.kpi6.toFixed(2)}%`
                }}
                comparison={{
                  percentage: formatMoM(momData.kpi6),
                  isPositive: momData.kpi6 > 0
                }}
              />
            </div>
            <div className="usc-stat-card">
              <StatCard
                title="USC Transactions"
                value={formatNumber(uscData.kpi7)}
                icon="USC Transactions"
                additionalKpi={{
                  label: "DAILY AVERAGE",
                  value: formatNumber(Math.round(dailyAverages.kpi7))
                }}
                comparison={{
                  percentage: formatMoM(momData.kpi7),
                  isPositive: momData.kpi7 > 0
                }}
              />
            </div>
            <div className="usc-stat-card">
              <StatCard
                title="USC Growth Rate"
                value={`${uscData.kpi8.toFixed(1)}%`}
                icon="USC Growth Rate"
                additionalKpi={{
                  label: "DAILY AVERAGE",
                  value: `${dailyAverages.kpi8.toFixed(2)}%`
                }}
                comparison={{
                  percentage: formatMoM(momData.kpi8),
                  isPositive: momData.kpi8 > 0
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
                       {tableData.map((row) => (
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
                series={lineChartData1.series}
                categories={lineChartData1.categories}
                title="USC Monthly Sales"
                currency={selectedCurrency}
                chartIcon={getChartIcon('USC Monthly Sales')}
              />
            </div>
            <div className="usc-chart">
              <LineChart
                series={lineChartData2.series}
                categories={lineChartData2.categories}
                title="USC Customer Retention"
                currency={selectedCurrency}
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
                       {tableData.map((row) => (
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
                series={lineChartData1.series}
                categories={lineChartData1.categories}
                title="USC Market Share"
                currency={selectedCurrency}
                chartIcon={getChartIcon('USC Market Share')}
              />
            </div>
            <div className="usc-chart">
              <LineChart
                series={lineChartData2.series}
                categories={lineChartData2.categories}
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
                 series={lineChartData1.series}
                 categories={lineChartData1.categories}
                 title="USC Regional Performance"
                 currency={selectedCurrency}
                 chartIcon={getChartIcon('USC Regional Performance')}
               />
             </div>
             <div className="usc-chart">
               <LineChart
                 series={lineChartData2.series}
                 categories={lineChartData2.categories}
                 title="USC Seasonal Trends"
                 currency={selectedCurrency}
                 chartIcon={getChartIcon('USC Seasonal Trends')}
               />
             </div>
           </div>
             </div>
                       </div>
          </div>

          {/* Slicer Info */}
          <div className="slicer-info">
            <p>Showing data for: {selectedYear} | {selectedMonth} | {selectedCurrency}</p>
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