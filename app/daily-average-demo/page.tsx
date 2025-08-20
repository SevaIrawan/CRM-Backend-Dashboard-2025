'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StatCard from '@/components/StatCard'
import { 
  calculateDailyAverage, 
  getMonthInfo, 
  getDaysInMonth, 
  getCurrentMonthProgress,
  isCurrentMonth 
} from '@/lib/dailyAverageHelper'

export default function DailyAverageDemo() {
  const [selectedYear, setSelectedYear] = useState('2025')
  const [selectedMonth, setSelectedMonth] = useState('August')
  
  // Add state for async data
  const [monthInfo, setMonthInfo] = useState<any>(null)
  const [dailyAverages, setDailyAverages] = useState({
    depositAmount: 0,
    netProfit: 0,
    activeMember: 0,
    conversionRate: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const years = ['2024', '2025', '2026']
  
  // Sample KPI data
  const sampleKPIs = {
    depositAmount: 30000,
    netProfit: 15000,
    activeMember: 900,
    conversionRate: 4.83
  }
  
  // Load month info and calculate daily averages when month/year changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        console.log('🔄 [Demo] Loading data for', selectedMonth, selectedYear)
        
        // Get month info
        const info = await getMonthInfo(selectedYear, selectedMonth)
        setMonthInfo(info)
        
        // Calculate daily averages
        const [depositAvg, netProfitAvg, activeMemberAvg, conversionAvg] = await Promise.all([
          calculateDailyAverage(sampleKPIs.depositAmount, selectedYear, selectedMonth),
          calculateDailyAverage(sampleKPIs.netProfit, selectedYear, selectedMonth),
          calculateDailyAverage(sampleKPIs.activeMember, selectedYear, selectedMonth),
          calculateDailyAverage(sampleKPIs.conversionRate, selectedYear, selectedMonth)
        ])
        
        setDailyAverages({
          depositAmount: depositAvg,
          netProfit: netProfitAvg,
          activeMember: activeMemberAvg,
          conversionRate: conversionAvg
        })
        
        console.log('✅ [Demo] Data loaded successfully')
        
      } catch (error) {
        console.error('❌ [Demo] Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [selectedYear, selectedMonth])
  
  if (!monthInfo) {
    return (
      <Layout>
        <Frame>
          <div className="loading-container">
            <p>Loading month information...</p>
          </div>
        </Frame>
      </Layout>
    )
  }
  
  return (
    <Layout>
      <Frame>
        <div className="demo-container">
          <h1 className="demo-title">Daily Average Formula Demo</h1>
          <p className="demo-description">
            Demonstrasi formula Daily Average yang fleksibel dan dinamis
          </p>
          
          {/* Month/Year Selector */}
          <div className="selector-container">
            <div className="selector-group">
              <label>Year:</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="selector"
                disabled={isLoading}
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="selector-group">
              <label>Month:</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="selector"
                disabled={isLoading}
              >
                {months.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="loading-indicator">
              <p>🔄 Calculating daily averages...</p>
            </div>
          )}
          
          {/* Month Info Display */}
          <div className="month-info">
            <h3>Month Information: {selectedMonth} {selectedYear}</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Total Days:</span>
                <span className="value">{monthInfo.totalDays}</span>
              </div>
              <div className="info-item">
                <span className="label">Active Days:</span>
                <span className="value">{monthInfo.activeDays}</span>
              </div>
              <div className="info-item">
                <span className="label">Current Month:</span>
                <span className="value">{monthInfo.isCurrentMonth ? 'Yes' : 'No'}</span>
              </div>
              <div className="info-item">
                <span className="label">Leap Year:</span>
                <span className="value">{monthInfo.isLeapYear ? 'Yes' : 'No'}</span>
              </div>
              <div className="info-item">
                <span className="label">Data Source:</span>
                <span className="value">{monthInfo.dataSource}</span>
              </div>
            </div>
          </div>
          
          {/* KPI Cards with Dynamic Daily Average */}
          <div className="kpi-grid">
            <StatCard
              title="DEPOSIT AMOUNT"
              value={`RM ${sampleKPIs.depositAmount.toLocaleString()}`}
              icon="Deposit Amount"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: `RM ${dailyAverages.depositAmount.toFixed(2)}`
              }}
              comparison={{
                percentage: "+5.2%",
                isPositive: true
              }}
            />
            
            <StatCard
              title="NET PROFIT"
              value={`RM ${sampleKPIs.netProfit.toLocaleString()}`}
              icon="Net Profit"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: `RM ${dailyAverages.netProfit.toFixed(2)}`
              }}
              comparison={{
                percentage: "+3.1%",
                isPositive: true
              }}
            />
            
            <StatCard
              title="ACTIVE MEMBER"
              value={sampleKPIs.activeMember.toLocaleString()}
              icon="Active Member"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: Math.round(dailyAverages.activeMember).toString()
              }}
              comparison={{
                percentage: "+2.8%",
                isPositive: true
              }}
            />
            
            <StatCard
              title="CONVERSION RATE"
              value={`${sampleKPIs.conversionRate}%`}
              icon="Conversion Rate"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: `${dailyAverages.conversionRate.toFixed(2)}%`
              }}
              comparison={{
                percentage: "-1.5%",
                isPositive: false
              }}
            />
          </div>
          
          {/* Formula Explanation */}
          <div className="formula-explanation">
            <h3>How It Works:</h3>
            <div className="formula-steps">
              <div className="step">
                <strong>Step 1:</strong> Detect month type
                <code>
                  {monthInfo.isCurrentMonth 
                    ? `Current month (${selectedMonth} ${selectedYear})` 
                    : `Past month (${selectedMonth} ${selectedYear})`
                  }
                </code>
              </div>
              
              <div className="step">
                <strong>Step 2:</strong> Calculate active days
                <code>
                  {monthInfo.isCurrentMonth 
                    ? `Database check: ${monthInfo.activeDays} days (data available until last update)` 
                    : `Total days: ${monthInfo.activeDays} days (month completed)`
                  }
                </code>
              </div>
              
              <div className="step">
                <strong>Step 3:</strong> Apply formula
                <code>
                  Daily Average = Monthly Value ÷ {monthInfo.activeDays}
                </code>
              </div>
              
              <div className="step">
                <strong>Example:</strong> Deposit Amount
                <code>
                  RM {sampleKPIs.depositAmount.toLocaleString()} ÷ {monthInfo.activeDays} = RM {dailyAverages.depositAmount.toFixed(2)}
                </code>
              </div>
            </div>
          </div>
        </div>
        
        <style jsx>{`
          .demo-container {
            padding: 24px;
            max-width: 1200px;
            margin: 0 auto;
          }
          
          .demo-title {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 8px 0;
            text-align: center;
          }
          
          .demo-description {
            font-size: 16px;
            color: #6b7280;
            margin: 0 0 32px 0;
            text-align: center;
          }
          
          .selector-container {
            display: flex;
            gap: 24px;
            justify-content: center;
            margin-bottom: 32px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
          }
          
          .selector-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .selector-group label {
            font-weight: 600;
            color: #374151;
            font-size: 14px;
          }
          
          .selector {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            min-width: 120px;
          }
          
          .selector:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          
          .loading-indicator {
            text-align: center;
            padding: 16px;
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            margin-bottom: 24px;
            color: #92400e;
            font-weight: 600;
          }
          
          .month-info {
            background: white;
            padding: 24px;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            margin-bottom: 24px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          
          .month-info h3 {
            margin: 0 0 16px 0;
            color: #1f2937;
            font-size: 18px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }
          
          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 12px;
            background: #f9fafb;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          
          .info-item .label {
            font-weight: 600;
            color: #374151;
          }
          
          .info-item .value {
            font-weight: 700;
            color: #059669;
          }
          
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 32px;
          }
          
          .formula-explanation {
            background: white;
            padding: 24px;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          
          .formula-explanation h3 {
            margin: 0 0 16px 0;
            color: #1f2937;
            font-size: 18px;
          }
          
          .formula-steps {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          
          .step {
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          
          .step strong {
            color: #1f2937;
            display: block;
            margin-bottom: 8px;
          }
          
          .step code {
            display: block;
            background: #1f2937;
            color: #f9fafb;
            padding: 8px 12px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            margin-top: 8px;
          }
          
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 400px;
            font-size: 18px;
            color: #6b7280;
          }
        `}</style>
      </Frame>
    </Layout>
  )
}
