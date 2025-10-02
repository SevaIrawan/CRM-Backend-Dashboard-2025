import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { currency, line, year, month, startDate, endDate, filterMode, exportType } = await request.json()

    console.log('📊 [USC Member-Analytic Export API] Exporting REAL DATA with USC lock:', { 
      currency, line, year, month, startDate, endDate, filterMode, exportType 
    })

    // Build query for REAL DATA export from blue_whale_usc_summary (MV) - USC currency locked
    let query = supabase.from('blue_whale_usc_summary').select('*')
      .eq('currency', 'USC') // Currency LOCKED to USC

    // Apply filters based on selections - ALL REAL DATA
    // "ALL" means get ALL lines data (no line filter), not literal "ALL" in database
    if (line && line !== 'ALL' && line !== 'all') {
      query = query.eq('line', line)
    }

    if (year && year !== 'ALL') {
      query = query.eq('year', parseInt(year))
    }

    // Handle month vs date range filtering
    if (filterMode === 'month' && month && month !== 'ALL') {
      query = query.eq('month', month)
    } else if (filterMode === 'daterange' && startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    }

    // Order by date for consistent results
    query = query.order('date', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching REAL DATA for USC Member-Analytic export:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching export data',
        message: error.message 
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No real data found for export',
        message: 'No records match the selected filters'
      }, { status: 404 })
    }

    let csvContent = ''
    let filename = ''

    if (exportType === 'retention_table') {
      // Export retention analysis data
      const retentionAnalysis = calculateRetentionAnalysis(data)
      
      const headers = [
        'RETENTION_CATEGORY',
        'MEMBER_COUNT', 
        'PERCENTAGE',
        'DEPOSIT_CASES',
        'DC_PERCENTAGE', 
        'DEPOSIT_AMOUNT',
        'DA_PERCENTAGE',
        'WITHDRAW_CASES', 
        'WC_PERCENTAGE',
        'WITHDRAW_AMOUNT',
        'WA_PERCENTAGE', 
        'GGR',
        'GGR_PERCENTAGE',
        'BONUS'
      ]
      
      csvContent = [
        headers.join(','),
        ...retentionAnalysis.map(category => [
          `"${category.name}"`,
          category.memberCount,
          category.percentage,
          category.depositCases,
          category.dcPercentage,
          category.depositAmount,
          category.daPercentage,
          category.withdrawCases,
          category.wcPercentage,
          category.withdrawAmount,
          category.waPercentage,
          category.ggr,
          category.ggrPercentage,
          category.bonus
        ].join(','))
      ].join('\n')
      
      filename = `USC_Member_Retention_Analysis_${new Date().toISOString().split('T')[0]}.csv`
      
    } else {
      // Export raw member data
      const headers = Object.keys(data[0])
      csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header]
            // Handle null/undefined values and escape commas in strings
            if (value === null || value === undefined) return ''
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ].join('\n')
      
      filename = `USC_Member_Data_Export_${new Date().toISOString().split('T')[0]}.csv`
    }

    console.log(`✅ [USC Member-Analytic Export API] Exported ${data.length} REAL DATA records to CSV`)

    return NextResponse.json({
      success: true,
      data: csvContent,
      recordCount: data.length,
      filename,
      exportType: exportType || 'member_data'
    })

  } catch (error) {
    console.error('❌ [USC Member-Analytic Export API] Error exporting REAL DATA:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to calculate retention analysis from REAL DATA
function calculateRetentionAnalysis(data: any[]) {
  const userActivity: { [key: string]: any } = {}
  
  // Calculate activity days per user from REAL DATA
  data.forEach(row => {
    const userkey = String(row.userkey)
    if (!userActivity[userkey]) {
      userActivity[userkey] = {
        activeDays: 0,
        depositCases: 0,
        depositAmount: 0,
        withdrawCases: 0,
        withdrawAmount: 0,
        ggr: 0,
        bonus: 0
      }
    }
    
    // Count activity if user has any transaction
    if ((Number(row.deposit_cases) || 0) > 0 || (Number(row.withdraw_cases) || 0) > 0) {
      userActivity[userkey].activeDays += 1
    }
    
    userActivity[userkey].depositCases += (Number(row.deposit_cases) || 0)
    userActivity[userkey].depositAmount += (Number(row.deposit_amount) || 0)
    userActivity[userkey].withdrawCases += (Number(row.withdraw_cases) || 0)
    userActivity[userkey].withdrawAmount += (Number(row.withdraw_amount) || 0)
    userActivity[userkey].ggr += (Number(row.gross_gaming_revenue) || 0)
    userActivity[userkey].bonus += (Number(row.bonus) || 0)
  })
  
  // Categorize users by retention days
  const retentionCategories = [
    { name: 'Premium Members (7+ Days)', minDays: 7, maxDays: 999 },
    { name: 'Regular Members (6 Days)', minDays: 6, maxDays: 6 },
    { name: 'Active Members (5 Days)', minDays: 5, maxDays: 5 },
    { name: 'Occasional Members (4 Days)', minDays: 4, maxDays: 4 },
    { name: 'Light Members (3 Days)', minDays: 3, maxDays: 3 },
    { name: 'Trial Members (2 Days)', minDays: 2, maxDays: 2 },
    { name: 'One-time Members (1 Day)', minDays: 1, maxDays: 1 }
  ]
  
  const totalMembers = Object.keys(userActivity).length
  const totalDeposit = Object.values(userActivity).reduce((sum: number, user: any) => sum + user.depositAmount, 0)
  const totalWithdraw = Object.values(userActivity).reduce((sum: number, user: any) => sum + user.withdrawAmount, 0)
  const totalGGR = Object.values(userActivity).reduce((sum: number, user: any) => sum + user.ggr, 0)
  const totalDepositCases = Object.values(userActivity).reduce((sum: number, user: any) => sum + user.depositCases, 0)
  const totalWithdrawCases = Object.values(userActivity).reduce((sum: number, user: any) => sum + user.withdrawCases, 0)
  const totalBonus = Object.values(userActivity).reduce((sum: number, user: any) => sum + user.bonus, 0)
  
  return retentionCategories.map(category => {
    const categoryUsers = Object.values(userActivity).filter((user: any) => 
      user.activeDays >= category.minDays && user.activeDays <= category.maxDays
    )
    
    const memberCount = categoryUsers.length
    const categoryDeposit = categoryUsers.reduce((sum: number, user: any) => sum + user.depositAmount, 0)
    const categoryWithdraw = categoryUsers.reduce((sum: number, user: any) => sum + user.withdrawAmount, 0)
    const categoryGGR = categoryUsers.reduce((sum: number, user: any) => sum + user.ggr, 0)
    const categoryDepositCases = categoryUsers.reduce((sum: number, user: any) => sum + user.depositCases, 0)
    const categoryWithdrawCases = categoryUsers.reduce((sum: number, user: any) => sum + user.withdrawCases, 0)
    const categoryBonus = categoryUsers.reduce((sum: number, user: any) => sum + user.bonus, 0)
    
    return {
      name: category.name,
      memberCount,
      percentage: totalMembers > 0 ? ((memberCount / totalMembers) * 100).toFixed(2) + '%' : '0.00%',
      depositCases: categoryDepositCases,
      dcPercentage: totalDepositCases > 0 ? ((categoryDepositCases / totalDepositCases) * 100).toFixed(2) + '%' : '0.00%',
      depositAmount: categoryDeposit.toFixed(2),
      daPercentage: totalDeposit > 0 ? ((categoryDeposit / totalDeposit) * 100).toFixed(2) + '%' : '0.00%',
      withdrawCases: categoryWithdrawCases,
      wcPercentage: totalWithdrawCases > 0 ? ((categoryWithdrawCases / totalWithdrawCases) * 100).toFixed(2) + '%' : '0.00%',
      withdrawAmount: categoryWithdraw.toFixed(2),
      waPercentage: totalWithdraw > 0 ? ((categoryWithdraw / totalWithdraw) * 100).toFixed(2) + '%' : '0.00%',
      ggr: categoryGGR.toFixed(2),
      ggrPercentage: totalGGR > 0 ? ((categoryGGR / totalGGR) * 100).toFixed(2) + '%' : '0.00%',
      bonus: categoryBonus.toFixed(2)
    }
  })
}
