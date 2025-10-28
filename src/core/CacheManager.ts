import { EventEmitter } from 'events';

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number; // in bytes
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // in bytes
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
  defaultTtl: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableStats: boolean;
}

/**
 * CacheManager provides intelligent caching for AI responses and documentation
 * with LRU eviction, TTL support, and performance monitoring
 */
export class CacheManager<T = any> extends EventEmitter {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    cleanups: 0
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    super();
    
    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB default
      maxEntries: 10000,
      defaultTtl: 30 * 60 * 1000, // 30 minutes
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      enableStats: true,
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      this.emit('cacheMiss', key);
      return null;
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      this.emit('cacheExpired', key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = new Date();
    
    if (this.config.enableStats) {
      this.stats.hits++;
    }
    
    this.emit('cacheHit', key);
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttl || this.config.defaultTtl));
    const size = this.calculateSize(value);

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessed: now,
      size
    };

    // Check if we need to make space
    this.ensureCapacity(size);

    this.cache.set(key, entry);
    this.emit('cacheSet', key, size);
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.emit('cacheDelete', key);
    }
    return deleted;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.emit('cacheCleared', size);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      oldestEntry: entries.length > 0 ? new Date(Math.min(...entries.map(e => e.timestamp.getTime()))) : undefined,
      newestEntry: entries.length > 0 ? new Date(Math.max(...entries.map(e => e.timestamp.getTime()))) : undefined
    };
  }

  /**
   * Get cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size in bytes
   */
  getSize(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  /**
   * Get number of entries
   */
  getEntryCount(): number {
    return this.cache.size;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.stats.cleanups++;
      this.emit('cacheCleanup', cleanedCount);
    }

    return cleanedCount;
  }

  /**
   * Get cache entries sorted by access pattern
   */
  getEntriesByAccess(limit?: number): CacheEntry<T>[] {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => {
        // Sort by access count (descending) then by last accessed (descending)
        if (a.accessCount !== b.accessCount) {
          return b.accessCount - a.accessCount;
        }
        return b.lastAccessed.getTime() - a.lastAccessed.getTime();
      });

    return limit ? entries.slice(0, limit) : entries;
  }

  /**
   * Optimize cache by removing least recently used entries
   */
  optimize(): number {
    const targetSize = this.config.maxSize * 0.8; // Target 80% of max size
    const currentSize = this.getSize();
    
    if (currentSize <= targetSize) {
      return 0;
    }

    // Sort entries by LRU (least recently used first)
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    let removedCount = 0;
    let freedSize = 0;

    for (const entry of entries) {
      if (currentSize - freedSize <= targetSize) {
        break;
      }

      this.cache.delete(entry.key);
      freedSize += entry.size;
      removedCount++;
      this.stats.evictions++;
    }

    if (removedCount > 0) {
      this.emit('cacheOptimized', removedCount, freedSize);
    }

    return removedCount;
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clear();
    this.removeAllListeners();
  }

  /**
   * Private methods
   */

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private ensureCapacity(newEntrySize: number): void {
    // Check entry count limit
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU(1);
    }

    // Check size limit
    const currentSize = this.getSize();
    if (currentSize + newEntrySize > this.config.maxSize) {
      const targetSize = this.config.maxSize - newEntrySize;
      this.evictToSize(targetSize);
    }
  }

  private evictLRU(count: number): void {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i].key);
      this.stats.evictions++;
      this.emit('cacheEvicted', entries[i].key, 'lru');
    }
  }

  private evictToSize(targetSize: number): void {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    let currentSize = this.getSize();
    let evictedCount = 0;

    for (const entry of entries) {
      if (currentSize <= targetSize) {
        break;
      }

      this.cache.delete(entry.key);
      currentSize -= entry.size;
      evictedCount++;
      this.stats.evictions++;
      this.emit('cacheEvicted', entry.key, 'size');
    }
  }

  private calculateSize(value: T): number {
    try {
      // Simple size calculation - in production you might want a more sophisticated approach
      const serialized = JSON.stringify(value);
      return new Blob([serialized]).size;
    } catch (error) {
      // Fallback size estimation
      return 1024; // 1KB default
    }
  }
}

/**
 * Specialized cache managers for different types of data
 */

export class AIResponseCache extends CacheManager<any> {
  constructor() {
    super({
      maxSize: 50 * 1024 * 1024, // 50MB for AI responses
      maxEntries: 1000,
      defaultTtl: 60 * 60 * 1000, // 1 hour
      cleanupInterval: 10 * 60 * 1000 // 10 minutes
    });
  }

  /**
   * Generate cache key for AI request
   */
  generateKey(prompt: string, model: string, parameters?: any): string {
    const paramStr = parameters ? JSON.stringify(parameters) : '';
    return `ai:${model}:${this.hashString(prompt + paramStr)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

export class DocumentationCache extends CacheManager<any> {
  constructor() {
    super({
      maxSize: 20 * 1024 * 1024, // 20MB for documentation
      maxEntries: 500,
      defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
      cleanupInterval: 60 * 60 * 1000 // 1 hour
    });
  }

  /**
   * Generate cache key for documentation
   */
  generateKey(toolName: string, version?: string): string {
    return `doc:${toolName}:${version || 'latest'}`;
  }
}