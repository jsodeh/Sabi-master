import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  timestamp: Date;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  sessionCount: number;
  responseTime: {
    average: number;
    min: number;
    max: number;
  };
  errorRate: number;
  cacheHitRate: number;
}

export interface PerformanceAlert {
  type: 'memory' | 'cpu' | 'response_time' | 'error_rate';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

export interface PerformanceThresholds {
  memoryUsageWarning: number; // percentage
  memoryUsageCritical: number; // percentage
  cpuUsageWarning: number; // percentage
  cpuUsageCritical: number; // percentage
  responseTimeWarning: number; // milliseconds
  responseTimeCritical: number; // milliseconds
  errorRateWarning: number; // percentage
  errorRateCritical: number; // percentage
}

/**
 * PerformanceMonitor tracks system performance metrics and alerts
 * when thresholds are exceeded
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private responseTimes: number[] = [];
  private errorCount = 0;
  private totalRequests = 0;
  private cacheHits = 0;
  private cacheRequests = 0;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  private thresholds: PerformanceThresholds = {
    memoryUsageWarning: 70,
    memoryUsageCritical: 85,
    cpuUsageWarning: 70,
    cpuUsageCritical: 85,
    responseTimeWarning: 2000,
    responseTimeCritical: 5000,
    errorRateWarning: 5,
    errorRateCritical: 10
  };

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    super();
    if (thresholds) {
      this.thresholds = { ...this.thresholds, ...thresholds };
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      console.warn('Performance monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    console.log(`Performance monitoring started with ${intervalMs}ms interval`);
    this.emit('monitoringStarted');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Performance monitoring stopped');
    this.emit('monitoringStopped');
  }

  /**
   * Record a response time
   */
  recordResponseTime(timeMs: number): void {
    this.responseTimes.push(timeMs);
    this.totalRequests++;
    
    // Keep only last 100 response times for rolling average
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.errorCount++;
    this.totalRequests++;
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
    this.cacheRequests++;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.cacheRequests++;
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;
    
    const responseTime = this.calculateResponseTimeStats();
    const errorRate = this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0;
    const cacheHitRate = this.cacheRequests > 0 ? (this.cacheHits / this.cacheRequests) * 100 : 0;

    return {
      timestamp: new Date(),
      memoryUsage: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100
      },
      cpuUsage: this.getCpuUsage(),
      sessionCount: this.getActiveSessionCount(),
      responseTime,
      errorRate,
      cacheHitRate
    };
  }

  /**
   * Get performance history
   */
  getMetricsHistory(limit?: number): PerformanceMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  /**
   * Clear performance history
   */
  clearHistory(): void {
    this.metrics = [];
    this.responseTimes = [];
    this.errorCount = 0;
    this.totalRequests = 0;
    this.cacheHits = 0;
    this.cacheRequests = 0;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageMemoryUsage: number;
    averageCpuUsage: number;
    averageResponseTime: number;
    totalErrors: number;
    totalRequests: number;
    uptime: number;
  } {
    const recentMetrics = this.metrics.slice(-20); // Last 20 measurements
    
    const averageMemoryUsage = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.memoryUsage.percentage, 0) / recentMetrics.length
      : 0;
      
    const averageCpuUsage = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length
      : 0;
      
    const averageResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime.average, 0) / recentMetrics.length
      : 0;

    return {
      averageMemoryUsage,
      averageCpuUsage,
      averageResponseTime,
      totalErrors: this.errorCount,
      totalRequests: this.totalRequests,
      uptime: process.uptime()
    };
  }

  /**
   * Private methods
   */
  
  private collectMetrics(): void {
    const metrics = this.getCurrentMetrics();
    this.metrics.push(metrics);
    
    // Keep only last 1000 metrics (about 1.4 hours at 5s intervals)
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
    
    // Check for alerts
    this.checkThresholds(metrics);
    
    this.emit('metricsCollected', metrics);
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Memory usage alerts
    if (metrics.memoryUsage.percentage >= this.thresholds.memoryUsageCritical) {
      alerts.push({
        type: 'memory',
        severity: 'critical',
        message: `Critical memory usage: ${metrics.memoryUsage.percentage.toFixed(1)}%`,
        value: metrics.memoryUsage.percentage,
        threshold: this.thresholds.memoryUsageCritical,
        timestamp: metrics.timestamp
      });
    } else if (metrics.memoryUsage.percentage >= this.thresholds.memoryUsageWarning) {
      alerts.push({
        type: 'memory',
        severity: 'warning',
        message: `High memory usage: ${metrics.memoryUsage.percentage.toFixed(1)}%`,
        value: metrics.memoryUsage.percentage,
        threshold: this.thresholds.memoryUsageWarning,
        timestamp: metrics.timestamp
      });
    }

    // CPU usage alerts
    if (metrics.cpuUsage >= this.thresholds.cpuUsageCritical) {
      alerts.push({
        type: 'cpu',
        severity: 'critical',
        message: `Critical CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
        value: metrics.cpuUsage,
        threshold: this.thresholds.cpuUsageCritical,
        timestamp: metrics.timestamp
      });
    } else if (metrics.cpuUsage >= this.thresholds.cpuUsageWarning) {
      alerts.push({
        type: 'cpu',
        severity: 'warning',
        message: `High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
        value: metrics.cpuUsage,
        threshold: this.thresholds.cpuUsageWarning,
        timestamp: metrics.timestamp
      });
    }

    // Response time alerts
    if (metrics.responseTime.average >= this.thresholds.responseTimeCritical) {
      alerts.push({
        type: 'response_time',
        severity: 'critical',
        message: `Critical response time: ${metrics.responseTime.average.toFixed(0)}ms`,
        value: metrics.responseTime.average,
        threshold: this.thresholds.responseTimeCritical,
        timestamp: metrics.timestamp
      });
    } else if (metrics.responseTime.average >= this.thresholds.responseTimeWarning) {
      alerts.push({
        type: 'response_time',
        severity: 'warning',
        message: `Slow response time: ${metrics.responseTime.average.toFixed(0)}ms`,
        value: metrics.responseTime.average,
        threshold: this.thresholds.responseTimeWarning,
        timestamp: metrics.timestamp
      });
    }

    // Error rate alerts
    if (metrics.errorRate >= this.thresholds.errorRateCritical) {
      alerts.push({
        type: 'error_rate',
        severity: 'critical',
        message: `Critical error rate: ${metrics.errorRate.toFixed(1)}%`,
        value: metrics.errorRate,
        threshold: this.thresholds.errorRateCritical,
        timestamp: metrics.timestamp
      });
    } else if (metrics.errorRate >= this.thresholds.errorRateWarning) {
      alerts.push({
        type: 'error_rate',
        severity: 'warning',
        message: `High error rate: ${metrics.errorRate.toFixed(1)}%`,
        value: metrics.errorRate,
        threshold: this.thresholds.errorRateWarning,
        timestamp: metrics.timestamp
      });
    }

    // Emit alerts
    alerts.forEach(alert => {
      this.emit('performanceAlert', alert);
    });
  }

  private calculateResponseTimeStats(): { average: number; min: number; max: number } {
    if (this.responseTimes.length === 0) {
      return { average: 0, min: 0, max: 0 };
    }

    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    const average = sum / this.responseTimes.length;
    const min = Math.min(...this.responseTimes);
    const max = Math.max(...this.responseTimes);

    return { average, min, max };
  }

  private getCpuUsage(): number {
    // Simple CPU usage estimation based on process.cpuUsage()
    // This is a basic implementation - in production you might want to use a more sophisticated approach
    const usage = process.cpuUsage();
    const totalUsage = usage.user + usage.system;
    
    // Convert to percentage (rough estimation)
    // This is simplified - real CPU percentage would require sampling over time
    return Math.min(100, (totalUsage / 1000000) * 0.1); // Very rough approximation
  }

  private getActiveSessionCount(): number {
    // This would be injected or accessed from the session manager
    // For now, return a placeholder
    return 0;
  }
}