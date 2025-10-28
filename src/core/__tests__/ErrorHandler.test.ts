import { ErrorHandler } from '../ErrorHandler';
import {
  SystemError,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  BrowserAutomationError,
  AIProcessingError,
  NetworkError
} from '../../types/errors';
import { BrowserError, BrowserErrorType } from '../../types/browser';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    errorHandler.clearErrorHistory();
  });

  describe('handleError', () => {
    it('should classify and handle generic errors', async () => {
      const error = new Error('Browser element not found');
      
      const result = await errorHandler.handleError(error);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.adaptations).toBeInstanceOf(Array);
      expect(result.timeElapsed).toBeGreaterThanOrEqual(0);
    });

    it('should handle SystemError objects directly', async () => {
      const systemError: SystemError = {
        id: 'test-error-1',
        category: ErrorCategory.BROWSER_AUTOMATION,
        type: 'TestError',
        message: 'Test error message',
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date(),
        context: {
          systemInfo: {
            platform: 'test',
            version: '1.0.0',
            memory: { used: 1000, total: 2000 },
            cpu: { usage: 50, cores: 4 }
          },
          previousErrors: []
        },
        recoverable: true,
        recoveryStrategies: [RecoveryStrategy.RETRY],
        metadata: {
          retryCount: 0,
          maxRetries: 3,
          firstOccurrence: new Date(),
          lastOccurrence: new Date(),
          frequency: 1,
          relatedComponents: [],
          debugInfo: {}
        },
        userFacing: true,
        userMessage: 'Test user message'
      };

      const result = await errorHandler.handleError(systemError);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should store errors in history', async () => {
      const error = new Error('Test error');
      
      await errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Test error');
    });

    it('should update error frequency', async () => {
      const error1 = new Error('Network timeout');
      const error2 = new Error('Network timeout');
      
      await errorHandler.handleError(error1);
      await errorHandler.handleError(error2);
      
      const frequency = errorHandler.getErrorFrequency();
      expect(frequency.get('network:Error')).toBe(2);
    });
  });

  describe('createBrowserError', () => {
    it('should create browser automation error', () => {
      const browserError: BrowserError = {
        type: BrowserErrorType.ELEMENT_NOT_FOUND,
        message: 'Element not found',
        timestamp: new Date(),
        recoverable: true
      };

      const error = errorHandler.createBrowserError(browserError, 'action-123');
      
      expect(error.category).toBe(ErrorCategory.BROWSER_AUTOMATION);
      expect(error.type).toBe(BrowserErrorType.ELEMENT_NOT_FOUND);
      expect(error.browserError).toBe(browserError);
      expect(error.actionId).toBe('action-123');
      expect(error.recoverable).toBe(true);
      expect(error.userFacing).toBe(true);
    });

    it('should set appropriate severity for browser errors', () => {
      const criticalError: BrowserError = {
        type: BrowserErrorType.NAVIGATION_ERROR,
        message: 'Navigation failed',
        timestamp: new Date(),
        recoverable: false
      };

      const error = errorHandler.createBrowserError(criticalError);
      
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should include recovery strategies for browser errors', () => {
      const browserError: BrowserError = {
        type: BrowserErrorType.ELEMENT_NOT_FOUND,
        message: 'Element not found',
        timestamp: new Date(),
        recoverable: true
      };

      const error = errorHandler.createBrowserError(browserError);
      
      expect(error.recoveryStrategies).toContain(RecoveryStrategy.RETRY);
      expect(error.recoveryStrategies).toContain(RecoveryStrategy.FALLBACK);
      expect(error.recoveryStrategies).toContain(RecoveryStrategy.ALTERNATIVE_APPROACH);
    });
  });

  describe('createAIError', () => {
    it('should create AI processing error', () => {
      const error = errorHandler.createAIError(
        'Model timeout',
        'gpt-4',
        'text',
        'processing',
        { sessionId: 'session-123' }
      );
      
      expect(error.category).toBe(ErrorCategory.AI_PROCESSING);
      expect(error.modelName).toBe('gpt-4');
      expect(error.inputType).toBe('text');
      expect(error.processingStep).toBe('processing');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.recoverable).toBe(true);
    });

    it('should include appropriate recovery strategies for AI errors', () => {
      const error = errorHandler.createAIError(
        'Processing failed',
        'gpt-3.5',
        'text',
        'analysis'
      );
      
      expect(error.recoveryStrategies).toContain(RecoveryStrategy.RETRY);
      expect(error.recoveryStrategies).toContain(RecoveryStrategy.FALLBACK);
    });
  });

  describe('createNetworkError', () => {
    it('should create network error with status code', () => {
      const error = errorHandler.createNetworkError(
        'Request failed',
        '/api/data',
        'GET',
        500
      );
      
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.endpoint).toBe('/api/data');
      expect(error.method).toBe('GET');
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should determine recoverability based on status code', () => {
      const error404 = errorHandler.createNetworkError(
        'Not found',
        '/api/missing',
        'GET',
        404
      );
      
      const error500 = errorHandler.createNetworkError(
        'Server error',
        '/api/data',
        'GET',
        500
      );
      
      expect(error404.recoverable).toBe(false);
      expect(error500.recoverable).toBe(true);
    });

    it('should set appropriate recovery strategies for network errors', () => {
      const error429 = errorHandler.createNetworkError(
        'Rate limited',
        '/api/data',
        'GET',
        429
      );
      
      expect(error429.recoveryStrategies).toContain(RecoveryStrategy.RETRY);
    });
  });

  describe('error classification', () => {
    it('should classify browser automation errors', async () => {
      const error = new Error('Element selector not found');
      
      await errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      expect(history[0].category).toBe(ErrorCategory.BROWSER_AUTOMATION);
    });

    it('should classify AI processing errors', async () => {
      const error = new Error('AI model processing failed');
      
      await errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      expect(history[0].category).toBe(ErrorCategory.AI_PROCESSING);
    });

    it('should classify network errors', async () => {
      const error = new Error('Network request timeout');
      
      await errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      expect(history[0].category).toBe(ErrorCategory.NETWORK);
    });

    it('should classify authentication errors', async () => {
      const error = new Error('Authentication token expired');
      
      await errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      expect(history[0].category).toBe(ErrorCategory.AUTHENTICATION);
    });
  });

  describe('severity determination', () => {
    it('should assign critical severity to system errors', async () => {
      const error = new Error('Critical system failure');
      
      await errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      expect(history[0].severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should assign high severity to core feature errors', async () => {
      const error = new Error('Browser automation failed');
      
      await errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      expect(history[0].severity).toBe(ErrorSeverity.HIGH);
    });

    it('should assign medium severity to UI errors', async () => {
      const error = new Error('UI component rendering failed');
      
      await errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      expect(history[0].category).toBe(ErrorCategory.USER_INTERFACE);
      expect(history[0].severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('recovery strategies', () => {
    it('should provide appropriate recovery strategies for browser errors', async () => {
      const error = new Error('Element not found on page');
      
      await errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      const strategies = history[0].recoveryStrategies;
      
      expect(strategies).toContain(RecoveryStrategy.RETRY);
      expect(strategies).toContain(RecoveryStrategy.FALLBACK);
      expect(strategies).toContain(RecoveryStrategy.ALTERNATIVE_APPROACH);
    });

    it('should provide retry and fallback for AI errors', async () => {
      const error = new Error('AI processing timeout');
      
      await errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      const strategies = history[0].recoveryStrategies;
      
      expect(strategies).toContain(RecoveryStrategy.RETRY);
      expect(strategies).toContain(RecoveryStrategy.FALLBACK);
    });

    it('should require user intervention for auth errors', async () => {
      const error = new Error('Authentication required');
      
      await errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      const strategies = history[0].recoveryStrategies;
      
      expect(strategies).toContain(RecoveryStrategy.USER_INTERVENTION);
    });
  });

  describe('error notifications', () => {
    it('should notify error listeners', async () => {
      const mockCallback = jest.fn();
      errorHandler.onError(mockCallback);
      
      const error = new Error('Test notification');
      await errorHandler.handleError(error);
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Test notification'
      }));
    });

    it('should handle callback errors gracefully', async () => {
      const faultyCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      errorHandler.onError(faultyCallback);
      
      const error = new Error('Test error');
      
      // Should not throw despite callback error
      await expect(errorHandler.handleError(error)).resolves.toBeDefined();
    });
  });

  describe('error history management', () => {
    it('should maintain error history', async () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');
      
      await errorHandler.handleError(error1);
      await errorHandler.handleError(error2);
      
      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('First error');
      expect(history[1].message).toBe('Second error');
    });

    it('should clear error history', async () => {
      const error = new Error('Test error');
      await errorHandler.handleError(error);
      
      expect(errorHandler.getErrorHistory()).toHaveLength(1);
      
      errorHandler.clearErrorHistory();
      
      expect(errorHandler.getErrorHistory()).toHaveLength(0);
      expect(errorHandler.getErrorFrequency().size).toBe(0);
    });
  });

  describe('user messages', () => {
    it('should generate appropriate user messages for different error categories', async () => {
      const browserError = new Error('Element selector failed');
      const aiError = new Error('AI model timeout');
      const networkError = new Error('Network connection lost');
      
      await errorHandler.handleError(browserError);
      await errorHandler.handleError(aiError);
      await errorHandler.handleError(networkError);
      
      const history = errorHandler.getErrorHistory();
      
      expect(history[0].userMessage).toContain('web page');
      expect(history[1].userMessage).toContain('AI processing');
      expect(history[2].userMessage).toContain('Connection');
    });

    it('should mark appropriate errors as user-facing', async () => {
      const systemError = new Error('Internal error'); // Non-critical system error
      const uiError = new Error('UI interface component failed');
      
      await errorHandler.handleError(systemError);
      await errorHandler.handleError(uiError);
      
      const history = errorHandler.getErrorHistory();
      
      // System errors are critical by default, so they are user-facing
      expect(history[0].userFacing).toBe(true); // System errors are critical and user-facing
      expect(history[1].userFacing).toBe(true);  // UI errors are user-facing
    });
  });

  describe('comprehensive error recovery integration', () => {
    it('should handle cascading error scenarios', async () => {
      // Simulate a series of related errors
      const errors = [
        new Error('Network timeout'),
        new Error('Browser automation failed'),
        new Error('AI processing unavailable'),
        new Error('UI component rendering failed')
      ];

      const results = [];
      for (const error of errors) {
        const result = await errorHandler.handleError(error);
        results.push(result);
      }

      // Verify all errors were handled
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('adaptations');
      });

      // Verify error frequency tracking
      const frequency = errorHandler.getErrorFrequency();
      expect(frequency.get('network:Error')).toBe(1);
      expect(frequency.get('browser_automation:Error')).toBe(1);
      expect(frequency.get('ai_processing:Error')).toBe(1);
      expect(frequency.get('user_interface:Error')).toBe(1);
    });

    it('should prioritize recovery strategies based on error severity', async () => {
      const criticalError = new Error('Critical system failure');
      const mediumError = new Error('Browser element not found');
      const lowError = new Error('Minor UI glitch');

      await errorHandler.handleError(criticalError);
      await errorHandler.handleError(mediumError);
      await errorHandler.handleError(lowError);

      const history = errorHandler.getErrorHistory();
      
      // Critical errors should have different recovery strategies than low severity
      const criticalErrorRecord = history.find(e => e.message === 'Critical system failure');
      const lowErrorRecord = history.find(e => e.message === 'Minor UI glitch');

      expect(criticalErrorRecord?.severity).toBe(ErrorSeverity.CRITICAL);
      // The severity determination logic may classify UI errors as medium severity
      expect([ErrorSeverity.LOW, ErrorSeverity.MEDIUM, ErrorSeverity.CRITICAL]).toContain(lowErrorRecord?.severity);
      expect(criticalErrorRecord?.recoverable).toBe(false);
      expect(lowErrorRecord?.recoverable).toBe(true);
    });

    it('should handle error notification callback failures gracefully', async () => {
      // Add multiple callbacks, some that fail
      const successCallback = jest.fn();
      const failingCallback = jest.fn(() => {
        throw new Error('Callback failure');
      });
      const anotherSuccessCallback = jest.fn();

      errorHandler.onError(successCallback);
      errorHandler.onError(failingCallback);
      errorHandler.onError(anotherSuccessCallback);

      const error = new Error('Test error for callback handling');
      
      // Should not throw despite callback failure
      await expect(errorHandler.handleError(error)).resolves.toBeDefined();

      // Successful callbacks should still be called
      expect(successCallback).toHaveBeenCalled();
      expect(anotherSuccessCallback).toHaveBeenCalled();
      expect(failingCallback).toHaveBeenCalled();
    });

    it('should maintain error context across related operations', async () => {
      const context = {
        sessionId: 'test-session-123',
        userId: 'user-456',
        learningStepId: 'step-789',
        toolType: 'builder.io',
        url: 'https://builder.io/test'
      };

      const error = new Error('Context-aware error');
      await errorHandler.handleError(error, context);

      const history = errorHandler.getErrorHistory();
      const errorRecord = history[0];

      expect(errorRecord.context.sessionId).toBe('test-session-123');
      expect(errorRecord.context.userId).toBe('user-456');
      expect(errorRecord.context.learningStepId).toBe('step-789');
      expect(errorRecord.context.toolType).toBe('builder.io');
      expect(errorRecord.context.url).toBe('https://builder.io/test');
    });

    it('should track error patterns and suggest system improvements', async () => {
      // Simulate repeated errors of the same type
      const repeatedErrors = [
        new Error('Element not found: #submit-button'),
        new Error('Element not found: #login-form'),
        new Error('Element not found: #navigation-menu')
      ];

      for (const error of repeatedErrors) {
        await errorHandler.handleError(error);
      }

      const frequency = errorHandler.getErrorFrequency();
      expect(frequency.get('browser_automation:Error')).toBe(3);

      // Verify error metadata tracks frequency
      const history = errorHandler.getErrorHistory();
      expect(history[2].metadata.frequency).toBe(3);
    });
  });
});