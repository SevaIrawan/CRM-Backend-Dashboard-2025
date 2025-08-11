// ===========================================
// PERFORMANCE MONITORING SYSTEM
// ===========================================

interface PerformanceMetric {
  operation: string
  startTime: number
  endTime: number
  duration: number
  success: boolean
  error?: string
  metadata?: any
}

interface PerformanceStats {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  averageDuration: number
  slowestOperation: PerformanceMetric | null
  fastestOperation: PerformanceMetric | null
  operationsByType: Map<string, PerformanceMetric[]>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private activeOperations: Map<string, number> = new Map()
  private slowThreshold = 3000 // 3 seconds
  private maxMetrics = 1000 // Keep last 1000 metrics

  // Start timing an operation
  startOperation(operation: string, metadata?: any): string {
    const id = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = performance.now()
    
    this.activeOperations.set(id, startTime)
    
    // Log slow operation start
    if (metadata?.expectedDuration && metadata.expectedDuration > this.slowThreshold) {
      console.warn(`⚠️ [Performance] Starting potentially slow operation: ${operation}`, metadata)
    }
    
    return id
  }

  // End timing an operation
  endOperation(id: string, success: boolean = true, error?: string, metadata?: any): void {
    const startTime = this.activeOperations.get(id)
    if (!startTime) {
      console.warn(`⚠️ [Performance] Operation ${id} not found in active operations`)
      return
    }

    const endTime = performance.now()
    const duration = endTime - startTime
    
    const metric: PerformanceMetric = {
      operation: id.split('_')[0], // Extract operation name from ID
      startTime,
      endTime,
      duration,
      success,
      error,
      metadata
    }

    this.metrics.push(metric)
    this.activeOperations.delete(id)

    // Log slow operations
    if (duration > this.slowThreshold) {
      console.warn(`🐌 [Performance] Slow operation detected: ${metric.operation} took ${duration.toFixed(2)}ms`, metadata)
    }

    // Log successful fast operations
    if (success && duration < 500) {
      console.log(`⚡ [Performance] Fast operation: ${metric.operation} completed in ${duration.toFixed(2)}ms`)
    }

    // Cleanup old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  // Get performance statistics
  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageDuration: 0,
        slowestOperation: null,
        fastestOperation: null,
        operationsByType: new Map()
      }
    }

    const successful = this.metrics.filter(m => m.success)
    const failed = this.metrics.filter(m => !m.success)
    
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0)
    const averageDuration = totalDuration / this.metrics.length

    const slowest = this.metrics.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest
    )

    const fastest = this.metrics.reduce((fastest, current) => 
      current.duration < fastest.duration ? current : fastest
    )

    // Group operations by type
    const operationsByType = new Map<string, PerformanceMetric[]>()
    this.metrics.forEach(metric => {
      const type = metric.operation
      if (!operationsByType.has(type)) {
        operationsByType.set(type, [])
      }
      operationsByType.get(type)!.push(metric)
    })

    return {
      totalOperations: this.metrics.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      averageDuration,
      slowestOperation: slowest,
      fastestOperation: fastest,
      operationsByType
    }
  }

  // Get performance for specific operation type
  getOperationStats(operationType: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.operation === operationType)
  }

  // Get slow operations
  getSlowOperations(threshold: number = this.slowThreshold): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > threshold)
  }

  // Get failed operations
  getFailedOperations(): PerformanceMetric[] {
    return this.metrics.filter(m => !m.success)
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics = []
    this.activeOperations.clear()
    console.log('🧹 [Performance] All performance metrics cleared')
  }

  // Get active operations
  getActiveOperations(): Map<string, number> {
    return new Map(this.activeOperations)
  }

  // Check if operation is taking too long
  isOperationSlow(id: string): boolean {
    const startTime = this.activeOperations.get(id)
    if (!startTime) return false
    
    const duration = performance.now() - startTime
    return duration > this.slowThreshold
  }

  // Log performance summary
  logPerformanceSummary(): void {
    const stats = this.getStats()
    
    console.log('📊 [Performance] Performance Summary:')
    console.log(`   Total Operations: ${stats.totalOperations}`)
    console.log(`   Successful: ${stats.successfulOperations}`)
    console.log(`   Failed: ${stats.failedOperations}`)
    console.log(`   Average Duration: ${stats.averageDuration.toFixed(2)}ms`)
    
    if (stats.slowestOperation) {
      console.log(`   Slowest: ${stats.slowestOperation.operation} (${stats.slowestOperation.duration.toFixed(2)}ms)`)
    }
    
    if (stats.fastestOperation) {
      console.log(`   Fastest: ${stats.fastestOperation.operation} (${stats.fastestOperation.duration.toFixed(2)}ms)`)
    }

    // Log operations by type
    console.log('   Operations by Type:')
    stats.operationsByType.forEach((metrics, type) => {
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
      const successRate = (metrics.filter(m => m.success).length / metrics.length * 100).toFixed(1)
      console.log(`     ${type}: ${metrics.length} ops, ${avgDuration.toFixed(2)}ms avg, ${successRate}% success`)
    })
  }
}

// ===========================================
// DATA LOADING OPTIMIZER
// ===========================================

class DataLoadingOptimizer {
  private monitor: PerformanceMonitor
  private optimizationRules: Map<string, (metrics: PerformanceMetric[]) => void> = new Map()

  constructor(monitor: PerformanceMonitor) {
    this.monitor = monitor
    this.setupOptimizationRules()
  }

  // Setup optimization rules
  private setupOptimizationRules(): void {
    // Rule 1: If KPI loading is consistently slow, suggest caching
    this.optimizationRules.set('calculateKPIs', (metrics) => {
      const recentMetrics = metrics.slice(-10) // Last 10 operations
      const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      
      if (avgDuration > 2000) { // 2 seconds
        console.log('💡 [Optimizer] KPI loading is slow, consider increasing cache TTL')
      }
    })

    // Rule 2: If chart data loading is slow, suggest prefetching
    this.optimizationRules.set('getLineChartData', (metrics) => {
      const recentMetrics = metrics.slice(-5) // Last 5 operations
      const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      
      if (avgDuration > 3000) { // 3 seconds
        console.log('💡 [Optimizer] Chart loading is slow, consider enabling data prefetching')
      }
    })

    // Rule 3: If database queries are slow, suggest connection pooling
    this.optimizationRules.set('database_query', (metrics) => {
      const slowQueries = metrics.filter(m => m.duration > 1000)
      if (slowQueries.length > 5) {
        console.log('💡 [Optimizer] Multiple slow database queries detected, consider connection pooling')
      }
    })
  }

  // Analyze performance and suggest optimizations
  analyzeAndOptimize(): void {
    const stats = this.monitor.getStats()
    
    // Apply optimization rules
    this.optimizationRules.forEach((rule, operationType) => {
      const operationMetrics = this.monitor.getOperationStats(operationType)
      if (operationMetrics.length > 0) {
        rule(operationMetrics)
      }
    })

    // Overall performance analysis
    if (stats.averageDuration > 1500) {
      console.log('💡 [Optimizer] Overall performance is slow, consider:')
      console.log('   - Increasing cache TTL')
      console.log('   - Enabling data prefetching')
      console.log('   - Optimizing database queries')
    }

    // Success rate analysis
    const successRate = (stats.successfulOperations / stats.totalOperations) * 100
    if (successRate < 90) {
      console.log('💡 [Optimizer] Low success rate detected, consider:')
      console.log('   - Adding retry logic')
      console.log('   - Improving error handling')
      console.log('   - Checking network stability')
    }
  }

  // Get optimization suggestions
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = []
    const stats = this.monitor.getStats()

    if (stats.averageDuration > 2000) {
      suggestions.push('Increase cache TTL for frequently accessed data')
      suggestions.push('Enable data prefetching for common user paths')
      suggestions.push('Implement connection pooling for database queries')
    }

    if (stats.failedOperations > stats.totalOperations * 0.1) {
      suggestions.push('Add retry logic with exponential backoff')
      suggestions.push('Improve error handling and user feedback')
      suggestions.push('Check network and database connectivity')
    }

    const slowOperations = this.monitor.getSlowOperations()
    if (slowOperations.length > 0) {
      suggestions.push('Optimize slow operations identified in performance logs')
      suggestions.push('Consider implementing progressive loading for large datasets')
    }

    return suggestions
  }
}

// ===========================================
// INSTANCES
// ===========================================

export const performanceMonitor = new PerformanceMonitor()
export const dataLoadingOptimizer = new DataLoadingOptimizer(performanceMonitor)

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

// Monitor async operation
export async function monitorAsyncOperation<T>(
  operation: string,
  operationFn: () => Promise<T>,
  metadata?: any
): Promise<T> {
  const id = performanceMonitor.startOperation(operation, metadata)
  
  try {
    const result = await operationFn()
    performanceMonitor.endOperation(id, true, undefined, metadata)
    return result
  } catch (error) {
    performanceMonitor.endOperation(id, false, error instanceof Error ? error.message : 'Unknown error', metadata)
    throw error
  }
}

// Monitor sync operation
export function monitorSyncOperation<T>(
  operation: string,
  operationFn: () => T,
  metadata?: any
): T {
  const id = performanceMonitor.startOperation(operation, metadata)
  
  try {
    const result = operationFn()
    performanceMonitor.endOperation(id, true, undefined, metadata)
    return result
  } catch (error) {
    performanceMonitor.endOperation(id, false, error instanceof Error ? error.message : 'Unknown error', metadata)
    throw error
  }
}

// Get performance insights
export function getPerformanceInsights(): void {
  performanceMonitor.logPerformanceSummary()
  dataLoadingOptimizer.analyzeAndOptimize()
}

// Get optimization suggestions
export function getOptimizationSuggestions(): string[] {
  return dataLoadingOptimizer.getOptimizationSuggestions()
}

export default PerformanceMonitor
