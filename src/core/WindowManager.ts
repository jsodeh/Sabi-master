import { BrowserWindow, screen } from 'electron';
import * as path from 'path';

/**
 * Manages Electron windows for the Sabi application
 * Handles main window creation, overlay windows, and window state management
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private overlayWindows: Map<string, BrowserWindow> = new Map();

  /**
   * Create the main application window
   */
  public async createMainWindow(): Promise<BrowserWindow> {
    console.log('[WindowManager] Creating main window...');
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      console.log('[WindowManager] Main window already exists, focusing...');
      this.mainWindow.focus();
      return this.mainWindow;
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    console.log('[WindowManager] Screen dimensions:', { width, height });

    this.mainWindow = new BrowserWindow({
      width: Math.min(1200, width),
      height: Math.min(800, height),
      minWidth: 800,
      minHeight: 600,
      show: true,
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false
      },
      icon: this.getAppIcon()
    });

    // Load the main window content
    await this.loadMainWindow();

    // Setup window event handlers
    this.setupMainWindowEvents();

    // Add error handling for failed loads
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('[WindowManager] Failed to load:', errorCode, errorDescription, validatedURL);
    });

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      console.log('[WindowManager] Window ready to show, displaying main window');
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
        
        // Focus window on creation
        if (process.platform === 'darwin') {
          this.mainWindow.focus();
        }
      }
    });

    // Force show window after a timeout if ready-to-show doesn't fire
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isVisible()) {
        console.log('[WindowManager] Forcing window to show after timeout');
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    }, 5000);

    return this.mainWindow;
  }

  /**
   * Get the main window instance
   */
  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Create an overlay window for contextual guidance
   */
  public async createOverlayWindow(id: string, options: {
    x: number;
    y: number;
    width: number;
    height: number;
    alwaysOnTop?: boolean;
  }): Promise<BrowserWindow> {
    const overlayWindow = new BrowserWindow({
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      frame: false,
      transparent: true,
      alwaysOnTop: options.alwaysOnTop ?? true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // Load overlay content
    await overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));

    this.overlayWindows.set(id, overlayWindow);

    // Clean up when overlay is closed
    overlayWindow.on('closed', () => {
      this.overlayWindows.delete(id);
    });

    return overlayWindow;
  }

  /**
   * Close an overlay window
   */
  public closeOverlayWindow(id: string): void {
    const overlayWindow = this.overlayWindows.get(id);
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close();
    }
    this.overlayWindows.delete(id);
  }

  /**
   * Close all overlay windows
   */
  public closeAllOverlays(): void {
    for (const [_id, window] of this.overlayWindows) {
      if (!window.isDestroyed()) {
        window.close();
      }
    }
    this.overlayWindows.clear();
  }

  /**
   * Load content into the main window
   */
  private async loadMainWindow(): Promise<void> {
    if (!this.mainWindow) return;

    const htmlPath = path.join(__dirname, '../renderer/index.html');
    console.log('[WindowManager] Loading main window from:', htmlPath);

    if (process.env.NODE_ENV === 'development') {
      // In development, load from dev server if available
      try {
        console.log('[WindowManager] Attempting to load from dev server...');
        await this.mainWindow.loadURL('http://localhost:3000');
        console.log('[WindowManager] Successfully loaded from dev server');
      } catch (error) {
        console.log('[WindowManager] Dev server not available, loading from file:', htmlPath);
        // Fallback to file if dev server not available
        await this.mainWindow.loadFile(htmlPath);
        console.log('[WindowManager] Successfully loaded from file');
      }
    } else {
      // In production, load from file
      console.log('[WindowManager] Loading from file (production):', htmlPath);
      await this.mainWindow.loadFile(htmlPath);
      console.log('[WindowManager] Successfully loaded from file');
    }
  }

  /**
   * Setup event handlers for the main window
   */
  private setupMainWindowEvents(): void {
    if (!this.mainWindow) return;

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      this.closeAllOverlays();
    });

    this.mainWindow.on('focus', () => {
      // Handle window focus events
    });

    this.mainWindow.on('blur', () => {
      // Handle window blur events
    });

    this.mainWindow.on('resize', () => {
      // Handle window resize events
      this.handleWindowResize();
    });

    this.mainWindow.on('move', () => {
      // Handle window move events
      this.handleWindowMove();
    });
  }

  /**
   * Handle window resize events
   */
  private handleWindowResize(): void {
    if (!this.mainWindow) return;
    
    const [width, height] = this.mainWindow.getSize();
    console.log(`Main window resized to: ${width}x${height}`);
    
    // Notify renderer process about resize
    this.mainWindow.webContents.send('window:resized', { width, height });
  }

  /**
   * Handle window move events
   */
  private handleWindowMove(): void {
    if (!this.mainWindow) return;
    
    const [x, y] = this.mainWindow.getPosition();
    console.log(`Main window moved to: ${x}, ${y}`);
    
    // Notify renderer process about move
    this.mainWindow.webContents.send('window:moved', { x, y });
  }

  /**
   * Get application icon path
   */
  private getAppIcon(): string | undefined {
    // Return appropriate icon path based on platform
    if (process.platform === 'win32') {
      return path.join(__dirname, '../assets/icon.ico');
    } else if (process.platform === 'darwin') {
      return path.join(__dirname, '../assets/icon.icns');
    } else {
      return path.join(__dirname, '../assets/icon.png');
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.closeAllOverlays();
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.close();
    }
  }
}