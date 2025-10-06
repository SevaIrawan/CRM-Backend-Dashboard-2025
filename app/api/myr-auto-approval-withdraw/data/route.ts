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
    const isWeekly = searchParams.get('isWeekly') === 'true'
    
    console.log('🔍 [DEBUG] Query parameters:', { line, year, month, isWeekly })
    
    // Build query filters
    let withdrawQuery = supabase
      .from('withdraw')
      .select('*')
      .eq('currency', 'MYR')
    
    if (line && line !== 'ALL') {
      withdrawQuery = withdrawQuery.eq('line', line)
    }
    
    if (year) {
      withdrawQuery = withdrawQuery.eq('year', parseInt(year))
    }
    
    if (month) {
      withdrawQuery = withdrawQuery.eq('month', month)
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
      uniqueChannels: [...new Set(withdrawData?.map(d => d.chanel) || [])]
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
      automationChannels: [...new Set(automationTransactions.map(d => d.chanel))],
      manualChannels: [...new Set(manualTransactions.map(d => d.chanel))],
      allUniqueChannels: [...new Set(withdrawData.map(d => d.chanel))],
      sampleData: withdrawData.slice(0, 3).map(d => ({ chanel: d.chanel, amount: d.amount }))
    })

    // Calculate main KPIs
    const totalAmount = withdrawData.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
    const totalCases = withdrawData.length
    const automationAmount = finalAutomationTransactions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
    const manualAmount = finalManualTransactions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)

    // Processing time calculations
    const automationProcessingTimes = finalAutomationTransactions
      .filter(d => d.proc_sec && d.proc_sec > 0)
      .map(d => d.proc_sec)
    
    const manualProcessingTimes = finalManualTransactions
      .filter(d => d.proc_sec && d.proc_sec > 0)
      .map(d => d.proc_sec)

    const avgAutomationProcessingTime = automationProcessingTimes.length > 0 
      ? automationProcessingTimes.reduce((sum: number, time: number) => sum + time, 0) / automationProcessingTimes.length 
      : 0

    const avgManualProcessingTime = manualProcessingTimes.length > 0 
      ? manualProcessingTimes.reduce((sum: number, time: number) => sum + time, 0) / manualProcessingTimes.length 
      : 0

    const avgAllProcessingTime = withdrawData
      .filter(d => d.proc_sec && d.proc_sec > 0)
      .reduce((sum: number, d: any) => sum + d.proc_sec, 0) / withdrawData.filter(d => d.proc_sec && d.proc_sec > 0).length

    // Coverage rate calculation
    const coverageRate = totalCases > 0 ? (finalAutomationTransactions.length / totalCases) * 100 : 0

    // Overdue transactions (processing time > 30 seconds)
    const automationOverdue = finalAutomationTransactions.filter(d => d.proc_sec && d.proc_sec > 30).length
    const manualOverdue = finalManualTransactions.filter(d => d.proc_sec && d.proc_sec > 30).length
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

    // Group data by period (daily/weekly)
    const groupDataByPeriod = (data: any[], isWeekly: boolean) => {
      const grouped: { [key: string]: any[] } = {}
      
      data.forEach(d => {
        const date = new Date(d.date)
        let periodKey: string
        
        if (isWeekly) {
          // Calculate week number within the month
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
          const firstWeekStart = new Date(monthStart)
          const dayOfWeek = firstWeekStart.getDay()
          const firstMonday = new Date(firstWeekStart)
          firstMonday.setDate(firstMonday.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek))
          
          const weekNumber = Math.ceil(((date.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24) + 1) / 7)
          periodKey = `Week ${Math.max(1, weekNumber)}`
        } else {
          // Daily grouping
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          periodKey = `${monthNames[date.getMonth()]} ${date.getDate()}`
        }
        
        if (!grouped[periodKey]) {
          grouped[periodKey] = []
        }
        grouped[periodKey].push(d)
      })
      
      return grouped
    }

    // Calculate period KPIs
    const calculatePeriodKPIs = (groupedData: { [key: string]: any[] }, isWeekly: boolean) => {
      // Sort periods chronologically, not alphabetically
      const periods = Object.keys(groupedData).sort((a, b) => {
        if (isWeekly) {
          // For weekly, extract week numbers
          const weekA = parseInt(a.replace('Week ', ''))
          const weekB = parseInt(b.replace('Week ', ''))
          return weekA - weekB
        } else {
          // For daily, sort by date
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const [monthA, dayA] = a.split(' ')
          const [monthB, dayB] = b.split(' ')
          const monthIndexA = monthNames.indexOf(monthA)
          const monthIndexB = monthNames.indexOf(monthB)
          
          if (monthIndexA !== monthIndexB) {
            return monthIndexA - monthIndexB
          }
          return parseInt(dayA) - parseInt(dayB)
        }
      })
      
      return periods.map(period => {
        const periodData = groupedData[period]
        const periodAutomation = periodData.filter(d => {
          if (!d.chanel) return false
          return d.chanel === 'Automation'
        })
        const periodManual = periodData.filter(d => {
          if (!d.chanel) return false
          return d.chanel === 'Manual' || d.chanel === 'Website'
        })
        
        const avgProcessingTime = periodData
          .filter(d => d.proc_sec && d.proc_sec > 0)
          .reduce((sum: number, d: any) => sum + d.proc_sec, 0) / periodData.filter(d => d.proc_sec && d.proc_sec > 0).length

        const avgProcessingTimeAutomation = periodAutomation.length > 0 && periodAutomation.filter(d => d.proc_sec && d.proc_sec > 0).length > 0
          ? periodAutomation.filter(d => d.proc_sec && d.proc_sec > 0).reduce((sum: number, d: any) => sum + d.proc_sec, 0) / periodAutomation.filter(d => d.proc_sec && d.proc_sec > 0).length
          : 0

        const coverageRate = periodData.length > 0 ? (periodAutomation.length / periodData.length) * 100 : 0

        const overdueCount = periodAutomation.filter(d => d.proc_sec && d.proc_sec > 30).length

        // Debug log for first few periods
        if (period === 'Sep 1' || period === 'Sep 2' || period === 'Sep 3') {
          console.log(`🔍 [DEBUG] Period ${period}:`, {
            totalData: periodData.length,
            automationData: periodAutomation.length,
            manualData: periodManual.length,
            avgProcessingTimeAutomation,
            coverageRate,
            overdueCount,
            automationChannels: [...new Set(periodAutomation.map(d => d.chanel))]
          })
        }

        return {
          period,
          avgProcessingTime,
          avgProcessingTimeAutomation,
          coverageRate,
          overdueCount
        }
      })
    }

    // Generate time series data
    const groupedData = groupDataByPeriod(withdrawData, isWeekly)
    const timeSeriesData = calculatePeriodKPIs(groupedData, isWeekly)

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
    const prevMonthAutomationOverdue = prevMonthAutomation.filter(d => d.proc_sec && d.proc_sec > 30).length
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
      ? Math.max(...withdrawData.map(d => new Date(d.date).getDate()))
      : 0

    const response = NextResponse.json({
      success: true,
      data: {
        withdrawAmount: totalAmount,
        withdrawCases: totalCases,
        averageProcessingTime: avgAllProcessingTime,
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
          min: 0,
          q1: 0,
          median: item.avgProcessingTimeAutomation,
          q3: 0,
          max: 0
        })),
        dailyAutomationProcessingDistribution: timeSeriesData.map(item => ({
          date: item.period,
          min: 0,
          q1: 0,
          median: item.avgProcessingTimeAutomation,
          q3: 0,
          max: 0
        })),
        peakHourProcessingTime: timeSeriesData.map(item => {
          // Find the actual peak hour for this period
          const periodData = groupedData[item.period] || []
          
          // Group by hour to find peak hour
          const hourlyData: { [hour: string]: any[] } = {}
          periodData.forEach(d => {
            const hour = new Date(d.date + ' ' + d.time).getHours()
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
            start: withdrawData.length > 0 ? new Date(Math.min(...withdrawData.map(d => new Date(d.date).getTime()))).getTime() : null,
            end: withdrawData.length > 0 ? new Date(Math.max(...withdrawData.map(d => new Date(d.date).getTime()))).getTime() : null
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