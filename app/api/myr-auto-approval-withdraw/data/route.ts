import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Helper function to get previous month
function getPreviousMonth(year: string, month: string): { year: string, month: string } {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']
  const currentMonthIndex = monthNames.indexOf(month)
  const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
  const prevMonth = monthNames[prevMonthIndex]
  const prevYear = currentMonthIndex === 0 ? (parseInt(year) - 1).toString() : year
  return { year: prevYear, month: prevMonth }
}

// Helper function to calculate MoM percentage
function calculateMoM(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / previous) * 100
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MYR Auto Approval Withdraw DATA API] Starting request')
    const { searchParams } = new URL(request.url)
    
    // Get slicer parameters
    const line = searchParams.get('line')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const isDateRange = searchParams.get('isDateRange') === 'true'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    console.log('🔍 [DEBUG] Query parameters:', { line, year, month, isDateRange, startDate, endDate })
    
    // Build query filters
    let withdrawQuery = supabase
      .from('withdraw')
      .select('*')
      .eq('currency', 'MYR')
    
    // Line filter: Skip if "ALL" to fetch all lines
    if (line && line !== 'ALL') {
      withdrawQuery = withdrawQuery.eq('line', line)
      console.log('🔍 [DEBUG] Added line filter:', line)
    } else {
      console.log('🔍 [DEBUG] Line filter: ALL (no filter applied, fetching all lines)')
    }
    
    // Date filtering logic
    if (isDateRange && startDate && endDate) {
      // Daily Mode: Use date range filter
      withdrawQuery = withdrawQuery
        .gte('date', startDate)
        .lte('date', endDate)
      console.log('🔍 [DEBUG] Added date range filter:', { startDate, endDate })
      
      // Validate minimum 7 days
      const start = new Date(startDate)
      const end = new Date(endDate)
      const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      
      if (daysDiff < 7) {
        console.warn('⚠️ [DEBUG] Date range less than 7 days, adjusting...')
        // Adjust start date to ensure minimum 7 days
        const adjustedStart = new Date(end)
        adjustedStart.setDate(end.getDate() - 6) // 7 days total including end date
        const adjustedStartStr = adjustedStart.toISOString().split('T')[0]
        
        withdrawQuery = withdrawQuery
          .gte('date', adjustedStartStr)
          .lte('date', endDate)
        console.log('🔍 [DEBUG] Adjusted date range to minimum 7 days:', { adjustedStartStr, endDate })
      }
    } else {
      // Monthly Mode: Use year and month filter
      if (year) {
        withdrawQuery = withdrawQuery.eq('year', parseInt(year))
        console.log('🔍 [DEBUG] Added year filter:', year)
      }
      
      if (month) {
        withdrawQuery = withdrawQuery.eq('month', month)
        console.log('🔍 [DEBUG] Added month filter:', month)
      }
    }
    
    const { data: withdrawData, error } = await withdrawQuery
    
    if (error) {
      console.error('❌ Error fetching withdraw data:', error)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: error.message
      }, { status: 500 })
    }
    
    console.log('🔍 [DEBUG] Withdraw data:', {
      totalRecords: withdrawData?.length,
      sampleData: withdrawData?.slice(0, 2),
      allChannels: withdrawData?.map(d => d.chanel).slice(0, 10),
      uniqueChannels: Array.from(new Set(withdrawData?.map(d => d.chanel) || []))
    })
    
    if (!withdrawData || withdrawData.length === 0) {
      console.log('⚠️ [DEBUG] No withdraw data found')
      return NextResponse.json({
        success: true,
        data: {
          withdrawAmount: 0,
          withdrawCases: 0,
          averageProcessingTime: 0,
          overdueTransactions: 0,
          coverageRate: 0,
          manualTimeSaved: 0,
          automation: {
            automationTransactions: 0,
            manualTransactions: 0,
            automationRate: 0,
            manualProcessingRate: 0,
            automationAmountRate: 0
          },
          processingTime: {
            avgAll: 0,
            avgAutomation: 0,
            avgManual: 0,
            efficiencyRatio: 0
          },
          performance: {
            overdueTransactions: 0,
            fastProcessingRate: 0,
            overdueRate: 0,
            automationOverdue: 0,
            manualOverdue: 0
          },
          debug: {
            totalCases: 0,
            autoApprovalCases: 0,
            manualCases: 0,
            manualAvgProcessingTime: 0,
            autoAvgProcessingTime: 0,
            timeSavedPerTransaction: 0,
            totalTimeSavedSeconds: 0,
            autoApprovalTransactionVolume: 0
          },
          weeklyProcessingTime: [],
          weeklyCoverageRate: [],
          weeklyOverdueTransactions: [],
          automationOverdueTransactionsTrend: {
            series: [],
            categories: []
          },
          dailyOverdueCount: [],
          dailyProcessingDistribution: [],
          dailyAutomationProcessingDistribution: [],
          peakHourProcessingTime: [],
          momComparison: {
            totalTransactions: 0,
            automationTransactions: 0,
            avgAutomationProcessingTime: 0,
            automationOverdue: 0,
            coverageRate: 0,
            manualTimeSaved: 0
          },
          metadata: {
            totalRecords: 0,
            dateRange: { start: null, end: null },
            automationStartDate: '2025-01-01',
            lastUpdated: new Date().toISOString(),
            maxDateData: 0
          }
        }
      })
    }

    // Define automation logic using chanel column
    // Based on actual data: 'Automation', 'Manual', 'Website'
    const automationTransactions = withdrawData.filter(d => {
      if (!d.chanel) return false
      return d.chanel === 'Automation'
    })
    const manualTransactions = withdrawData.filter(d => {
      if (!d.chanel) return false
      return d.chanel === 'Manual' || d.chanel === 'Website'
    })
    
    // If still no automation found, assume all are manual (fallback)
    const finalAutomationTransactions = automationTransactions.length > 0 ? automationTransactions : []
    const finalManualTransactions = automationTransactions.length > 0 ? manualTransactions : withdrawData

    console.log('🔍 [DEBUG] Transaction breakdown:', {
      total: withdrawData.length,
      automation: automationTransactions.length,
      manual: manualTransactions.length,
      automationChannels: Array.from(new Set(automationTransactions.map(d => d.chanel))),
      manualChannels: Array.from(new Set(manualTransactions.map(d => d.chanel))),
      allUniqueChannels: Array.from(new Set(withdrawData.map(d => d.chanel))),
      sampleData: withdrawData.slice(0, 3).map(d => ({ chanel: d.chanel, amount: d.amount }))
    })

    // Calculate main KPIs
    const totalAmount = withdrawData.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
    const totalCases = withdrawData.length
    const automationAmount = finalAutomationTransactions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
    const manualAmount = finalManualTransactions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)

    // Processing time calculations
    const automationProcessingTimes = finalAutomationTransactions
      .filter(d => d.proc_sec && (d.proc_sec as number) > 0)
      .map(d => d.proc_sec as number)
    
    const manualProcessingTimes = finalManualTransactions
      .filter(d => d.proc_sec && (d.proc_sec as number) > 0)
      .map(d => d.proc_sec as number)

    const avgAutomationProcessingTime = automationProcessingTimes.length > 0 
      ? automationProcessingTimes.reduce((sum: number, time: number) => sum + time, 0) / automationProcessingTimes.length 
      : 0

    const avgManualProcessingTime = manualProcessingTimes.length > 0 
      ? manualProcessingTimes.reduce((sum: number, time: number) => sum + time, 0) / manualProcessingTimes.length 
      : 0

    const avgAllProcessingTime = withdrawData
      .filter(d => d.proc_sec && (d.proc_sec as number) > 0)
      .reduce((sum: number, d: any) => sum + (d.proc_sec as number), 0) / withdrawData.filter(d => d.proc_sec && (d.proc_sec as number) > 0).length

    // Coverage rate calculation
    const coverageRate = totalCases > 0 ? (finalAutomationTransactions.length / totalCases) * 100 : 0

    // Overdue transactions (processing time > 30 seconds)
    const automationOverdue = finalAutomationTransactions.filter(d => d.proc_sec && (d.proc_sec as number) > 30).length
    const manualOverdue = finalManualTransactions.filter(d => d.proc_sec && (d.proc_sec as number) > 30).length
    const totalOverdue = automationOverdue + manualOverdue

    // Manual time saved calculation
    const timeSavedPerTransaction = avgManualProcessingTime - avgAutomationProcessingTime
    const totalTimeSavedSeconds = timeSavedPerTransaction * finalAutomationTransactions.length
    const manualTimeSaved = totalTimeSavedSeconds / 3600 // Convert to hours

    // Determine automation start date (earliest automation transaction)
    const automationStartDate = finalAutomationTransactions.length > 0 
      ? finalAutomationTransactions.reduce((earliest: string, d: any) => 
          !earliest || d.date < earliest ? d.date : earliest, '')
      : '2025-01-01'

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
            // Get week number within the month
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
        d.chanel === 'Automation'
      )
      const manualTransactions = periodData.filter(d => 
        d.chanel === 'Manual' || d.chanel === 'Website'
      )
      
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
      const automationProcessingTimes = automationTransactions.map((d: any) => d.proc_sec || 0).filter(t => t > 0).sort((a, b) => a - b)
      const automationProcessingTimeStats = {
        min: automationProcessingTimes.length > 0 ? automationProcessingTimes[0] : 0,
        max: automationProcessingTimes.length > 0 ? automationProcessingTimes[automationProcessingTimes.length - 1] : 0,
        median: automationProcessingTimes.length > 0 ? automationProcessingTimes[Math.floor(automationProcessingTimes.length / 2)] : 0,
        q1: automationProcessingTimes.length > 0 ? automationProcessingTimes[Math.floor(automationProcessingTimes.length * 0.25)] : 0,
        q3: automationProcessingTimes.length > 0 ? automationProcessingTimes[Math.floor(automationProcessingTimes.length * 0.75)] : 0
      }
      
      // Calculate KPIs
      const avgProcessingTime = periodData
        .filter(d => d.proc_sec && (d.proc_sec as number) > 0)
        .reduce((sum: number, d: any) => sum + (d.proc_sec as number), 0) / periodData.filter(d => d.proc_sec && (d.proc_sec as number) > 0).length || 0

      const avgProcessingTimeAutomation = automationTransactions.length > 0 && automationTransactions.filter(d => d.proc_sec && (d.proc_sec as number) > 0).length > 0
        ? automationTransactions.filter(d => d.proc_sec && (d.proc_sec as number) > 0).reduce((sum: number, d: any) => sum + (d.proc_sec as number), 0) / automationTransactions.filter(d => d.proc_sec && (d.proc_sec as number) > 0).length
        : 0

      const coverageRate = periodData.length > 0 ? (automationTransactions.length / periodData.length) * 100 : 0
      const overdueCount = automationTransactions.filter(d => d.proc_sec && (d.proc_sec as number) > 30).length
      
      return {
        totalTransactions,
        automationTransactions: automationTransactions.length,
        manualTransactions: manualTransactions.length,
        avgProcessingTime,
        avgProcessingTimeAutomation,
        coverageRate,
        overdueCount,
        processingTimeDistribution: periodProcessingTimeStats,
        automationProcessingTimeDistribution: automationProcessingTimeStats
      }
    }

    // Generate time series data
    // Always use daily grouping - for both date range mode and monthly mode
    const period = 'daily'
    const groupedData = groupDataByPeriod(withdrawData, period)
    
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

    // Month-over-Month comparison
    console.log('🔄 [MoM] Calculating Month-over-Month comparison...')
    const { year: prevYear, month: prevMonth } = getPreviousMonth(year || '2025', month || 'September')
    
    // Fetch previous month data
    const { data: prevMonthData } = await supabase
      .from('withdraw')
      .select('*')
      .eq('currency', 'MYR')
      .eq('year', parseInt(prevYear))
      .eq('month', prevMonth)

    if (line && line !== 'ALL') {
      // Apply line filter if specified
      prevMonthData?.filter(d => d.line === line)
    }

    const prevMonthAutomation = prevMonthData?.filter(d => {
      if (!d.chanel) return false
      return d.chanel === 'Automation'
    }) || []
    const prevMonthAutomationOverdue = prevMonthAutomation.filter(d => d.proc_sec && (d.proc_sec as number) > 30).length
    const prevMonthAvgProcessingTime = prevMonthAutomation.length > 0 
      ? prevMonthAutomation.reduce((sum: number, d: any) => sum + (d.proc_sec || 0), 0) / prevMonthAutomation.length 
      : 0
    const prevMonthCoverageRate = prevMonthData?.length ? (prevMonthAutomation.length / prevMonthData.length) * 100 : 0
    const prevMonthTimeSaved = prevMonthData?.length 
      ? (prevMonthData.filter(d => {
          if (!d.chanel) return false
          return d.chanel === 'Manual' || d.chanel === 'Website'
        }).length * (prevMonthAvgProcessingTime - prevMonthAvgProcessingTime)) / 3600
      : 0

    const momComparison = {
      totalTransactions: calculateMoM(totalCases, prevMonthData?.length || 0),
      automationTransactions: calculateMoM(finalAutomationTransactions.length, prevMonthAutomation.length),
      avgAutomationProcessingTime: calculateMoM(avgAutomationProcessingTime, prevMonthAvgProcessingTime),
      automationOverdue: calculateMoM(automationOverdue, prevMonthAutomationOverdue),
      coverageRate: calculateMoM(coverageRate, prevMonthCoverageRate),
      manualTimeSaved: calculateMoM(manualTimeSaved, prevMonthTimeSaved)
    }

    // Calculate max date data for current month
    const maxDateData = withdrawData.length > 0
      ? Math.max(...withdrawData.map(d => new Date(d.date as string).getDate()))  
      : 0

    const response = NextResponse.json({
      success: true,
      data: {
        withdrawAmount: totalAmount,
        withdrawCases: totalCases,
        averageProcessingTime: avgAutomationProcessingTime,  // CHANGED: Use automation avg instead of all avg
        overdueTransactions: totalOverdue,
        coverageRate,
        manualTimeSaved,
        automation: {
          automationTransactions: finalAutomationTransactions.length,
          manualTransactions: finalManualTransactions.length,
          automationRate: (finalAutomationTransactions.length / totalCases) * 100,
          manualProcessingRate: (finalManualTransactions.length / totalCases) * 100,
          automationAmountRate: (automationAmount / totalAmount) * 100
        },
        processingTime: {
          avgAll: avgAllProcessingTime,
          avgAutomation: avgAutomationProcessingTime,
          avgManual: avgManualProcessingTime,
          efficiencyRatio: avgManualProcessingTime > 0 ? avgAutomationProcessingTime / avgManualProcessingTime : 0
        },
        performance: {
          overdueTransactions: totalOverdue,
          fastProcessingRate: ((totalCases - totalOverdue) / totalCases) * 100,
          overdueRate: (totalOverdue / totalCases) * 100,
          automationOverdue,
          manualOverdue
        },
        debug: {
          totalCases,
          autoApprovalCases: finalAutomationTransactions.length,
          manualCases: finalManualTransactions.length,
          manualAvgProcessingTime: avgManualProcessingTime,
          autoAvgProcessingTime: avgAutomationProcessingTime,
          timeSavedPerTransaction,
          totalTimeSavedSeconds,
          autoApprovalTransactionVolume: finalAutomationTransactions.length
        },
        weeklyProcessingTime: timeSeriesData.map(item => ({
          week: item.period,
          avgProcessingTime: item.avgProcessingTimeAutomation
        })),
        weeklyCoverageRate: timeSeriesData.map(item => ({
          week: item.period,
          coverageRate: item.coverageRate
        })),
        weeklyOverdueTransactions: timeSeriesData.map(item => ({
          week: item.period,
          overdueCount: item.overdueCount
        })),
        automationOverdueTransactionsTrend: {
          series: [{
            name: 'Automation Overdue Count',
            data: timeSeriesData.map(item => item.overdueCount)
          }],
          categories: timeSeriesData.map(item => item.period)
        },
        dailyOverdueCount: timeSeriesData.map(item => ({
          date: item.period,
          overdueCount: item.overdueCount
        })),
        dailyProcessingDistribution: timeSeriesData.map(item => ({
          date: item.period,
          min: item.processingTimeDistribution.min,
          q1: item.processingTimeDistribution.q1,
          median: item.processingTimeDistribution.median,
          q3: item.processingTimeDistribution.q3,
          max: item.processingTimeDistribution.max
        })),
        dailyAutomationProcessingDistribution: timeSeriesData.map(item => ({
          date: item.period,
          min: item.automationProcessingTimeDistribution.min,
          q1: item.automationProcessingTimeDistribution.q1,
          median: item.automationProcessingTimeDistribution.median,
          q3: item.automationProcessingTimeDistribution.q3,
          max: item.automationProcessingTimeDistribution.max
        })),
        peakHourProcessingTime: timeSeriesData.map(item => {
          // Find the actual peak hour for this period
          const periodData = groupedData[item.period] || []
          
          // Group by hour to find peak hour
          const hourlyData: { [hour: string]: any[] } = {}
          periodData.forEach(d => {
            const hour = new Date((d.date as string) + ' ' + (d.time as string)).getHours()
            const hourStr = hour.toString().padStart(2, '0') + ':00'
            if (!hourlyData[hourStr]) {
              hourlyData[hourStr] = []
            }
            hourlyData[hourStr].push(d)
          })
          
          // Find hour with maximum total transactions
          let maxHour = '00:00'
          let maxTotalTransactions = 0
          let maxAutomationTransactions = 0
          
          Object.entries(hourlyData).forEach(([hour, transactions]) => {
            const totalTransactions = transactions.length
            const automationTransactions = transactions.filter(t => {
              if (!t.chanel) return false
              return t.chanel === 'Automation'
            }).length
            
            if (totalTransactions > maxTotalTransactions) {
              maxTotalTransactions = totalTransactions
              maxHour = hour
              maxAutomationTransactions = automationTransactions
            }
          })
          
          return {
            period: item.period,
            peakHour: maxHour,
            maxTotalTransactions: maxTotalTransactions,
            automationTransactions: maxAutomationTransactions,
            avgProcessingTimeAutomation: item.avgProcessingTimeAutomation
          }
        }),
        momComparison,
        metadata: {
          totalRecords: withdrawData.length,
          dateRange: {
            start: withdrawData.length > 0 ? new Date(Math.min(...withdrawData.map(d => new Date(d.date as string).getTime()))).getTime() : null,
            end: withdrawData.length > 0 ? new Date(Math.max(...withdrawData.map(d => new Date(d.date as string).getTime()))).getTime() : null
          },
          automationStartDate,
          lastUpdated: new Date().toISOString(),
          maxDateData
        }
      }
    })

    // Add aggressive cache busting headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')
    response.headers.set('Last-Modified', new Date().toUTCString())
    response.headers.set('ETag', `"${Date.now()}-${Math.random()}"`)

    return response

  } catch (error) {
    console.error('❌ [MYR Auto Approval Withdraw DATA API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}