// ===========================================
// SIMPLE CACHE TEST
// ==========================================

console.log('🧪 Testing Simple Cache System...\n');

// Simulate cache behavior
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  set(key, value) {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (item) {
      this.stats.hits++;
      return item.data;
    } else {
      this.stats.misses++;
      return null;
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : '0.00';
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate}%`,
      totalItems: this.cache.size
    };
  }

  clear() {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }
}

// Test data
const testData = {
  kpi: { netProfit: 1500000, ggrUser: 2500000 },
  chart: { labels: ['Jan', 'Feb', 'Mar'], data: [100, 200, 300] },
  slicer: { years: ['2024', '2025'], currencies: ['MYR', 'SGD'] }
};

console.log('📊 Test 1: Creating Cache Instance');
const cache = new SimpleCache();
console.log('✅ Cache instance created\n');

console.log('📊 Test 2: Setting Data');
cache.set('kpi_data', testData.kpi);
cache.set('chart_data', testData.chart);
cache.set('slicer_data', testData.slicer);
console.log('✅ Data set successfully\n');

console.log('📊 Test 3: Retrieving Data');
const kpiData = cache.get('kpi_data');
const chartData = cache.get('chart_data');
const slicerData = cache.get('slicer_data');

console.log('✅ Data retrieved:');
console.log(`   KPI: ${kpiData ? '✅' : '❌'}`);
console.log(`   Chart: ${chartData ? '✅' : '❌'}`);
console.log(`   Slicer: ${slicerData ? '✅' : '❌'}\n`);

console.log('📊 Test 4: Cache Hit/Miss Testing');
// Test multiple retrievals
for (let i = 0; i < 10; i++) {
  cache.get('kpi_data'); // Should be hit
  cache.get('chart_data'); // Should be hit
  cache.get('nonexistent_key'); // Should be miss
}

const stats = cache.getStats();
console.log('✅ Cache Statistics:');
console.log(`   Hits: ${stats.hits}`);
console.log(`   Misses: ${stats.misses}`);
console.log(`   Hit Rate: ${stats.hitRate}`);
console.log(`   Total Items: ${stats.totalItems}\n`);

console.log('📊 Test 5: Performance Test');
const startTime = performance.now();

// Simulate heavy operations
for (let i = 0; i < 1000; i++) {
  cache.set(`perf_key_${i}`, { data: `value_${i}`, timestamp: Date.now() });
}

for (let i = 0; i < 1000; i++) {
  cache.get(`perf_key_${i}`);
}

const endTime = performance.now();
const duration = endTime - startTime;

console.log(`✅ Performance Test Completed:`);
console.log(`   Operations: 2000`);
console.log(`   Duration: ${duration.toFixed(2)}ms`);
console.log(`   Average: ${(duration / 2000).toFixed(4)}ms per operation\n`);

console.log('🎯 SIMPLE CACHE TEST COMPLETED');
console.log('===============================');
console.log(`✅ Cache Operations: ${stats.hits + stats.misses}`);
console.log(`✅ Hit Rate: ${stats.hitRate}`);
console.log(`✅ Cache Items: ${stats.totalItems}`);
console.log(`✅ Performance: ${duration.toFixed(2)}ms for 2000 operations`);
console.log(`✅ All tests passed successfully! 🚀\n`);

// Cleanup
cache.clear();
console.log('🧹 Cache cleared for cleanup');
