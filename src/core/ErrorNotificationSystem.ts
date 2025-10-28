import { v4 as uuidv4 } from 'uuid';
import {
  SystemError,
  ErrorNotification,
  NotificationType,
  NotificationAction,
  ErrorSeverity,
  ErrorCategory
} from '../types/errors';

export interface NotificationConfig {
  maxNotifications: number;
  defaultDuration: number;
  enableSound: boolean;
  enableDesktopNotifications: boolean;
  groupSimilarErrors: boolean;
}

export class ErrorNotificationSystem {
  private notifications: Map<string, ErrorNotification> = new Map();
  private notificationQueue: ErrorNotification[] = [];
  private config: NotificationConfig;
  private uiCallbacks: Map<NotificationType, (notification: ErrorNotification) => void> = new Map();

  constructor(config: Partial<NotificationConfig> = {}) {
    this.config = {
      maxNotifications: 5,
      defaultDuration: 5000,
      enableSound: true,
      enableDesktopNotifications: true,
      groupSimilarErrors: true,
      ...config
    };
  }

  /**
   * Create and display error notification
   */
  async notifyError(error: SystemError): Promise<void> {
    // Only show notifications for user-facing errors
    if (!error.userFacing) {
      return;
    }

    // Check if we should group with existing notification
    if (this.config.groupSimilarErrors) {
      const existingNotification = this.findSimilarNotification(error);
      if (existingNotification) {
        this.updateExistingNotification(existingNotification, error);
        return;
      }
    }

    const notification = this.createNotification(error);
    
    // Add to queue if we're at max capacity
    if (this.notifications.size >= this.config.maxNotifications) {
      this.notificationQueue.push(notification);
      return;
    }

    await this.displayNotification(notification);
  }

  /**
   * Create notification from error
   */
  private createNotification(error: SystemError): ErrorNotification {
    const notificationType = this.getNotificationType(error);
    const actions = this.createNotificationActions(error);
    
    return {
      id: uuidv4(),
      errorId: error.id,
      type: notificationType,
      title: this.getNotificationTitle(error),
      message: error.userMessage || error.message,
      severity: error.severity,
      timestamp: new Date(),
      actions,
      dismissed: false,
      autoHide: this.shouldAutoHide(error),
      duration: this.getNotificationDuration(error)
    };
  }

  /**
   * Display notification using appropriate UI method
   */
  private async displayNotification(notification: ErrorNotification): Promise<void> {
    this.notifications.set(notification.id, notification);
    
    // Call UI callback for the notification type
    const callback = this.uiCallbacks.get(notification.type);
    if (callback) {
      callback(notification);
    }

    // Play sound if enabled
    if (this.config.enableSound && notification.severity !== ErrorSeverity.LOW) {
      this.playNotificationSound(notification.severity);
    }

    // Show desktop notification if enabled
    if (this.config.enableDesktopNotifications && notification.severity === ErrorSeverity.CRITICAL) {
      this.showDesktopNotification(notification);
    }

    // Auto-hide if configured
    if (notification.autoHide && notification.duration) {
      setTimeout(() => {
        this.dismissNotification(notification.id);
      }, notification.duration);
    }
  }

  /**
   * Create notification actions based on error type
   */
  private createNotificationActions(error: SystemError): NotificationAction[] {
    const actions: NotificationAction[] = [];

    // Always add dismiss action
    actions.push({
      id: 'dismiss',
      label: 'Dismiss',
      type: 'secondary',
      action: async () => {
        this.dismissNotification(error.id);
      }
    });

    // Add retry action if error is recoverable
    if (error.recoverable) {
      actions.push({
        id: 'retry',
        label: 'Retry',
        type: 'primary',
        action: async () => {
          await this.retryErrorAction(error);
        }
      });
    }

    // Add specific actions based on error category
    switch (error.category) {
      case ErrorCategory.AUTHENTICATION:
        actions.push({
          id: 'login',
          label: 'Login',
          type: 'primary',
          action: async () => {
            await this.handleAuthenticationError(error);
          }
        });
        break;

      case ErrorCategory.NETWORK:
        actions.push({
          id: 'check-connection',
          label: 'Check Connection',
          type: 'secondary',
          action: async () => {
            await this.checkNetworkConnection();
          }
        });
        break;

      case ErrorCategory.BROWSER_AUTOMATION:
        actions.push({
          id: 'manual-mode',
          label: 'Manual Mode',
          type: 'secondary',
          action: async () => {
            await this.switchToManualMode(error);
          }
        });
        break;
    }

    // Add report action for critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      actions.push({
        id: 'report',
        label: 'Report Issue',
        type: 'danger',
        action: async () => {
          await this.reportError(error);
        }
      });
    }

    return actions;
  }

  /**
   * Determine notification type based on error
   */
  private getNotificationType(error: SystemError): NotificationType {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return NotificationType.MODAL;
      case ErrorSeverity.HIGH:
        return NotificationType.BANNER;
      case ErrorSeverity.MEDIUM:
        return NotificationType.TOAST;
      case ErrorSeverity.LOW:
        return NotificationType.INLINE;
      default:
        return NotificationType.TOAST;
    }
  }

  /**
   * Get notification title based on error
   */
  private getNotificationTitle(error: SystemError): string {
    switch (error.category) {
      case ErrorCategory.BROWSER_AUTOMATION:
        return 'Browser Interaction Issue';
      case ErrorCategory.AI_PROCESSING:
        return 'AI Processing Error';
      case ErrorCategory.NETWORK:
        return 'Connection Problem';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication Required';
      case ErrorCategory.USER_INTERFACE:
        return 'Interface Issue';
      case ErrorCategory.DATA_VALIDATION:
        return 'Input Validation Error';
      case ErrorCategory.SYSTEM:
        return 'System Error';
      default:
        return 'Unexpected Error';
    }
  }

  /**
   * Determine if notification should auto-hide
   */
  private shouldAutoHide(error: SystemError): boolean {
    // Critical errors and authentication errors should not auto-hide
    return error.severity !== ErrorSeverity.CRITICAL && 
           error.category !== ErrorCategory.AUTHENTICATION;
  }

  /**
   * Get notification duration based on error
   */
  private getNotificationDuration(error: SystemError): number | undefined {
    if (!this.shouldAutoHide(error)) {
      return undefined;
    }

    switch (error.severity) {
      case ErrorSeverity.HIGH:
        return 8000;
      case ErrorSeverity.MEDIUM:
        return this.config.defaultDuration;
      case ErrorSeverity.LOW:
        return 3000;
      default:
        return this.config.defaultDuration;
    }
  }

  /**
   * Find similar notification to group with
   */
  private findSimilarNotification(error: SystemError): ErrorNotification | undefined {
    for (const notification of this.notifications.values()) {
      if (notification.dismissed) continue;
      
      // Check if category and type match
      const titleMatch = notification.title === this.getNotificationTitle(error);
      const baseMessage = (error.userMessage || error.message).replace(/ \(\d+ occurrences\)$/, '');
      const notificationBaseMessage = notification.message.replace(/ \(\d+ occurrences\)$/, '');
      const messageMatch = notificationBaseMessage === baseMessage;
      
      if (titleMatch && messageMatch) {
        return notification;
      }
    }
    return undefined;
  }

  /**
   * Update existing notification with new error occurrence
   */
  private updateExistingNotification(notification: ErrorNotification, error: SystemError): void {
    // Update message to indicate multiple occurrences
    const count = this.getErrorOccurrenceCount(error);
    notification.message = `${error.userMessage || error.message} (${count} occurrences)`;
    notification.timestamp = new Date();
    
    // Notify UI of update
    const callback = this.uiCallbacks.get(notification.type);
    if (callback) {
      callback(notification);
    }
  }

  /**
   * Get error occurrence count
   */
  private getErrorOccurrenceCount(error: SystemError): number {
    return error.metadata.frequency || 1;
  }

  /**
   * Play notification sound
   */
  private playNotificationSound(severity: ErrorSeverity): void {
    if (!this.config.enableSound) return;

    // Different sounds for different severities
    const soundFile = severity === ErrorSeverity.CRITICAL ? 'error-critical.wav' : 'error-notification.wav';
    
    try {
      const audio = new Audio(`/sounds/${soundFile}`);
      audio.volume = 0.5;
      audio.play().catch(err => {
        console.warn('Could not play notification sound:', err);
      });
    } catch (err) {
      console.warn('Error playing notification sound:', err);
    }
  }

  /**
   * Show desktop notification
   */
  private showDesktopNotification(notification: ErrorNotification): void {
    if (!this.config.enableDesktopNotifications || (typeof window === 'undefined') || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/error-icon.png',
        tag: notification.id
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showDesktopNotification(notification);
        }
      });
    }
  }

  /**
   * Action handlers
   */
  private async retryErrorAction(error: SystemError): Promise<void> {
    // This would integrate with the ErrorHandler to retry the failed action
    console.log('Retrying action for error:', error.id);
    // Implementation would depend on the specific error type and context
  }

  private async handleAuthenticationError(error: SystemError): Promise<void> {
    // This would trigger the authentication flow
    console.log('Handling authentication error:', error.id);
    // Implementation would open login dialog or redirect to auth page
  }

  private async checkNetworkConnection(): Promise<void> {
    // This would check network connectivity
    console.log('Checking network connection...');
    // Implementation would test network connectivity and report status
  }

  private async switchToManualMode(error: SystemError): Promise<void> {
    // This would switch to manual mode for browser automation
    console.log('Switching to manual mode for error:', error.id);
    // Implementation would disable automation and provide manual instructions
  }

  private async reportError(error: SystemError): Promise<void> {
    // This would report the error to support/logging system
    console.log('Reporting error:', error.id);
    // Implementation would send error report to backend or support system
  }

  /**
   * Dismiss notification
   */
  dismissNotification(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.dismissed = true;
      this.notifications.delete(notificationId);
      
      // Process next notification in queue
      this.processNotificationQueue();
    }
  }

  /**
   * Process notification queue
   */
  private processNotificationQueue(): void {
    if (this.notificationQueue.length > 0 && this.notifications.size < this.config.maxNotifications) {
      const nextNotification = this.notificationQueue.shift();
      if (nextNotification) {
        this.displayNotification(nextNotification);
      }
    }
  }

  /**
   * Register UI callback for notification type
   */
  registerUICallback(type: NotificationType, callback: (notification: ErrorNotification) => void): void {
    this.uiCallbacks.set(type, callback);
  }

  /**
   * Get all active notifications
   */
  getActiveNotifications(): ErrorNotification[] {
    return Array.from(this.notifications.values()).filter(n => !n.dismissed);
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notifications.clear();
    this.notificationQueue = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Helper method to get error by ID (would integrate with ErrorHandler)
   */
  private getErrorById(errorId: string): SystemError | undefined {
    // This would integrate with the ErrorHandler to get error details
    return undefined;
  }
}

// Singleton instance
export const errorNotificationSystem = new ErrorNotificationSystem();