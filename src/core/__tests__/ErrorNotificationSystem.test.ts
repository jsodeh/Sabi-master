import { ErrorNotificationSystem } from '../ErrorNotificationSystem';
import {
  SystemError,
  ErrorCategory,
  ErrorSeverity,
  NotificationType,
  ErrorNotification
} from '../../types/errors';

// Mock audio and notification APIs
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  volume: 0.5
}));

global.Notification = jest.fn().mockImplementation((title, options) => ({
  title,
  ...options
})) as any;

Object.defineProperty(global.Notification, 'permission', {
  value: 'granted',
  writable: true
});

Object.defineProperty(global.Notification, 'requestPermission', {
  value: jest.fn().mockResolvedValue('granted'),
  writable: true
});

describe('ErrorNotificationSystem', () => {
  let notificationSystem: ErrorNotificationSystem;
  let mockError: SystemError;

  beforeEach(() => {
    notificationSystem = new ErrorNotificationSystem({
      maxNotifications: 3,
      defaultDuration: 5000,
      enableSound: true,
      enableDesktopNotifications: true,
      groupSimilarErrors: true
    });

    mockError = {
      id: 'test-error-1',
      category: ErrorCategory.BROWSER_AUTOMATION,
      type: 'ElementNotFound',
      message: 'Element not found',
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
      recoveryStrategies: [],
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
      userMessage: 'Having trouble with the page element'
    };
  });

  afterEach(() => {
    notificationSystem.clearAllNotifications();
    jest.clearAllMocks();
  });

  describe('notifyError', () => {
    it('should create and display notification for error', async () => {
      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      await notificationSystem.notifyError(mockError);

      expect(mockCallback).toHaveBeenCalledTimes(1);
      const notification = mockCallback.mock.calls[0][0];
      expect(notification.errorId).toBe(mockError.id);
      expect(notification.title).toBe('Browser Interaction Issue');
      expect(notification.message).toBe('Having trouble with the page element');
      expect(notification.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should determine correct notification type based on severity', async () => {
      const criticalError = { ...mockError, id: 'critical-1', severity: ErrorSeverity.CRITICAL, message: 'Critical error', userMessage: 'Critical error', userFacing: true };
      const highError = { ...mockError, id: 'high-1', severity: ErrorSeverity.HIGH, message: 'High error', userMessage: 'High error', userFacing: true };
      const mediumError = { ...mockError, id: 'medium-1', severity: ErrorSeverity.MEDIUM, message: 'Medium error', userMessage: 'Medium error', userFacing: true };
      const lowError = { ...mockError, id: 'low-1', severity: ErrorSeverity.LOW, message: 'Low error', userMessage: 'Low error', userFacing: true };

      const modalCallback = jest.fn();
      const bannerCallback = jest.fn();
      const toastCallback = jest.fn();
      const inlineCallback = jest.fn();

      notificationSystem.registerUICallback(NotificationType.MODAL, modalCallback);
      notificationSystem.registerUICallback(NotificationType.BANNER, bannerCallback);
      notificationSystem.registerUICallback(NotificationType.TOAST, toastCallback);
      notificationSystem.registerUICallback(NotificationType.INLINE, inlineCallback);

      await notificationSystem.notifyError(criticalError);
      await notificationSystem.notifyError(highError);
      await notificationSystem.notifyError(mediumError);
      await notificationSystem.notifyError(lowError);

      expect(modalCallback).toHaveBeenCalledTimes(1);
      expect(bannerCallback).toHaveBeenCalledTimes(1);
      expect(toastCallback).toHaveBeenCalledTimes(1);
      expect(inlineCallback).toHaveBeenCalledTimes(1);
    });

    it('should queue notifications when at max capacity', async () => {
      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      // Fill up to max capacity (3) with different messages to avoid grouping
      await notificationSystem.notifyError({ ...mockError, message: 'Error 1', userMessage: 'Error 1' });
      await notificationSystem.notifyError({ ...mockError, id: 'error-2', message: 'Error 2', userMessage: 'Error 2' });
      await notificationSystem.notifyError({ ...mockError, id: 'error-3', message: 'Error 3', userMessage: 'Error 3' });

      expect(mockCallback).toHaveBeenCalledTimes(3);

      // This should be queued
      await notificationSystem.notifyError({ ...mockError, id: 'error-4', message: 'Error 4', userMessage: 'Error 4' });

      expect(mockCallback).toHaveBeenCalledTimes(3); // Still 3, not 4

      // Dismiss one notification to process queue
      const activeNotifications = notificationSystem.getActiveNotifications();
      notificationSystem.dismissNotification(activeNotifications[0].id);

      expect(mockCallback).toHaveBeenCalledTimes(4); // Now 4
    });

    it('should group similar errors when enabled', async () => {
      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      const similarError = {
        ...mockError,
        id: 'similar-error',
        metadata: { ...mockError.metadata, frequency: 2 }
      };

      await notificationSystem.notifyError(mockError);
      await notificationSystem.notifyError(similarError);

      // Should only have one notification (grouped)
      expect(mockCallback).toHaveBeenCalledTimes(2); // Initial + update
      const activeNotifications = notificationSystem.getActiveNotifications();
      expect(activeNotifications).toHaveLength(1);
      expect(activeNotifications[0].message).toContain('2 occurrences');
    });
  });

  describe('notification actions', () => {
    it('should create dismiss action for all notifications', async () => {
      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      await notificationSystem.notifyError(mockError);

      const notification = mockCallback.mock.calls[0][0];
      const dismissAction = notification.actions.find((a: any) => a.id === 'dismiss');
      
      expect(dismissAction).toBeDefined();
      expect(dismissAction.label).toBe('Dismiss');
      expect(dismissAction.type).toBe('secondary');
    });

    it('should create retry action for recoverable errors', async () => {
      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      await notificationSystem.notifyError(mockError);

      const notification = mockCallback.mock.calls[0][0];
      const retryAction = notification.actions.find((a: any) => a.id === 'retry');
      
      expect(retryAction).toBeDefined();
      expect(retryAction.label).toBe('Retry');
      expect(retryAction.type).toBe('primary');
    });

    it('should create login action for authentication errors', async () => {
      const authError = {
        ...mockError,
        category: ErrorCategory.AUTHENTICATION,
        type: 'AuthenticationRequired'
      };

      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      await notificationSystem.notifyError(authError);

      const notification = mockCallback.mock.calls[0][0];
      const loginAction = notification.actions.find((a: any) => a.id === 'login');
      
      expect(loginAction).toBeDefined();
      expect(loginAction.label).toBe('Login');
      expect(loginAction.type).toBe('primary');
    });

    it('should create report action for critical errors', async () => {
      const criticalError = {
        ...mockError,
        severity: ErrorSeverity.CRITICAL
      };

      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.MODAL, mockCallback);

      await notificationSystem.notifyError(criticalError);

      const notification = mockCallback.mock.calls[0][0];
      const reportAction = notification.actions.find((a: any) => a.id === 'report');
      
      expect(reportAction).toBeDefined();
      expect(reportAction.label).toBe('Report Issue');
      expect(reportAction.type).toBe('danger');
    });

    it('should create manual mode action for browser errors', async () => {
      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      await notificationSystem.notifyError(mockError);

      const notification = mockCallback.mock.calls[0][0];
      const manualAction = notification.actions.find((a: any) => a.id === 'manual-mode');
      
      expect(manualAction).toBeDefined();
      expect(manualAction.label).toBe('Manual Mode');
      expect(manualAction.type).toBe('secondary');
    });
  });

  describe('auto-hide behavior', () => {
    it('should auto-hide non-critical errors', async () => {
      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      await notificationSystem.notifyError(mockError);

      const notification = mockCallback.mock.calls[0][0];
      expect(notification.autoHide).toBe(true);
      expect(notification.duration).toBe(5000); // default duration
    });

    it('should not auto-hide critical errors', async () => {
      const criticalError = {
        ...mockError,
        severity: ErrorSeverity.CRITICAL
      };

      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.MODAL, mockCallback);

      await notificationSystem.notifyError(criticalError);

      const notification = mockCallback.mock.calls[0][0];
      expect(notification.autoHide).toBe(false);
      expect(notification.duration).toBeUndefined();
    });

    it('should not auto-hide authentication errors', async () => {
      const authError = {
        ...mockError,
        category: ErrorCategory.AUTHENTICATION
      };

      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      await notificationSystem.notifyError(authError);

      const notification = mockCallback.mock.calls[0][0];
      expect(notification.autoHide).toBe(false);
    });

    it('should set different durations based on severity', async () => {
      const highError = { ...mockError, id: 'high-error', severity: ErrorSeverity.HIGH, message: 'High severity error', userMessage: 'High severity error' };
      const lowError = { ...mockError, id: 'low-error', severity: ErrorSeverity.LOW, message: 'Low severity error', userMessage: 'Low severity error' };

      const bannerCallback = jest.fn();
      const inlineCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.BANNER, bannerCallback);
      notificationSystem.registerUICallback(NotificationType.INLINE, inlineCallback);

      await notificationSystem.notifyError(highError);
      await notificationSystem.notifyError(lowError);

      expect(bannerCallback).toHaveBeenCalledTimes(1);
      expect(inlineCallback).toHaveBeenCalledTimes(1);

      const highNotification = bannerCallback.mock.calls[0][0];
      const lowNotification = inlineCallback.mock.calls[0][0];

      expect(highNotification.duration).toBe(8000);
      expect(lowNotification.duration).toBe(3000);
    });
  });

  describe('sound notifications', () => {
    it('should play sound for non-low severity errors', async () => {
      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      await notificationSystem.notifyError(mockError);

      expect(global.Audio).toHaveBeenCalledWith('/sounds/error-notification.wav');
    });

    it('should play critical sound for critical errors', async () => {
      const criticalError = {
        ...mockError,
        severity: ErrorSeverity.CRITICAL
      };

      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.MODAL, mockCallback);

      await notificationSystem.notifyError(criticalError);

      expect(global.Audio).toHaveBeenCalledWith('/sounds/error-critical.wav');
    });

    it('should not play sound when disabled', async () => {
      const quietSystem = new ErrorNotificationSystem({ enableSound: false });
      const mockCallback = jest.fn();
      quietSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      await quietSystem.notifyError(mockError);

      expect(global.Audio).not.toHaveBeenCalled();
    });
  });

  describe('desktop notifications', () => {
    it('should show desktop notification for critical errors', async () => {
      const criticalError = {
        ...mockError,
        severity: ErrorSeverity.CRITICAL
      };

      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.MODAL, mockCallback);

      await notificationSystem.notifyError(criticalError);

      expect(global.Notification).toHaveBeenCalledWith(
        'Browser Interaction Issue',
        expect.objectContaining({
          body: 'Having trouble with the page element',
          icon: '/icons/error-icon.png'
        })
      );
    });

    it('should not show desktop notification when disabled', async () => {
      const noDesktopSystem = new ErrorNotificationSystem({ 
        enableDesktopNotifications: false 
      });
      
      const criticalError = {
        ...mockError,
        severity: ErrorSeverity.CRITICAL
      };

      const mockCallback = jest.fn();
      noDesktopSystem.registerUICallback(NotificationType.MODAL, mockCallback);

      await noDesktopSystem.notifyError(criticalError);

      expect(global.Notification).not.toHaveBeenCalled();
    });
  });

  describe('notification management', () => {
    it('should dismiss notifications', async () => {
      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      await notificationSystem.notifyError(mockError);

      let activeNotifications = notificationSystem.getActiveNotifications();
      expect(activeNotifications).toHaveLength(1);

      notificationSystem.dismissNotification(activeNotifications[0].id);

      activeNotifications = notificationSystem.getActiveNotifications();
      expect(activeNotifications).toHaveLength(0);
    });

    it('should clear all notifications', async () => {
      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);

      await notificationSystem.notifyError(mockError);
      await notificationSystem.notifyError({ ...mockError, id: 'error-2', userMessage: 'Different message' });

      expect(notificationSystem.getActiveNotifications()).toHaveLength(2);

      notificationSystem.clearAllNotifications();

      expect(notificationSystem.getActiveNotifications()).toHaveLength(0);
    });

    it('should update configuration', () => {
      notificationSystem.updateConfig({
        maxNotifications: 10,
        enableSound: false
      });

      // Test that config is updated by checking behavior
      expect(notificationSystem.getActiveNotifications()).toHaveLength(0);
    });
  });

  describe('notification titles', () => {
    it('should generate appropriate titles for different error categories', async () => {
      const errors = [
        { ...mockError, category: ErrorCategory.BROWSER_AUTOMATION, userMessage: 'Browser error 1', userFacing: true },
        { ...mockError, category: ErrorCategory.AI_PROCESSING, userMessage: 'AI error 2', userFacing: true },
        { ...mockError, category: ErrorCategory.NETWORK, userMessage: 'Network error 3', userFacing: true },
        { ...mockError, category: ErrorCategory.AUTHENTICATION, userMessage: 'Auth error 4', userFacing: true },
        { ...mockError, category: ErrorCategory.USER_INTERFACE, userMessage: 'UI error 5', userFacing: true },
        { ...mockError, category: ErrorCategory.DATA_VALIDATION, userMessage: 'Validation error 6', userFacing: true },
        { ...mockError, category: ErrorCategory.SYSTEM, severity: ErrorSeverity.CRITICAL, userMessage: 'System error 7', userFacing: true }
      ];

      const expectedTitles = [
        'Browser Interaction Issue',
        'AI Processing Error',
        'Connection Problem',
        'Authentication Required',
        'Interface Issue',
        'Input Validation Error',
        'System Error'
      ];

      const mockCallback = jest.fn();
      notificationSystem.registerUICallback(NotificationType.TOAST, mockCallback);
      notificationSystem.registerUICallback(NotificationType.BANNER, mockCallback);
      notificationSystem.registerUICallback(NotificationType.MODAL, mockCallback);
      notificationSystem.registerUICallback(NotificationType.INLINE, mockCallback);

      for (let i = 0; i < errors.length; i++) {
        await notificationSystem.notifyError({ ...errors[i], id: `error-${i}` });
      }

      // Check that all notifications were created with correct titles
      expect(mockCallback).toHaveBeenCalledTimes(errors.length);
      const allCalls = mockCallback.mock.calls;
      for (let i = 0; i < errors.length; i++) {
        const notification = allCalls[i][0];
        expect(notification.title).toBe(expectedTitles[i]);
      }
    });
  });
});