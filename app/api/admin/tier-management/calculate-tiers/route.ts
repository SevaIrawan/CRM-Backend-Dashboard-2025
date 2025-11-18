import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { 
  calculateCustomerScore, 
  calibrateTierBoundaries,
  assignTierWithBoundaries,
  TIER_NAMES,
  TIER_GROUPS
} from '@/lib/uscTierClassification'

/**
 * ============================================================================
 * ADMIN TIER MANAGEMENT - CALCULATE TIERS API
 * ============================================================================
 * 
 * Purpose: Calculate K-Means tier and UPDATE tier table
 * Method: POST
 * 
 * Process:
 * 1. Fetch aggregated data from tier table (tier_usc_v1, tier_sgd_v1, tier_myr_v1)
 * 2. Calculate K-Means score for each customer
 * 3. Assign tier 1-7 using calibrated boundaries
 * 4. UPDATE tier table with tier, tier_name, tier_group, score
 * 
 * Params:
 * - currency: Required (e.g., "USC", "SGD", "MYR")
 * - year: Optional (e.g., 2025)
 * - month: Optional (e.g., "November")
 * - line: Optional (e.g., "LVMY")
 * 
 * ============================================================================
 */

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get('currency') || 'USC'
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const line = searchParams.get('line')
    
    console.log('🔄 [Admin Calculate Tiers] Starting...', { currency, year, month, line })
    
    // Validate currency
    if (!['USC', 'SGD', 'MYR'].includes(currency)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid currency. Must be USC, SGD, or MYR'
      }, { status: 400 })
    }
    
    // Determine table name based on currency
    const tableName = `tier_${currency.toLowerCase()}_v1`
    
    // For now, only USC is implemented
    if (currency !== 'USC') {
      return NextResponse.json({
        success: false,
        error: `${currency} tier calculation is not yet implemented. Please use USC for now.`,
        message: 'Coming soon'
      }, { status: 501 })
    }
    
    // ============================================================================
    // STEP 1: FETCH DATA FROM tier table
    // ============================================================================
    
    let query = supabase.from(tableName).select('*')
    
    if (year) query = query.eq('year', parseInt(year))
    if (month && month !== 'ALL') query = query.eq('month', month)
    if (line && line !== 'ALL') query = query.eq('line', line)
    
    const { data: records, error: fetchError } = await query
    
    if (fetchError) {
      console.error('❌ [Admin Calculate Tiers] Fetch error:', fetchError)
      throw fetchError
    }
    
    if (!records || records.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No records found to calculate',
        data: { totalProcessed: 0, successCount: 0 }
      })
    }
    
    console.log(`📊 [Admin Calculate Tiers] Processing ${records.length} records`)
    
    // ============================================================================
    // STEP 2: CALCULATE K-MEANS SCORE
    // ============================================================================
    
    type RecordWithScore = typeof records[number] & { calculated_score: number }
    
    const withScores: RecordWithScore[] = records.map(record => {
      const score = calculateCustomerScore({
        depositAmount: Number(record.total_deposit_amount) || 0,
        ggr: Number(record.total_ggr) || 0,
        depositCases: Number(record.total_deposit_cases) || 0,
        purchaseFrequency: Number(record.purchase_frequency) || 0,
        avgTransactionValue: Number(record.avg_transaction_value) || 0,
        winRate: Number(record.win_rate) || 0
      })
      
      return { ...record, calculated_score: score } as RecordWithScore
    })
    
    // ============================================================================
    // STEP 3: CALIBRATE TIER BOUNDARIES (Per period for fair distribution)
    // ============================================================================
    
    // Group by year-month for period-specific tier assignment
    const periodGroups: Record<string, RecordWithScore[]> = {}
    
    withScores.forEach(record => {
      const key = `${record.year}-${record.month}`
      if (!periodGroups[key]) periodGroups[key] = []
      periodGroups[key].push(record)
    })
    
    console.log(`🎯 [Admin Calculate Tiers] Processing ${Object.keys(periodGroups).length} periods`)
    
    // ============================================================================
    // STEP 4: ASSIGN TIERS PER PERIOD & UPDATE DATABASE
    // ============================================================================
    
    let totalUpdated = 0
    const allDistributions: Record<string, any> = {}
    
    for (const [periodKey, periodRecords] of Object.entries(periodGroups)) {
      console.log(`📅 [Admin Calculate Tiers] Period: ${periodKey} (${periodRecords.length} records)`)
      
      // Calibrate boundaries for this period
      const scores = periodRecords.map(r => r.calculated_score)
      const boundaries = calibrateTierBoundaries(scores)
      
      // Assign tiers
      const updates = periodRecords.map(record => {
        const tier = assignTierWithBoundaries(record.calculated_score, boundaries)
        // Extract line from userkey (format: prefix-unique_code-line)
        // Example: "neang90-USRI485687-L0Y66" -> line = "L0Y66"
        const userkeyStr = record.userkey as string
        const line = record.line || (userkeyStr ? userkeyStr.split('-')[2] || null : null)
        
        if (!line) {
          console.warn(`⚠️ [Admin Calculate Tiers] Missing line for userkey: ${record.userkey}`)
        }
        
        return {
          userkey: record.userkey,
          year: record.year,
          month: record.month,
          line: line || record.line || '', // Fallback to record.line or empty string
          tier,
          tier_name: TIER_NAMES[tier],
          tier_group: TIER_GROUPS[tier],
          score: record.calculated_score
        }
      })
      
      // Filter out records without line (should not happen, but safety check)
      const validUpdates = updates.filter(u => u.line && u.line.trim() !== '')
      
      if (validUpdates.length !== updates.length) {
        console.warn(`⚠️ [Admin Calculate Tiers] Filtered out ${updates.length - validUpdates.length} records without line`)
      }
      
      // Update database using UPSERT (much faster and more stable!)
      const batchSize = 50
      for (let i = 0; i < validUpdates.length; i += batchSize) {
        const batch = validUpdates.slice(i, i + batchSize)
        
        // Map to database format - MUST include line for NOT NULL constraint
        const upsertData = batch.map(update => ({
          userkey: update.userkey,
          year: update.year,
          month: update.month,
          line: update.line, // ✅ CRITICAL: Include line to satisfy NOT NULL constraint
          tier: update.tier,
          tier_name: update.tier_name,
          tier_group: update.tier_group,
          score: update.score,
          updated_at: new Date().toISOString()
        }))
        
        // UPSERT batch (conflict on primary key will UPDATE)
        const { error, count } = await supabase
          .from(tableName)
          .upsert(upsertData, {
            onConflict: 'userkey,year,month',
            ignoreDuplicates: false
          })
        
        if (!error) {
          totalUpdated += batch.length
        } else {
          console.error(`❌ Batch update error:`, error)
        }
        
        // Add delay between batches
        if (i + batchSize < updates.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
        console.log(`   Progress: ${Math.min(i + batchSize, updates.length)}/${updates.length}`)
      }
      
      // Calculate distribution for this period
      const distribution: Record<number, any> = {}
      for (let tier = 1; tier <= 7; tier++) {
        const count = updates.filter(u => u.tier === tier).length
        distribution[tier] = {
          tier,
          tierName: TIER_NAMES[tier],
          tierGroup: TIER_GROUPS[tier],
          count,
          percentage: Math.round((count / updates.length) * 10000) / 100
        }
      }
      
      allDistributions[periodKey] = {
        boundaries,
        distribution,
        totalRecords: updates.length
      }
    }
    
    console.log(`✅ [Admin Calculate Tiers] Complete! ${totalUpdated} records updated`)
    
    return NextResponse.json({
      success: true,
      message: `Tiers calculated and updated successfully`,
      data: {
        totalProcessed: records.length,
        totalUpdated,
        periods: Object.keys(periodGroups).length,
        distributions: allDistributions
      }
    })
    
  } catch (error) {
    console.error('❌ [Admin Calculate Tiers] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

