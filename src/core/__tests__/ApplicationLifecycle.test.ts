import { ApplicationLifecycle } from '../ApplicationLifecycle';

// Mock Electron app module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      const paths: Record<string, string> = {
        userData: '/mock/userData',
        temp: '/mock/temp'
      };
      return paths[name] || '/mock/default';
    }),
    getVersion: jest.fn(() => '1.0.0'),
    setName: jest.fn(),
    setAppUserModelId: jest.fn(),
    on: jest.fn()
  }
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockRejectedValue(new Error('File not found')),
  writeFile: jest.fn().mockResolvedValue(undefined),
  appendFile: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
  unlink: jest.fn().mockResolvedValue(undefined)
}));

describe('ApplicationLifecycle', () => {
  let lifecycle: ApplicationLifecycle;

  beforeEach(() => {
    lifecycle = new ApplicationLifecycle();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(lifecycle.initialize()).resolves.not.toThrow();
      expect(lifecycle.isAppInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      await lifecycle.initialize();
      expect(lifecycle.isAppInitialized()).toBe(true);
      
      // Second initialization should return immediately
      await expect(lifecycle.initialize()).resolves.not.toThrow();
    });

    it('should provide application paths', () => {
      const paths = lifecycle.getPaths();
      
      expect(paths).toHaveProperty('userData');
      expect(paths).toHaveProperty('config');
      expect(paths).toHaveProperty('logs');
      expect(paths).toHaveProperty('temp');
      
      expect(typeof paths.userData).toBe('string');
      expect(typeof paths.config).toBe('string');
      expect(typeof paths.logs).toBe('string');
      expect(typeof paths.temp).toBe('string');
    });
  });

  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      await lifecycle.initialize();
      await expect(lifecycle.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock fs operations to throw errors
      const fs = require('fs/promises');
      fs.readdir.mockRejectedValue(new Error('Read error'));
      
      await lifecycle.initialize();
      await expect(lifecycle.cleanup()).resolves.not.toThrow();
    });
  });
});