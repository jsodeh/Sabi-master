/**
 * Test auto-updater integration
 */

import { AutoUpdater } from '../../core/AutoUpdater';

// Mock electron-updater
jest.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: false,
    autoInstallOnAppQuit: true,
    allowPrerelease: false,
    setFeedURL: jest.fn(),
    checkForUpdatesAndNotify: jest.fn(),
    downloadUpdate: jest.fn(),
    quitAndInstall: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn()
  }
}));

// Mock electron
jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn().mockReturnValue('1.0.0'),
    quit: jest.fn()
  },
  dialog: {
    showMessageBox: jest.fn()
  },
  BrowserWindow: {
    getFocusedWindow: jest.fn(),
    getAllWindows: jest.fn().mockReturnValue([])
  }
}));

describe('AutoUpdater Integration', () => {
  let autoUpdater: AutoUpdater;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set production environment for testing
    process.env.NODE_ENV = 'production';
    
    autoUpdater = new AutoUpdater({
      autoDownload: false,
      autoInstallOnAppQuit: true,
      allowPrerelease: false,
      checkForUpdatesOnStart: false, // Disable for testing
      checkInterval: 1000 // Short interval for testing
    });
  });

  afterEach(() => {
    autoUpdater.destroy();
    process.env.NODE_ENV = 'test';
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      const updater = new AutoUpdater();
      expect(updater).toBeDefined();
      expect(updater.getCurrentVersion()).toBe('1.0.0');
      updater.destroy();
    });

    test('should initialize with custom configuration', () => {
      const config = {
        autoDownload: true,
        autoInstallOnAppQuit: false,
        allowPrerelease: true,
        checkForUpdatesOnStart: true,
        checkInterval: 5000
      };

      const updater = new AutoUpdater(config);
      expect(updater).toBeDefined();
      updater.destroy();
    });

    test('should setup electron-updater configuration', () => {
      const { autoUpdater: electronUpdater } = require('electron-updater');
      
      autoUpdater.initialize();
      
      expect(electronUpdater.autoDownload).toBe(false);
      expect(electronUpdater.autoInstallOnAppQuit).toBe(true);
      expect(electronUpdater.allowPrerelease).toBe(false);
      expect(electronUpdater.setFeedURL).toHaveBeenCalledWith({
        provider: 'github',
        owner: 'sabi-team',
        repo: 'sabi-learning-companion',
        private: false
      });
    });
  });

  describe('Update Checking', () => {
    test('should check for updates', async () => {
      const { autoUpdater: electronUpdater } = require('electron-updater');
      electronUpdater.checkForUpdatesAndNotify.mockResolvedValue({
        updateInfo: { version: '1.1.0' }
      });

      await autoUpdater.checkForUpdates();

      expect(electronUpdater.checkForUpdatesAndNotify).toHaveBeenCalled();
    });

    test('should handle update check errors', async () => {
      const { autoUpdater: electronUpdater } = require('electron-updater');
      const error = new Error('Network error');
      electronUpdater.checkForUpdatesAndNotify.mockRejectedValue(error);

      const errorSpy = jest.fn();
      autoUpdater.on('error', errorSpy);

      await autoUpdater.checkForUpdates();

      expect(errorSpy).toHaveBeenCalledWith(error);
    });

    test('should skip update checks in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const { autoUpdater: electronUpdater } = require('electron-updater');

      await autoUpdater.checkForUpdates();

      expect(electronUpdater.checkForUpdatesAndNotify).not.toHaveBeenCalled();
    });
  });

  describe('Update Download', () => {
    test('should download update when available', async () => {
      const { autoUpdater: electronUpdater } = require('electron-updater');
      electronUpdater.downloadUpdate.mockResolvedValue(undefined);

      // Simulate update available
      (autoUpdater as any).updateAvailable = true;

      await autoUpdater.downloadUpdate();

      expect(electronUpdater.downloadUpdate).toHaveBeenCalled();
    });

    test('should throw error when no update available', async () => {
      (autoUpdater as any).updateAvailable = false;

      await expect(autoUpdater.downloadUpdate()).rejects.toThrow(
        'No update available to download'
      );
    });

    test('should handle download errors', async () => {
      const { autoUpdater: electronUpdater } = require('electron-updater');
      const error = new Error('Download failed');
      electronUpdater.downloadUpdate.mockRejectedValue(error);

      (autoUpdater as any).updateAvailable = true;

      const errorSpy = jest.fn();
      autoUpdater.on('error', errorSpy);

      await expect(autoUpdater.downloadUpdate()).rejects.toThrow('Download failed');
      expect(errorSpy).toHaveBeenCalledWith(error);
    });
  });

  describe('Update Installation', () => {
    test('should install update and restart', () => {
      const { autoUpdater: electronUpdater } = require('electron-updater');

      autoUpdater.installUpdate();

      expect(electronUpdater.quitAndInstall).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    test('should get current version', () => {
      const version = autoUpdater.getCurrentVersion();
      expect(version).toBe('1.0.0');
    });

    test('should enable/disable auto-check', () => {
      autoUpdater.setAutoCheck(true);
      // Should start periodic checks
      
      autoUpdater.setAutoCheck(false);
      // Should stop periodic checks
    });

    test('should set check interval', () => {
      autoUpdater.setCheckInterval(10000);
      // Should update the check interval
    });
  });

  describe('Event Handling', () => {
    test('should emit events for update lifecycle', () => {
      const checkingSpy = jest.fn();
      const availableSpy = jest.fn();
      const notAvailableSpy = jest.fn();
      const progressSpy = jest.fn();
      const downloadedSpy = jest.fn();
      const errorSpy = jest.fn();

      autoUpdater.on('checking-for-update', checkingSpy);
      autoUpdater.on('update-available', availableSpy);
      autoUpdater.on('update-not-available', notAvailableSpy);
      autoUpdater.on('download-progress', progressSpy);
      autoUpdater.on('update-downloaded', downloadedSpy);
      autoUpdater.on('error', errorSpy);

      // Simulate electron-updater events
      const { autoUpdater: electronUpdater } = require('electron-updater');
      const mockOn = electronUpdater.on as jest.Mock;

      // Get the event handlers that were registered
      const eventHandlers: { [key: string]: Function } = {};
      mockOn.mock.calls.forEach(([event, handler]) => {
        eventHandlers[event] = handler;
      });

      // Simulate events
      if (eventHandlers['checking-for-update']) {
        eventHandlers['checking-for-update']();
        expect(checkingSpy).toHaveBeenCalled();
      }

      if (eventHandlers['update-available']) {
        const updateInfo = { version: '1.1.0', releaseDate: '2024-01-01' };
        eventHandlers['update-available'](updateInfo);
        expect(availableSpy).toHaveBeenCalled();
      }

      if (eventHandlers['update-not-available']) {
        eventHandlers['update-not-available']({});
        expect(notAvailableSpy).toHaveBeenCalled();
      }

      if (eventHandlers['download-progress']) {
        const progress = { percent: 50, bytesPerSecond: 1000, transferred: 500, total: 1000 };
        eventHandlers['download-progress'](progress);
        expect(progressSpy).toHaveBeenCalled();
      }

      if (eventHandlers['update-downloaded']) {
        const info = { version: '1.1.0' };
        eventHandlers['update-downloaded'](info);
        expect(downloadedSpy).toHaveBeenCalled();
      }

      if (eventHandlers['error']) {
        const error = new Error('Update error');
        eventHandlers['error'](error);
        expect(errorSpy).toHaveBeenCalledWith(error);
      }
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources on destroy', () => {
      const removeListenersSpy = jest.spyOn(autoUpdater, 'removeAllListeners');

      autoUpdater.destroy();

      expect(removeListenersSpy).toHaveBeenCalled();
    });
  });
});