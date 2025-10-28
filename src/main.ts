import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { WindowManager } from './core/WindowManager';
import { ApplicationLifecycle } from './core/ApplicationLifecycle';
import { LearningOrchestrator } from './core/LearningOrchestrator';
import { LearningSessionManager } from './core/LearningSessionManager';
import { BrowserController } from './browser/BrowserController';
import { MultimodalProcessor } from './ai/MultimodalProcessor';
import { IntentAnalyzer } from './ai/IntentAnalyzer';
import { LearningPathGenerator } from './ai/LearningPathGenerator';
import { AdaptiveInstructor } from './ai/AdaptiveInstructor';
import { PerformanceMonitor } from './core/PerformanceMonitor';
import { CacheManager, AIResponseCache, DocumentationCache } from './core/CacheManager';
import { AutoUpdater } from './core/AutoUpdater';
import { LearningRequest, UserFeedback } from './types/learning';

/**
 * Main entry point for the Sabi Electron application
 * Handles application lifecycle and window management
 */
class SabiApplication {
  private windowManager: WindowManager;
  private lifecycle: ApplicationLifecycle;
  private learningOrchestrator: LearningOrchestrator | null = null;
  private sessionManager: LearningSessionManager | null = null;
  private browserController: BrowserController | null = null;
  private performanceMonitor: PerformanceMonitor | null = null;
  private aiResponseCache: AIResponseCache | null = null;
  private documentationCache: DocumentationCache | null = null;
  private autoUpdater: AutoUpdater | null = null;

  constructor() {
    this.windowManager = new WindowManager();
    this.lifecycle = new ApplicationLifecycle();
    this.setupEventHandlers();
  }

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
    try {
      await this.lifecycle.initialize();
      await this.initializeLearningComponents();
      await this.windowManager.createMainWindow();
      console.log('Sabi application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Sabi application:', error);
      app.quit();
    }
  }

  /**
   * Initialize learning system components
   */
  private async initializeLearningComponents(): Promise<void> {
    try {
      // Initialize performance monitoring and caching
      this.performanceMonitor = new PerformanceMonitor({
        memoryUsageWarning: 75,
        memoryUsageCritical: 90,
        cpuUsageWarning: 80,
        cpuUsageCritical: 95,
        responseTimeWarning: 3000,
        responseTimeCritical: 8000
      });

      this.aiResponseCache = new AIResponseCache();
      this.documentationCache = new DocumentationCache();

      // Set up performance monitoring event listeners
      this.setupPerformanceMonitoring();

      // Start performance monitoring
      this.performanceMonitor.startMonitoring(3000); // Every 3 seconds

      // Initialize auto-updater
      this.autoUpdater = new AutoUpdater({
        autoDownload: false,
        autoInstallOnAppQuit: true,
        allowPrerelease: false,
        checkForUpdatesOnStart: true,
        checkInterval: 4 * 60 * 60 * 1000 // 4 hours
      });

      this.setupAutoUpdaterEvents();
      this.autoUpdater.initialize();

      // Initialize core components
      this.browserController = new BrowserController();
      const multimodalProcessor = new MultimodalProcessor();
      const intentAnalyzer = new IntentAnalyzer();
      const pathGenerator = new LearningPathGenerator();
      const adaptiveInstructor = new AdaptiveInstructor();

      // Initialize session manager
      this.sessionManager = new LearningSessionManager(
        pathGenerator,
        adaptiveInstructor,
        this.browserController,
        intentAnalyzer
      );

      // Initialize learning orchestrator
      this.learningOrchestrator = new LearningOrchestrator(
        {
          enableRealTimeTracking: true,
          adaptationThreshold: 0.7,
          maxConcurrentSessions: 3,
          errorRecoveryAttempts: 3
        },
        this.browserController,
        this.sessionManager,
        multimodalProcessor,
        intentAnalyzer,
        pathGenerator,
        adaptiveInstructor
      );

      // Set up event listeners for real-time updates
      this.setupLearningEventListeners();

      console.log('Learning components initialized successfully');
    } catch (error) {
      console.error('Failed to initialize learning components:', error);
      throw error;
    }
  }

  /**
   * Setup application event handlers
   */
  private setupEventHandlers(): void {
    // Handle app ready event
    app.whenReady().then(() => this.initialize());

    // Handle window closed events
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Handle app activation (macOS)
    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await this.windowManager.createMainWindow();
      }
    });

    // Handle app before quit
    app.on('before-quit', async () => {
      await this.cleanupLearningComponents();
      await this.lifecycle.cleanup();
    });

    // Setup IPC handlers
    this.setupIpcHandlers();
    this.setupLearningIpcHandlers();
    this.setupIpcErrorHandling();
  }

  /**
   * Setup Inter-Process Communication handlers
   */
  private setupIpcHandlers(): void {
    ipcMain.handle('app:get-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:get-path', (_, name: string) => {
      return app.getPath(name as any);
    });

    ipcMain.handle('window:minimize', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.minimize();
      }
    });

    ipcMain.handle('window:maximize', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        if (focusedWindow.isMaximized()) {
          focusedWindow.unmaximize();
        } else {
          focusedWindow.maximize();
        }
      }
    });

    ipcMain.handle('window:close', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.close();
      }
    });
  }

  /**
   * Setup learning-specific IPC handlers
   */
  private setupLearningIpcHandlers(): void {
    // Start learning session
    ipcMain.handle('learning:start-session', async (event, request: LearningRequest) => {
      const startTime = Date.now();
      try {
        if (!this.learningOrchestrator) {
          throw new Error('Learning orchestrator not initialized');
        }

        // Validate request
        if (!request || !request.objective) {
          throw new Error('Invalid learning request: missing objective');
        }

        console.log(`[IPC] Starting learning session: "${request.objective}" (ID: ${request.id})`);
        const sessionId = await this.learningOrchestrator.processLearningRequest(request);
        
        const duration = Date.now() - startTime;
        console.log(`[IPC] Learning session started successfully in ${duration}ms (Session ID: ${sessionId})`);
        
        // Record performance metrics
        this.performanceMonitor?.recordResponseTime(duration);
        
        return {
          success: true,
          sessionId,
          message: 'Learning session started successfully',
          duration
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[IPC] Failed to start learning session after ${duration}ms:`, error);
        
        // Record error and response time
        this.performanceMonitor?.recordError();
        this.performanceMonitor?.recordResponseTime(duration);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration
        };
      }
    });

    // Pause learning session
    ipcMain.handle('learning:pause-session', async (event, sessionId: string) => {
      const startTime = Date.now();
      try {
        if (!this.learningOrchestrator) {
          throw new Error('Learning orchestrator not initialized');
        }

        if (!sessionId) {
          throw new Error('Invalid session ID provided');
        }

        console.log(`[IPC] Pausing learning session: ${sessionId}`);
        await this.learningOrchestrator.pauseSession(sessionId);
        
        const duration = Date.now() - startTime;
        console.log(`[IPC] Learning session paused successfully in ${duration}ms`);
        
        // Record performance metrics
        this.performanceMonitor?.recordResponseTime(duration);
        
        return {
          success: true,
          message: 'Learning session paused successfully',
          duration
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[IPC] Failed to pause learning session after ${duration}ms:`, error);
        
        // Record error and response time
        this.performanceMonitor?.recordError();
        this.performanceMonitor?.recordResponseTime(duration);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration
        };
      }
    });

    // Resume learning session
    ipcMain.handle('learning:resume-session', async (event, sessionId: string) => {
      const startTime = Date.now();
      try {
        if (!this.learningOrchestrator) {
          throw new Error('Learning orchestrator not initialized');
        }

        if (!sessionId) {
          throw new Error('Invalid session ID provided');
        }

        console.log(`[IPC] Resuming learning session: ${sessionId}`);
        await this.learningOrchestrator.resumeSession(sessionId);
        
        const duration = Date.now() - startTime;
        console.log(`[IPC] Learning session resumed successfully in ${duration}ms`);
        
        // Record performance metrics
        this.performanceMonitor?.recordResponseTime(duration);
        
        return {
          success: true,
          message: 'Learning session resumed successfully',
          duration
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[IPC] Failed to resume learning session after ${duration}ms:`, error);
        
        // Record error and response time
        this.performanceMonitor?.recordError();
        this.performanceMonitor?.recordResponseTime(duration);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration
        };
      }
    });

    // Stop learning session
    ipcMain.handle('learning:stop-session', async (event, sessionId: string) => {
      const startTime = Date.now();
      try {
        if (!this.learningOrchestrator) {
          throw new Error('Learning orchestrator not initialized');
        }

        if (!sessionId) {
          throw new Error('Invalid session ID provided');
        }

        console.log(`[IPC] Stopping learning session: ${sessionId}`);
        await this.learningOrchestrator.cancelSession(sessionId);
        
        const duration = Date.now() - startTime;
        console.log(`[IPC] Learning session stopped successfully in ${duration}ms`);
        
        // Record performance metrics
        this.performanceMonitor?.recordResponseTime(duration);
        
        return {
          success: true,
          message: 'Learning session stopped successfully',
          duration
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[IPC] Failed to stop learning session after ${duration}ms:`, error);
        
        // Record error and response time
        this.performanceMonitor?.recordError();
        this.performanceMonitor?.recordResponseTime(duration);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration
        };
      }
    });

    // Submit user input/feedback
    ipcMain.handle('learning:submit-input', async (event, input: { sessionId: string; feedback?: UserFeedback; data?: any }) => {
      const startTime = Date.now();
      try {
        if (!this.learningOrchestrator) {
          throw new Error('Learning orchestrator not initialized');
        }

        if (!input || !input.sessionId) {
          throw new Error('Invalid input: missing session ID');
        }

        console.log(`[IPC] Submitting user input for session: ${input.sessionId}`);
        
        if (input.feedback) {
          await this.learningOrchestrator.provideFeedback(input.sessionId, input.feedback);
          console.log(`[IPC] User feedback processed for session: ${input.sessionId}`);
        }
        
        const duration = Date.now() - startTime;
        console.log(`[IPC] User input submitted successfully in ${duration}ms`);
        
        // Record performance metrics
        this.performanceMonitor?.recordResponseTime(duration);
        
        return {
          success: true,
          message: 'User input submitted successfully',
          duration
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[IPC] Failed to submit user input after ${duration}ms:`, error);
        
        // Record error and response time
        this.performanceMonitor?.recordError();
        this.performanceMonitor?.recordResponseTime(duration);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration
        };
      }
    });

    // Get session status
    ipcMain.handle('learning:get-session-status', async (event, sessionId: string) => {
      const startTime = Date.now();
      try {
        if (!this.learningOrchestrator) {
          throw new Error('Learning orchestrator not initialized');
        }

        if (!sessionId) {
          throw new Error('Invalid session ID provided');
        }

        const processingStatus = await this.learningOrchestrator.getProcessingStatus(sessionId);
        const sessionProgress = await this.learningOrchestrator.getSessionProgress(sessionId);
        
        const duration = Date.now() - startTime;
        console.log(`[IPC] Session status retrieved successfully in ${duration}ms for session: ${sessionId}`);
        
        // Record performance metrics
        this.performanceMonitor?.recordResponseTime(duration);
        
        return {
          success: true,
          status: processingStatus,
          progress: sessionProgress,
          duration
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[IPC] Failed to get session status after ${duration}ms:`, error);
        
        // Record error and response time
        this.performanceMonitor?.recordError();
        this.performanceMonitor?.recordResponseTime(duration);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration
        };
      }
    });

    // Performance monitoring IPC handlers
    ipcMain.handle('performance:get-metrics', async () => {
      try {
        if (!this.performanceMonitor) {
          throw new Error('Performance monitor not initialized');
        }

        const metrics = this.performanceMonitor.getCurrentMetrics();
        const summary = this.performanceMonitor.getPerformanceSummary();
        
        return {
          success: true,
          metrics,
          summary
        };
      } catch (error) {
        console.error('[IPC] Failed to get performance metrics:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('performance:get-cache-stats', async () => {
      try {
        const aiCacheStats = this.aiResponseCache?.getStats();
        const docCacheStats = this.documentationCache?.getStats();
        
        return {
          success: true,
          aiCache: aiCacheStats,
          documentationCache: docCacheStats
        };
      } catch (error) {
        console.error('[IPC] Failed to get cache stats:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('performance:clear-cache', async (event, cacheType: 'ai' | 'documentation' | 'all') => {
      try {
        switch (cacheType) {
          case 'ai':
            this.aiResponseCache?.clear();
            break;
          case 'documentation':
            this.documentationCache?.clear();
            break;
          case 'all':
            this.aiResponseCache?.clear();
            this.documentationCache?.clear();
            break;
        }
        
        return {
          success: true,
          message: `${cacheType} cache cleared successfully`
        };
      } catch (error) {
        console.error('[IPC] Failed to clear cache:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('performance:optimize-cache', async () => {
      try {
        const aiOptimized = this.aiResponseCache?.optimize() || 0;
        const docOptimized = this.documentationCache?.optimize() || 0;
        
        return {
          success: true,
          message: 'Cache optimization completed',
          optimized: {
            ai: aiOptimized,
            documentation: docOptimized
          }
        };
      } catch (error) {
        console.error('[IPC] Failed to optimize cache:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Auto-updater IPC handlers
    ipcMain.handle('updater:check-for-updates', async () => {
      try {
        if (!this.autoUpdater) {
          throw new Error('Auto-updater not initialized');
        }

        await this.autoUpdater.checkForUpdates();
        
        return {
          success: true,
          message: 'Update check initiated'
        };
      } catch (error) {
        console.error('[IPC] Failed to check for updates:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('updater:download-update', async () => {
      try {
        if (!this.autoUpdater) {
          throw new Error('Auto-updater not initialized');
        }

        await this.autoUpdater.downloadUpdate();
        
        return {
          success: true,
          message: 'Update download started'
        };
      } catch (error) {
        console.error('[IPC] Failed to download update:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('updater:install-update', async () => {
      try {
        if (!this.autoUpdater) {
          throw new Error('Auto-updater not initialized');
        }

        this.autoUpdater.installUpdate();
        
        return {
          success: true,
          message: 'Update installation started'
        };
      } catch (error) {
        console.error('[IPC] Failed to install update:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('updater:get-version', async () => {
      try {
        const version = this.autoUpdater?.getCurrentVersion() || app.getVersion();
        
        return {
          success: true,
          version
        };
      } catch (error) {
        console.error('[IPC] Failed to get version:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('updater:set-auto-check', async (event, enabled: boolean) => {
      try {
        if (!this.autoUpdater) {
          throw new Error('Auto-updater not initialized');
        }

        this.autoUpdater.setAutoCheck(enabled);
        
        return {
          success: true,
          message: `Auto-check ${enabled ? 'enabled' : 'disabled'}`
        };
      } catch (error) {
        console.error('[IPC] Failed to set auto-check:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Setup event listeners for learning system real-time updates
   */
  private setupLearningEventListeners(): void {
    if (!this.learningOrchestrator) return;

    // Session started event
    this.learningOrchestrator.on('sessionStarted', (data) => {
      console.log('Learning session started:', data.sessionId);
      this.broadcastToRenderer('learning:session-update', {
        type: 'session-started',
        sessionId: data.sessionId,
        data
      });
    });

    // Session completed event
    this.learningOrchestrator.on('sessionCompleted', (data) => {
      console.log('Learning session completed:', data.sessionId);
      this.broadcastToRenderer('learning:session-update', {
        type: 'session-completed',
        sessionId: data.sessionId,
        data
      });
    });

    // Session paused event
    this.learningOrchestrator.on('sessionPaused', (data) => {
      console.log('Learning session paused:', data.sessionId);
      this.broadcastToRenderer('learning:session-update', {
        type: 'session-paused',
        sessionId: data.sessionId,
        data
      });
    });

    // Session resumed event
    this.learningOrchestrator.on('sessionResumed', (data) => {
      console.log('Learning session resumed:', data.sessionId);
      this.broadcastToRenderer('learning:session-update', {
        type: 'session-resumed',
        sessionId: data.sessionId,
        data
      });
    });

    // Step completed event
    this.learningOrchestrator.on('stepCompleted', (data) => {
      console.log('Learning step completed:', data.step.title);
      this.broadcastToRenderer('learning:step-complete', {
        sessionId: data.sessionId,
        step: data.step,
        result: data.result
      });
    });

    // Progress update event
    this.learningOrchestrator.on('progressUpdate', (data) => {
      this.broadcastToRenderer('learning:session-update', {
        type: 'progress-update',
        sessionId: data.sessionId,
        progress: data.progress,
        currentStep: data.currentStep,
        outcome: data.outcome
      });
    });

    // Session error event
    this.learningOrchestrator.on('sessionError', (data) => {
      console.error('Learning session error:', data.error);
      this.broadcastToRenderer('learning:session-update', {
        type: 'session-error',
        sessionId: data.sessionId,
        error: data.error
      });
    });

    // Session failed event
    this.learningOrchestrator.on('sessionFailed', (data) => {
      console.error('Learning session failed:', data.error);
      this.broadcastToRenderer('learning:session-update', {
        type: 'session-failed',
        sessionId: data.sessionId,
        error: data.error
      });
    });

    // Feedback received event
    this.learningOrchestrator.on('feedbackReceived', (data) => {
      console.log('User feedback received for session:', data.sessionId);
      this.broadcastToRenderer('learning:session-update', {
        type: 'feedback-received',
        sessionId: data.sessionId,
        feedback: data.feedback
      });
    });
  }

  /**
   * Broadcast message to all renderer processes
   */
  private broadcastToRenderer(channel: string, data: any): void {
    try {
      const allWindows = BrowserWindow.getAllWindows();
      let successCount = 0;
      let errorCount = 0;
      
      allWindows.forEach(window => {
        try {
          if (!window.isDestroyed() && window.webContents) {
            window.webContents.send(channel, data);
            successCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`[IPC] Failed to send message to renderer window:`, error);
        }
      });
      
      if (successCount > 0) {
        console.log(`[IPC] Broadcasted "${channel}" to ${successCount} renderer(s)`);
      }
      
      if (errorCount > 0) {
        console.warn(`[IPC] Failed to broadcast to ${errorCount} renderer(s)`);
      }
    } catch (error) {
      console.error(`[IPC] Critical error in broadcastToRenderer:`, error);
    }
  }

  /**
   * Setup IPC error handling for uncaught exceptions in handlers
   */
  private setupIpcErrorHandling(): void {
    // Handle IPC errors globally
    ipcMain.on('error', (error) => {
      console.error('[IPC] Unhandled IPC error:', error);
    });

    // Add timeout handling for long-running IPC operations
    const originalHandle = ipcMain.handle.bind(ipcMain);
    ipcMain.handle = (channel: string, listener: any) => {
      const wrappedListener = async (...args: any[]) => {
        const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`IPC handler timeout for channel: ${channel}`)), 30000);
        });

        try {
          return await Promise.race([listener(...args), timeout]);
        } catch (error) {
          console.error(`[IPC] Error in handler for channel "${channel}":`, error);
          throw error;
        }
      };

      return originalHandle(channel, wrappedListener);
    };
  }

  /**
   * Setup performance monitoring event listeners
   */
  private setupPerformanceMonitoring(): void {
    if (!this.performanceMonitor) return;

    this.performanceMonitor.on('performanceAlert', (alert) => {
      console.warn(`[Performance Alert] ${alert.severity.toUpperCase()}: ${alert.message}`);
      
      // Broadcast performance alert to renderer
      this.broadcastToRenderer('performance:alert', alert);
      
      // Take action based on alert type and severity
      if (alert.severity === 'critical') {
        this.handleCriticalPerformanceAlert(alert);
      }
    });

    this.performanceMonitor.on('metricsCollected', (metrics) => {
      // Broadcast metrics to renderer for dashboard
      this.broadcastToRenderer('performance:metrics', metrics);
    });

    // Set up cache event listeners
    if (this.aiResponseCache) {
      this.aiResponseCache.on('cacheHit', (key) => {
        this.performanceMonitor?.recordCacheHit();
      });

      this.aiResponseCache.on('cacheMiss', (key) => {
        this.performanceMonitor?.recordCacheMiss();
      });
    }

    if (this.documentationCache) {
      this.documentationCache.on('cacheHit', (key) => {
        this.performanceMonitor?.recordCacheHit();
      });

      this.documentationCache.on('cacheMiss', (key) => {
        this.performanceMonitor?.recordCacheMiss();
      });
    }
  }

  /**
   * Setup auto-updater event listeners
   */
  private setupAutoUpdaterEvents(): void {
    if (!this.autoUpdater) return;

    this.autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for updates...');
      this.broadcastToRenderer('update:checking', {});
    });

    this.autoUpdater.on('update-available', (info) => {
      console.log('[AutoUpdater] Update available:', info.version);
      this.broadcastToRenderer('update:available', info);
    });

    this.autoUpdater.on('update-not-available', () => {
      console.log('[AutoUpdater] No updates available');
      this.broadcastToRenderer('update:not-available', {});
    });

    this.autoUpdater.on('download-progress', (progress) => {
      console.log(`[AutoUpdater] Download progress: ${progress.percent.toFixed(2)}%`);
      this.broadcastToRenderer('update:download-progress', progress);
    });

    this.autoUpdater.on('update-downloaded', (info) => {
      console.log('[AutoUpdater] Update downloaded:', info.version);
      this.broadcastToRenderer('update:downloaded', info);
    });

    this.autoUpdater.on('error', (error) => {
      console.error('[AutoUpdater] Error:', error);
      this.broadcastToRenderer('update:error', { error: error.message });
    });
  }

  /**
   * Handle critical performance alerts
   */
  private async handleCriticalPerformanceAlert(alert: any): Promise<void> {
    console.error(`[Critical Performance Alert] ${alert.message}`);
    
    switch (alert.type) {
      case 'memory':
        // Force garbage collection and cache cleanup
        if (global.gc) {
          global.gc();
        }
        this.aiResponseCache?.optimize();
        this.documentationCache?.optimize();
        break;
        
      case 'cpu':
        // Reduce processing load
        console.log('[Performance] Reducing processing load due to high CPU usage');
        break;
        
      case 'response_time':
        // Clear caches to free up resources
        this.aiResponseCache?.clear();
        break;
        
      case 'error_rate':
        // Log error rate issue
        console.error('[Performance] High error rate detected, investigating...');
        break;
    }
  }

  /**
   * Cleanup learning components
   */
  private async cleanupLearningComponents(): Promise<void> {
    try {
      console.log('[Cleanup] Starting learning components cleanup...');
      
      // Stop performance monitoring
      if (this.performanceMonitor) {
        this.performanceMonitor.stopMonitoring();
        console.log('[Cleanup] Performance monitoring stopped');
      }
      
      // Cleanup auto-updater
      if (this.autoUpdater) {
        this.autoUpdater.destroy();
        console.log('[Cleanup] Auto-updater destroyed');
      }

      // Cleanup caches
      if (this.aiResponseCache) {
        this.aiResponseCache.destroy();
        console.log('[Cleanup] AI response cache destroyed');
      }
      
      if (this.documentationCache) {
        this.documentationCache.destroy();
        console.log('[Cleanup] Documentation cache destroyed');
      }
      
      if (this.browserController) {
        await this.browserController.closeBrowser();
        console.log('[Cleanup] Browser controller cleaned up');
      }
      
      if (this.learningOrchestrator) {
        this.learningOrchestrator.removeAllListeners();
        console.log('[Cleanup] Learning orchestrator listeners removed');
      }
      
      // Remove all IPC handlers
      ipcMain.removeAllListeners();
      console.log('[Cleanup] IPC handlers removed');
      
      console.log('[Cleanup] Learning components cleaned up successfully');
    } catch (error) {
      console.error('[Cleanup] Error cleaning up learning components:', error);
    }
  }
}

// Create and start the application
const sabiApp = new SabiApplication();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});