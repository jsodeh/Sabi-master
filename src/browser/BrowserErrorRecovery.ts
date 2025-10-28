import { BrowserError, BrowserErrorType, ElementSelector, BrowserAction, ActionResult } from '../types/browser';
import { RecoveryResult, RecoveryStrategy } from '../types/errors';
import { BrowserController } from './BrowserController';

export interface BrowserRecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  fallbackSelectors: boolean;
  screenshotAnalysis: boolean;
  adaptiveSelectors: boolean;
}

export class BrowserErrorRecovery {
  private config: BrowserRecoveryConfig;
  private browserController: BrowserController;
  private retryHistory: Map<string, number> = new Map();

  constructor(browserController: BrowserController, config: Partial<BrowserRecoveryConfig> = {}) {
    this.browserController = browserController;
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      fallbackSelectors: true,
      screenshotAnalysis: true,
      adaptiveSelectors: true,
      ...config
    };
  }

  /**
   * Main recovery method for browser automation errors
   */
  async recoverFromError(
    error: BrowserError,
    originalAction: BrowserAction,
    context: any = {}
  ): Promise<RecoveryResult> {
    const recoveryKey = `${originalAction.id}-${error.type}`;
    const currentRetries = this.retryHistory.get(recoveryKey) || 0;

    if (currentRetries >= this.config.maxRetries) {
      return {
        success: false,
        message: `Maximum retry attempts (${this.config.maxRetries}) exceeded`,
        adaptations: [],
        timeElapsed: 0
      };
    }

    this.retryHistory.set(recoveryKey, currentRetries + 1);

    const startTime = Date.now();
    let result: RecoveryResult;

    switch (error.type) {
      case BrowserErrorType.ELEMENT_NOT_FOUND:
        result = await this.recoverFromElementNotFound(error, originalAction, context);
        break;
      case BrowserErrorType.TIMEOUT:
        result = await this.recoverFromTimeout(error, originalAction, context);
        break;
      case BrowserErrorType.NAVIGATION_ERROR:
        result = await this.recoverFromNavigationError(error, originalAction, context);
        break;
      case BrowserErrorType.AUTHENTICATION_ERROR:
        result = await this.recoverFromAuthenticationError(error, originalAction, context);
        break;
      case BrowserErrorType.NETWORK_ERROR:
        result = await this.recoverFromNetworkError(error, originalAction, context);
        break;
      case BrowserErrorType.JAVASCRIPT_ERROR:
        result = await this.recoverFromJavaScriptError(error, originalAction, context);
        break;
      case BrowserErrorType.PERMISSION_ERROR:
        result = await this.recoverFromPermissionError(error, originalAction, context);
        break;
      default:
        result = await this.genericRecovery(error, originalAction, context);
    }

    result.timeElapsed = Date.now() - startTime;

    // Clear retry history on success
    if (result.success) {
      this.retryHistory.delete(recoveryKey);
    }

    return result;
  }

  /**
   * Recovery for element not found errors
   */
  private async recoverFromElementNotFound(
    error: BrowserError,
    originalAction: BrowserAction,
    context: any
  ): Promise<RecoveryResult> {
    const adaptations: string[] = [];

    // Strategy 1: Try fallback selectors
    if (this.config.fallbackSelectors && originalAction.target.fallbacks) {
      for (const fallbackSelector of originalAction.target.fallbacks) {
        try {
          const modifiedAction = { ...originalAction, target: fallbackSelector };
          const result = await this.executeAction(modifiedAction);
          
          if (result.success) {
            adaptations.push(`Used fallback selector: ${fallbackSelector.type}="${fallbackSelector.value}"`);
            return {
              success: true,
              message: 'Element found using fallback selector',
              adaptations,
              timeElapsed: 0
            };
          }
        } catch (err) {
          console.warn('Fallback selector failed:', err);
        }
      }
    }

    // Strategy 2: Wait and retry with delay
    await this.delay(this.config.retryDelay);
    try {
      const result = await this.executeAction(originalAction);
      if (result.success) {
        adaptations.push('Element appeared after waiting');
        return {
          success: true,
          message: 'Element found after delay',
          adaptations,
          timeElapsed: 0
        };
      }
    } catch (err) {
      console.warn('Delayed retry failed:', err);
    }

    // Strategy 3: Adaptive selector generation
    if (this.config.adaptiveSelectors) {
      const adaptiveSelector = await this.generateAdaptiveSelector(originalAction.target, context);
      if (adaptiveSelector) {
        try {
          const modifiedAction = { ...originalAction, target: adaptiveSelector };
          const result = await this.executeAction(modifiedAction);
          
          if (result.success) {
            adaptations.push(`Generated adaptive selector: ${adaptiveSelector.type}="${adaptiveSelector.value}"`);
            return {
              success: true,
              message: 'Element found using adaptive selector',
              adaptations,
              timeElapsed: 0
            };
          }
        } catch (err) {
          console.warn('Adaptive selector failed:', err);
        }
      }
    }

    // Strategy 4: Screenshot analysis
    if (this.config.screenshotAnalysis) {
      const screenshotResult = await this.analyzeScreenshotForElement(originalAction.target, context);
      if (screenshotResult.found) {
        adaptations.push('Found element through screenshot analysis');
        return {
          success: true,
          message: 'Element located through visual analysis',
          adaptations,
          timeElapsed: 0
        };
      }
    }

    return {
      success: false,
      message: 'Element could not be found using any recovery strategy',
      adaptations,
      timeElapsed: 0
    };
  }

  /**
   * Recovery for timeout errors
   */
  private async recoverFromTimeout(
    error: BrowserError,
    originalAction: BrowserAction,
    context: any
  ): Promise<RecoveryResult> {
    const adaptations: string[] = [];

    // Strategy 1: Increase timeout and retry
    const extendedTimeout = (originalAction as any).timeout ? (originalAction as any).timeout * 2 : 10000;
    try {
      const modifiedAction = { ...originalAction, timeout: extendedTimeout };
      const result = await this.executeAction(modifiedAction);
      
      if (result.success) {
        adaptations.push(`Extended timeout to ${extendedTimeout}ms`);
        return {
          success: true,
          message: 'Action succeeded with extended timeout',
          adaptations,
          timeElapsed: 0
        };
      }
    } catch (err) {
      console.warn('Extended timeout retry failed:', err);
    }

    // Strategy 2: Check page loading state
    const pageReady = await this.waitForPageReady();
    if (pageReady) {
      try {
        const result = await this.executeAction(originalAction);
        if (result.success) {
          adaptations.push('Waited for page to fully load');
          return {
            success: true,
            message: 'Action succeeded after page loaded',
            adaptations,
            timeElapsed: 0
          };
        }
      } catch (err) {
        console.warn('Post-page-load retry failed:', err);
      }
    }

    // Strategy 3: Break down complex actions
    if (originalAction.type === 'click' || originalAction.type === 'type') {
      const simpleResult = await this.executeSimpleAction(originalAction);
      if (simpleResult.success) {
        adaptations.push('Simplified action execution');
        return {
          success: true,
          message: 'Action succeeded with simplified approach',
          adaptations,
          timeElapsed: 0
        };
      }
    }

    return {
      success: false,
      message: 'Action timed out despite recovery attempts',
      adaptations,
      timeElapsed: 0
    };
  }

  /**
   * Recovery for navigation errors
   */
  private async recoverFromNavigationError(
    error: BrowserError,
    originalAction: BrowserAction,
    context: any
  ): Promise<RecoveryResult> {
    const adaptations: string[] = [];

    // Strategy 1: Retry navigation with delay
    await this.delay(2000);
    try {
      const result = await this.executeAction(originalAction);
      if (result.success) {
        adaptations.push('Navigation succeeded after delay');
        return {
          success: true,
          message: 'Navigation completed on retry',
          adaptations,
          timeElapsed: 0
        };
      }
    } catch (err) {
      console.warn('Navigation retry failed:', err);
    }

    // Strategy 2: Check current URL and adjust
    const currentUrl = await this.getCurrentUrl();
    if (currentUrl && originalAction.value) {
      const targetUrl = originalAction.value;
      if (this.isUrlSimilar(currentUrl, targetUrl)) {
        adaptations.push('Already at target URL or similar');
        return {
          success: true,
          message: 'Navigation not needed - already at destination',
          adaptations,
          timeElapsed: 0
        };
      }
    }

    // Strategy 3: Alternative navigation method
    if (originalAction.value) {
      try {
        const alternativeResult = await this.alternativeNavigation(originalAction.value);
        if (alternativeResult) {
          adaptations.push('Used alternative navigation method');
          return {
            success: true,
            message: 'Navigation succeeded with alternative method',
            adaptations,
            timeElapsed: 0
          };
        }
      } catch (err) {
        console.warn('Alternative navigation failed:', err);
      }
    }

    return {
      success: false,
      message: 'Navigation failed despite recovery attempts',
      adaptations,
      timeElapsed: 0
    };
  }

  /**
   * Recovery for authentication errors
   */
  private async recoverFromAuthenticationError(
    error: BrowserError,
    originalAction: BrowserAction,
    context: any
  ): Promise<RecoveryResult> {
    const adaptations: string[] = [];

    // Strategy 1: Check if already authenticated
    const authStatus = await this.checkAuthenticationStatus();
    if (authStatus.authenticated) {
      adaptations.push('Authentication status verified');
      try {
        const result = await this.executeAction(originalAction);
        if (result.success) {
          return {
            success: true,
            message: 'Action succeeded - authentication was valid',
            adaptations,
            timeElapsed: 0
          };
        }
      } catch (err) {
        console.warn('Post-auth-check retry failed:', err);
      }
    }

    // Strategy 2: Refresh authentication tokens
    try {
      const refreshResult = await this.refreshAuthentication();
      if (refreshResult.success) {
        adaptations.push('Authentication tokens refreshed');
        const result = await this.executeAction(originalAction);
        if (result.success) {
          return {
            success: true,
            message: 'Action succeeded after token refresh',
            adaptations,
            timeElapsed: 0
          };
        }
      }
    } catch (err) {
      console.warn('Token refresh failed:', err);
    }

    // Strategy 3: Trigger re-authentication flow
    adaptations.push('Re-authentication required');
    return {
      success: false,
      message: 'Authentication required - user intervention needed',
      adaptations,
      timeElapsed: 0,
      newError: {
        id: error.code || 'auth-required',
        category: 'authentication' as any,
        type: 'AuthenticationRequired',
        message: 'Please log in to continue',
        severity: 'high' as any,
        timestamp: new Date(),
        context: {} as any,
        recoverable: true,
        recoveryStrategies: ['user_intervention' as any],
        metadata: {} as any,
        userFacing: true,
        userMessage: 'Please log in to continue'
      }
    };
  }

  /**
   * Recovery for network errors
   */
  private async recoverFromNetworkError(
    error: BrowserError,
    originalAction: BrowserAction,
    context: any
  ): Promise<RecoveryResult> {
    const adaptations: string[] = [];

    // Strategy 1: Check network connectivity
    const networkStatus = await this.checkNetworkConnectivity();
    if (!networkStatus.connected) {
      return {
        success: false,
        message: 'Network connectivity lost',
        adaptations: ['Network connectivity check failed'],
        timeElapsed: 0
      };
    }

    // Strategy 2: Retry with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      await this.delay(delay);
      
      try {
        const result = await this.executeAction(originalAction);
        if (result.success) {
          adaptations.push(`Network retry succeeded on attempt ${attempt}`);
          return {
            success: true,
            message: 'Action succeeded after network retry',
            adaptations,
            timeElapsed: 0
          };
        }
      } catch (err) {
        console.warn(`Network retry attempt ${attempt} failed:`, err);
      }
    }

    // Strategy 3: Switch to offline mode if applicable
    if (this.canWorkOffline(originalAction)) {
      const offlineResult = await this.executeOfflineAction(originalAction);
      if (offlineResult.success) {
        adaptations.push('Switched to offline mode');
        return {
          success: true,
          message: 'Action completed in offline mode',
          adaptations,
          timeElapsed: 0
        };
      }
    }

    return {
      success: false,
      message: 'Network error persists despite recovery attempts',
      adaptations,
      timeElapsed: 0
    };
  }

  /**
   * Recovery for JavaScript errors
   */
  private async recoverFromJavaScriptError(
    error: BrowserError,
    originalAction: BrowserAction,
    context: any
  ): Promise<RecoveryResult> {
    const adaptations: string[] = [];

    // Strategy 1: Wait for page to stabilize
    await this.delay(2000);
    try {
      const result = await this.executeAction(originalAction);
      if (result.success) {
        adaptations.push('Action succeeded after page stabilization');
        return {
          success: true,
          message: 'JavaScript error resolved',
          adaptations,
          timeElapsed: 0
        };
      }
    } catch (err) {
      console.warn('Post-stabilization retry failed:', err);
    }

    // Strategy 2: Use alternative interaction method
    const alternativeResult = await this.useAlternativeInteraction(originalAction);
    if (alternativeResult.success) {
      adaptations.push('Used alternative interaction method');
      return {
        success: true,
        message: 'Action succeeded with alternative method',
        adaptations,
        timeElapsed: 0
      };
    }

    // Strategy 3: Refresh page and retry
    try {
      await this.refreshPage();
      await this.delay(3000); // Wait for page to load
      
      const result = await this.executeAction(originalAction);
      if (result.success) {
        adaptations.push('Page refreshed to resolve JavaScript error');
        return {
          success: true,
          message: 'Action succeeded after page refresh',
          adaptations,
          timeElapsed: 0
        };
      }
    } catch (err) {
      console.warn('Post-refresh retry failed:', err);
    }

    return {
      success: false,
      message: 'JavaScript error could not be resolved',
      adaptations,
      timeElapsed: 0
    };
  }

  /**
   * Recovery for permission errors
   */
  private async recoverFromPermissionError(
    error: BrowserError,
    originalAction: BrowserAction,
    context: any
  ): Promise<RecoveryResult> {
    const adaptations: string[] = [];

    // Strategy 1: Request permissions
    try {
      const permissionResult = await this.requestPermissions(originalAction);
      if (permissionResult.granted) {
        adaptations.push('Permissions granted');
        const result = await this.executeAction(originalAction);
        if (result.success) {
          return {
            success: true,
            message: 'Action succeeded after permission grant',
            adaptations,
            timeElapsed: 0
          };
        }
      }
    } catch (err) {
      console.warn('Permission request failed:', err);
    }

    // Strategy 2: Use alternative approach that doesn't require permissions
    const alternativeResult = await this.usePermissionlessAlternative(originalAction);
    if (alternativeResult.success) {
      adaptations.push('Used permission-less alternative');
      return {
        success: true,
        message: 'Action completed without requiring permissions',
        adaptations,
        timeElapsed: 0
      };
    }

    return {
      success: false,
      message: 'Permission error could not be resolved',
      adaptations,
      timeElapsed: 0
    };
  }

  /**
   * Generic recovery for unknown error types
   */
  private async genericRecovery(
    error: BrowserError,
    originalAction: BrowserAction,
    context: any
  ): Promise<RecoveryResult> {
    const adaptations: string[] = [];

    // Strategy 1: Simple retry with delay
    await this.delay(this.config.retryDelay);
    try {
      const result = await this.executeAction(originalAction);
      if (result.success) {
        adaptations.push('Generic retry succeeded');
        return {
          success: true,
          message: 'Action succeeded on retry',
          adaptations,
          timeElapsed: 0
        };
      }
    } catch (err) {
      console.warn('Generic retry failed:', err);
    }

    return {
      success: false,
      message: 'Generic recovery failed',
      adaptations,
      timeElapsed: 0
    };
  }

  /**
   * Helper methods
   */
  private async executeAction(action: BrowserAction): Promise<ActionResult> {
    // This would delegate to the actual browser controller
    return await this.browserController.performAction(action);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async generateAdaptiveSelector(
    originalSelector: ElementSelector,
    context: any
  ): Promise<ElementSelector | null> {
    // Implementation would use AI/ML to generate alternative selectors
    // based on page structure and context
    return null;
  }

  private async analyzeScreenshotForElement(
    selector: ElementSelector,
    context: any
  ): Promise<{ found: boolean; location?: { x: number; y: number } }> {
    // Implementation would use computer vision to find elements in screenshots
    return { found: false };
  }

  private async waitForPageReady(): Promise<boolean> {
    // Implementation would wait for page to be fully loaded
    return true;
  }

  private async executeSimpleAction(action: BrowserAction): Promise<ActionResult> {
    // Implementation would break down complex actions into simpler ones
    return await this.executeAction(action);
  }

  private async getCurrentUrl(): Promise<string | null> {
    // Implementation would get current page URL
    return null;
  }

  private isUrlSimilar(url1: string, url2: string): boolean {
    // Implementation would compare URLs for similarity
    return url1 === url2;
  }

  private async alternativeNavigation(url: string): Promise<boolean> {
    // Implementation would try alternative navigation methods
    return false;
  }

  private async checkAuthenticationStatus(): Promise<{ authenticated: boolean }> {
    // Implementation would check current authentication status
    return { authenticated: false };
  }

  private async refreshAuthentication(): Promise<{ success: boolean }> {
    // Implementation would refresh authentication tokens
    return { success: false };
  }

  private async checkNetworkConnectivity(): Promise<{ connected: boolean }> {
    // Implementation would check network connectivity
    return { connected: true };
  }

  private canWorkOffline(action: BrowserAction): boolean {
    // Implementation would determine if action can work offline
    return false;
  }

  private async executeOfflineAction(action: BrowserAction): Promise<ActionResult> {
    // Implementation would execute action in offline mode
    return await this.executeAction(action);
  }

  private async useAlternativeInteraction(action: BrowserAction): Promise<ActionResult> {
    // Implementation would use alternative interaction methods
    return await this.executeAction(action);
  }

  private async refreshPage(): Promise<void> {
    // Implementation would refresh the current page
  }

  private async requestPermissions(action: BrowserAction): Promise<{ granted: boolean }> {
    // Implementation would request necessary permissions
    return { granted: false };
  }

  private async usePermissionlessAlternative(action: BrowserAction): Promise<ActionResult> {
    // Implementation would use alternative that doesn't require permissions
    return await this.executeAction(action);
  }

  /**
   * Clear retry history
   */
  clearRetryHistory(): void {
    this.retryHistory.clear();
  }

  /**
   * Get retry statistics
   */
  getRetryStatistics(): Map<string, number> {
    return new Map(this.retryHistory);
  }
}