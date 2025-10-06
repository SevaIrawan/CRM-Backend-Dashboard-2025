import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MYR Auto Approval Monitor DATA API] Fetching data - FORCE MAX DATE')
    const { searchParams } = new URL(request.url)
    
    // Get slicer parameters
    const line = searchParams.get('line')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const isWeekly = searchParams.get('isWeekly') === 'true'
    const isMonthly = searchParams.get('isMonthly') === 'true'
    
    console.log('🔍 [DEBUG] Query parameters:', {
      line,
      year,
      month,
      isWeekly,
      isMonthly
    })
    
    // Build query filters
    let depositQuery = supabase
      .from('deposit')
      .select('*')
      .eq('currency', 'MYR')
      .not('proc_sec', 'is', null)
    
    console.log('🔍 [DEBUG] Base query filters:', {
      currency: 'MYR',
      proc_sec: 'not null'
    })
    
    if (line) {
      depositQuery = depositQuery.eq('line', line)
      console.log('🔍 [DEBUG] Added line filter:', line)
    }
    
    if (year) {
      depositQuery = depositQuery.eq('year', parseInt(year))
      console.log('🔍 [DEBUG] Added year filter:', year)
    }
    
    if (month) {
      // Month is already just the month name (e.g., "September")
      depositQuery = depositQuery.eq('month', month)
      console.log('🔍 [DEBUG] Added month filter:', month)
    }
    
    const { data: depositData, error } = await depositQuery
    
    if (error) {
      console.error('Error fetching deposit data:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch deposit data'
      }, { status: 500 })
    }
    
    console.log('🔍 [DEBUG] Raw deposit data:', {
      totalRecords: depositData?.length,
      sampleRecords: depositData?.slice(0, 3),
      totalAmount: depositData?.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
    })
    
    // Check if we're missing some data
    console.log('🔍 [DEBUG] Expected vs Actual:', {
      expectedAmount: 1931897.94,
      expectedCases: 22102,
      actualAmount: depositData?.reduce((sum: number, d: any) => sum + (d.amount || 0), 0),
      actualCases: depositData?.length,
      difference: {
        amount: 1931897.94 - (depositData?.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) || 0),
        cases: 22102 - (depositData?.length || 0)
      }
    })
    
    if (!depositData || depositData.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          averageProcessingTime: 0,
          overdueTransactions: 0,
          coverageRate: 0,
          manualTimeSaved: 0,
          totalCases: 0,
          autoApprovalCases: 0,
          manualAvgProcessingTime: 0,
          autoAvgProcessingTime: 0
        }
      })
    }
    
    // ============================================
    // KPI LOGIC FOUNDATION - COMPREHENSIVE CALCULATIONS
    // ============================================
    
    // Base Data Filtering
    const totalTransactions = depositData.length
    const automationTransactions = depositData.filter((d: any) => 
      d.operator_group === 'Automation' || d.operator_group === 'BOT'
    )
    const manualTransactions = depositData.filter((d: any) => 
      d.operator_group === 'Staff' || d.operator_group === 'User' || d.operator_group === 'Manual'
    )
    
    // ============================================
    // VOLUME KPIs
    // ============================================
    
    // 1. Total Amount = sum(deposit[amount])
    const totalAmount = depositData.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
    
    // 2. Total Transactions = count of all transactions
    const depositCases = totalTransactions
    
    console.log('🔍 [DEBUG] KPI Calculations:', {
      totalTransactions,
      totalAmount,
      depositCases,
      automationTransactions: automationTransactions.length,
      manualTransactions: manualTransactions.length
    })
    
    // 3. Average Transaction Value = total amount / total transactions
    const avgTransactionValue = totalTransactions > 0 ? totalAmount / totalTransactions : 0
    
    // 4. Automation Amount = sum(amount) where operator_group = 'Automation'
    const automationAmount = automationTransactions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
    
    // 5. Manual Amount = sum(amount) where operator_group != 'Automation'
    const manualAmount = manualTransactions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
    
    // ============================================
    // AUTOMATION EFFICIENCY KPIs
    // ============================================
    
    // 6. Automation Rate = (automation transactions / total transactions) * 100
    const automationRate = totalTransactions > 0 ? (automationTransactions.length / totalTransactions) * 100 : 0
    
    // 7. Manual Processing Rate = (manual transactions / total transactions) * 100
    const manualProcessingRate = totalTransactions > 0 ? (manualTransactions.length / totalTransactions) * 100 : 0
    
    // 8. Automation Amount Rate = (automation amount / total amount) * 100
    const automationAmountRate = totalAmount > 0 ? (automationAmount / totalAmount) * 100 : 0
    
    // ============================================
    // PROCESSING TIME KPIs
    // ============================================
    
    // 9. Average Processing Time (All) = sum(proc_sec) / count of all transactions
    const avgProcessingTimeAll = totalTransactions > 0 ? 
      depositData.reduce((sum: number, d: any) => sum + (d.proc_sec || 0), 0) / totalTransactions : 0
    
    // 10. Average Processing Time (Automation) = sum(proc_sec) where automation / count automation
    const avgProcessingTimeAutomation = automationTransactions.length > 0 ? 
      automationTransactions.reduce((sum: number, d: any) => sum + (d.proc_sec || 0), 0) / automationTransactions.length : 0
    
    // 11. Average Processing Time (Manual) = sum(proc_sec) where manual / count manual
    const avgProcessingTimeManual = manualTransactions.length > 0 ? 
      manualTransactions.reduce((sum: number, d: any) => sum + (d.proc_sec || 0), 0) / manualTransactions.length : 0
    
    // 12. Processing Time Efficiency Ratio = total_process_time / total_automation_process_time
    const totalProcessingTime = depositData.reduce((sum: number, d: any) => sum + (d.proc_sec || 0), 0)
    const automationProcessingTime = automationTransactions.reduce((sum: number, d: any) => sum + (d.proc_sec || 0), 0)
    const processingTimeEfficiencyRatio = automationProcessingTime > 0 ? totalProcessingTime / automationProcessingTime : 0
    
    // ============================================
    // PERFORMANCE KPIs
    // ============================================
    
    // 13. Overdue Transactions = count where proc_sec > 30 seconds
    const threshold = 30 // seconds
    const overdueTransactions = depositData.filter((d: any) => (d.proc_sec || 0) > threshold).length
    
    // 14. Fast Processing Rate = (count where proc_sec <= 10 / total transactions) * 100
    const fastProcessingTransactions = depositData.filter((d: any) => (d.proc_sec || 0) <= 10).length
    const fastProcessingRate = totalTransactions > 0 ? (fastProcessingTransactions / totalTransactions) * 100 : 0
    
    // 15. Overdue Rate = (overdue transactions / total transactions) * 100
    const overdueRate = totalTransactions > 0 ? (overdueTransactions / totalTransactions) * 100 : 0
    
    // 16. Automation Overdue = count automation where proc_sec > 30
    const automationOverdue = automationTransactions.filter((d: any) => (d.proc_sec || 0) > threshold).length
    
    // 17. Manual Overdue = count manual where proc_sec > 30
    const manualOverdue = manualTransactions.filter((d: any) => (d.proc_sec || 0) > threshold).length
    
    // ============================================
    // TIME SAVINGS & EFFICIENCY KPIs
    // ============================================
    
    // 18. Time Saved per Transaction = manual_avg_time - automation_avg_time
    const timeSavedPerTransaction = avgProcessingTimeManual - avgProcessingTimeAutomation
    
    // 19. Total Time Saved (Seconds) = time_saved_per_transaction * automation_transaction_count
    const totalTimeSavedSeconds = timeSavedPerTransaction * automationTransactions.length
    
    // 20. Total Time Saved (Hours) = total_time_saved_seconds / 3600
    const totalTimeSavedHours = totalTimeSavedSeconds / 3600
    
    // 21. Efficiency Improvement = ((manual_time - automation_time) / manual_time) * 100
    const efficiencyImprovement = avgProcessingTimeManual > 0 ? 
      ((avgProcessingTimeManual - avgProcessingTimeAutomation) / avgProcessingTimeManual) * 100 : 0
    
    // ============================================
    // COVERAGE & DISTRIBUTION KPIs
    // ============================================
    
    // 22. Coverage Rate = (automation transactions / total transactions) * 100 (same as automation rate)
    const coverageRate = automationRate
    
    // 23. Processing Time Distribution Stats
    const processingTimes = depositData.map((d: any) => d.proc_sec || 0).filter(t => t > 0).sort((a, b) => a - b)
    const processingTimeStats = {
      min: processingTimes.length > 0 ? processingTimes[0] : 0,
      max: processingTimes.length > 0 ? processingTimes[processingTimes.length - 1] : 0,
      median: processingTimes.length > 0 ? processingTimes[Math.floor(processingTimes.length / 2)] : 0,
      q1: processingTimes.length > 0 ? processingTimes[Math.floor(processingTimes.length * 0.25)] : 0,
      q3: processingTimes.length > 0 ? processingTimes[Math.floor(processingTimes.length * 0.75)] : 0
    }
    
    // ============================================
    // PEAK HOUR ANALYSIS KPIs
    // ============================================
    
    // Group data by hour to find peak hours
    const hourlyData: { [hour: string]: any[] } = {}
    depositData.forEach(item => {
      if (item.time && typeof item.time === 'string') {
        const hour = item.time.split(':')[0] // Extract hour (HH:MM:SS -> HH)
        if (!hourlyData[hour]) hourlyData[hour] = []
        hourlyData[hour].push(item)
      }
    })
    
    // Calculate hourly metrics
    const hourlyMetrics = Object.keys(hourlyData).map(hour => {
      const hourTransactions = hourlyData[hour]
      const hourAutomation = hourTransactions.filter(d => 
        d.operator_group === 'Automation' || d.operator_group === 'BOT'
      )
      const hourManual = hourTransactions.filter(d => 
        d.operator_group === 'Staff' || d.operator_group === 'User' || d.operator_group === 'Manual'
      )
      
      return {
        hour: `${hour}:00`,
        totalCases: hourTransactions.length,
        automationCases: hourAutomation.length,
        manualCases: hourManual.length,
        automationContribution: hourTransactions.length > 0 ? 
          (hourAutomation.length / hourTransactions.length) * 100 : 0,
        avgProcessingTime: hourTransactions.length > 0 ? 
          hourTransactions.reduce((sum, d) => sum + (d.proc_sec || 0), 0) / hourTransactions.length : 0
      }
    }).sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
    
    // Find peak hour (hour with highest total cases)
    const peakHour = hourlyMetrics.reduce((peak, current) => 
      current.totalCases > peak.totalCases ? current : peak, 
      { totalCases: 0, hour: '00:00', automationCases: 0, manualCases: 0, automationContribution: 0, avgProcessingTime: 0 }
    )
    
    // Peak Hour KPIs
    const peakHourTotalCases = peakHour.totalCases
    const peakHourAutomationCases = peakHour.automationCases
    const peakHourAutomationContribution = peakHour.automationContribution
    const peakHourTime = peakHour.hour
    
    // ============================================
    // LEGACY KPI MAPPING (for backward compatibility)
    // ============================================
    
    // Map to original KPI names for StatCard display
    const depositAmount = totalAmount
    const averageProcessingTime = processingTimeEfficiencyRatio
    const manualTimeSaved = totalTimeSavedHours
    
    // ============================================
    // CHART DATA GENERATION - DAILY/WEEKLY/MONTHLY TRACKING
    // ============================================
    
    // Helper function to group data by time period
    const groupDataByPeriod = (data: any[], period: 'daily' | 'weekly' | 'monthly') => {
      const grouped: { [key: string]: any[] } = {}
      
      data.forEach(item => {
        const date = new Date(item.date)
        let key = ''
        
        switch (period) {
          case 'daily':
            key = date.toISOString().split('T')[0] // YYYY-MM-DD
            break
          case 'weekly':
            // Get week number within the month - CORRECTED LOGIC
            const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
            const firstWeekStart = new Date(firstDayOfMonth)
            firstWeekStart.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay())
            
            const currentWeekStart = new Date(date)
            currentWeekStart.setDate(date.getDate() - date.getDay())
            
            const weekNumber = Math.floor((currentWeekStart.getTime() - firstWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
            key = `${date.getFullYear()}-W${weekNumber}`
            break
          case 'monthly':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            break
        }
        
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(item)
      })
      
      return grouped
    }
    
    // Calculate KPIs for each time period
    const calculatePeriodKPIs = (periodData: any[]) => {
      const totalTransactions = periodData.length
      const automationTransactions = periodData.filter(d => 
        d.operator_group === 'Automation' || d.operator_group === 'BOT'
      )
      const manualTransactions = periodData.filter(d => 
        d.operator_group === 'Staff' || d.operator_group === 'User' || d.operator_group === 'Manual'
      )
      
      // Debug: Log automation data if found before Sep 22
      if (automationTransactions.length > 0) {
        const sampleDate = periodData[0]?.date
        if (sampleDate && sampleDate < '2025-09-22') {
          console.log('🚨 [DEBUG] Found automation data before Sep 22:', {
            date: sampleDate,
            automationCount: automationTransactions.length,
            sampleAutomation: automationTransactions[0]
          })
        }
      }
      
      // Calculate processing time distribution stats for this period (ALL transactions)
      const periodProcessingTimes = periodData.map((d: any) => d.proc_sec || 0).filter(t => t > 0).sort((a, b) => a - b)
      const periodProcessingTimeStats = {
        min: periodProcessingTimes.length > 0 ? periodProcessingTimes[0] : 0,
        max: periodProcessingTimes.length > 0 ? periodProcessingTimes[periodProcessingTimes.length - 1] : 0,
        median: periodProcessingTimes.length > 0 ? periodProcessingTimes[Math.floor(periodProcessingTimes.length / 2)] : 0,
        q1: periodProcessingTimes.length > 0 ? periodProcessingTimes[Math.floor(periodProcessingTimes.length * 0.25)] : 0,
        q3: periodProcessingTimes.length > 0 ? periodProcessingTimes[Math.floor(periodProcessingTimes.length * 0.75)] : 0
      }
      
      // Calculate processing time distribution stats for AUTOMATION ONLY
      const automationProcessingTimes = automationTransactions.filter(d => d.date >= '2025-09-22').map((d: any) => d.proc_sec || 0).filter(t => t > 0).sort((a, b) => a - b)
      const automationProcessingTimeStats = {
        min: automationProcessingTimes.length > 0 ? automationProcessingTimes[0] : 0,
        max: automationProcessingTimes.length > 0 ? automationProcessingTimes[automationProcessingTimes.length - 1] : 0,
        median: automationProcessingTimes.length > 0 ? automationProcessingTimes[Math.floor(automationProcessingTimes.length / 2)] : 0,
        q1: automationProcessingTimes.length > 0 ? automationProcessingTimes[Math.floor(automationProcessingTimes.length * 0.25)] : 0,
        q3: automationProcessingTimes.length > 0 ? automationProcessingTimes[Math.floor(automationProcessingTimes.length * 0.75)] : 0
      }
      
      return {
        totalAmount: periodData.reduce((sum, d) => sum + (d.amount || 0), 0),
        totalTransactions,
        automationTransactions: automationTransactions.length,
        manualTransactions: manualTransactions.length,
        avgProcessingTimeAll: totalTransactions > 0 ? 
          periodData.reduce((sum, d) => sum + (d.proc_sec || 0), 0) / totalTransactions : 0,
        avgProcessingTimeAutomation: automationTransactions.filter(d => d.date >= '2025-09-22').length > 0 ? 
          automationTransactions.filter(d => d.date >= '2025-09-22').reduce((sum, d) => sum + (d.proc_sec || 0), 0) / automationTransactions.filter(d => d.date >= '2025-09-22').length : 0,
        avgProcessingTimeManual: manualTransactions.length > 0 ? 
          manualTransactions.reduce((sum, d) => sum + (d.proc_sec || 0), 0) / manualTransactions.length : 0,
        automationRate: totalTransactions > 0 ? (automationTransactions.length / totalTransactions) * 100 : 0,
        overdueTransactions: periodData.filter(d => (d.proc_sec || 0) > 30).length,
        automationOverdueTransactions: automationTransactions.filter(d => (d.proc_sec || 0) > 30 && d.date >= '2025-09-22').length,
        fastProcessingRate: totalTransactions > 0 ? 
          (periodData.filter(d => (d.proc_sec || 0) <= 10).length / totalTransactions) * 100 : 0,
        // Add processing time distribution stats (ALL transactions)
        processingTimeDistribution: periodProcessingTimeStats,
        // Add automation-only processing time distribution stats
        automationProcessingTimeDistribution: automationProcessingTimeStats
      }
    }
    
    // Generate chart data based on period
    let chartData = {}
    const period = isMonthly ? 'monthly' : (isWeekly ? 'weekly' : 'daily')
    const groupedData = groupDataByPeriod(depositData, period)
    
    // Sort periods chronologically
    const sortedPeriods = Object.keys(groupedData).sort()
    
    // Generate time series data for all KPIs
    const timeSeriesData = sortedPeriods.map(periodKey => {
      const periodKPIs = calculatePeriodKPIs(groupedData[periodKey])
      const dateLabel = period === 'daily' ? 
        new Date(periodKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
        period === 'weekly' ? 
        `Week ${periodKey.split('-W')[1]}` :
        new Date(periodKey + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      
      return {
        period: dateLabel,
        ...periodKPIs
      }
    })
    
    // Structure chart data for frontend
    chartData = {
      // Volume KPIs
      totalAmountTrend: {
        series: [{ name: 'Total Amount', data: timeSeriesData.map(d => d.totalAmount) }],
        categories: timeSeriesData.map(d => d.period)
      },
      totalTransactionsTrend: {
        series: [{ name: 'Total Transactions', data: timeSeriesData.map(d => d.totalTransactions) }],
        categories: timeSeriesData.map(d => d.period)
      },
      
      // Automation KPIs
      automationRateTrend: {
        series: [{ name: 'Automation Rate', data: timeSeriesData.map(d => d.automationRate) }],
        categories: timeSeriesData.map(d => d.period)
      },
      automationTransactionsTrend: {
        series: [{ name: 'Automation Transactions', data: timeSeriesData.map(d => d.automationTransactions) }],
        categories: timeSeriesData.map(d => d.period)
      },
      
      // Processing Time KPIs
      avgProcessingTimeAllTrend: {
        series: [{ name: 'Avg Processing Time (All)', data: timeSeriesData.map(d => d.avgProcessingTimeAll) }],
        categories: timeSeriesData.map(d => d.period)
      },
      avgProcessingTimeAutomationTrend: {
        series: [{ name: 'Avg Processing Time (Automation)', data: timeSeriesData.map(d => d.avgProcessingTimeAutomation) }],
        categories: timeSeriesData.map(d => d.period)
      },
      avgProcessingTimeManualTrend: {
        series: [{ name: 'Avg Processing Time (Manual)', data: timeSeriesData.map(d => d.avgProcessingTimeManual) }],
        categories: timeSeriesData.map(d => d.period)
      },
      
      // Performance KPIs
      overdueTransactionsTrend: {
        series: [{ name: 'Overdue Transactions', data: timeSeriesData.map(d => d.overdueTransactions) }],
        categories: timeSeriesData.map(d => d.period)
      },
      automationOverdueTransactionsTrend: (() => {
        // Always use weekly data for this chart regardless of isWeekly toggle
        const weeklyGroupedData = groupDataByPeriod(depositData, 'weekly')
        const sortedWeeklyPeriods = Object.keys(weeklyGroupedData).sort()
        const weeklyTimeSeriesData = sortedWeeklyPeriods.map(periodKey => {
          const periodKPIs = calculatePeriodKPIs(weeklyGroupedData[periodKey])
          const weekLabel = `Week ${periodKey.split('-W')[1]}`
          return {
            period: weekLabel,
            ...periodKPIs
          }
        })
        return {
          series: [{ name: 'Automation Overdue Transactions', data: weeklyTimeSeriesData.map(d => d.automationOverdueTransactions) }],
          categories: weeklyTimeSeriesData.map(d => d.period)
        }
      })(),
      fastProcessingRateTrend: {
        series: [{ name: 'Fast Processing Rate', data: timeSeriesData.map(d => d.fastProcessingRate) }],
        categories: timeSeriesData.map(d => d.period)
      },
      
      // Legacy chart data (for backward compatibility)
      weeklyProcessingTime: timeSeriesData.map(d => ({
        week: d.period,
        avgProcessingTime: d.avgProcessingTimeAutomation
      })),
      weeklyOverdueTransactions: timeSeriesData.map(d => ({
        week: d.period,
        overdueCount: d.automationOverdueTransactions
      })),
      dailyOverdueCount: timeSeriesData.map(d => ({
        date: d.period,
        overdueCount: d.automationOverdueTransactions
      })),
      dailyProcessingDistribution: timeSeriesData.map(d => ({
        date: d.period,
        min: d.processingTimeDistribution.min,
        q1: d.processingTimeDistribution.q1,
        median: d.processingTimeDistribution.median,
        q3: d.processingTimeDistribution.q3,
        max: d.processingTimeDistribution.max
      })),
      // Automation-only processing time distribution
      dailyAutomationProcessingDistribution: timeSeriesData.map(d => ({
        date: d.period,
        min: d.automationProcessingTimeDistribution.min,
        q1: d.automationProcessingTimeDistribution.q1,
        median: d.automationProcessingTimeDistribution.median,
        q3: d.automationProcessingTimeDistribution.q3,
        max: d.automationProcessingTimeDistribution.max
      })),
      peakHourProcessingTime: timeSeriesData.map(d => ({
        hour: d.period,
        avgProcessingTime: d.avgProcessingTimeAll
      }))
    }

    console.log('🔍 [DEBUG] Final return values:', {
      depositAmount: Math.round(depositAmount * 100) / 100,
      depositCases,
      totalAmount,
      totalTransactions
    })
    
    // Add cache busting headers to force fresh data
    const response = NextResponse.json({
      success: true,
      data: {
        // ============================================
        // MAIN KPIs (for StatCard display)
        // ============================================
        depositAmount: Math.round(depositAmount * 100) / 100,
        depositCases,
        averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
        overdueTransactions,
        coverageRate: Math.round(coverageRate * 100) / 100,
        manualTimeSaved: Math.round(manualTimeSaved * 100) / 100,
        
        // ============================================
        // COMPREHENSIVE KPI DATA
        // ============================================
        
        // Volume KPIs
        volume: {
          totalTransactions: depositCases,
          automationTransactions: automationTransactions.length,
          manualTransactions: manualTransactions.length
        },
        
        // Automation KPIs
        automation: {
          automationTransactions: automationTransactions.length,
          automationRate: Math.round(automationRate * 100) / 100
        },
        
        // Processing Time KPIs
        processingTime: {
          avgAutomation: Math.round(avgProcessingTimeAutomation * 100) / 100,
          avgManual: Math.round(avgProcessingTimeManual * 100) / 100,
          avgOverall: Math.round(averageProcessingTime * 100) / 100
        },
        
        // Performance KPIs
        performance: {
          overdueTransactions,
          automationOverdue,
          manualOverdue,
          overdueRate: Math.round(overdueRate * 100) / 100
        },
        
        // Time Savings KPIs
        timeSavings: {
          manualTimeSaved: Math.round(manualTimeSaved * 100) / 100,
          efficiencyGain: Math.round(efficiencyImprovement * 100) / 100
        },
        
        // Distribution KPIs
        distribution: {
          automationVolume: Math.round(automationAmount * 100) / 100,
          manualVolume: Math.round(manualAmount * 100) / 100,
          coverageRate: Math.round(coverageRate * 100) / 100
        },
        
        // ============================================
        // TIME SERIES DATA (for charts)
        // ============================================
        
        // Weekly Processing Time Trend
        weeklyProcessingTime: timeSeriesData.map(d => ({
          week: d.period,
          avgProcessingTime: d.avgProcessingTimeAutomation
        })),
        
        // Daily Processing Time Trend
        dailyProcessingTime: timeSeriesData.map(d => ({
          date: d.period,
          avgProcessingTime: d.avgProcessingTimeAutomation
        })),
        
        // Automation Overdue Transactions Trend (WEEKLY ONLY)
        automationOverdueTransactionsTrend: (() => {
          // Always use weekly data for this chart regardless of isWeekly toggle
          const weeklyGroupedData = groupDataByPeriod(depositData, 'weekly')
          const sortedWeeklyPeriods = Object.keys(weeklyGroupedData).sort()
          const weeklyTimeSeriesData = sortedWeeklyPeriods.map(periodKey => {
            const periodKPIs = calculatePeriodKPIs(weeklyGroupedData[periodKey])
            const weekLabel = `Week ${periodKey.split('-W')[1]}`
            return {
              period: weekLabel,
              ...periodKPIs
            }
          })
          return {
            series: [{ name: 'Automation Overdue Transactions', data: weeklyTimeSeriesData.map(d => d.automationOverdueTransactions) }],
            categories: weeklyTimeSeriesData.map(d => d.period)
          }
        })(),
        
        // Daily Overdue Count for Line Chart
        dailyOverdueCount: timeSeriesData.map(d => ({
          date: d.period,
          overdueCount: d.automationOverdueTransactions // Changed to automation overdue
        })),
        
        // Additional chart data for missing charts
        weeklyCoverageRate: timeSeriesData.map(d => ({
          week: d.period,
          coverageRate: d.automationRate
        })),
        dailyProcessingDistribution: timeSeriesData.map(d => ({
          date: d.period,
          min: d.processingTimeDistribution.min,
          q1: d.processingTimeDistribution.q1,
          median: d.processingTimeDistribution.median,
          q3: d.processingTimeDistribution.q3,
          max: d.processingTimeDistribution.max
        })),
        // Automation-only processing time distribution
        dailyAutomationProcessingDistribution: timeSeriesData.map(d => ({
          date: d.period,
          min: d.automationProcessingTimeDistribution.min,
          q1: d.automationProcessingTimeDistribution.q1,
          median: d.automationProcessingTimeDistribution.median,
          q3: d.automationProcessingTimeDistribution.q3,
          max: d.automationProcessingTimeDistribution.max
        })),
        peakHourProcessingTime: timeSeriesData.map(d => ({
          hour: d.period,
          avgProcessingTime: d.avgProcessingTimeAll
        })),
        
        // ============================================
        // METADATA
        // ============================================
        metadata: {
          totalRecords: depositData.length,
          dateRange: {
            start: depositData.length > 0 ? Math.min(...depositData.map(d => new Date(d.date as string).getTime())) : null,
            end: depositData.length > 0 ? Math.max(...depositData.map(d => new Date(d.date as string).getTime())) : null
          },
          automationStartDate: '2025-09-22',
          lastUpdated: new Date().toISOString()
        }
      }
    })
    
    // Add cache busting headers to force fresh data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('Error in auto approval monitor data API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
