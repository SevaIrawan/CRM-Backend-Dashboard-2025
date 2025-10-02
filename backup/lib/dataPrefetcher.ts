// ===========================================
// DATA PREFETCHING SYSTEM
// ===========================================

import { kpiCache, chartCache, slicerCache, generateCacheKey } from './advancedCache'
import { getAllKPIsWithMoM, getLineChartData, getBarChartData, getSlicerData } from './KPILogic'

interface PrefetchConfig {
  enabled: boolean
  delay: number // Delay before starting prefetch
  batchSize: number // Number of items to prefetch at once
  priority: 'high' | 'medium' | 'low'
}

class DataPrefetcher {
  private isPrefetching = false
  private prefetchQueue: Array<() => Promise<void>> = []
  private config: PrefetchConfig
  private prefetchTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<PrefetchConfig> = {}) {
    this.config = {
      enabled: true,
      delay: 2000, // 2 seconds delay
      batchSize: 3,
      priority: 'medium',
      ...config
    }
  }

  // Start prefetching after user interaction
  startPrefetching(): void {
    if (!this.config.enabled || this.isPrefetching) return

    console.log('🚀 [Prefetcher] Starting data prefetching...')
    
    // Clear existing timer
    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer)
    }

    // Start prefetching after delay
    this.prefetchTimer = setTimeout(() => {
      this.processPrefetchQueue()
    }, this.config.delay)
  }

  // Add prefetch task to queue
  addPrefetchTask(task: () => Promise<void>): void {
    if (!this.config.enabled) return
    
    this.prefetchQueue.push(task)
    
    // If queue is getting long, start processing
    if (this.prefetchQueue.length >= this.config.batchSize * 2) {
      this.processPrefetchQueue()
    }
  }

  // Process prefetch queue in batches
  private async processPrefetchQueue(): Promise<void> {
    if (this.isPrefetching || this.prefetchQueue.length === 0) return

    this.isPrefetching = true
    console.log(`🔄 [Prefetcher] Processing ${this.prefetchQueue.length} prefetch tasks...`)

    try {
      // Process in batches
      while (this.prefetchQueue.length > 0) {
        const batch = this.prefetchQueue.splice(0, this.config.batchSize)
        
        // Execute batch in parallel
        await Promise.allSettled(
          batch.map(task => task())
        )

        // Small delay between batches to avoid overwhelming the system
        if (this.prefetchQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    } catch (error) {
      console.error('❌ [Prefetcher] Error processing prefetch queue:', error)
    } finally {
      this.isPrefetching = false
      console.log('✅ [Prefetcher] Prefetch queue processing completed')
    }
  }

  // Prefetch common data combinations
  async prefetchCommonData(): Promise<void> {
    if (!this.config.enabled) return

    console.log('📊 [Prefetcher] Prefetching common data combinations...')

    const commonCombinations = [
      { year: '2024', month: '12', currency: 'MYR' },
      { year: '2024', month: '12', currency: 'SGD' },
      { year: '2024', month: '12', currency: 'USC' },
      { year: '2025', month: '01', currency: 'MYR' },
      { year: '2025', month: '01', currency: 'SGD' },
      { year: '2025', month: '01', currency: 'USC' }
    ]

    for (const combo of commonCombinations) {
      this.addPrefetchTask(async () => {
        try {
          // Prefetch KPI data
          const kpiKey = generateCacheKey('kpi', combo)
          if (!kpiCache.get(kpiKey)) {
            await getAllKPIsWithMoM(combo)
          }

          // Prefetch chart data
          const chartKey = generateCacheKey('line_chart', combo)
          if (!chartCache.get(chartKey)) {
            await getLineChartData(combo)
          }

          // Prefetch bar chart data
          const barKey = generateCacheKey('bar_chart', combo)
          if (!chartCache.get(barKey)) {
            await getBarChartData(combo)
          }
        } catch (error) {
          console.warn(`⚠️ [Prefetcher] Failed to prefetch data for ${JSON.stringify(combo)}:`, error)
        }
      })
    }
  }

  // Prefetch data for specific filters
  async prefetchForFilters(filters: any): Promise<void> {
    if (!this.config.enabled) return

    this.addPrefetchTask(async () => {
      try {
        // Prefetch KPI data
        const kpiKey = generateCacheKey('kpi', filters)
        if (!kpiCache.get(kpiKey)) {
          await getAllKPIsWithMoM(filters)
        }

        // Prefetch chart data
        const chartKey = generateCacheKey('line_chart', filters)
        if (!chartCache.get(chartKey)) {
          await getLineChartData(filters)
        }

        // Prefetch bar chart data
        const barKey = generateCacheKey('bar_chart', filters)
        if (!chartCache.get(barKey)) {
          await getBarChartData(filters)
        }
      } catch (error) {
        console.warn(`⚠️ [Prefetcher] Failed to prefetch data for filters:`, error)
      }
    })
  }

  // Prefetch slicer data
  async prefetchSlicerData(): Promise<void> {
    if (!this.config.enabled) return

    this.addPrefetchTask(async () => {
      try {
        const slicerKey = generateCacheKey('slicer', {})
        if (!slicerCache.get(slicerKey)) {
          await getSlicerData()
        }
      } catch (error) {
        console.warn('⚠️ [Prefetcher] Failed to prefetch slicer data:', error)
      }
    })
  }

  // Stop prefetching
  stop(): void {
    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer)
      this.prefetchTimer = null
    }
    
    this.prefetchQueue = []
    this.isPrefetching = false
    console.log('⏹️ [Prefetcher] Data prefetching stopped')
  }

  // Get prefetcher status
  getStatus() {
    return {
      enabled: this.config.enabled,
      isPrefetching: this.isPrefetching,
      queueLength: this.prefetchQueue.length,
      config: this.config
    }
  }
}

// ===========================================
// BACKGROUND DATA LOADER
// ===========================================

class BackgroundDataLoader {
  private loaders: Map<string, Promise<any>> = new Map()
  private retryCount: Map<string, number> = new Map()
  private maxRetries = 3

  // Load data in background with retry logic
  async loadInBackground<T>(
    key: string,
    loader: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    // If already loading, return existing promise
    if (this.loaders.has(key)) {
      return this.loaders.get(key)!
    }

    // Create new loading promise
    const loadPromise = this.executeWithRetry(key, loader)
    this.loaders.set(key, loadPromise)

    try {
      const result = await loadPromise
      return result
    } finally {
      // Clean up
      this.loaders.delete(key)
      this.retryCount.delete(key)
    }
  }

  // Execute loader with retry logic
  private async executeWithRetry<T>(
    key: string,
    loader: () => Promise<T>
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await loader()
      } catch (error) {
        lastError = error as Error
        console.warn(`⚠️ [BackgroundLoader] Attempt ${attempt} failed for ${key}:`, error)

        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError!
  }

  // Cancel background loading for specific key
  cancelLoading(key: string): boolean {
    if (this.loaders.has(key)) {
      this.loaders.delete(key)
      this.retryCount.delete(key)
      return true
    }
    return false
  }

  // Get loading status
  getLoadingStatus() {
    return {
      activeLoaders: Array.from(this.loaders.keys()),
      totalActive: this.loaders.size
    }
  }
}

// ===========================================
// INSTANCES
// ===========================================

export const dataPrefetcher = new DataPrefetcher({
  enabled: true,
  delay: 1500, // 1.5 seconds
  batchSize: 2,
  priority: 'medium'
})

export const backgroundLoader = new BackgroundDataLoader()

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

// Initialize prefetching system
export function initializePrefetching(): void {
  console.log('🚀 [Prefetcher] Initializing data prefetching system...')
  
  // Start prefetching common data
  dataPrefetcher.prefetchCommonData()
  
  // Start prefetching slicer data
  dataPrefetcher.prefetchSlicerData()
}

// Prefetch data when user navigates to page
export function prefetchPageData(filters: any): void {
  dataPrefetcher.prefetchForFilters(filters)
}

// Load data in background for better UX
export function loadDataInBackground<T>(
  key: string,
  loader: () => Promise<T>
): Promise<T> {
  return backgroundLoader.loadInBackground(key, loader)
}

// Stop all background operations
export function stopBackgroundOperations(): void {
  dataPrefetcher.stop()
  console.log('⏹️ [Background] All background operations stopped')
}

export default DataPrefetcher
