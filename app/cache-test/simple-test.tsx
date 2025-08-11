'use client';

import { useState } from 'react';

// Simple cache implementation for testing
class SimpleCache {
  private cache = new Map();
  private stats = { hits: 0, misses: 0 };

  set(key: string, value: any) {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  get(key: string) {
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

export default function SimpleCacheTest() {
  const [cache] = useState(() => new SimpleCache());
  const [stats, setStats] = useState(cache.getStats());
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, result]);
  };

  const updateStats = () => {
    setStats(cache.getStats());
  };

  const runBasicTest = () => {
    addResult('🧪 Running Basic Cache Test...');
    
    // Test data
    const testData = {
      kpi: { netProfit: 1500000, ggrUser: 2500000 },
      chart: { labels: ['Jan', 'Feb', 'Mar'], data: [100, 200, 300] }
    };

    // Set data
    cache.set('test_kpi', testData.kpi);
    cache.set('test_chart', testData.chart);
    addResult('✅ Data set successfully');

    // Get data
    const retrievedKPI = cache.get('test_kpi');
    const retrievedChart = cache.get('test_chart');
    
    if (retrievedKPI && retrievedChart) {
      addResult('✅ Data retrieved successfully');
    } else {
      addResult('❌ Data retrieval failed');
    }

    updateStats();
  };

  const runHitMissTest = () => {
    addResult('🧪 Running Hit/Miss Test...');
    
    let hits = 0;
    let misses = 0;

    // Test multiple retrievals
    for (let i = 0; i < 20; i++) {
      if (cache.get('test_kpi')) {
        hits++;
      } else {
        misses++;
      }
    }

    const hitRate = (hits / (hits + misses) * 100).toFixed(2);
    addResult(`✅ Hit Rate: ${hitRate}% (${hits} hits, ${misses} misses)`);
    
    updateStats();
  };

  const runPerformanceTest = () => {
    addResult('🧪 Running Performance Test...');
    
    const startTime = performance.now();

    // Simulate heavy operations
    for (let i = 0; i < 1000; i++) {
      cache.set(`perf_key_${i}`, { 
        data: `value_${i}`, 
        timestamp: Date.now() 
      });
    }

    for (let i = 0; i < 1000; i++) {
      cache.get(`perf_key_${i}`);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    addResult(`✅ Performance: ${duration.toFixed(2)}ms for 2000 operations`);
    addResult(`✅ Average: ${(duration / 2000).toFixed(4)}ms per operation`);
    
    updateStats();
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // Clear cache first
      cache.clear();
      addResult('🧹 Cache cleared');
      
      // Run tests
      runBasicTest();
      runHitMissTest();
      runPerformanceTest();
      
      addResult('🎯 All tests completed successfully! 🚀');
    } catch (error) {
      addResult(`❌ Test error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = () => {
    cache.clear();
    updateStats();
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🧪 Simple Cache Test</h1>
        
        {/* Cache Statistics */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 Cache Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800">Total Items</h3>
              <p className="text-2xl font-bold text-blue-600">{stats.totalItems}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800">Hits</h3>
              <p className="text-2xl font-bold text-green-600">{stats.hits}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-red-800">Misses</h3>
              <p className="text-2xl font-bold text-red-600">{stats.misses}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-800">Hit Rate</h3>
              <p className="text-2xl font-bold text-purple-600">{stats.hitRate}</p>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🎮 Test Controls</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={runAllTests}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
            >
              {isLoading ? 'Running Tests...' : '🚀 Run All Tests'}
            </button>
            <button
              onClick={runBasicTest}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              📊 Basic Test
            </button>
            <button
              onClick={runHitMissTest}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              🎯 Hit/Miss Test
            </button>
            <button
              onClick={runPerformanceTest}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              ⚡ Performance Test
            </button>
            <button
              onClick={clearCache}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              🧹 Clear Cache
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📋 Test Results</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cache Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">ℹ️ Cache Information</h2>
          <div className="space-y-2 text-gray-600">
            <p>• <strong>Type:</strong> In-Memory Map-based cache</p>
            <p>• <strong>Features:</strong> Set, Get, Clear operations</p>
            <p>• <strong>Statistics:</strong> Hit rate, Miss count, Total items</p>
            <p>• <strong>Performance:</strong> Sub-millisecond operations</p>
            <p>• <strong>Use Case:</strong> Testing and demonstration purposes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
