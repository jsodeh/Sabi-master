import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Manages the application lifecycle for Sabi
 * Handles initialization, configuration, and cleanup processes
 */
export class ApplicationLifecycle {
  private isInitialized: boolean = false;
  private configPath: string;
  private userDataPath: string;

  constructor() {
    this.userDataPath = app.getPath('userData');
    this.configPath = path.join(this.userDataPath, 'config');
  }

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing Sabi application...');

    try {
      // Create necessary directories
      await this.createDirectories();

      // Initialize configuration
      await this.initializeConfiguration();

      // Setup application settings
      this.setupApplicationSettings();

      // Initialize core services
      await this.initializeCoreServices();

      this.isInitialized = true;
      console.log('Application initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Cleanup application resources
   */
  public async cleanup(): Promise<void> {
    console.log('Cleaning up application resources...');

    try {
      // Save application state
      await this.saveApplicationState();

      // Cleanup core services
      await this.cleanupCoreServices();

      console.log('Application cleanup completed');
    } catch (error) {
      console.error('Error during application cleanup:', error);
    }
  }

  /**
   * Check if application is initialized
   */
  public isAppInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get application paths
   */
  public getPaths(): {
    userData: string;
    config: string;
    logs: string;
    temp: string;
  } {
    return {
      userData: this.userDataPath,
      config: this.configPath,
      logs: path.join(this.userDataPath, 'logs'),
      temp: path.join(this.userDataPath, 'temp')
    };
  }

  /**
   * Create necessary application directories
   */
  private async createDirectories(): Promise<void> {
    const directories = [
      this.configPath,
      path.join(this.userDataPath, 'logs'),
      path.join(this.userDataPath, 'temp'),
      path.join(this.userDataPath, 'cache'),
      path.join(this.userDataPath, 'user-profiles'),
      path.join(this.userDataPath, 'learning-sessions')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
        throw error;
      }
    }
  }

  /**
   * Initialize application configuration
   */
  private async initializeConfiguration(): Promise<void> {
    const configFile = path.join(this.configPath, 'app-config.json');
    
    try {
      // Check if config file exists
      await fs.access(configFile);
      console.log('Configuration file found, loading existing config');
    } catch {
      // Create default configuration
      console.log('Creating default configuration file');
      const defaultConfig = {
        version: app.getVersion(),
        firstRun: true,
        theme: 'system',
        language: 'en',
        windowSettings: {
          width: 1200,
          height: 800,
          maximized: false
        },
        learningSettings: {
          adaptiveMode: true,
          explanationLevel: 'detailed',
          voiceEnabled: true
        },
        browserSettings: {
          headless: false,
          timeout: 30000,
          retryAttempts: 3
        },
        aiSettings: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7
        }
      };

      await fs.writeFile(configFile, JSON.stringify(defaultConfig, null, 2));
    }
  }

  /**
   * Setup application-wide settings
   */
  private setupApplicationSettings(): void {
    // Set application name
    app.setName('Sabi');

    // Set application user model ID (Windows)
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.sabi.learning-companion');
    }

    // Configure security settings
    app.on('web-contents-created', (_, contents) => {
      // Prevent navigation to external URLs
      contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.origin !== 'http://localhost:3000' && 
            parsedUrl.protocol !== 'file:') {
          event.preventDefault();
        }
      });

      // Prevent new window creation
      contents.setWindowOpenHandler(({ url }) => {
        console.log(`Blocked window open attempt to: ${url}`);
        return { action: 'deny' };
      });
    });

    // Handle certificate errors
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      // In development, ignore certificate errors for localhost
      if (process.env.NODE_ENV === 'development' && url.startsWith('http://localhost')) {
        event.preventDefault();
        callback(true);
      } else {
        callback(false);
      }
    });
  }

  /**
   * Initialize core application services
   */
  private async initializeCoreServices(): Promise<void> {
    console.log('Initializing core services...');

    // Initialize logging service
    await this.initializeLogging();

    // Initialize error handling
    this.initializeErrorHandling();

    // Initialize performance monitoring
    this.initializePerformanceMonitoring();

    console.log('Core services initialized');
  }

  /**
   * Initialize logging service
   */
  private async initializeLogging(): Promise<void> {
    const logsDir = path.join(this.userDataPath, 'logs');
    const logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);

    // Setup console logging to file
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args) => {
      originalConsoleLog(...args);
      this.writeToLogFile(logFile, 'INFO', args.join(' '));
    };

    console.error = (...args) => {
      originalConsoleError(...args);
      this.writeToLogFile(logFile, 'ERROR', args.join(' '));
    };
  }

  /**
   * Write message to log file
   */
  private async writeToLogFile(logFile: string, level: string, message: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${level}: ${message}\n`;
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      // Silently fail to avoid infinite loops
    }
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // Log error but don't exit in production
      if (process.env.NODE_ENV !== 'development') {
        // Could send error to crash reporting service
      }
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    // Monitor memory usage
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
        console.warn('High memory usage detected:', {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
        });
      }
    }, 60000); // Check every minute
  }

  /**
   * Save application state before shutdown
   */
  private async saveApplicationState(): Promise<void> {
    const stateFile = path.join(this.configPath, 'app-state.json');
    
    const state = {
      lastShutdown: new Date().toISOString(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch
    };

    try {
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      console.log('Application state saved');
    } catch (error) {
      console.error('Failed to save application state:', error);
    }
  }

  /**
   * Cleanup core services
   */
  private async cleanupCoreServices(): Promise<void> {
    // Clear temporary files
    const tempDir = path.join(this.userDataPath, 'temp');
    try {
      const files = await fs.readdir(tempDir);
      for (const file of files) {
        await fs.unlink(path.join(tempDir, file));
      }
      console.log('Temporary files cleaned up');
    } catch (error) {
      console.error('Failed to cleanup temporary files:', error);
    }
  }
}