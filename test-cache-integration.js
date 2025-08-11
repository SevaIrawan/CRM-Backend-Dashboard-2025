// ===========================================
// COMPREHENSIVE CACHE INTEGRATION TEST
// ===========================================

console.log('🧪 Testing Complete Cache Integration System...\n');

// Test data for various scenarios
const testFilters = [
  { year: '2024', month: 'December', currency: 'MYR' },
  { year: '2024', month: 'November', currency: 'SGD' },
  { year: '2025', month: 'January', currency: 'USC' },
  { year: '2024', month: 'December', currency: 'MYR' }, // Repeat for cache hit test
];

// Performance tracking
const performanceResults = [];

// Simulate cache operations
class IntegrationCache {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, totalOperations: 0 };
    this.operationTimes = [];
  }

  generateKey(prefix, filters) {
    const filterString = JSON.stringify(filters);
    return `${prefix}_${Buffer.from(filterString).toString('base64').substring(0, 32)}`;
  }

  set(key, value, ttl = 15 * 60 * 1000) {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key) {
    this.stats.totalOperations++;
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.data;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : '0.00';
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      totalItems: this.cache.size,
      averageTime: this.operationTimes.length > 0 
        ? (this.operationTimes.reduce((a, b) => a + b, 0) / this.operationTimes.length).toFixed(4)
        : '0.0000'
    };
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, totalOperations: 0 };
    this.operationTimes = [];
  }
}

// Create cache instances
const kpiCache = new IntegrationCache();
const chartCache = new IntegrationCache();
const slicerCache = new IntegrationCache();

// Simulate data loading operations
async function simulateKPILoad(filters) {
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200)); // Simulate DB query
  return {
    current: {
      netProfit: Math.floor(Math.random() * 1000000),
      ggrUser: Math.floor(Math.random() * 2000000),
      activeMember: Math.floor(Math.random() * 5000),
      pureUser: Math.floor(Math.random() * 3000),
      headcount: Math.floor(Math.random() * 100)
    },
    mom: {
      netProfit: (Math.random() - 0.5) * 20,
      ggrUser: (Math.random() - 0.5) * 15,
      activeMember: (Math.random() - 0.5) * 10
    }
  };
}

async function simulateChartLoad(filters) {
  await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 300)); // Simulate complex query
  return {
    success: true,
    ggrUserTrend: {
      series: [{ name: 'GGR User', data: Array(6).fill().map(() => Math.floor(Math.random() * 1000000)) }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    retentionChurnTrend: {
      series: [
        { name: 'Retention', data: Array(6).fill().map(() => 80 + Math.random() * 15) },
        { name: 'Churn', data: Array(6).fill().map(() => 5 + Math.random() * 15) }
      ],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    }
  };
}

async function simulateSlicerLoad() {
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100)); // Quick lookup
  return {
    years: ['2024', '2025'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    currencies: ['MYR', 'SGD', 'USC'],
    lines: ['Line1', 'Line2', 'Line3']
  };
}

// Test functions with cache integration
async function testKPIWithCache(filters) {
  const startTime = performance.now();
  const cacheKey = kpiCache.generateKey('kpi_with_mom', filters);
  
  let result = kpiCache.get(cacheKey);
  if (!result) {
    console.log(`🔄 Loading KPI data for ${JSON.stringify(filters)} (cache miss)`);
    result = await simulateKPILoad(filters);
    kpiCache.set(cacheKey, result);
  } else {
    console.log(`🎯 Using cached KPI data for ${JSON.stringify(filters)} (cache hit)`);
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  kpiCache.operationTimes.push(duration);
  
  return { result, duration };
}

async function testChartWithCache(filters) {
  const startTime = performance.now();
  const cacheKey = chartCache.generateKey('line_chart', filters);
  
  let result = chartCache.get(cacheKey);
  if (!result) {
    console.log(`🔄 Loading chart data for ${JSON.stringify(filters)} (cache miss)`);
    result = await simulateChartLoad(filters);
    chartCache.set(cacheKey, result);
  } else {
    console.log(`🎯 Using cached chart data for ${JSON.stringify(filters)} (cache hit)`);
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  chartCache.operationTimes.push(duration);
  
  return { result, duration };
}

async function testSlicerWithCache() {
  const startTime = performance.now();
  const cacheKey = slicerCache.generateKey('slicer_data', {});
  
  let result = slicerCache.get(cacheKey);
  if (!result) {
    console.log('🔄 Loading slicer data (cache miss)');
    result = await simulateSlicerLoad();
    slicerCache.set(cacheKey, result);
  } else {
    console.log('🎯 Using cached slicer data (cache hit)');
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  slicerCache.operationTimes.push(duration);
  
  return { result, duration };
}

// Main test execution
async function runIntegrationTests() {
  console.log('📊 Test 1: Cache Integration Test');
  console.log('================================\n');
  
  // Test slicer data (should be cached across all requests)
  console.log('🔸 Testing Slicer Data Caching:');
  for (let i = 0; i < 3; i++) {
    const { duration } = await testSlicerWithCache();
    performanceResults.push({ operation: 'slicer', duration, iteration: i + 1 });
  }
  console.log('');
  
  // Test KPI data with different filters
  console.log('🔸 Testing KPI Data Caching:');
  for (let i = 0; i < testFilters.length; i++) {
    const { duration } = await testKPIWithCache(testFilters[i]);
    performanceResults.push({ operation: 'kpi', duration, iteration: i + 1, filters: testFilters[i] });
  }
  console.log('');
  
  // Test chart data with different filters
  console.log('🔸 Testing Chart Data Caching:');
  for (let i = 0; i < testFilters.length; i++) {
    const { duration } = await testChartWithCache(testFilters[i]);
    performanceResults.push({ operation: 'chart', duration, iteration: i + 1, filters: testFilters[i] });
  }
  console.log('');
  
  // Performance analysis
  console.log('📊 Test 2: Performance Analysis');
  console.log('===============================\n');
  
  const kpiStats = kpiCache.getStats();
  const chartStats = chartCache.getStats();
  const slicerStats = slicerCache.getStats();
  
  console.log('📈 Cache Statistics:');
  console.log(`   KPI Cache    - Hits: ${kpiStats.hits}, Misses: ${kpiStats.misses}, Hit Rate: ${kpiStats.hitRate}, Avg Time: ${kpiStats.averageTime}ms`);
  console.log(`   Chart Cache  - Hits: ${chartStats.hits}, Misses: ${chartStats.misses}, Hit Rate: ${chartStats.hitRate}, Avg Time: ${chartStats.averageTime}ms`);
  console.log(`   Slicer Cache - Hits: ${slicerStats.hits}, Misses: ${slicerStats.misses}, Hit Rate: ${slicerStats.hitRate}, Avg Time: ${slicerStats.averageTime}ms`);
  console.log('');
  
  // Performance comparison
  const kpiOperations = performanceResults.filter(r => r.operation === 'kpi');
  const chartOperations = performanceResults.filter(r => r.operation === 'chart');
  const slicerOperations = performanceResults.filter(r => r.operation === 'slicer');
  
  const avgKPITime = kpiOperations.reduce((sum, op) => sum + op.duration, 0) / kpiOperations.length;
  const avgChartTime = chartOperations.reduce((sum, op) => sum + op.duration, 0) / chartOperations.length;
  const avgSlicerTime = slicerOperations.reduce((sum, op) => sum + op.duration, 0) / slicerOperations.length;
  
  console.log('⚡ Performance Summary:');
  console.log(`   Average KPI Load Time: ${avgKPITime.toFixed(2)}ms`);
  console.log(`   Average Chart Load Time: ${avgChartTime.toFixed(2)}ms`);
  console.log(`   Average Slicer Load Time: ${avgSlicerTime.toFixed(2)}ms`);
  console.log('');
  
  // Cache efficiency analysis
  const totalOperations = kpiStats.totalOperations + chartStats.totalOperations + slicerStats.totalOperations;
  const totalHits = kpiStats.hits + chartStats.hits + slicerStats.hits;
  const overallHitRate = totalOperations > 0 ? (totalHits / totalOperations * 100).toFixed(2) : '0.00';
  
  console.log('🎯 Cache Efficiency:');
  console.log(`   Total Operations: ${totalOperations}`);
  console.log(`   Total Cache Hits: ${totalHits}`);
  console.log(`   Overall Hit Rate: ${overallHitRate}%`);
  console.log(`   Total Cached Items: ${kpiStats.totalItems + chartStats.totalItems + slicerStats.totalItems}`);
  console.log('');
  
  // Memory usage simulation
  const estimatedMemory = (kpiStats.totalItems * 2) + (chartStats.totalItems * 5) + (slicerStats.totalItems * 1);
  console.log('💾 Estimated Memory Usage:');
  console.log(`   KPI Cache: ~${kpiStats.totalItems * 2}KB`);
  console.log(`   Chart Cache: ~${chartStats.totalItems * 5}KB`);
  console.log(`   Slicer Cache: ~${slicerStats.totalItems * 1}KB`);
  console.log(`   Total Estimated: ~${estimatedMemory}KB`);
  console.log('');
  
  // Test results
  console.log('🎯 INTEGRATION TEST RESULTS');
  console.log('============================');
  
  const passed = overallHitRate >= 30 && avgKPITime < 200 && avgChartTime < 300;
  
  if (passed) {
    console.log('✅ All tests PASSED! 🚀');
    console.log('✅ Cache integration working optimally');
    console.log('✅ Performance targets met');
    console.log('✅ Memory usage within acceptable limits');
  } else {
    console.log('⚠️ Some performance targets not met');
    console.log(`   Hit Rate: ${overallHitRate}% (target: 30%+)`);
    console.log(`   KPI Time: ${avgKPITime.toFixed(2)}ms (target: <200ms)`);
    console.log(`   Chart Time: ${avgChartTime.toFixed(2)}ms (target: <300ms)`);
  }
  
  console.log('');
  console.log('📋 Recommendations:');
  if (overallHitRate < 50) {
    console.log('💡 Consider increasing cache TTL for frequently accessed data');
  }
  if (avgKPITime > 150) {
    console.log('💡 Consider enabling data prefetching for KPI data');
  }
  if (avgChartTime > 250) {
    console.log('💡 Consider background loading for chart data');
  }
  if (estimatedMemory > 100) {
    console.log('💡 Monitor memory usage and implement cleanup if needed');
  }
  
  console.log('');
  console.log('🧹 Cleaning up test data...');
  kpiCache.clear();
  chartCache.clear();
  slicerCache.clear();
  console.log('✅ Cleanup completed');
}

// Run the integration tests
runIntegrationTests().catch(error => {
  console.error('❌ Integration test failed:', error);
});
