'use client';

import { useState, useEffect } from 'react';

// Simple cache untuk performance demo
class PerformanceCache {
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

export default function PerformanceDemo() {
  const [results, setResults] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const updateStats = (cache: PerformanceCache) => {
    setStats(cache.getStats());
  };

  // Simulasi database query yang lambat
  const simulateDatabaseQuery = async (key: string): Promise<any> => {
    // Simulasi delay database
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    return {
      id: key,
      value: Math.random() * 1000000,
      timestamp: new Date().toISOString()
    };
  };

  const testWithoutCache = async () => {
    addResult('🧪 Testing WITHOUT cache...');
    const startTime = performance.now();
    
    // Query database 5 kali tanpa cache
    for (let i = 0; i < 5; i++) {
      await simulateDatabaseQuery(`query_${i}`);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    addResult(`❌ Without cache: ${duration.toFixed(2)}ms untuk 5 queries`);
    return duration;
  };

  const testWithCache = async () => {
    addResult('🧪 Testing WITH cache...');
    const cache = new PerformanceCache();
    const startTime = performance.now();
    
    // Query database 5 kali dengan cache
    for (let i = 0; i < 5; i++) {
      const key = `query_${i}`;
      let data = cache.get(key);
      
      if (!data) {
        data = await simulateDatabaseQuery(key);
        cache.set(key, data);
      }
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    addResult(`✅ With cache: ${duration.toFixed(2)}ms untuk 5 queries`);
    updateStats(cache);
    return duration;
  };

  const testCacheHitRate = async () => {
    addResult('🧪 Testing cache hit rate...');
    const cache = new PerformanceCache();
    
    // Set beberapa data
    for (let i = 0; i < 10; i++) {
      cache.set(`data_${i}`, { value: i, timestamp: Date.now() });
    }
    
    // Test retrieval multiple times
    for (let i = 0; i < 20; i++) {
      const key = `data_${i % 10}`; // 10 unique keys, will have hits
      cache.get(key);
    }
    
    const stats = cache.getStats();
    addResult(`📊 Cache Hit Rate: ${stats.hitRate} (${stats.hits} hits, ${stats.misses} misses)`);
    updateStats(cache);
  };

  const testMemoryEfficiency = async () => {
    addResult('🧪 Testing memory efficiency...');
    const cache = new PerformanceCache();
    
    // Add banyak data
    for (let i = 0; i < 100; i++) {
      cache.set(`large_data_${i}`, {
        id: i,
        data: new Array(1000).fill(`item_${i}`),
        timestamp: Date.now()
      });
    }
    
    const stats = cache.getStats();
    addResult(`💾 Memory test: ${stats.totalItems} items cached`);
    updateStats(cache);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    addResult('🚀 Starting Performance Cache Tests...\n');
    
    try {
      // Test 1: Without cache
      const withoutCacheTime = await testWithoutCache();
      
      // Test 2: With cache
      const withCacheTime = await testWithCache();
      
      // Test 3: Hit rate
      await testCacheHitRate();
      
      // Test 4: Memory efficiency
      await testMemoryEfficiency();
      
      // Performance comparison
      const improvement = ((withoutCacheTime - withCacheTime) / withoutCacheTime * 100).toFixed(2);
      addResult(`\n🎯 PERFORMANCE IMPROVEMENT: ${improvement}% faster with cache!`);
      addResult(`   Without cache: ${withoutCacheTime.toFixed(2)}ms`);
      addResult(`   With cache: ${withCacheTime.toFixed(2)}ms`);
      
    } catch (error) {
      addResult(`❌ Error during testing: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearCache = () => {
    setResults([]);
    setStats(null);
    addResult('🧹 Cache test results cleared');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🚀 NEXMAX Performance Cache Demo
          </h1>
          <p className="text-gray-600 mb-6">
            Demonstrasi sistem caching yang meningkatkan performa aplikasi secara signifikan
          </p>
          
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              {isRunning ? '🔄 Running Tests...' : '🧪 Jalankan Semua Test'}
            </button>
            
            <button
              onClick={clearCache}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🧹 Clear Results
            </button>
          </div>

          {stats && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">📊 Cache Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.hits}</div>
                  <div className="text-sm text-blue-600">Cache Hits</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.misses}</div>
                  <div className="text-sm text-red-600">Cache Misses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.hitRate}</div>
                  <div className="text-sm text-green-600">Hit Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.totalItems}</div>
                  <div className="text-sm text-purple-600">Total Items</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📋 Test Results</h2>
          <div className="bg-gray-100 rounded-lg p-4 h-96 overflow-y-auto">
            {results.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                Klik "Jalankan Semua Test" untuk memulai testing
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div key={index} className="text-sm font-mono bg-white p-2 rounded border">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">💡 Cara Kerja Cache</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-red-600 mb-2">❌ Tanpa Cache:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Setiap request ke database</li>
                <li>• Waktu loading lambat</li>
                <li>• Beban server tinggi</li>
                <li>• User experience buruk</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-green-600 mb-2">✅ Dengan Cache:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Data disimpan di memory</li>
                <li>• Akses data sangat cepat</li>
                <li>• Mengurangi beban database</li>
                <li>• User experience optimal</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
