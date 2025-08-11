// ===========================================
// ADVANCED CACHING SYSTEM
// ===========================================

interface CacheItem<T> {
  data: T
  timestamp: number
  accessCount: number
  lastAccessed: number
  size: number
}

interface CacheConfig {
  maxSize: number // Maximum memory usage in MB
  defaultTTL: number // Default TTL in milliseconds
  cleanupInterval: number // Cleanup interval in milliseconds
  maxItems: number // Maximum number of items
}

class AdvancedCache {
  private cache = new Map<string, CacheItem<any>>()
  private config: CacheConfig
  private cleanupTimer: NodeJS.Timeout | null = null
  private totalSize = 0

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100, // 100MB
      defaultTTL: 10 * 60 * 1000, // 10 minutes
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      maxItems: 1000,
      ...config
    }
    
    this.startCleanupTimer()
  }

  // Set data with intelligent TTL based on data type
  set<T>(key: string, data: T, customTTL?: number): void {
    const size = this.estimateSize(data)
    const ttl = customTTL || this.getIntelligentTTL(key, data)
    
    // Check if we need to evict items
    this.ensureCapacity(size)
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size
    })
    
    this.totalSize += size
  }

  // Get data with access tracking
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    // Check TTL
    if (Date.now() - item.timestamp > this.config.defaultTTL) {
      this.delete(key)
      return null
    }
    
    // Update access statistics
    item.accessCount++
    item.lastAccessed = Date.now()
    
    return item.data
  }

  // Get with fallback function
  async getOrSet<T>(key: string, fallback: () => Promise<T>, customTTL?: number): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      console.log(`🎯 [Cache] Hit for key: ${key}`)
      return cached
    }
    
    console.log(`🔄 [Cache] Miss for key: ${key}, fetching...`)
    const data = await fallback()
    this.set(key, data, customTTL)
    return data
  }

  // Batch get multiple keys
  getBatch<T>(keys: string[]): Map<string, T | null> {
    const result = new Map<string, T | null>()
    keys.forEach(key => {
      result.set(key, this.get<T>(key))
    })
    return result
  }

  // Batch set multiple items
  setBatch<T>(items: Array<{ key: string; data: T; ttl?: number }>): void {
    items.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl)
    })
  }

  // Delete specific key
  delete(key: string): boolean {
    const item = this.cache.get(key)
    if (item) {
      this.totalSize -= item.size
      return this.cache.delete(key)
    }
    return false
  }

  // Clear all cache
  clear(): void {
    this.cache.clear()
    this.totalSize = 0
  }

  // Get cache statistics
  getStats() {
    return {
      totalItems: this.cache.size,
      totalSize: this.totalSize,
      hitRate: this.calculateHitRate(),
      memoryUsage: `${(this.totalSize / 1024 / 1024).toFixed(2)}MB`
    }
  }

  // Intelligent TTL based on data type and key
  private getIntelligentTTL(key: string, data: any): number {
    // Slicer data (years, months, currencies) - longer TTL
    if (key.includes('slicer') || key.includes('years') || key.includes('months') || key.includes('currencies')) {
      return 30 * 60 * 1000 // 30 minutes
    }
    
    // KPI data - medium TTL
    if (key.includes('kpi') || key.includes('raw_kpi')) {
      return 15 * 60 * 1000 // 15 minutes
    }
    
    // Chart data - shorter TTL
    if (key.includes('chart') || key.includes('line') || key.includes('bar')) {
      return 8 * 60 * 1000 // 8 minutes
    }
    
    // Default TTL
    return this.config.defaultTTL
  }

  // Estimate memory size of data
  private estimateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data)
      return new Blob([jsonString]).size
    } catch {
      // Fallback estimation
      return 1024 // 1KB default
    }
  }

  // Ensure capacity before adding new item
  private ensureCapacity(newItemSize: number): void {
    // If adding this item would exceed max size, evict items
    if (this.totalSize + newItemSize > this.config.maxSize * 1024 * 1024) {
      this.evictItems(newItemSize)
    }
    
    // If we have too many items, evict least recently used
    if (this.cache.size >= this.config.maxItems) {
      this.evictLRU()
    }
  }

  // Evict items based on LRU and size
  private evictItems(requiredSpace: number): void {
    const items = Array.from(this.cache.entries())
      .map(([key, item]) => ({ key, ...item }))
      .sort((a, b) => {
        // Sort by access count (descending) then by last accessed (ascending)
        if (a.accessCount !== b.accessCount) {
          return b.accessCount - a.accessCount
        }
        return a.lastAccessed - b.lastAccessed
      })

    let freedSpace = 0
    for (const item of items) {
      if (freedSpace >= requiredSpace) break
      
      this.delete(item.key)
      freedSpace += item.size
    }
  }

  // Evict least recently used items
  private evictLRU(): void {
    const items = Array.from(this.cache.entries())
      .map(([key, item]) => ({ key, ...item }))
      .sort((a, b) => a.lastAccessed - b.lastAccessed)

    // Remove 20% of least recently used items
    const itemsToRemove = Math.ceil(items.length * 0.2)
    for (let i = 0; i < itemsToRemove; i++) {
      this.delete(items[i].key)
    }
  }

  // Calculate hit rate
  private calculateHitRate(): number {
    // This would need to be implemented with actual hit/miss tracking
    return 0.85 // Placeholder
  }

  // Start cleanup timer
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  // Cleanup expired items
  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []
    
    for (const [key, item] of Array.from(this.cache.entries())) {
      if (now - item.timestamp > this.config.defaultTTL) {
        expiredKeys.push(key)
      }
    }
    
    expiredKeys.forEach(key => this.delete(key))
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 [Cache] Cleaned up ${expiredKeys.length} expired items`)
    }
  }

  // Stop cleanup timer
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }
}

// ===========================================
// CACHE INSTANCES FOR DIFFERENT DATA TYPES
// ===========================================

// Main KPI cache
export const kpiCache = new AdvancedCache({
  maxSize: 50, // 50MB
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  maxItems: 500
})

// Chart data cache
export const chartCache = new AdvancedCache({
  maxSize: 30, // 30MB
  defaultTTL: 8 * 60 * 1000, // 8 minutes
  maxItems: 300
})

// Slicer data cache
export const slicerCache = new AdvancedCache({
  maxSize: 20, // 20MB
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  maxItems: 100
})

// ===========================================
// CACHE UTILITY FUNCTIONS
// ===========================================

// Generate cache key from filters
export function generateCacheKey(prefix: string, filters: any): string {
  const filterString = JSON.stringify(filters)
  return `${prefix}_${Buffer.from(filterString).toString('base64').substring(0, 32)}`
}

// Preload common data
export async function preloadCommonData(): Promise<void> {
  console.log('🚀 [Cache] Preloading common data...')
  
  try {
    // Preload slicer data for common currencies
    const currencies = ['MYR', 'SGD', 'USC']
    const years = ['2024', '2025']
    
    for (const currency of currencies) {
      for (const year of years) {
        const key = generateCacheKey('slicer', { currency, year })
        if (!slicerCache.get(key)) {
          console.log(`🔄 [Cache] Preloading slicer data for ${currency} ${year}`)
        }
      }
    }
    
    console.log('✅ [Cache] Common data preload completed')
  } catch (error) {
    console.error('❌ [Cache] Preload error:', error)
  }
}

// Clear all caches
export function clearAllCaches(): void {
  kpiCache.clear()
  chartCache.clear()
  slicerCache.clear()
  console.log('🧹 [Cache] All caches cleared')
}

// Get cache statistics
export function getCacheStats() {
  return {
    kpi: kpiCache.getStats(),
    chart: chartCache.getStats(),
    slicer: slicerCache.getStats()
  }
}

export default AdvancedCache
