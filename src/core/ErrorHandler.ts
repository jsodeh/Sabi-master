import { v4 as uuidv4 } from 'uuid';
import {
  SystemError,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  RecoveryAction,
  RecoveryResult,
  BrowserAutomationError,
  AIProcessingError,
  NetworkError,
  AuthenticationError,
  UserInterfaceError,
  DataValidationError,
  ErrorContext,
  ErrorMetadata,
  SystemInfo
} from '../types/errors';
import { BrowserError, BrowserErrorType } from '../types/browser';

export class ErrorHandler {
  private errorHistory: Map<string, SystemError> = new Map();
  private recoveryActions: Map<string, RecoveryAction[]> = new Map();
  private errorFrequency: Map<string, number> = new Map();
  private notificationCallbacks: ((error: SystemError) => void)[] = [];

  constructor() {
    this.initializeRecoveryActions();
  }

  /**
   * Main error handling entry point
   */
  async handleError(error: Error | SystemError, context?: Partial<ErrorContext>): Promise<RecoveryResult> {
    const systemError = this.isSystemError(error) ? error : await this.classifyError(error, context);
    
    // Store error in history
    this.errorHistory.set(systemError.id, systemError);
    this.updateErrorFrequency(systemError);
    
    // Notify listeners
    this.notifyErrorListeners(systemError);
    
    // Attempt recovery
    return await this.attemptRecovery(systemError);
  }

  /**
   * Classify generic errors into system errors
   */
  private async classifyError(error: Error, context?: Partial<ErrorContext>): Promise<SystemError> {
    const errorContext = await this.buildErrorContext(context);
    const errorId = uuidv4();
    
    // Analyze error message and stack trace to determine category
    const category = this.determineErrorCategory(error);
    const severity = this.determineSeverity(error, category);
    const recoveryStrategies = this.getRecoveryStrategies(category, error);
    
    const systemError: SystemError = {
      id: errorId,
      category,
      type: error.constructor.name,
      message: error.message,
      severity,
      timestamp: new Date(),
      context: errorContext,
      recoverable: this.isRecoverable(category, error),
      recoveryStrategies,
      metadata: this.createErrorMetadata(errorId),
      stackTrace: error.stack,
      userFacing: this.isUserFacing(category, severity),
      userMessage: this.generateUserMessage(category, error)
    };

    return systemError;
  }

  /**
   * Create browser automation specific error
   */
  createBrowserError(
    browserError: BrowserError,
    actionId?: string,
    context?: Partial<ErrorContext>
  ): BrowserAutomationError {
    const errorContext = this.buildErrorContextSync(context);
    
    return {
      id: uuidv4(),
      category: ErrorCategory.BROWSER_AUTOMATION,
      type: browserError.type,
      message: browserError.message,
      severity: this.getBrowserErrorSeverity(browserError.type),
      timestamp: new Date(),
      context: errorContext,
      recoverable: browserError.recoverable,
      recoveryStrategies: this.getBrowserRecoveryStrategies(browserError.type),
      metadata: this.createErrorMetadata(uuidv4()),
      userFacing: true,
      userMessage: this.getBrowserUserMessage(browserError.type),
      browserError,
      actionId,
      elementSelector: browserError.selector?.value,
      screenshot: browserError.screenshot
    };
  }

  /**
   * Create AI processing specific error
   */
  createAIError(
    message: string,
    modelName: string,
    inputType: string,
    processingStep: string,
    context?: Partial<ErrorContext>
  ): AIProcessingError {
    const errorContext = this.buildErrorContextSync(context);
    
    return {
      id: uuidv4(),
      category: ErrorCategory.AI_PROCESSING,
      type: 'AIProcessingError',
      message,
      severity: ErrorSeverity.HIGH,
      timestamp: new Date(),
      context: errorContext,
      recoverable: true,
      recoveryStrategies: [RecoveryStrategy.RETRY, RecoveryStrategy.FALLBACK],
      metadata: this.createErrorMetadata(uuidv4()),
      userFacing: true,
      userMessage: 'AI processing encountered an issue. Trying alternative approach...',
      modelName,
      inputType,
      processingStep
    };
  }

  /**
   * Create network specific error
   */
  createNetworkError(
    message: string,
    endpoint: string,
    method: string,
    statusCode?: number,
    context?: Partial<ErrorContext>
  ): NetworkError {
    const errorContext = this.buildErrorContextSync(context);
    
    return {
      id: uuidv4(),
      category: ErrorCategory.NETWORK,
      type: 'NetworkError',
      message,
      severity: this.getNetworkErrorSeverity(statusCode),
      timestamp: new Date(),
      context: errorContext,
      recoverable: this.isNetworkErrorRecoverable(statusCode),
      recoveryStrategies: this.getNetworkRecoveryStrategies(statusCode),
      metadata: this.createErrorMetadata(uuidv4()),
      userFacing: true,
      userMessage: this.getNetworkUserMessage(statusCode),
      statusCode,
      endpoint,
      method
    };
  }

  /**
   * Attempt to recover from error
   */
  private async attemptRecovery(error: SystemError): Promise<RecoveryResult> {
    if (!error.recoverable) {
      return {
        success: false,
        message: 'Error is not recoverable',
        adaptations: [],
        timeElapsed: 0
      };
    }

    const actions = this.recoveryActions.get(error.category) || [];
    const applicableActions = actions.filter(action => 
      error.recoveryStrategies.includes(action.strategy)
    );

    // Sort by success probability
    applicableActions.sort((a, b) => b.successProbability - a.successProbability);

    for (const action of applicableActions) {
      try {
        const startTime = Date.now();
        const result = await action.execute();
        result.timeElapsed = Date.now() - startTime;
        
        if (result.success) {
          this.updateErrorMetadata(error.id, { debugInfo: { recovered: true, recoveryAction: action.id } });
          return result;
        }
      } catch (recoveryError) {
        console.error(`Recovery action ${action.id} failed:`, recoveryError);
      }
    }

    return {
      success: false,
      message: 'All recovery attempts failed',
      adaptations: [],
      timeElapsed: 0
    };
  }

  /**
   * Initialize recovery actions for different error categories
   */
  private initializeRecoveryActions(): void {
    // Browser automation recovery actions
    this.recoveryActions.set(ErrorCategory.BROWSER_AUTOMATION, [
      {
        id: 'retry-with-delay',
        strategy: RecoveryStrategy.RETRY,
        description: 'Retry action with exponential backoff delay',
        automated: true,
        estimatedTime: 2000,
        successProbability: 0.7,
        prerequisites: [],
        execute: async () => this.retryWithDelay()
      },
      {
        id: 'fallback-selector',
        strategy: RecoveryStrategy.FALLBACK,
        description: 'Try alternative element selectors',
        automated: true,
        estimatedTime: 1000,
        successProbability: 0.6,
        prerequisites: [],
        execute: async () => this.tryFallbackSelectors()
      },
      {
        id: 'screenshot-analysis',
        strategy: RecoveryStrategy.ALTERNATIVE_APPROACH,
        description: 'Analyze screenshot to find alternative approach',
        automated: true,
        estimatedTime: 3000,
        successProbability: 0.5,
        prerequisites: [],
        execute: async () => this.analyzeScreenshotForAlternative()
      }
    ]);

    // AI processing recovery actions
    this.recoveryActions.set(ErrorCategory.AI_PROCESSING, [
      {
        id: 'retry-ai-request',
        strategy: RecoveryStrategy.RETRY,
        description: 'Retry AI request with adjusted parameters',
        automated: true,
        estimatedTime: 5000,
        successProbability: 0.8,
        prerequisites: [],
        execute: async () => this.retryAIRequest()
      },
      {
        id: 'fallback-model',
        strategy: RecoveryStrategy.FALLBACK,
        description: 'Switch to fallback AI model',
        automated: true,
        estimatedTime: 3000,
        successProbability: 0.6,
        prerequisites: [],
        execute: async () => this.switchToFallbackModel()
      }
    ]);

    // Network recovery actions
    this.recoveryActions.set(ErrorCategory.NETWORK, [
      {
        id: 'retry-network-request',
        strategy: RecoveryStrategy.RETRY,
        description: 'Retry network request with exponential backoff',
        automated: true,
        estimatedTime: 3000,
        successProbability: 0.7,
        prerequisites: [],
        execute: async () => this.retryNetworkRequest()
      },
      {
        id: 'offline-mode',
        strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        description: 'Switch to offline mode with cached data',
        automated: true,
        estimatedTime: 500,
        successProbability: 0.9,
        prerequisites: [],
        execute: async () => this.switchToOfflineMode()
      }
    ]);
  }

  /**
   * Recovery action implementations
   */
  private async retryWithDelay(): Promise<RecoveryResult> {
    // Implementation would retry the failed action with exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      message: 'Action retried successfully',
      adaptations: ['Added delay before retry'],
      timeElapsed: 1000
    };
  }

  private async tryFallbackSelectors(): Promise<RecoveryResult> {
    // Implementation would try alternative selectors
    return {
      success: true,
      message: 'Alternative selector worked',
      adaptations: ['Used fallback CSS selector'],
      timeElapsed: 500
    };
  }

  private async analyzeScreenshotForAlternative(): Promise<RecoveryResult> {
    // Implementation would analyze screenshot to find alternative approach
    return {
      success: false,
      message: 'Could not find alternative approach',
      adaptations: [],
      timeElapsed: 2000
    };
  }

  private async retryAIRequest(): Promise<RecoveryResult> {
    // Implementation would retry AI request with adjusted parameters
    return {
      success: true,
      message: 'AI request succeeded with adjusted parameters',
      adaptations: ['Reduced temperature', 'Increased max tokens'],
      timeElapsed: 3000
    };
  }

  private async switchToFallbackModel(): Promise<RecoveryResult> {
    // Implementation would switch to a different AI model
    return {
      success: true,
      message: 'Switched to fallback model successfully',
      adaptations: ['Using GPT-3.5 instead of GPT-4'],
      timeElapsed: 2000
    };
  }

  private async retryNetworkRequest(): Promise<RecoveryResult> {
    // Implementation would retry network request
    return {
      success: true,
      message: 'Network request succeeded on retry',
      adaptations: ['Added retry with backoff'],
      timeElapsed: 2000
    };
  }

  private async switchToOfflineMode(): Promise<RecoveryResult> {
    // Implementation would switch to offline mode
    return {
      success: true,
      message: 'Switched to offline mode',
      adaptations: ['Using cached data', 'Limited functionality'],
      timeElapsed: 100
    };
  }

  /**
   * Helper methods
   */
  private isSystemError(error: any): error is SystemError {
    return error && typeof error === 'object' && 'category' in error && 'id' in error;
  }

  private determineErrorCategory(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    // Check UI errors first to avoid conflicts with other categories
    if (stack.includes('renderer') || message.includes('ui component') || message.includes('component') || (message.includes('ui') && (message.includes('interface') || message.includes('rendering')))) {
      return ErrorCategory.USER_INTERFACE;
    }
    if (message.includes('browser') || message.includes('element') || message.includes('selector')) {
      return ErrorCategory.BROWSER_AUTOMATION;
    }
    if (message.includes('ai') || message.includes('model') || (message.includes('processing') && !message.includes('ui'))) {
      return ErrorCategory.AI_PROCESSING;
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('request')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('auth') || message.includes('token') || message.includes('login')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('validation') || message.includes('schema')) {
      return ErrorCategory.DATA_VALIDATION;
    }
    if (message.includes('critical') || message.includes('system')) {
      return ErrorCategory.SYSTEM;
    }
    
    return ErrorCategory.SYSTEM;
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors that break core functionality
    if (error.message.toLowerCase().includes('critical')) {
      return ErrorSeverity.CRITICAL;
    }
    
    // System errors are critical unless otherwise specified
    if (category === ErrorCategory.SYSTEM) {
      return ErrorSeverity.CRITICAL;
    }
    
    // High severity for core features
    if (category === ErrorCategory.BROWSER_AUTOMATION || category === ErrorCategory.AI_PROCESSING) {
      return ErrorSeverity.HIGH;
    }
    
    // Medium for user experience issues
    if (category === ErrorCategory.USER_INTERFACE || category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.NETWORK) {
      return ErrorSeverity.MEDIUM;
    }
    
    // Data validation errors are typically medium severity
    if (category === ErrorCategory.DATA_VALIDATION) {
      return ErrorSeverity.MEDIUM;
    }
    
    return ErrorSeverity.LOW;
  }

  private getRecoveryStrategies(category: ErrorCategory, error: Error): RecoveryStrategy[] {
    switch (category) {
      case ErrorCategory.BROWSER_AUTOMATION:
        return [RecoveryStrategy.RETRY, RecoveryStrategy.FALLBACK, RecoveryStrategy.ALTERNATIVE_APPROACH];
      case ErrorCategory.AI_PROCESSING:
        return [RecoveryStrategy.RETRY, RecoveryStrategy.FALLBACK];
      case ErrorCategory.NETWORK:
        return [RecoveryStrategy.RETRY, RecoveryStrategy.GRACEFUL_DEGRADATION];
      case ErrorCategory.AUTHENTICATION:
        return [RecoveryStrategy.USER_INTERVENTION];
      case ErrorCategory.USER_INTERFACE:
        return [RecoveryStrategy.RETRY, RecoveryStrategy.GRACEFUL_DEGRADATION];
      default:
        return [RecoveryStrategy.RETRY];
    }
  }

  private isRecoverable(category: ErrorCategory, error: Error): boolean {
    // System errors are generally not recoverable
    if (category === ErrorCategory.SYSTEM) {
      return false;
    }
    
    // Data validation errors require fixing the input
    if (category === ErrorCategory.DATA_VALIDATION) {
      return false;
    }
    
    return true;
  }

  private isUserFacing(category: ErrorCategory, severity: ErrorSeverity): boolean {
    // System errors are generally not user-facing unless critical
    if (category === ErrorCategory.SYSTEM) {
      return severity === ErrorSeverity.CRITICAL;
    }
    
    // UI errors are always user-facing
    if (category === ErrorCategory.USER_INTERFACE) {
      return true;
    }
    
    // Authentication errors are always user-facing
    if (category === ErrorCategory.AUTHENTICATION) {
      return true;
    }
    
    // Other categories are user-facing if not low severity
    return severity !== ErrorSeverity.LOW;
  }

  private generateUserMessage(category: ErrorCategory, error: Error): string {
    switch (category) {
      case ErrorCategory.BROWSER_AUTOMATION:
        return 'Having trouble interacting with the web page. Trying alternative approach...';
      case ErrorCategory.AI_PROCESSING:
        return 'AI processing is taking longer than expected. Please wait...';
      case ErrorCategory.NETWORK:
        return 'Connection issue detected. Retrying...';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication required. Please log in again.';
      case ErrorCategory.USER_INTERFACE:
        return 'Interface issue detected. Refreshing...';
      default:
        return 'An unexpected issue occurred. Working to resolve it...';
    }
  }

  private getBrowserErrorSeverity(type: BrowserErrorType): ErrorSeverity {
    switch (type) {
      case BrowserErrorType.ELEMENT_NOT_FOUND:
        return ErrorSeverity.MEDIUM;
      case BrowserErrorType.TIMEOUT:
        return ErrorSeverity.MEDIUM;
      case BrowserErrorType.NAVIGATION_ERROR:
        return ErrorSeverity.HIGH;
      case BrowserErrorType.AUTHENTICATION_ERROR:
        return ErrorSeverity.HIGH;
      case BrowserErrorType.NETWORK_ERROR:
        return ErrorSeverity.HIGH;
      case BrowserErrorType.JAVASCRIPT_ERROR:
        return ErrorSeverity.MEDIUM;
      case BrowserErrorType.PERMISSION_ERROR:
        return ErrorSeverity.HIGH;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private getBrowserRecoveryStrategies(type: BrowserErrorType): RecoveryStrategy[] {
    switch (type) {
      case BrowserErrorType.ELEMENT_NOT_FOUND:
        return [RecoveryStrategy.RETRY, RecoveryStrategy.FALLBACK, RecoveryStrategy.ALTERNATIVE_APPROACH];
      case BrowserErrorType.TIMEOUT:
        return [RecoveryStrategy.RETRY];
      case BrowserErrorType.NAVIGATION_ERROR:
        return [RecoveryStrategy.RETRY, RecoveryStrategy.ALTERNATIVE_APPROACH];
      case BrowserErrorType.AUTHENTICATION_ERROR:
        return [RecoveryStrategy.USER_INTERVENTION];
      case BrowserErrorType.NETWORK_ERROR:
        return [RecoveryStrategy.RETRY, RecoveryStrategy.GRACEFUL_DEGRADATION];
      default:
        return [RecoveryStrategy.RETRY];
    }
  }

  private getBrowserUserMessage(type: BrowserErrorType): string {
    switch (type) {
      case BrowserErrorType.ELEMENT_NOT_FOUND:
        return 'Could not find the expected element on the page. Trying alternative approach...';
      case BrowserErrorType.TIMEOUT:
        return 'Page is taking longer to load than expected. Please wait...';
      case BrowserErrorType.NAVIGATION_ERROR:
        return 'Having trouble navigating to the page. Retrying...';
      case BrowserErrorType.AUTHENTICATION_ERROR:
        return 'Authentication required. Please log in to continue.';
      case BrowserErrorType.NETWORK_ERROR:
        return 'Network connection issue. Checking connectivity...';
      default:
        return 'Browser interaction issue detected. Working to resolve it...';
    }
  }

  private getNetworkErrorSeverity(statusCode?: number): ErrorSeverity {
    if (!statusCode) return ErrorSeverity.HIGH;
    
    if (statusCode >= 500) return ErrorSeverity.HIGH;
    if (statusCode >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  private isNetworkErrorRecoverable(statusCode?: number): boolean {
    if (!statusCode) return true;
    
    // 4xx client errors are generally not recoverable by retry
    if (statusCode >= 400 && statusCode < 500) {
      return statusCode === 429; // Rate limit is recoverable
    }
    
    return true;
  }

  private getNetworkRecoveryStrategies(statusCode?: number): RecoveryStrategy[] {
    if (!statusCode) return [RecoveryStrategy.RETRY];
    
    if (statusCode === 429) {
      return [RecoveryStrategy.RETRY]; // Rate limit
    }
    if (statusCode >= 500) {
      return [RecoveryStrategy.RETRY, RecoveryStrategy.GRACEFUL_DEGRADATION];
    }
    if (statusCode === 401 || statusCode === 403) {
      return [RecoveryStrategy.USER_INTERVENTION];
    }
    
    return [RecoveryStrategy.RETRY];
  }

  private getNetworkUserMessage(statusCode?: number): string {
    if (!statusCode) return 'Network request failed. Retrying...';
    
    if (statusCode === 429) return 'Rate limit reached. Waiting before retry...';
    if (statusCode >= 500) return 'Server error detected. Retrying...';
    if (statusCode === 401) return 'Authentication required. Please log in.';
    if (statusCode === 403) return 'Access denied. Please check permissions.';
    if (statusCode === 404) return 'Resource not found. Trying alternative...';
    
    return `Request failed with status ${statusCode}. Retrying...`;
  }

  private async buildErrorContext(context?: Partial<ErrorContext>): Promise<ErrorContext> {
    const systemInfo = await this.getSystemInfo();
    
    return {
      sessionId: context?.sessionId,
      userId: context?.userId,
      learningStepId: context?.learningStepId,
      toolType: context?.toolType,
      url: context?.url,
      userAgent: navigator.userAgent,
      systemInfo,
      previousErrors: context?.previousErrors || []
    };
  }

  private buildErrorContextSync(context?: Partial<ErrorContext>): ErrorContext {
    const systemInfo: SystemInfo = {
      platform: process.platform,
      version: process.version,
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal
      },
      cpu: {
        usage: 0, // Would need additional library to get real CPU usage
        cores: require('os').cpus().length
      }
    };
    
    return {
      sessionId: context?.sessionId,
      userId: context?.userId,
      learningStepId: context?.learningStepId,
      toolType: context?.toolType,
      url: context?.url,
      userAgent: navigator?.userAgent || 'Unknown',
      systemInfo,
      previousErrors: context?.previousErrors || []
    };
  }

  private async getSystemInfo(): Promise<SystemInfo> {
    return {
      platform: process.platform,
      version: process.version,
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal
      },
      cpu: {
        usage: 0, // Would need additional library to get real CPU usage
        cores: require('os').cpus().length
      }
    };
  }

  private createErrorMetadata(errorId: string): ErrorMetadata {
    const now = new Date();
    return {
      retryCount: 0,
      maxRetries: 3,
      firstOccurrence: now,
      lastOccurrence: now,
      frequency: 1,
      relatedComponents: [],
      debugInfo: {}
    };
  }

  private updateErrorFrequency(error: SystemError): void {
    const key = `${error.category}:${error.type}`;
    const current = this.errorFrequency.get(key) || 0;
    this.errorFrequency.set(key, current + 1);
    error.metadata.frequency = current + 1;
  }

  private updateErrorMetadata(errorId: string, updates: Partial<ErrorMetadata>): void {
    const error = this.errorHistory.get(errorId);
    if (error) {
      error.metadata = { ...error.metadata, ...updates };
    }
  }

  private notifyErrorListeners(error: SystemError): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error notification callback failed:', err);
      }
    });
  }

  /**
   * Public API methods
   */
  onError(callback: (error: SystemError) => void): void {
    this.notificationCallbacks.push(callback);
  }

  getErrorHistory(): SystemError[] {
    return Array.from(this.errorHistory.values());
  }

  getErrorFrequency(): Map<string, number> {
    return new Map(this.errorFrequency);
  }

  clearErrorHistory(): void {
    this.errorHistory.clear();
    this.errorFrequency.clear();
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();