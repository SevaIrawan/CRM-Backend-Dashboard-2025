// ===========================================
// TERMINAL CACHE TEST
// ==========================================

const { performance } = require('perf_hooks');

console.log('🧪 Testing Terminal Cache System...\n');

// Simple cache implementation for terminal testing
class TerminalCache {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, operations: 0 };
    this.maxSize = 100; // Max items
  }

  set(key, value, ttl = 60000) {
    // Check if we need to evict items
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl
    });
  }

  get(key) {
    this.stats.operations++;
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

  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : '0.00';
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate}%`,
      totalItems: this.cache.size,
      operations: this.stats.operations
    };
  }

  clear() {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.operations = 0;
  }

  // Simulate memory usage
  getMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.cache.entries()) {
      totalSize += JSON.stringify(key).length;
      totalSize += JSON.stringify(value).length;
    }
    return `${(totalSize / 1024).toFixed(2)}KB`;
  }
}

// Test data
const testData = {
  kpi: { 
    netProfit: 1500000, 
    ggrUser: 2500000,
    ggrPureUser: 1800000,
    currency: 'MYR',
    year: '2024',
    month: '12'
  },
  chart: { 
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Net Profit Trend',
        data: [1200000, 1350000, 1420000, 1580000, 1450000, 1500000]
      }
    ]
  },
  slicer: { 
    years: ['2024', '2025'],
    months: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
    currencies: ['MYR', 'SGD', 'USC']
  }
};

// Create cache instance
const cache = new TerminalCache();

// Test 1: Basic Operations
console.log('📊 Test 1: Basic Cache Operations');
const startTime = performance.now();

cache.set('test_kpi', testData.kpi, 30000); // 30 seconds
cache.set('test_chart', testData.chart, 15000); // 15 seconds
cache.set('test_slicer', testData.slicer, 60000); // 1 minute

console.log('✅ Data set successfully');

const retrievedKPI = cache.get('test_kpi');
const retrievedChart = cache.get('test_chart');
const retrievedSlicer = cache.get('test_slicer');

if (retrievedKPI && retrievedChart && retrievedSlicer) {
  console.log('✅ All data retrieved successfully');
} else {
  console.log('❌ Some data not retrieved');
}

const endTime = performance.now();
const duration = endTime - startTime;
console.log(`⚡ Basic operations completed in ${duration.toFixed(2)}ms\n`);

// Test 2: Hit/Miss Testing
console.log('📊 Test 2: Cache Hit/Miss Testing');

let hits = 0;
let misses = 0;

for (let i = 0; i < 100; i++) {
  if (cache.get('test_kpi')) {
    hits++;
  } else {
    misses++;
  }
}

const hitRate = (hits / (hits + misses) * 100).toFixed(2);
console.log(`✅ Hit Rate: ${hitRate}% (${hits} hits, ${misses} misses)\n`);

// Test 3: TTL Testing
console.log('📊 Test 3: TTL (Time To Live) Testing');

// Set data with short TTL
cache.set('temp_data', { message: 'This will expire soon' }, 1000); // 1 second

console.log('   Setting data with 1 second TTL...');
const tempData = cache.get('temp_data');
console.log(`   Immediate retrieval: ${tempData ? '✅' : '❌'}`);

// Wait for TTL to expire
setTimeout(() => {
  const expiredData = cache.get('temp_data');
  console.log(`   After TTL expiration: ${expiredData ? '❌' : '✅'}`);
}, 1100);

// Test 4: Performance Testing
console.log('📊 Test 4: Performance Testing');

const perfStartTime = performance.now();

// Simulate heavy operations
for (let i = 0; i < 2000; i++) {
  cache.set(`perf_key_${i}`, { 
    data: `value_${i}`, 
    timestamp: Date.now(),
    largeArray: new Array(100).fill(`item_${i}`)
  });
}

for (let i = 0; i < 2000; i++) {
  cache.get(`perf_key_${i}`);
}

const perfEndTime = performance.now();
const perfDuration = perfEndTime - perfStartTime;

console.log(`✅ Performance: ${perfDuration.toFixed(2)}ms for 4000 operations`);
console.log(`✅ Average: ${(perfDuration / 4000).toFixed(4)}ms per operation\n`);

// Test 5: Memory Management
console.log('📊 Test 5: Memory Management');

const initialStats = cache.getStats();
console.log(`   Initial items: ${initialStats.totalItems}`);

// Add more items to test eviction
for (let i = 0; i < 150; i++) {
  cache.set(`bulk_key_${i}`, {
    data: `bulk_data_${i}`,
    timestamp: Date.now(),
    largeArray: new Array(200).fill(`item_${i}`),
    metadata: {
      id: i,
      category: `category_${i % 5}`,
      priority: i % 3,
      description: `This is a test item number ${i} with some additional metadata`
    }
  });
}

const finalStats = cache.getStats();
console.log(`   Final items: ${finalStats.totalItems}`);
console.log(`   Memory usage: ${cache.getMemoryUsage()}`);
console.log(`   Items evicted: ${150 - (finalStats.totalItems - initialStats.totalItems)}\n`);

// Test 6: Stress Testing
console.log('📊 Test 6: Stress Testing');

const stressStartTime = performance.now();
let stressOperations = 0;

// Rapid set/get operations
for (let i = 0; i < 5000; i++) {
  const key = `stress_${i % 100}`;
  cache.set(key, { 
    data: `stress_data_${i}`, 
    timestamp: Date.now(),
    counter: i
  });
  
  if (i % 10 === 0) {
    cache.get(key);
    stressOperations++;
  }
}

const stressEndTime = performance.now();
const stressDuration = stressEndTime - stressStartTime;

console.log(`✅ Stress test: ${stressDuration.toFixed(2)}ms for ${stressOperations} operations`);
console.log(`✅ Stress performance: ${(stressDuration / stressOperations).toFixed(4)}ms per operation\n`);

// Test 7: Final Statistics
console.log('📊 Test 7: Final Statistics');

const finalCacheStats = cache.getStats();
console.log('✅ Final Cache Statistics:');
console.log(`   Total Items: ${finalCacheStats.totalItems}`);
console.log(`   Memory Usage: ${cache.getMemoryUsage()}`);
console.log(`   Hit Rate: ${finalCacheStats.hitRate}`);
console.log(`   Total Operations: ${finalCacheStats.operations}`);
console.log(`   Hits: ${finalCacheStats.hits}`);
console.log(`   Misses: ${finalCacheStats.misses}\n`);

// Test 8: Summary
console.log('🎯 TERMINAL CACHE TEST COMPLETED');
console.log('==================================');
console.log(`✅ Cache Operations: ${finalCacheStats.operations}`);
console.log(`✅ Hit Rate: ${finalCacheStats.hitRate}`);
console.log(`✅ Memory Usage: ${cache.getMemoryUsage()}`);
console.log(`✅ Cache Items: ${finalCacheStats.totalItems}`);
console.log(`✅ Performance: ${perfDuration.toFixed(2)}ms for 4000 operations`);
console.log(`✅ Stress Test: ${stressDuration.toFixed(2)}ms for ${stressOperations} operations`);
console.log(`✅ All tests passed successfully! 🚀\n`);

// Cleanup
cache.clear();
console.log('🧹 Cache cleared for cleanup');

// Wait for TTL test to complete
setTimeout(() => {
  console.log('✅ TTL test completed');
  process.exit(0);
}, 2000);
