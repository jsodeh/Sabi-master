import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script for secure communication between main and renderer processes
 * Exposes safe APIs to the renderer process through context isolation
 */

// Define the API interface
interface SabiAPI {
  // Application APIs
  app: {
    getVersion(): Promise<string>;
    getPath(name: string): Promise<string>;
  };
  
  // Window APIs
  window: {
    minimize(): Promise<void>;
    maximize(): Promise<void>;
    close(): Promise<void>;
    onResized(callback: (data: { width: number; height: number }) => void): void;
    onMoved(callback: (data: { x: number; y: number }) => void): void;
  };

  // Learning APIs
  learning: {
    startSession: (request: any) => Promise<any>;
    pauseSession: (sessionId: string) => Promise<any>;
    resumeSession: (sessionId: string) => Promise<any>;
    stopSession: (sessionId: string) => Promise<any>;
    submitInput: (input: any) => Promise<any>;
    getSessionStatus: (sessionId: string) => Promise<any>;
    onSessionUpdate: (callback: (data: any) => void) => void;
    onStepComplete: (callback: (data: any) => void) => void;
  };

  // Performance monitoring APIs
  performance: {
    getMetrics: () => Promise<any>;
    getCacheStats: () => Promise<any>;
    clearCache: (cacheType: 'ai' | 'documentation' | 'all') => Promise<any>;
    optimizeCache: () => Promise<any>;
    onMetricsUpdate: (callback: (data: any) => void) => void;
    onPerformanceAlert: (callback: (data: any) => void) => void;
  };

  // Auto-updater APIs
  updater: {
    checkForUpdates: () => Promise<any>;
    downloadUpdate: () => Promise<any>;
    installUpdate: () => Promise<any>;
    getVersion: () => Promise<any>;
    setAutoCheck: (enabled: boolean) => Promise<any>;
    onUpdateChecking: (callback: () => void) => void;
    onUpdateAvailable: (callback: (info: any) => void) => void;
    onUpdateNotAvailable: (callback: () => void) => void;
    onDownloadProgress: (callback: (progress: any) => void) => void;
    onUpdateDownloaded: (callback: (info: any) => void) => void;
    onUpdateError: (callback: (error: any) => void) => void;
  };

  // Browser automation APIs (placeholder for future implementation)
  browser: {
    // Will be implemented in future tasks
  };
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const sabiAPI: SabiAPI = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPath: (name: string) => ipcRenderer.invoke('app:get-path', name)
  },
  
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    onResized: (callback) => {
      ipcRenderer.on('window:resized', (_, data) => callback(data));
    },
    onMoved: (callback) => {
      ipcRenderer.on('window:moved', (_, data) => callback(data));
    }
  },

  learning: {
    startSession: (request: any) => ipcRenderer.invoke('learning:start-session', request),
    pauseSession: (sessionId: string) => ipcRenderer.invoke('learning:pause-session', sessionId),
    resumeSession: (sessionId: string) => ipcRenderer.invoke('learning:resume-session', sessionId),
    stopSession: (sessionId: string) => ipcRenderer.invoke('learning:stop-session', sessionId),
    submitInput: (input: any) => ipcRenderer.invoke('learning:submit-input', input),
    getSessionStatus: (sessionId: string) => ipcRenderer.invoke('learning:get-session-status', sessionId),
    onSessionUpdate: (callback: (data: any) => void) => {
      ipcRenderer.on('learning:session-update', (_, data) => callback(data));
    },
    onStepComplete: (callback: (data: any) => void) => {
      ipcRenderer.on('learning:step-complete', (_, data) => callback(data));
    }
  },

  performance: {
    getMetrics: () => ipcRenderer.invoke('performance:get-metrics'),
    getCacheStats: () => ipcRenderer.invoke('performance:get-cache-stats'),
    clearCache: (cacheType: 'ai' | 'documentation' | 'all') => ipcRenderer.invoke('performance:clear-cache', cacheType),
    optimizeCache: () => ipcRenderer.invoke('performance:optimize-cache'),
    onMetricsUpdate: (callback: (data: any) => void) => {
      ipcRenderer.on('performance:metrics', (_, data) => callback(data));
    },
    onPerformanceAlert: (callback: (data: any) => void) => {
      ipcRenderer.on('performance:alert', (_, data) => callback(data));
    }
  },

  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
    installUpdate: () => ipcRenderer.invoke('updater:install-update'),
    getVersion: () => ipcRenderer.invoke('updater:get-version'),
    setAutoCheck: (enabled: boolean) => ipcRenderer.invoke('updater:set-auto-check', enabled),
    onUpdateChecking: (callback: () => void) => {
      ipcRenderer.on('update:checking', () => callback());
    },
    onUpdateAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update:available', (_, info) => callback(info));
    },
    onUpdateNotAvailable: (callback: () => void) => {
      ipcRenderer.on('update:not-available', () => callback());
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('update:download-progress', (_, progress) => callback(progress));
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      ipcRenderer.on('update:downloaded', (_, info) => callback(info));
    },
    onUpdateError: (callback: (error: any) => void) => {
      ipcRenderer.on('update:error', (_, error) => callback(error));
    }
  },

  browser: {
    // Placeholder for future browser automation APIs
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('sabiAPI', sabiAPI);

// Type declaration for TypeScript support in renderer
declare global {
  interface Window {
    sabiAPI: SabiAPI;
  }
}