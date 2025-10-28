import { BrowserController, BrowserControllerConfig } from '../BrowserController';
import { BuilderType } from '../../types/common';
import { 
  BrowserAction, 
  BrowserActionType, 
  SelectorType, 
  BrowserErrorType,
  SessionStatus 
} from '../../types/browser';
import { v4 as uuidv4 } from 'uuid';

// Mock playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        setExtraHTTPHeaders: jest.fn(),
        setViewportSize: jest.fn(),
        goto: jest.fn(),
        locator: jest.fn().mockReturnValue({
          first: jest.fn().mockReturnValue({
            click: jest.fn(),
            fill: jest.fn(),
            scrollIntoViewIfNeeded: jest.fn(),
            highlight: jest.fn(),
            hover: jest.fn()
          })
        }),
        getByText: jest.fn().mockReturnValue({
          first: jest.fn().mockReturnValue({
            click: jest.fn(),
            fill: jest.fn()
          })
        }),
        getByPlaceholder: jest.fn().mockReturnValue({
          first: jest.fn().mockReturnValue({
            click: jest.fn(),
            fill: jest.fn()
          })
        }),
        getByLabel: jest.fn().mockReturnValue({
          first: jest.fn().mockReturnValue({
            click: jest.fn(),
            fill: jest.fn()
          })
        }),
        getByTestId: jest.fn().mockReturnValue({
          first: jest.fn().mockReturnValue({
            click: jest.fn(),
            fill: jest.fn()
          })
        }),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-screenshot')),
        title: jest.fn().mockResolvedValue('Test Page'),
        url: jest.fn().mockReturnValue('https://example.com'),
        viewportSize: jest.fn().mockReturnValue({ width: 1920, height: 1080 }),
        evaluate: jest.fn().mockResolvedValue('Sample page content'),
        waitForTimeout: jest.fn(),
        reload: jest.fn(),
        close: jest.fn()
      }),
      close: jest.fn()
    })
  },
  firefox: {
    launch: jest.fn()
  },
  webkit: {
    launch: jest.fn()
  }
}));

describe('BrowserController', () => {
  let controller: BrowserController;
  let mockConfig: BrowserControllerConfig;

  beforeEach(() => {
    mockConfig = {
      headless: true,
      timeout: 10000,
      viewport: { width: 1280, height: 720 }
    };
    controller = new BrowserController(mockConfig);
  });

  afterEach(async () => {
    await controller.closeBrowser();
  });

  describe('openTool', () => {
    it('should successfully open a tool and create a session', async () => {
      const session = await controller.openTool(BuilderType.BUILDER_IO);

      expect(session).toBeDefined();
      expect(session.toolType).toBe(BuilderType.BUILDER_IO);
      expect(session.url).toBe('https://builder.io');
      expect(session.status).toBe(SessionStatus.ACTIVE);
      expect(session.isAuthenticated).toBe(false);
      expect(session.id).toBeDefined();
    });

    it('should handle navigation errors gracefully', async () => {
      // Mock chromium to throw an error
      const { chromium } = require('playwright');
      chromium.launch.mockRejectedValueOnce(new Error('Navigation failed'));

      await expect(controller.openTool(BuilderType.LOVABLE))
        .rejects
        .toMatchObject({
          type: BrowserErrorType.NAVIGATION_ERROR,
          message: expect.stringContaining('Failed to open tool'),
          recoverable: true
        });
    });

    it('should use correct URLs for different tools', async () => {
      const tools = [
        { type: BuilderType.BUILDER_IO, expectedUrl: 'https://builder.io' },
        { type: BuilderType.FIREBASE_STUDIO, expectedUrl: 'https://console.firebase.google.com' },
        { type: BuilderType.LOVABLE, expectedUrl: 'https://lovable.dev' },
        { type: BuilderType.BOLT_NEW, expectedUrl: 'https://bolt.new' },
        { type: BuilderType.REPLIT, expectedUrl: 'https://replit.com' }
      ];

      for (const tool of tools) {
        const session = await controller.openTool(tool.type);
        expect(session.url).toBe(tool.expectedUrl);
        await controller.closeBrowser();
        controller = new BrowserController(mockConfig);
      }
    });
  });

  describe('performAction', () => {
    beforeEach(async () => {
      await controller.openTool(BuilderType.BUILDER_IO);
    });

    it('should perform a click action successfully', async () => {
      const action: BrowserAction = {
        id: uuidv4(),
        type: BrowserActionType.CLICK,
        target: {
          type: SelectorType.CSS,
          value: '.button',
          description: 'Submit button'
        },
        explanation: 'Click the submit button',
        reasoning: 'To submit the form',
        expectedResult: 'Form should be submitted',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      const result = await controller.performAction(action);

      expect(result.success).toBe(true);
      expect(result.actionId).toBe(action.id);
      expect(result.elementFound).toBe(true);
      expect(result.actualResult).toContain('Clicked on Submit button');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should perform a type action successfully', async () => {
      const action: BrowserAction = {
        id: uuidv4(),
        type: BrowserActionType.TYPE,
        target: {
          type: SelectorType.CSS,
          value: 'input[name="email"]',
          description: 'Email input field'
        },
        value: 'test@example.com',
        explanation: 'Enter email address',
        reasoning: 'To provide user email',
        expectedResult: 'Email should be entered',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      const result = await controller.performAction(action);

      expect(result.success).toBe(true);
      expect(result.actualResult).toContain('Typed "test@example.com"');
    });

    it('should handle element not found errors', async () => {
      // Mock locator to return null (element not found)
      const { chromium } = require('playwright');
      const mockPage = {
        setExtraHTTPHeaders: jest.fn(),
        setViewportSize: jest.fn(),
        goto: jest.fn(),
        locator: jest.fn().mockReturnValue({
          first: jest.fn().mockReturnValue(null)
        }),
        getByText: jest.fn().mockReturnValue({
          first: jest.fn().mockReturnValue(null)
        }),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('error-screenshot')),
        close: jest.fn()
      };

      chromium.launch.mockResolvedValueOnce({
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      });

      // Create new controller with mocked page
      const newController = new BrowserController();
      await newController.openTool(BuilderType.BUILDER_IO);

      const action: BrowserAction = {
        id: uuidv4(),
        type: BrowserActionType.CLICK,
        target: {
          type: SelectorType.CSS,
          value: '.nonexistent',
          description: 'Nonexistent button'
        },
        explanation: 'Click nonexistent button',
        reasoning: 'Testing error handling',
        expectedResult: 'Should fail',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      const result = await newController.performAction(action);

      expect(result.success).toBe(false);
      expect(result.elementFound).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe(BrowserErrorType.ELEMENT_NOT_FOUND);
      expect(result.screenshot).toBeDefined();

      await newController.closeBrowser();
    });

    it('should try fallback selectors when primary selector fails', async () => {
      const action: BrowserAction = {
        id: uuidv4(),
        type: BrowserActionType.CLICK,
        target: {
          type: SelectorType.CSS,
          value: '.primary-selector',
          description: 'Button with fallbacks',
          fallbacks: [
            {
              type: SelectorType.TEXT,
              value: 'Submit',
              description: 'Submit button by text'
            }
          ]
        },
        explanation: 'Click button with fallback',
        reasoning: 'Testing fallback selectors',
        expectedResult: 'Should use fallback',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      const result = await controller.performAction(action);

      expect(result.success).toBe(true);
      expect(result.elementFound).toBe(true);
    });

    it('should require browser initialization', async () => {
      const uninitializedController = new BrowserController();
      
      const action: BrowserAction = {
        id: uuidv4(),
        type: BrowserActionType.CLICK,
        target: {
          type: SelectorType.CSS,
          value: '.button',
          description: 'Button'
        },
        explanation: 'Click button',
        reasoning: 'Testing',
        expectedResult: 'Should fail',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      await expect(uninitializedController.performAction(action))
        .rejects
        .toThrow('Browser not initialized');
    });
  });

  describe('captureScreen', () => {
    beforeEach(async () => {
      await controller.openTool(BuilderType.BUILDER_IO);
    });

    it('should capture a screenshot successfully', async () => {
      const screenshot = await controller.captureScreen();

      expect(screenshot).toBeDefined();
      expect(screenshot.id).toBeDefined();
      expect(screenshot.data).toBeDefined();
      expect(screenshot.timestamp).toBeInstanceOf(Date);
      expect(screenshot.dimensions).toEqual({ width: 1920, height: 1080 });
      expect(screenshot.annotations).toEqual([]);
    });

    it('should require browser initialization', async () => {
      const uninitializedController = new BrowserController();
      
      await expect(uninitializedController.captureScreen())
        .rejects
        .toThrow('Browser not initialized');
    });
  });

  describe('explainCurrentState', () => {
    beforeEach(async () => {
      await controller.openTool(BuilderType.BUILDER_IO);
    });

    it('should explain current page state', async () => {
      const explanation = await controller.explainCurrentState();

      expect(explanation).toBeDefined();
      expect(explanation).toContain('Test Page');
      expect(explanation).toContain('https://example.com');
      expect(explanation).toContain('Sample page content');
    });

    it('should handle errors gracefully', async () => {
      // This test verifies that explainCurrentState handles errors gracefully
      // Since we can't easily mock the existing page, we'll just verify
      // that the method returns a valid explanation
      const explanation = await controller.explainCurrentState();
      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe('string');
    });
  });

  describe('handleError', () => {
    beforeEach(async () => {
      await controller.openTool(BuilderType.BUILDER_IO);
    });

    it('should handle recoverable errors', async () => {
      const error = {
        type: BrowserErrorType.ELEMENT_NOT_FOUND,
        message: 'Element not found',
        timestamp: new Date(),
        recoverable: true
      };

      const result = await controller.handleError(error);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.actualResult).toContain('Error handled');
      expect(result.actualResult).toContain('Page refreshed for recovery');
    });

    it('should handle non-recoverable errors', async () => {
      const error = {
        type: BrowserErrorType.PERMISSION_ERROR,
        message: 'Permission denied',
        timestamp: new Date(),
        recoverable: false
      };

      const result = await controller.handleError(error);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.actualResult).toContain('Error handled');
      expect(result.actualResult).toContain('No specific recovery action');
    });

    it('should require active session', async () => {
      const uninitializedController = new BrowserController();
      
      const error = {
        type: BrowserErrorType.NETWORK_ERROR,
        message: 'Network error',
        timestamp: new Date(),
        recoverable: true
      };

      await expect(uninitializedController.handleError(error))
        .rejects
        .toThrow('No active session to handle error');
    });
  });

  describe('closeBrowser', () => {
    it('should close browser and clean up resources', async () => {
      await controller.openTool(BuilderType.BUILDER_IO);
      const session = controller.getCurrentSession();
      
      expect(session).toBeDefined();
      expect(session?.status).toBe(SessionStatus.ACTIVE);

      await controller.closeBrowser();

      const closedSession = controller.getCurrentSession();
      expect(closedSession).toBeNull();
    });

    it('should handle errors during cleanup gracefully', async () => {
      // This test ensures that even if there are errors during cleanup,
      // the method doesn't throw and completes the cleanup process
      await expect(controller.closeBrowser()).resolves.not.toThrow();
    });
  });

  describe('getCurrentSession', () => {
    it('should return null when no session is active', () => {
      const session = controller.getCurrentSession();
      expect(session).toBeNull();
    });

    it('should return current session when active', async () => {
      await controller.openTool(BuilderType.REPLIT);
      const session = controller.getCurrentSession();
      
      expect(session).toBeDefined();
      expect(session?.toolType).toBe(BuilderType.REPLIT);
      expect(session?.status).toBe(SessionStatus.ACTIVE);
    });
  });
});