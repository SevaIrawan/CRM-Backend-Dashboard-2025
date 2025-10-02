import { getAllKPIsWithMoM, SlicerFilters } from './KPILogic'

// ========================================
// PAGE KPI HELPER - UNTUK SEMUA PAGE VISUALISASI
// ========================================

// Helper class untuk memudahkan page mendapatkan KPI dengan nama
export class PageKPIHelper {
  
  // Get KPI value untuk StatCard/visualization dengan nama KPI
  static async getKPIForVisualization(
    kpiName: string, 
    filters: SlicerFilters,
    format: 'number' | 'currency' | 'percentage' = 'number'
  ): Promise<{
    value: number,
    formattedValue: string,
    isValid: boolean
  }> {
    try {
      // Get KPI value using getAllKPIsWithMoM
      const kpiResult = await getAllKPIsWithMoM(filters)
      const kpiData = kpiResult.current
      
      // Map KPI name to value
      const kpiMap: { [key: string]: number } = {
        'activeMember': kpiData.activeMember,
        'newDepositor': kpiData.newDepositor,
        'depositAmount': kpiData.depositAmount,
        'grossGamingRevenue': kpiData.grossGamingRevenue,
        'netProfit': kpiData.netProfit,
        'winrate': kpiData.winrate,
        'validBetAmount': kpiData.validBetAmount
      }
      
      const value = kpiMap[kpiName] || 0

      // Format value based on type
      let formattedValue: string
      switch (format) {
        case 'currency':
          formattedValue = new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: filters.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(value)
          break
        
        case 'percentage':
          formattedValue = new Intl.NumberFormat('en-MY', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          }).format(value) + '%'
          break
        
        default:
          formattedValue = new Intl.NumberFormat('en-MY').format(value)
      }

      return {
        value,
        formattedValue,
        isValid: value !== undefined
      }
    } catch (error) {
      console.error(`❌ Error getting KPI for visualization:`, error)
      return {
        value: 0,
        formattedValue: '0',
        isValid: false
      }
    }
  }

  // Get multiple KPIs untuk dashboard dengan banyak visualisasi
  static async getMultipleKPIsForPage(
    kpiConfigs: Array<{
      name: string
      format: 'number' | 'currency' | 'percentage'
    }>,
    filters: SlicerFilters
  ): Promise<{
    [key: string]: {
      value: number
      formattedValue: string
      isValid: boolean
    }
  }> {
    try {
      const results: { [key: string]: any } = {}

      for (const config of kpiConfigs) {
        results[config.name] = await this.getKPIForVisualization(
          config.name,
          filters,
          config.format
        )
      }

      return results
    } catch (error) {
      console.error('❌ Error getting multiple KPIs for page:', error)
      return {}
    }
  }

  // Get comparison data untuk chart trends
  static async getKPIComparison(
    kpiName: string,
    currentFilters: SlicerFilters,
    previousFilters: SlicerFilters
  ): Promise<{
    current: number
    previous: number
    change: number
    changePercentage: number
    isPositive: boolean
  }> {
    try {
      const [currentResult, previousResult] = await Promise.all([
        getAllKPIsWithMoM(currentFilters),
        getAllKPIsWithMoM(previousFilters)
      ])
      
      const currentData = currentResult.current
      const previousData = previousResult.current
      
      // Map KPI name to value
      const kpiMap: { [key: string]: number } = {
        'activeMember': currentData.activeMember,
        'newDepositor': currentData.newDepositor,
        'depositAmount': currentData.depositAmount,
        'grossGamingRevenue': currentData.grossGamingRevenue,
        'netProfit': currentData.netProfit,
        'winrate': currentData.winrate,
        'validBetAmount': currentData.validBetAmount
      }
      
      const previousKpiMap: { [key: string]: number } = {
        'activeMember': previousData.activeMember,
        'newDepositor': previousData.newDepositor,
        'depositAmount': previousData.depositAmount,
        'grossGamingRevenue': previousData.grossGamingRevenue,
        'netProfit': previousData.netProfit,
        'winrate': previousData.winrate,
        'validBetAmount': previousData.validBetAmount
      }
      
      const current = kpiMap[kpiName] || 0
      const previous = previousKpiMap[kpiName] || 0

      const change = current - previous
      const changePercentage = previous === 0 ? 0 : (change / previous) * 100

      return {
        current,
        previous,
        change,
        changePercentage,
        isPositive: change >= 0
      }
    } catch (error) {
      console.error('❌ Error getting KPI comparison:', error)
      return {
        current: 0,
        previous: 0,
        change: 0,
        changePercentage: 0,
        isPositive: false
      }
    }
  }

  // Validate filter requirements untuk page
  static validateFilters(filters: SlicerFilters, requiredFields: string[]): boolean {
    for (const field of requiredFields) {
      if (!filters[field as keyof SlicerFilters]) {
        console.error(`❌ Required filter missing: ${field}`)
        return false
      }
    }
    return true
  }
}

// ========================================
// USAGE EXAMPLES UNTUK PAGE
// ========================================

/*
CONTOH PENGGUNAAN DALAM PAGE:

1. Import helper:
   import { PageKPIHelper } from '@/lib/pageKPIHelper'
   import { SlicerFilters } from '@/lib/KPILogic'

2. Get single KPI untuk StatCard:
   const filters: SlicerFilters = { year: '2025', month: 'July', currency: 'MYR' }
   const activeMember = await PageKPIHelper.getKPIForVisualization('Active Member', filters, 'number')
   
   <StatCard 
     title="Active Member"
     value={activeMember.formattedValue}
     isValid={activeMember.isValid}
   />

3. Get multiple KPIs untuk dashboard:
   const kpiConfigs = [
     { name: 'Active Member', format: 'number' },
     { name: 'Deposit Amount', format: 'currency' },
     { name: 'Winrate', format: 'percentage' }
   ]
   const kpis = await PageKPIHelper.getMultipleKPIsForPage(kpiConfigs, filters)

4. Get comparison untuk chart:
   const comparison = await PageKPIHelper.getKPIComparison(
     'Active Member',
     currentFilters,
     previousFilters
   )

5. Validate filters:
   const isValid = PageKPIHelper.validateFilters(filters, ['year', 'month', 'currency'])
*/