import {
  AIResponse,
  ProcessedInput,
  AIModelConfig,
  AIProvider,
  ModelCapability
} from '../types/ai';
import { RecoveryResult, RecoveryStrategy } from '../types/errors';
import { MultimodalProcessor } from './MultimodalProcessor';

export interface AIRecoveryConfig {
  maxRetries: number;
  fallbackModels: AIModelConfig[];
  degradedModeEnabled: boolean;
  cacheEnabled: boolean;
  timeoutMs: number;
}

export interface AIFallbackStrategy {
  id: string;
  name: string;
  description: string;
  priority: number;
  execute: (input: any, context: any) => Promise<RecoveryResult>;
}

export class AIErrorRecovery {
  private config: AIRecoveryConfig;
  private multimodalProcessor: MultimodalProcessor;
  private fallbackStrategies: Map<string, AIFallbackStrategy> = new Map();
  private responseCache: Map<string, AIResponse> = new Map();
  private retryHistory: Map<string, number> = new Map();

  constructor(
    multimodalProcessor: MultimodalProcessor,
    config: Partial<AIRecoveryConfig> = {}
  ) {
    this.multimodalProcessor = multimodalProcessor;
    this.config = {
      maxRetries: 3,
      fallbackModels: [],
      degradedModeEnabled: true,
      cacheEnabled: true,
      timeoutMs: 30000,
      ...config
    };

    this.initializeFallbackStrategies();
  }

  /**
   * Main recovery method for AI processing errors
   */
  async recoverFromAIError(
    error: Error,
    originalInput: any,
    processingType: string,
    context: any = {}
  ): Promise<RecoveryResult> {
    const recoveryKey = `${processingType}-${this.hashInput(originalInput)}`;
    const currentRetries = this.retryHistory.get(recoveryKey) || 0;

    if (currentRetries >= this.config.maxRetries) {
      return await this.handleMaxRetriesExceeded(originalInput, processingType, context);
    }

    this.retryHistory.set(recoveryKey, currentRetries + 1);

    const startTime = Date.now();
    let result: RecoveryResult;

    // Try recovery strategies in order of priority
    const strategies = this.getApplicableStrategies(error, processingType);
    
    for (const strategy of strategies) {
      try {
        result = await strategy.execute(originalInput, { ...context, error, processingType });
        
        if (result.success) {
          result.timeElapsed = Date.now() - startTime;
          this.retryHistory.delete(recoveryKey); // Clear on success
          return result;
        }
      } catch (strategyError) {
        console.warn(`Recovery strategy ${strategy.id} failed:`, strategyError);
      }
    }

    // If all strategies failed, try degraded mode
    if (this.config.degradedModeEnabled) {
      result = await this.tryDegradedMode(originalInput, processingType, context);
      result.timeElapsed = Date.now() - startTime;
      return result;
    }

    return {
      success: false,
      message: 'All AI recovery strategies failed',
      adaptations: [],
      timeElapsed: Date.now() - startTime
    };
  }

  /**
   * Initialize fallback strategies
   */
  private initializeFallbackStrategies(): void {
    // Strategy 1: Retry with adjusted parameters
    this.fallbackStrategies.set('retry-adjusted', {
      id: 'retry-adjusted',
      name: 'Retry with Adjusted Parameters',
      description: 'Retry the request with modified parameters',
      priority: 1,
      execute: async (input, context) => this.retryWithAdjustedParameters(input, context)
    });

    // Strategy 2: Use fallback model
    this.fallbackStrategies.set('fallback-model', {
      id: 'fallback-model',
      name: 'Fallback Model',
      description: 'Switch to a different AI model',
      priority: 2,
      execute: async (input, context) => this.useFallbackModel(input, context)
    });

    // Strategy 3: Simplify input
    this.fallbackStrategies.set('simplify-input', {
      id: 'simplify-input',
      name: 'Simplify Input',
      description: 'Reduce input complexity and retry',
      priority: 3,
      execute: async (input, context) => this.simplifyInputAndRetry(input, context)
    });

    // Strategy 4: Use cached response
    this.fallbackStrategies.set('use-cache', {
      id: 'use-cache',
      name: 'Use Cached Response',
      description: 'Return a similar cached response',
      priority: 4,
      execute: async (input, context) => this.useCachedResponse(input, context)
    });

    // Strategy 5: Break down request
    this.fallbackStrategies.set('break-down', {
      id: 'break-down',
      name: 'Break Down Request',
      description: 'Split complex request into smaller parts',
      priority: 5,
      execute: async (input, context) => this.breakDownRequest(input, context)
    });

    // Strategy 6: Use template response
    this.fallbackStrategies.set('template-response', {
      id: 'template-response',
      name: 'Template Response',
      description: 'Generate response from templates',
      priority: 6,
      execute: async (input, context) => this.useTemplateResponse(input, context)
    });
  }

  /**
   * Get applicable strategies based on error and processing type
   */
  private getApplicableStrategies(error: Error, processingType: string): AIFallbackStrategy[] {
    const strategies: AIFallbackStrategy[] = [];
    
    // Always try retry with adjusted parameters first
    strategies.push(this.fallbackStrategies.get('retry-adjusted')!);

    // Add fallback model if available
    if (this.config.fallbackModels.length > 0) {
      strategies.push(this.fallbackStrategies.get('fallback-model')!);
    }

    // Add input simplification for complex inputs
    if (this.isComplexInput(processingType)) {
      strategies.push(this.fallbackStrategies.get('simplify-input')!);
    }

    // Add cache strategy if enabled
    if (this.config.cacheEnabled) {
      strategies.push(this.fallbackStrategies.get('use-cache')!);
    }

    // Add breakdown strategy for complex requests
    if (this.canBreakDown(processingType)) {
      strategies.push(this.fallbackStrategies.get('break-down')!);
    }

    // Always add template response as last resort
    strategies.push(this.fallbackStrategies.get('template-response')!);

    return strategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Strategy implementations
   */
  private async retryWithAdjustedParameters(input: any, context: any): Promise<RecoveryResult> {
    const adaptations: string[] = [];
    
    try {
      // Adjust parameters based on error type
      const adjustedConfig = this.adjustModelParameters(context.error);
      adaptations.push(`Adjusted parameters: ${Object.keys(adjustedConfig).join(', ')}`);

      // Retry with adjusted parameters
      const result = await this.processWithConfig(input, adjustedConfig, context.processingType);
      
      return {
        success: true,
        message: 'AI processing succeeded with adjusted parameters',
        adaptations,
        timeElapsed: 0
      };
    } catch (error) {
      return {
        success: false,
        message: 'Parameter adjustment failed',
        adaptations,
        timeElapsed: 0
      };
    }
  }

  private async useFallbackModel(input: any, context: any): Promise<RecoveryResult> {
    const adaptations: string[] = [];
    
    for (const fallbackModel of this.config.fallbackModels) {
      try {
        adaptations.push(`Trying fallback model: ${fallbackModel.modelName}`);
        
        const result = await this.processWithModel(input, fallbackModel, context.processingType);
        
        return {
          success: true,
          message: `Fallback model ${fallbackModel.modelName} succeeded`,
          adaptations,
          timeElapsed: 0
        };
      } catch (error) {
        adaptations.push(`Fallback model ${fallbackModel.modelName} failed`);
        continue;
      }
    }

    return {
      success: false,
      message: 'All fallback models failed',
      adaptations,
      timeElapsed: 0
    };
  }

  private async simplifyInputAndRetry(input: any, context: any): Promise<RecoveryResult> {
    const adaptations: string[] = [];
    
    try {
      const simplifiedInput = this.simplifyInput(input, context.processingType);
      adaptations.push('Simplified input complexity');

      const result = await this.processInput(simplifiedInput, context.processingType);
      
      return {
        success: true,
        message: 'AI processing succeeded with simplified input',
        adaptations,
        timeElapsed: 0
      };
    } catch (error) {
      return {
        success: false,
        message: 'Input simplification failed',
        adaptations,
        timeElapsed: 0
      };
    }
  }

  private async useCachedResponse(input: any, context: any): Promise<RecoveryResult> {
    const adaptations: string[] = [];
    
    if (!this.config.cacheEnabled) {
      return {
        success: false,
        message: 'Cache not enabled',
        adaptations,
        timeElapsed: 0
      };
    }

    const cacheKey = this.generateCacheKey(input, context.processingType);
    const cachedResponse = this.responseCache.get(cacheKey);
    
    if (cachedResponse) {
      adaptations.push('Used exact cached response');
      return {
        success: true,
        message: 'Returned cached response',
        adaptations,
        timeElapsed: 0
      };
    }

    // Try to find similar cached response
    const similarResponse = this.findSimilarCachedResponse(input, context.processingType);
    if (similarResponse) {
      adaptations.push('Used similar cached response');
      return {
        success: true,
        message: 'Returned similar cached response',
        adaptations,
        timeElapsed: 0
      };
    }

    return {
      success: false,
      message: 'No suitable cached response found',
      adaptations,
      timeElapsed: 0
    };
  }

  private async breakDownRequest(input: any, context: any): Promise<RecoveryResult> {
    const adaptations: string[] = [];
    
    try {
      const subRequests = this.breakDownInput(input, context.processingType);
      adaptations.push(`Broke down into ${subRequests.length} sub-requests`);

      const subResults: any[] = [];
      for (const subRequest of subRequests) {
        try {
          const subResult = await this.processInput(subRequest, context.processingType);
          subResults.push(subResult);
        } catch (error) {
          // If any sub-request fails, the whole strategy fails
          return {
            success: false,
            message: 'Sub-request processing failed',
            adaptations,
            timeElapsed: 0
          };
        }
      }

      // Combine sub-results
      const combinedResult = this.combineResults(subResults, context.processingType);
      adaptations.push('Combined sub-request results');

      return {
        success: true,
        message: 'Request breakdown and combination succeeded',
        adaptations,
        timeElapsed: 0
      };
    } catch (error) {
      return {
        success: false,
        message: 'Request breakdown failed',
        adaptations,
        timeElapsed: 0
      };
    }
  }

  private async useTemplateResponse(input: any, context: any): Promise<RecoveryResult> {
    const adaptations: string[] = [];
    
    try {
      const template = this.getResponseTemplate(context.processingType);
      const templateResponse = this.fillTemplate(template, input, context);
      
      adaptations.push(`Used template for ${context.processingType}`);
      
      return {
        success: true,
        message: 'Generated response from template',
        adaptations,
        timeElapsed: 0
      };
    } catch (error) {
      return {
        success: false,
        message: 'Template response generation failed',
        adaptations,
        timeElapsed: 0
      };
    }
  }

  /**
   * Degraded mode - minimal functionality
   */
  private async tryDegradedMode(input: any, processingType: string, context: any): Promise<RecoveryResult> {
    const adaptations: string[] = ['Switched to degraded mode'];
    
    try {
      // Provide basic functionality without AI processing
      const degradedResponse = this.generateDegradedResponse(input, processingType);
      
      return {
        success: true,
        message: 'Operating in degraded mode with limited functionality',
        adaptations,
        timeElapsed: 0
      };
    } catch (error) {
      return {
        success: false,
        message: 'Degraded mode failed',
        adaptations,
        timeElapsed: 0
      };
    }
  }

  /**
   * Handle max retries exceeded
   */
  private async handleMaxRetriesExceeded(
    input: any,
    processingType: string,
    context: any
  ): Promise<RecoveryResult> {
    // Try one last attempt with most conservative settings
    try {
      const conservativeConfig = this.getConservativeConfig();
      const result = await this.processWithConfig(input, conservativeConfig, processingType);
      
      return {
        success: true,
        message: 'Succeeded with conservative settings after max retries',
        adaptations: ['Used most conservative settings'],
        timeElapsed: 0
      };
    } catch (error) {
      return {
        success: false,
        message: `Maximum retry attempts (${this.config.maxRetries}) exceeded`,
        adaptations: [],
        timeElapsed: 0
      };
    }
  }

  /**
   * Helper methods
   */
  private hashInput(input: any): string {
    // Simple hash function for input
    return JSON.stringify(input).slice(0, 50);
  }

  private isComplexInput(processingType: string): boolean {
    return ['multimodal', 'image', 'complex_text'].includes(processingType);
  }

  private canBreakDown(processingType: string): boolean {
    return ['text', 'multimodal', 'learning_path'].includes(processingType);
  }

  private adjustModelParameters(error: Error): Partial<AIModelConfig> {
    const adjustments: Partial<AIModelConfig> = {};
    
    if (error.message.includes('timeout')) {
      adjustments.maxTokens = 1000; // Reduce token limit
    }
    
    if (error.message.includes('rate limit')) {
      // No parameter adjustment needed, just retry later
    }
    
    if (error.message.includes('content')) {
      adjustments.temperature = 0.3; // More conservative
    }

    return adjustments;
  }

  private async processWithConfig(input: any, config: Partial<AIModelConfig>, processingType: string): Promise<any> {
    // This would integrate with the actual AI processing system
    // For now, simulate processing
    return { processed: true, config };
  }

  private async processWithModel(input: any, model: AIModelConfig, processingType: string): Promise<any> {
    // This would integrate with the actual AI processing system
    return { processed: true, model: model.modelName };
  }

  private async processInput(input: any, processingType: string): Promise<any> {
    // This would integrate with the actual AI processing system
    return { processed: true };
  }

  private simplifyInput(input: any, processingType: string): any {
    // Implementation would simplify input based on type
    if (typeof input === 'string') {
      return input.slice(0, 500); // Truncate text
    }
    return input;
  }

  private generateCacheKey(input: any, processingType: string): string {
    return `${processingType}-${this.hashInput(input)}`;
  }

  private findSimilarCachedResponse(input: any, processingType: string): AIResponse | null {
    // Implementation would find similar cached responses
    return null;
  }

  private breakDownInput(input: any, processingType: string): any[] {
    // Implementation would break down complex inputs
    if (typeof input === 'string') {
      // Split text into sentences
      return input.split('.').filter(s => s.trim().length > 0);
    }
    return [input];
  }

  private combineResults(results: any[], processingType: string): any {
    // Implementation would combine sub-results
    if (processingType === 'text') {
      return results.join(' ');
    }
    return results;
  }

  private getResponseTemplate(processingType: string): string {
    const templates = {
      text: 'I understand you want to {action}. Here are the basic steps: {steps}',
      explanation: 'This action involves {description}. The expected outcome is {outcome}.',
      instruction: 'To complete this task: 1. {step1} 2. {step2} 3. {step3}',
      default: 'I apologize, but I\'m having trouble processing your request right now. Please try again or contact support.'
    };
    
    return templates[processingType as keyof typeof templates] || templates.default;
  }

  private fillTemplate(template: string, input: any, context: any): any {
    // Implementation would fill template with available data
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return context[key] || `[${key}]`;
    });
  }

  private generateDegradedResponse(input: any, processingType: string): any {
    // Implementation would generate basic response without AI
    return {
      type: 'degraded',
      message: 'AI processing is temporarily unavailable. Basic functionality is active.',
      processingType,
      timestamp: new Date()
    };
  }

  private getConservativeConfig(): Partial<AIModelConfig> {
    return {
      temperature: 0.1,
      maxTokens: 500,
      topP: 0.5
    };
  }

  /**
   * Cache management
   */
  cacheResponse(input: any, processingType: string, response: AIResponse): void {
    if (!this.config.cacheEnabled) return;
    
    const cacheKey = this.generateCacheKey(input, processingType);
    this.responseCache.set(cacheKey, response);
  }

  clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Configuration management
   */
  updateConfig(config: Partial<AIRecoveryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  addFallbackModel(model: AIModelConfig): void {
    this.config.fallbackModels.push(model);
  }

  /**
   * Statistics
   */
  getRetryStatistics(): Map<string, number> {
    return new Map(this.retryHistory);
  }

  clearRetryHistory(): void {
    this.retryHistory.clear();
  }
}