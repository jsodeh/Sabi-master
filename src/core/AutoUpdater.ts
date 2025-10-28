import { autoUpdater } from 'electron-updater';
import { app, dialog, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
  downloadSize?: number;
}

export interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export interface UpdateConfig {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  allowPrerelease: boolean;
  checkForUpdatesOnStart: boolean;
  checkInterval: number; // in milliseconds
}

/**
 * AutoUpdater manages application updates using electron-updater
 */
export class AutoUpdater extends EventEmitter {
  private config: UpdateConfig;
  private checkTimer: NodeJS.Timeout | null = null;
  private isChecking = false;
  private updateAvailable = false;

  constructor(config: Partial<UpdateConfig> = {}) {
    super();
    
    this.config = {
      autoDownload: false, // Let user decide
      autoInstallOnAppQuit: true,
      allowPrerelease: false,
      checkForUpdatesOnStart: true,
      checkInterval: 4 * 60 * 60 * 1000, // 4 hours
      ...config
    };

    this.setupAutoUpdater();
  }

  /**
   * Initialize the auto-updater
   */
  initialize(): void {
    // Configure auto-updater
    autoUpdater.autoDownload = this.config.autoDownload;
    autoUpdater.autoInstallOnAppQuit = this.config.autoInstallOnAppQuit;
    autoUpdater.allowPrerelease = this.config.allowPrerelease;

    // Set update server URL (would be configured for production)
    if (process.env.NODE_ENV === 'production') {
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'sabi-team',
        repo: 'sabi-learning-companion',
        private: false
      });
    }

    // Check for updates on app start if configured
    if (this.config.checkForUpdatesOnStart) {
      // Wait a bit after app start to check for updates
      setTimeout(() => {
        this.checkForUpdates();
      }, 10000); // 10 seconds after start
    }

    // Set up periodic update checks
    this.startPeriodicChecks();

    console.log('AutoUpdater initialized');
  }

  /**
   * Manually check for updates
   */
  async checkForUpdates(): Promise<void> {
    if (this.isChecking) {
      console.log('Update check already in progress');
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Update checks disabled in development mode');
      return;
    }

    try {
      this.isChecking = true;
      console.log('Checking for updates...');
      
      const result = await autoUpdater.checkForUpdatesAndNotify();
      
      if (result) {
        console.log('Update check completed:', result.updateInfo.version);
      } else {
        console.log('No updates available');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      this.emit('error', error);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Download available update
   */
  async downloadUpdate(): Promise<void> {
    if (!this.updateAvailable) {
      throw new Error('No update available to download');
    }

    try {
      console.log('Starting update download...');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Error downloading update:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Install downloaded update and restart app
   */
  installUpdate(): void {
    console.log('Installing update and restarting...');
    autoUpdater.quitAndInstall();
  }

  /**
   * Get current app version
   */
  getCurrentVersion(): string {
    return app.getVersion();
  }

  /**
   * Enable or disable automatic update checks
   */
  setAutoCheck(enabled: boolean): void {
    this.config.checkForUpdatesOnStart = enabled;
    
    if (enabled) {
      this.startPeriodicChecks();
    } else {
      this.stopPeriodicChecks();
    }
  }

  /**
   * Set update check interval
   */
  setCheckInterval(intervalMs: number): void {
    this.config.checkInterval = intervalMs;
    
    if (this.checkTimer) {
      this.stopPeriodicChecks();
      this.startPeriodicChecks();
    }
  }

  /**
   * Show update notification dialog
   */
  private async showUpdateDialog(updateInfo: UpdateInfo): Promise<boolean> {
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    
    if (!mainWindow) {
      return false;
    }

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Sabi Learning Companion v${updateInfo.version} is available`,
      detail: `Current version: ${this.getCurrentVersion()}\nNew version: ${updateInfo.version}\n\n${updateInfo.releaseNotes || 'No release notes available.'}`,
      buttons: ['Download Now', 'Download Later', 'Skip This Version'],
      defaultId: 0,
      cancelId: 1
    });

    return result.response === 0; // Download Now
  }

  /**
   * Show download progress dialog
   */
  private showDownloadProgress(progress: UpdateProgress): void {
    // Broadcast progress to renderer process
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('update:download-progress', progress);
      }
    });
  }

  /**
   * Show update ready dialog
   */
  private async showUpdateReadyDialog(): Promise<boolean> {
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    
    if (!mainWindow) {
      return false;
    }

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update has been downloaded and is ready to install',
      detail: 'The application will restart to apply the update.',
      buttons: ['Restart Now', 'Restart Later'],
      defaultId: 0,
      cancelId: 1
    });

    return result.response === 0; // Restart Now
  }

  /**
   * Setup auto-updater event listeners
   */
  private setupAutoUpdater(): void {
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
      this.emit('checking-for-update');
    });

    autoUpdater.on('update-available', async (info) => {
      console.log('Update available:', info.version);
      this.updateAvailable = true;
      this.emit('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
        downloadSize: info.files?.[0]?.size
      });

      // Show dialog and download if user agrees
      if (await this.showUpdateDialog({
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
      })) {
        await this.downloadUpdate();
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available');
      this.updateAvailable = false;
      this.emit('update-not-available', info);
    });

    autoUpdater.on('error', (error) => {
      console.error('AutoUpdater error:', error);
      this.updateAvailable = false;
      this.emit('error', error);
    });

    autoUpdater.on('download-progress', (progress) => {
      console.log(`Download progress: ${progress.percent.toFixed(2)}%`);
      this.showDownloadProgress(progress);
      this.emit('download-progress', progress);
    });

    autoUpdater.on('update-downloaded', async (info) => {
      console.log('Update downloaded:', info.version);
      this.emit('update-downloaded', info);

      // Show dialog and install if user agrees
      if (await this.showUpdateReadyDialog()) {
        this.installUpdate();
      }
    });
  }

  /**
   * Start periodic update checks
   */
  private startPeriodicChecks(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.checkTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.config.checkInterval);
  }

  /**
   * Stop periodic update checks
   */
  private stopPeriodicChecks(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopPeriodicChecks();
    this.removeAllListeners();
  }
}