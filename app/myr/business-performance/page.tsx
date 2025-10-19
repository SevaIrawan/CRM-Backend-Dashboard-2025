"use client"

import { useState } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StatCard from '@/components/StatCard'
import ProgressBarStatCard from '@/components/ProgressBarStatCard'
import DualKPICard from '@/components/DualKPICard'
import LineChart from '@/components/LineChart'
import BarChart from '@/components/BarChart'
import StackedBarChart from '@/components/StackedBarChart'
import SankeyChart from '@/components/SankeyChart'
import MixedChart from '@/components/MixedChart'
import YearSlicer from '@/components/slicers/YearSlicer'
import QuarterSlicer from '@/components/slicers/QuarterSlicer'
import DateRangeSlicer from '@/components/slicers/DateRangeSlicer'
import { getChartIcon } from '@/lib/CentralIcon'

export default function BusinessPerformancePage() {
  // Slicer States
  const [selectedYear, setSelectedYear] = useState('2025')
  const [selectedQuarter, setSelectedQuarter] = useState('Q4')
  const [startDate, setStartDate] = useState('2025-10-01')
  const [endDate, setEndDate] = useState('2025-10-31')
  
  // Toggle State: FALSE = Month Mode (default), TRUE = Date Range Mode
  const [isDateRangeMode, setIsDateRangeMode] = useState(false)
  
  // CUSTOM STYLES FOR BUSINESS PERFORMANCE PAGE - COMPACT & PROFESSIONAL
  const customKPIStyles = `
    /* StatCard - Standard KPI Values */
    .bp-page .stat-card-value {
      font-size: 22px !important;
      line-height: 1.2 !important;
      margin-bottom: 4px !important;
    }
    .bp-page .stat-card-additional-kpi {
      font-size: 10px !important;
      margin-top: 4px !important;
      margin-bottom: 4px !important;
    }
    .bp-page .stat-card-comparison {
      font-size: 11px !important;
      margin-top: 4px !important;
    }
    
    /* DualKPICard - Dual KPI Grid Values */
    .bp-page .stat-card > div > div > div:nth-child(2) {
      font-size: 18px !important;
      line-height: 1.2 !important;
    }
    
    /* Toggle Switch - Date Range Mode */
    .mode-toggle {
      position: relative;
      width: 52px;
      height: 26px;
      background-color: #ef4444; /* Red when OFF */
      border-radius: 13px;
      cursor: pointer;
      transition: background-color 0.3s ease;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    }
    .mode-toggle.active {
      background-color: #10b981; /* Green when ON */
    }
    .mode-toggle-knob {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      background-color: #ffffff;
      border-radius: 50%;
      transition: transform 0.3s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .mode-toggle.active .mode-toggle-knob {
      transform: translateX(26px);
    }
  `
  
  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
  }

  return (
    <>
      {/* Custom Styles for Business Performance Page */}
      <style jsx>{customKPIStyles}</style>
      
      <Layout 
        pageTitle="Business Performance"
        customSubHeader={
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 24px',
          width: '100%'
        }}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            margin: 0
          }}>
            Wireframe Preview - Design for Management Approval
          </h2>
          
          {/* Slicers */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151', textTransform: 'uppercase' }}>
                Year:
              </span>
              <YearSlicer 
                value={selectedYear} 
                onChange={setSelectedYear}
                years={['2023', '2024', '2025']}
              />
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              opacity: isDateRangeMode ? 0.4 : 1,
              pointerEvents: isDateRangeMode ? 'none' : 'auto',
              transition: 'opacity 0.3s ease'
            }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151', textTransform: 'uppercase' }}>
                Quarter:
              </span>
              <QuarterSlicer 
                value={selectedQuarter} 
                onChange={setSelectedQuarter}
              />
            </div>
            
            {/* TOGGLE: DIANTARA QUARTER DAN DATE RANGE */}
            <div 
              className={`mode-toggle ${isDateRangeMode ? 'active' : ''}`}
              onClick={() => setIsDateRangeMode(!isDateRangeMode)}
              title={isDateRangeMode ? 'Switch to Month Mode (Click to OFF)' : 'Switch to Date Range Mode (Click to ON)'}
            >
              <div className="mode-toggle-knob" />
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              opacity: isDateRangeMode ? 1 : 0.4,
              pointerEvents: isDateRangeMode ? 'auto' : 'none',
              transition: 'opacity 0.3s ease'
            }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151', textTransform: 'uppercase' }}>
                Period:
              </span>
              <DateRangeSlicer 
                startDate={startDate}
                endDate={endDate}
                onDateChange={handleDateRangeChange}
              />
            </div>
          </div>
        </div>
      }
    >
      <Frame className="bp-page">
        {/* ROW 1: KPI Cards (6 cards) */}
        <div className="kpi-row" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(6, 1fr)', 
          gap: '18px' 
        }}>
          {/* Target Achieve Rate */}
          <ProgressBarStatCard 
            title="Target Achieve Rate"
            value={8500000}
            target={10000000}
            unit="%"
            icon="targetCompletion"
          />
          
          {/* Gross Gaming Revenue */}
          <StatCard 
            title="Gross Gaming Revenue"
            value="RM 8.5M"
            icon="Net Profit"
            additionalKpi={{
              label: 'Daily Avg',
              value: 'RM 274K'
            }}
            comparison={{
              percentage: '+12.5%',
              isPositive: true,
              text: 'MoM'
            }}
          />
          
          {/* Active Member */}
          <StatCard 
            title="Active Member"
            value="1,250"
            icon="Active Member"
            additionalKpi={{
              label: 'Daily Avg',
              value: '40'
            }}
            comparison={{
              percentage: '+8.3%',
              isPositive: true,
              text: 'MoM'
            }}
          />
          
          {/* Pure Active */}
          <StatCard 
            title="Pure Active"
            value="950"
            icon="Pure Active"
            additionalKpi={{
              label: 'Daily Avg',
              value: '31'
            }}
            comparison={{
              percentage: '+6.7%',
              isPositive: true,
              text: 'MoM'
            }}
          />
          
          {/* ATV & PF */}
          <DualKPICard 
            title="Transaction Metrics"
            icon="Transaction Metrics"
            kpi1={{
              label: 'ATV',
              value: 'RM 285',
              comparison: {
                percentage: '+3.2%',
                isPositive: true
              }
            }}
            kpi2={{
              label: 'PF',
              value: '3.8x',
              comparison: {
                percentage: '+0.5x',
                isPositive: true
              }
            }}
          />
          
          {/* GGR User & DA User */}
          <DualKPICard 
            title="User Value Metrics"
            icon="User Value Metrics"
            kpi1={{
              label: 'GGR User',
              value: 'RM 6,800',
              comparison: {
                percentage: '+4.1%',
                isPositive: true
              }
            }}
            kpi2={{
              label: 'DA User',
              value: 'RM 8,500',
              comparison: {
                percentage: '+3.8%',
                isPositive: true
              }
            }}
          />
        </div>

        {/* ROW 2: Line Charts (2 charts) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '18px',
          minHeight: '350px'
        }}>
          {/* Forecast Q4 - Actual vs Target vs Forecast */}
          <LineChart 
            series={[
              { 
                name: 'Actual GGR', 
                data: [7500000, 8200000, 8800000, 9500000], // Real performance
                color: '#3B82F6' // Blue
              },
              { 
                name: 'Target GGR', 
                data: [9000000, 9200000, 9500000, 10000000], // Goal (highest)
                color: '#10b981' // Green
              },
              { 
                name: 'Forecast GGR', 
                data: [8000000, 8500000, 9000000, 9700000], // Prediction
                color: '#F97316' // Orange
              }
            ]}
            categories={['Oct', 'Nov', 'Dec', 'Jan']}
            title="FORECAST Q4 - GROSS GAMING REVENUE"
            currency="MYR"
            chartIcon={getChartIcon('Gross Gaming Revenue')}
            showDataLabels={true}
          />
          
          {/* GGR Trend */}
          <LineChart 
            series={[
              { 
                name: 'Gross Gaming Revenue', 
                data: [7200000, 7800000, 8100000, 8500000, 8200000, 8800000] 
              }
            ]}
            categories={['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']}
            title="GROSS GAMING REVENUE TREND"
            currency="MYR"
            chartIcon={getChartIcon('Gross Gaming Revenue')}
            showDataLabels={true}
            color="#3B82F6"
          />
        </div>

        {/* ROW 3: Dual-Axis Charts (2 charts) - Mixed Bar + Line */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '18px',
          minHeight: '350px'
        }}>
          {/* Deposit Amount vs Cases */}
          <MixedChart 
            data={[
              { name: 'May', barValue: 5200000, lineValue: 8500 },
              { name: 'Jun', barValue: 5800000, lineValue: 9200 },
              { name: 'Jul', barValue: 6100000, lineValue: 9800 },
              { name: 'Aug', barValue: 6500000, lineValue: 10200 },
              { name: 'Sep', barValue: 6200000, lineValue: 9900 },
              { name: 'Oct', barValue: 6800000, lineValue: 10500 }
            ]}
            title="DEPOSIT AMOUNT VS CASES"
            chartIcon={getChartIcon('Deposit Amount')}
            barLabel="Amount"
            lineLabel="Cases"
            barColor="#3B82F6"
            lineColor="#F97316"
            currency="MYR"
          />
          
          {/* Withdraw Amount vs Cases */}
          <MixedChart 
            data={[
              { name: 'May', barValue: 4500000, lineValue: 7200 },
              { name: 'Jun', barValue: 5100000, lineValue: 7800 },
              { name: 'Jul', barValue: 5400000, lineValue: 8100 },
              { name: 'Aug', barValue: 5800000, lineValue: 8500 },
              { name: 'Sep', barValue: 5500000, lineValue: 8200 },
              { name: 'Oct', barValue: 6000000, lineValue: 8800 }
            ]}
            title="WITHDRAW AMOUNT VS CASES"
            chartIcon={getChartIcon('Withdraw Amount')}
            barLabel="Amount"
            lineLabel="Cases"
            barColor="#3B82F6"
            lineColor="#F97316"
            currency="MYR"
          />
        </div>

        {/* ROW 4: Dual Line Chart + Bar Chart */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '18px',
          minHeight: '350px'
        }}>
          {/* Winrate & Withdraw Rate - Dual Line */}
          <LineChart 
            series={[
              { name: 'Winrate', data: [45.5, 48.2, 46.8, 49.1, 47.5, 50.2] },
              { name: 'Withdraw Rate', data: [65.2, 68.5, 70.1, 72.8, 71.5, 74.2] }
            ]}
            categories={['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']}
            title="WINRATE VS WITHDRAW RATE"
            currency="PERCENTAGE"
            chartIcon={getChartIcon('Winrate')}
            showDataLabels={true}
          />
          
          {/* Bonus Usage Rate - PER BRAND */}
          <BarChart 
            series={[
              { name: 'Bonus Usage Rate', data: [18.25, 15.80, 22.45, 16.90] }
            ]}
            categories={['SBMY', 'LVMY', 'JMMY', 'STMY']}
            title="BONUS USAGE RATE (%)"
            currency="PERCENTAGE"
            chartIcon={getChartIcon('Bonus')}
            color="#F97316"
            showDataLabels={true}
          />
        </div>

        {/* ROW 5: Bar Charts (2 separate bars) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '18px',
          minHeight: '350px'
        }}>
          {/* Retention Rate - PER BRAND */}
          <BarChart 
            series={[
              { name: 'Retention Rate', data: [72.50, 68.30, 75.80, 70.15] }
            ]}
            categories={['SBMY', 'LVMY', 'JMMY', 'STMY']}
            title="RETENTION RATE (%)"
            currency="PERCENTAGE"
            chartIcon={getChartIcon('Retention Rate')}
            color="#3B82F6"
            showDataLabels={true}
          />
          
          {/* Activation Rate - PER BRAND */}
          <BarChart 
            series={[
              { name: 'Activation Rate', data: [55.80, 48.90, 62.45, 52.30] }
            ]}
            categories={['SBMY', 'LVMY', 'JMMY', 'STMY']}
            title="ACTIVATION RATE (%)"
            currency="PERCENTAGE"
            chartIcon={getChartIcon('Conversion Rate')}
            color="#F97316"
            showDataLabels={true}
          />
        </div>

        {/* ROW 6: Stacked Bar Chart + Sankey Diagram */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '18px',
          minHeight: '350px'
        }}>
          {/* Stacked Bar Chart - Brand GGR Contribution */}
          <StackedBarChart 
            series={[
              { name: 'SBMY', data: [3000000, 3200000, 3500000, 3800000], color: '#3B82F6' },
              { name: 'LVMY', data: [2500000, 2700000, 2800000, 3000000], color: '#F97316' },
              { name: 'STMY', data: [2000000, 2300000, 2200000, 2400000], color: '#10b981' },
              { name: 'JMMY', data: [1500000, 1800000, 2000000, 2200000], color: '#8b5cf6' }
            ]}
            categories={['Jul', 'Aug', 'Sep', 'Oct']}
            title="BRAND GGR CONTRIBUTION (STACKED)"
            currency="MYR"
            chartIcon={getChartIcon('Gross Gaming Revenue')}
            showDataLabels={false}
          />
          
          {/* Sankey Diagram - Cross-Brand Customer Flow */}
          <SankeyChart 
            data={{
              nodes: [
                { name: 'New Register' },
                { name: 'SBMY' },
                { name: 'LVMY' },
                { name: 'STMY' },
                { name: 'JMMY' },
                { name: 'Retained' },
                { name: 'Churned' }
              ],
              links: [
                // New Register → Brands
                { source: 0, target: 1, value: 400 }, // New Register → SBMY
                { source: 0, target: 2, value: 300 }, // New Register → LVMY
                { source: 0, target: 3, value: 200 }, // New Register → STMY
                { source: 0, target: 4, value: 100 }, // New Register → JMMY
                
                // Brands → Retained
                { source: 1, target: 5, value: 280 }, // SBMY → Retained
                { source: 2, target: 5, value: 210 }, // LVMY → Retained
                { source: 3, target: 5, value: 130 }, // STMY → Retained
                { source: 4, target: 5, value: 50 },  // JMMY → Retained
                
                // Brands → Churned
                { source: 1, target: 6, value: 120 }, // SBMY → Churned
                { source: 2, target: 6, value: 90 },  // LVMY → Churned
                { source: 3, target: 6, value: 70 },  // STMY → Churned
                { source: 4, target: 6, value: 50 }   // JMMY → Churned
              ]
            }}
            title="CROSS-BRAND CUSTOMER FLOW (SANKEY)"
            chartIcon={getChartIcon('Customer Flow')}
          />
        </div>

        {/* Slicer Info */}
        <div className="slicer-info">
          <p>
            {isDateRangeMode 
              ? `Showing data for: ${selectedYear} | Date Range: ${startDate} to ${endDate} | Dummy Data Preview`
              : `Showing data for: ${selectedYear} | ${selectedQuarter} | Dummy Data Preview`
            }
          </p>
        </div>
      </Frame>
    </Layout>
    </>
  )
}
