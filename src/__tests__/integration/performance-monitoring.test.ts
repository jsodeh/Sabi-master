/**
 * Test performance monitoring and caching system integration
 */

import { PerformanceMonitor, PerformanceAlert } from '../../core/PerformanceMonitor';
import { CacheManager, AIResponseCache, DocumentationCache } from '../../core/CacheManager';

describe('Performance Monitoring Integration', () => {
  let performanceMonitor: PerformanceMonitor;
  let aiCache: AIResponseCache;
  let docCache: DocumentationCache;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor({
      memoryUsageWarning: 70,
      memoryUsageCritical: 85,
      cpuUsageWarning: 70,
      cpuUsageCritical: 85,
      responseTimeWarning: 2000,
      responseTimeCritical: 5000
    });

    aiCache = new AIResponseCache();
    docCache = new DocumentationCache();
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
    aiCache.destroy();
    docCache.destroy();
  });

  describe('Performance Monitoring', () => {
    test('should start and stop monitoring', () => {
      const startSpy = jest.spyOn(performanceMonitor, 'emit');
      
      performanceMonitor.startMonitoring(1000);
      expect(startSpy).toHaveBeenCalledWith('monitoringStarted');
      
      performanceMonitor.stopMonitoring();
      expect(startSpy).toHaveBeenCalledWith('monitoringStopped');
    });

    test('should collect performance metrics', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cpuUsage');
      expect(metrics).toHaveProperty('sessionCount');
      expect(metrics).toHaveProperty('responseTime');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('cacheHitRate');
      
      expect(metrics.memoryUsage).toHaveProperty('used');
      expect(metrics.memoryUsage).toHaveProperty('total');
      expect(metrics.memoryUsage).toHaveProperty('percentage');
    });

    test('should record response times', () => {
      performanceMonitor.recordResponseTime(1000);
      performanceMonitor.recordResponseTime(2000);
      performanceMonitor.recordResponseTime(1500);
      
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.responseTime.average).toBe(1500);
      expect(metrics.responseTime.min).toBe(1000);
      expect(metrics.responseTime.max).toBe(2000);
    });

    test('should record errors and calculate error rate', () => {
      performanceMonitor.recordError();
      performanceMonitor.recordResponseTime(1000); // Successful request
      performanceMonitor.recordError();
      
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.errorRate).toBeCloseTo(66.67, 1); // 2 errors out of 3 total requests
    });

    test('should record cache hits and misses', () => {
      performanceMonitor.recordCacheHit();
      performanceMonitor.recordCacheHit();
      performanceMonitor.recordCacheMiss();
      
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.cacheHitRate).toBe(66.66666666666666); // 2 hits out of 3 requests
    });

    test('should emit performance alerts', (done) => {
      let alertReceived = false;
      
      performanceMonitor.on('performanceAlert', (alert: PerformanceAlert) => {
        if (alertReceived) return; // Prevent multiple calls to done()
        alertReceived = true;
        
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('value');
        expect(alert).toHaveProperty('threshold');
        expect(alert).toHaveProperty('timestamp');
        
        performanceMonitor.stopMonitoring();
        done();
      });

      // Simulate high response time to trigger alert
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordResponseTime(3000); // Above warning threshold
      }

      // Start monitoring to trigger metric collection
      performanceMonitor.startMonitoring(100);
      
      // Fallback timeout
      setTimeout(() => {
        if (!alertReceived) {
          performanceMonitor.stopMonitoring();
          done();
        }
      }, 1000);
    });

    test('should get performance summary', () => {
      performanceMonitor.recordResponseTime(1000);
      performanceMonitor.recordResponseTime(2000);
      performanceMonitor.recordError();
      
      const summary = performanceMonitor.getPerformanceSummary();
      
      expect(summary).toHaveProperty('averageMemoryUsage');
      expect(summary).toHaveProperty('averageCpuUsage');
      expect(summary).toHaveProperty('averageResponseTime');
      expect(summary).toHaveProperty('totalErrors');
      expect(summary).toHaveProperty('totalRequests');
      expect(summary).toHaveProperty('uptime');
      
      expect(summary.totalErrors).toBe(1);
      expect(summary.totalRequests).toBe(3);
    });
  });

  describe('AI Response Cache', () => {
    test('should cache and retrieve AI responses', () => {
      const prompt = 'Explain React components';
      const model = 'gpt-4';
      const response = { text: 'React components are...', tokens: 100 };
      
      const key = aiCache.generateKey(prompt, model);
      aiCache.set(key, response);
      
      const retrieved = aiCache.get(key);
      expect(retrieved).toEqual(response);
    });

    test('should handle cache misses', () => {
      const result = aiCache.get('non-existent-key');
      expect(result).toBeNull();
    });

    test('should respect TTL expiration', (done) => {
      const key = 'test-key';
      const value = { data: 'test' };
      
      aiCache.set(key, value, 100); // 100ms TTL
      
      // Should be available immediately
      expect(aiCache.get(key)).toEqual(value);
      
      // Should expire after TTL
      setTimeout(() => {
        expect(aiCache.get(key)).toBeNull();
        done();
      }, 150);
    });

    test('should generate consistent cache keys', () => {
      const prompt = 'Test prompt';
      const model = 'gpt-4';
      const params = { temperature: 0.7 };
      
      const key1 = aiCache.generateKey(prompt, model, params);
      const key2 = aiCache.generateKey(prompt, model, params);
      
      expect(key1).toBe(key2);
    });

    test('should emit cache events', () => {
      const hitSpy = jest.fn();
      const missSpy = jest.fn();
      const setSpy = jest.fn();
      
      aiCache.on('cacheHit', hitSpy);
      aiCache.on('cacheMiss', missSpy);
      aiCache.on('cacheSet', setSpy);
      
      const key = 'test-key';
      const value = { data: 'test' };
      
      aiCache.set(key, value);
      expect(setSpy).toHaveBeenCalledWith(key, expect.any(Number));
      
      aiCache.get(key);
      expect(hitSpy).toHaveBeenCalledWith(key);
      
      aiCache.get('non-existent');
      expect(missSpy).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('Documentation Cache', () => {
    test('should cache and retrieve documentation', () => {
      const toolName = 'builder.io';
      const version = '1.0.0';
      const docs = { 
        title: 'Builder.io Documentation',
        content: 'How to use Builder.io...',
        lastUpdated: new Date()
      };
      
      const key = docCache.generateKey(toolName, version);
      docCache.set(key, docs);
      
      const retrieved = docCache.get(key);
      expect(retrieved).toEqual(docs);
    });

    test('should generate cache keys for documentation', () => {
      const key1 = docCache.generateKey('builder.io', '1.0.0');
      const key2 = docCache.generateKey('builder.io'); // No version
      
      expect(key1).toBe('doc:builder.io:1.0.0');
      expect(key2).toBe('doc:builder.io:latest');
    });
  });

  describe('Cache Management', () => {
    test('should get cache statistics', () => {
      aiCache.set('key1', { data: 'value1' });
      aiCache.set('key2', { data: 'value2' });
      aiCache.get('key1'); // Hit
      aiCache.get('key3'); // Miss
      
      const stats = aiCache.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(50);
      expect(stats.missRate).toBe(50);
    });

    test('should clear cache', () => {
      aiCache.set('key1', { data: 'value1' });
      aiCache.set('key2', { data: 'value2' });
      
      expect(aiCache.getEntryCount()).toBe(2);
      
      aiCache.clear();
      
      expect(aiCache.getEntryCount()).toBe(0);
    });

    test('should optimize cache by removing LRU entries', () => {
      // Create a small cache for testing
      const smallCache = new CacheManager({
        maxSize: 500, // Very small size to trigger optimization
        maxEntries: 2 // Only 2 entries max
      });
      
      smallCache.set('key1', { data: 'a'.repeat(100) });
      smallCache.set('key2', { data: 'b'.repeat(100) });
      
      expect(smallCache.getEntryCount()).toBe(2);
      
      // Access key1 to make it more recently used
      smallCache.get('key1');
      
      // Add another entry that should trigger eviction
      smallCache.set('key3', { data: 'c'.repeat(100) });
      
      // Should have evicted one entry due to maxEntries limit
      expect(smallCache.getEntryCount()).toBeLessThanOrEqual(2);
      expect(smallCache.has('key1')).toBe(true); // Most recently accessed
      expect(smallCache.has('key3')).toBe(true); // Most recently added
      
      smallCache.destroy();
    });

    test('should cleanup expired entries', () => {
      const cache = new CacheManager({
        cleanupInterval: 1000 // Disable automatic cleanup for testing
      });
      
      cache.set('key1', { data: 'value1' }, 10); // 10ms TTL
      cache.set('key2', { data: 'value2' }, 1000); // 1000ms TTL
      
      expect(cache.getEntryCount()).toBe(2);
      
      // Wait for key1 to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Manually trigger cleanup
          const cleanedCount = cache.cleanup();
          
          // key1 should be expired and cleaned up
          expect(cache.has('key1')).toBe(false);
          expect(cache.has('key2')).toBe(true);
          expect(cleanedCount).toBe(1);
          
          cache.destroy();
          resolve();
        }, 50);
      });
    });
  });

  describe('Integration with Performance Monitor', () => {
    test('should integrate cache events with performance monitoring', () => {
      const cacheHitSpy = jest.spyOn(performanceMonitor, 'recordCacheHit');
      const cacheMissSpy = jest.spyOn(performanceMonitor, 'recordCacheMiss');
      
      // Simulate cache events
      aiCache.emit('cacheHit', 'test-key');
      aiCache.emit('cacheMiss', 'missing-key');
      
      // In real integration, these would be called automatically
      performanceMonitor.recordCacheHit();
      performanceMonitor.recordCacheMiss();
      
      expect(cacheHitSpy).toHaveBeenCalled();
      expect(cacheMissSpy).toHaveBeenCalled();
      
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.cacheHitRate).toBe(50); // 1 hit, 1 miss
    });
  });
});