import { EventEmitter } from 'events';
import { 
  LearningStep, 
  StepResult, 
  LearningOutcome,
  StepAdaptation,
  ValidationCriteria,
  UserFeedback
} from '../types/learning';
import { BrowserController } from '../browser/BrowserController';
import { IToolNavigator } from '../browser/ToolNavigator';
import { LearningPathGenerator } from '../ai/LearningPathGenerator';
import { BrowserAction, BrowserActionResult, BrowserErrorType } from '../types/browser';

export interface StepExecutionContext {
  stepId: string;
  sessionId: string;
  userId: string;
  previousResults: StepResult[];
  userFeedback?: UserFeedback;
  retryCount: number;
  maxRetries: number;
}

export interface StepValidationResult {
  success: boolean;
  score: number; // 0-100
  feedback: string;
  errors: string[];
  warnings: string[];
  completedCriteria: string[];
  failedCriteria: string[];
}

export interface StepRecoveryAction {
  type: 'retry' | 'skip' | 'adapt' | 'manual_intervention' | 'alternative_approach';
  reason: string;
  adaptedStep?: LearningStep;
  userInstructions?: string;
  estimatedRecoveryTime: number; // in minutes
}

export interface ILearningPathExecutionEngine {
  executeStep(step: LearningStep, context: StepExecutionContext): Promise<StepResult>;
  validateStepCompletion(step: LearningStep, actionResults: BrowserActionResult[]): Promise<StepValidationResult>;
  handleStepFailure(step: LearningStep, error: Error, context: StepExecutionContext): Promise<StepRecoveryAction>;
  adaptStepBasedOnFeedback(step: LearningStep, feedback: UserFeedback): Promise<LearningStep>;
  generateAlternativeApproach(step: LearningStep, failureReason: string): Promise<LearningStep>;
}

/**
 * LearningPathExecutionEngine handles the execution of individual learning steps
 * with browser automation integration, validation, and error recovery
 */
export class LearningPathExecutionEngine extends EventEmitter implements ILearningPathExecutionEngine {
  private browserController: BrowserController;
  private toolNavigator: IToolNavigator;
  private learningPathGenerator: LearningPathGenerator;
  private executionHistory: Map<string, StepResult[]> = new Map();

  constructor(
    browserController: BrowserController,
    toolNavigator: IToolNavigator,
    learningPathGenerator: LearningPathGenerator
  ) {
    super();
    this.browserController = browserController;
    this.toolNavigator = toolNavigator;
    this.learningPathGenerator = learningPathGenerator;
  }

  /**
   * Execute a learning step with full browser automation integration
   */
  async executeStep(step: LearningStep, context: StepExecutionContext): Promise<StepResult> {
    const executionStartTime = Date.now();
    
    try {
      this.emit('stepExecutionStarted', { step, context });

      // Ensure the required tool is available and ready
      await this.ensureToolReady(step.toolRequired, context);

      // Execute all browser actions for this step
      const actionResults: BrowserActionResult[] = [];
      
      for (const action of step.actions) {
        try {
          const result = await this.executeBrowserAction(action, context);
          actionResults.push(result);
          
          // Emit action completed event
          this.emit('actionCompleted', { action, result, step, context });
          
          // If action failed and is critical, handle failure immediately
          if (!result.success && this.isActionCritical(action, step)) {
            const recoveryAction = await this.handleActionFailure(action, result, step, context);
            if (recoveryAction.type === 'manual_intervention') {
              throw new Error(`Critical action failed: ${result.error?.message}`);
            }
          }
        } catch (error) {
          const failedResult: BrowserActionResult = {
            actionId: action.id,
            success: false,
            error: {
              type: BrowserErrorType.JAVASCRIPT_ERROR,
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date(),
              recoverable: true
            },
            elementFound: false,
            executionTime: Date.now() - executionStartTime,
            actualResult: 'Action execution failed',
            adaptations: []
          };
          
          actionResults.push(failedResult);
          this.emit('actionFailed', { action, result: failedResult, step, context });
          
          // If this is a critical action failure, throw to trigger step retry or failure
          if (this.isActionCritical(action, step)) {
            throw error;
          }
        }
      }

      // Validate step completion
      const validationResult = await this.validateStepCompletion(step, actionResults);
      
      // Create learning outcome
      const outcome: LearningOutcome = {
        skill: step.learningObjectives[0] || 'General Learning',
        description: validationResult.feedback,
        proficiencyGained: validationResult.success ? 25 : 5,
        evidenceUrl: undefined
      };

      // Create step result
      const stepResult: StepResult = {
        stepId: step.id,
        status: validationResult.success ? 'completed' : 'failed',
        outcome,
        nextStepId: undefined, // Will be set by session manager
        adaptations: this.extractStepAdaptations(step, actionResults),
        timestamp: new Date()
      };

      // Store execution history
      this.addToExecutionHistory(context.sessionId, stepResult);

      this.emit('stepExecutionCompleted', { step, stepResult, context });
      return stepResult;

    } catch (error) {
      // Handle step execution failure
      const failureOutcome: LearningOutcome = {
        skill: step.learningObjectives[0] || 'General Learning',
        description: 'Step execution failed due to technical error',
        proficiencyGained: 0,
        evidenceUrl: undefined
      };

      const failureResult: StepResult = {
        stepId: step.id,
        status: 'failed',
        outcome: failureOutcome,
        adaptations: [],
        timestamp: new Date()
      };

      // Attempt recovery if retries are available
      if (context.retryCount < context.maxRetries) {
        const recoveryAction = await this.handleStepFailure(step, error as Error, context);
        
        if (recoveryAction.type === 'retry' || recoveryAction.type === 'adapt') {
          const retryContext: StepExecutionContext = {
            ...context,
            retryCount: context.retryCount + 1
          };
          
          const stepToRetry = recoveryAction.adaptedStep || step;
          this.emit('stepRetryAttempted', { step: stepToRetry, context: retryContext, recoveryAction });
          
          return await this.executeStep(stepToRetry, retryContext);
        }
      }

      // If we can't recover or retries are exhausted, throw the error for tool navigation failures
      if (error instanceof Error && error.message.includes('Failed to ensure tool')) {
        throw error;
      }

      // Update failure result to include the original error message
      // Note: challengesEncountered is not part of LearningOutcome interface anymore

      this.addToExecutionHistory(context.sessionId, failureResult);
      this.emit('stepExecutionFailed', { step, stepResult: failureResult, context, error });
      return failureResult;
    }
  }

  /**
   * Validate that a step has been completed successfully
   */
  async validateStepCompletion(step: LearningStep, actionResults: BrowserActionResult[]): Promise<StepValidationResult> {
    const { validationCriteria } = step;
    const errors: string[] = [];
    const warnings: string[] = [];
    const completedCriteria: string[] = [];
    const failedCriteria: string[] = [];

    // Basic validation: check action success rate
    const successfulActions = actionResults.filter(r => r.success).length;
    const totalActions = actionResults.length;
    const actionSuccessRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 0;

    // Validate against success threshold
    if (actionSuccessRate < validationCriteria.successThreshold) {
      errors.push(`Action success rate (${actionSuccessRate.toFixed(1)}%) below threshold (${validationCriteria.successThreshold}%)`);
      failedCriteria.push('action_success_rate');
    } else {
      completedCriteria.push('action_success_rate');
    }

    // Validate specific criteria
    for (const criterion of validationCriteria.criteria) {
      try {
        const isValid = await this.validateCriterion(criterion, actionResults);
        if (isValid) {
          completedCriteria.push(criterion.id);
        } else {
          failedCriteria.push(criterion.id);
          errors.push(`Validation failed for criterion: ${criterion.description}`);
        }
      } catch (error) {
        warnings.push(`Could not validate criterion ${criterion.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Calculate overall score
    const totalCriteria = validationCriteria.criteria.length + 1; // +1 for action success rate
    const passedCriteria = completedCriteria.length;
    const score = (passedCriteria / totalCriteria) * 100;

    const success = score >= validationCriteria.successThreshold;
    const feedback = this.generateValidationFeedback(success, score, completedCriteria, failedCriteria);

    return {
      success,
      score,
      feedback,
      errors,
      warnings,
      completedCriteria,
      failedCriteria
    };
  }

  /**
   * Handle step failure and determine recovery action
   */
  async handleStepFailure(step: LearningStep, error: Error, context: StepExecutionContext): Promise<StepRecoveryAction> {
    const errorMessage = error.message.toLowerCase();
    
    // Determine recovery strategy based on error type
    if (errorMessage.includes('element not found') || errorMessage.includes('selector')) {
      // UI element issues - try to adapt selectors
      try {
        const adaptedStep = await this.adaptStepForUIChanges(step);
        return {
          type: 'adapt',
          reason: 'UI elements changed, adapted selectors',
          adaptedStep,
          estimatedRecoveryTime: 2
        };
      } catch (adaptError) {
        return {
          type: 'manual_intervention',
          reason: 'Could not adapt to UI changes automatically',
          userInstructions: 'Please verify the tool interface and update selectors manually',
          estimatedRecoveryTime: 10
        };
      }
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      // Network or timing issues - retry with delay
      return {
        type: 'retry',
        reason: 'Network or timing issue, retrying with delay',
        estimatedRecoveryTime: 1
      };
    }

    if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
      // Authentication issues
      return {
        type: 'manual_intervention',
        reason: 'Authentication required',
        userInstructions: 'Please log in to the required tool and try again',
        estimatedRecoveryTime: 5
      };
    }

    // For other errors, try to generate an alternative approach
    try {
      const alternativeStep = await this.generateAlternativeApproach(step, error.message);
      return {
        type: 'alternative_approach',
        reason: 'Generated alternative approach to achieve the same objective',
        adaptedStep: alternativeStep,
        estimatedRecoveryTime: 5
      };
    } catch (altError) {
      // Last resort - skip the step
      return {
        type: 'skip',
        reason: 'Could not recover from error, skipping step',
        userInstructions: 'This step was skipped due to technical issues. You may need to complete it manually.',
        estimatedRecoveryTime: 0
      };
    }
  }

  /**
   * Adapt a step based on user feedback
   */
  async adaptStepBasedOnFeedback(step: LearningStep, feedback: UserFeedback): Promise<LearningStep> {
    const adaptedStep = { ...step };

    // Adjust explanation detail based on feedback
    if (feedback.needsMoreExplanation) {
      adaptedStep.explanation = await this.expandExplanation(step.explanation, step.learningObjectives);
    } else if (feedback.tooMuchExplanation) {
      adaptedStep.explanation = this.simplifyExplanation(step.explanation);
    }

    // Adjust pace based on feedback
    if (feedback.tooFast) {
      adaptedStep.estimatedDuration = Math.round(step.estimatedDuration * 1.5);
      // Add more intermediate steps if needed
      adaptedStep.actions = await this.addIntermediateActions(step.actions);
    } else if (feedback.tooSlow) {
      adaptedStep.estimatedDuration = Math.round(step.estimatedDuration * 0.7);
      // Combine actions where possible
      adaptedStep.actions = this.optimizeActions(step.actions);
    }

    // Adjust difficulty based on feedback
    if (feedback.tooEasy) {
      adaptedStep.complexity = this.increaseDifficulty(step.complexity);
    } else if (feedback.tooHard) {
      adaptedStep.complexity = this.decreaseDifficulty(step.complexity);
    }

    return adaptedStep;
  }

  /**
   * Generate an alternative approach for a failed step
   */
  async generateAlternativeApproach(step: LearningStep, failureReason: string): Promise<LearningStep> {
    // Use the learning path generator to create an alternative approach
    const alternativeSteps = await this.learningPathGenerator.generateAlternativeSteps(
      step.learningObjectives,
      step.toolRequired,
      failureReason
    );

    if (alternativeSteps.length > 0) {
      const alternativeStep = alternativeSteps[0];
      return {
        ...alternativeStep,
        id: `${step.id}_alt`,
        title: `${step.title} (Alternative Approach)`,
        description: `Alternative approach: ${alternativeStep.description}`
      };
    }

    throw new Error('Could not generate alternative approach');
  }

  /**
   * Get execution history for a session
   */
  getExecutionHistory(sessionId: string): StepResult[] {
    return this.executionHistory.get(sessionId) || [];
  }

  /**
   * Clear execution history for a session
   */
  clearExecutionHistory(sessionId: string): void {
    this.executionHistory.delete(sessionId);
  }

  /**
   * Private helper methods
   */
  private async ensureToolReady(toolName: string, context: StepExecutionContext): Promise<void> {
    try {
      // Navigate to the tool using the tool navigator
      await this.toolNavigator.navigateToBuilder();
      this.emit('toolActivated', { toolName, context });
    } catch (error) {
      throw new Error(`Failed to ensure tool ${toolName} is ready: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeBrowserAction(action: BrowserAction, context: StepExecutionContext): Promise<BrowserActionResult> {
    const actionStartTime = Date.now();
    
    try {
      const result = await this.browserController.performAction(action);
      
      // Add execution time
      result.executionTime = Date.now() - actionStartTime;
      
      return result;
    } catch (error) {
      return {
        actionId: action.id,
        success: false,
        error: {
          type: BrowserErrorType.JAVASCRIPT_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          recoverable: true
        },
        elementFound: false,
        executionTime: Date.now() - actionStartTime,
        actualResult: 'Action execution failed',
        adaptations: []
      };
    }
  }

  private isActionCritical(action: BrowserAction, step: LearningStep): boolean {
    // Actions that are critical for step completion
    const criticalActionTypes = ['click', 'type', 'submit'];
    return criticalActionTypes.includes(action.type);
  }

  private async handleActionFailure(
    action: BrowserAction, 
    result: BrowserActionResult, 
    step: LearningStep, 
    context: StepExecutionContext
  ): Promise<StepRecoveryAction> {
    // Simple recovery strategy for individual actions
    if (result.error?.type === 'element_not_found') {
      return {
        type: 'retry',
        reason: 'Element not found, retrying with delay',
        estimatedRecoveryTime: 0.5
      };
    }

    return {
      type: 'manual_intervention',
      reason: 'Action failed and requires manual intervention',
      estimatedRecoveryTime: 5
    };
  }

  private async validateCriterion(criterion: any, actionResults: BrowserActionResult[]): Promise<boolean> {
    // Basic validation logic - in a real implementation, this would be more sophisticated
    switch (criterion.validationType) {
      case 'exists':
        // Check if any action successfully found and interacted with elements
        return actionResults.some(r => r.success && r.elementFound);
      
      case 'contains':
        // Check if any action result contains expected content
        return actionResults.some(r => r.actualResult?.includes(criterion.expectedValue));
      
      case 'equals':
        // Check if any action result equals expected value
        return actionResults.some(r => r.actualResult === criterion.expectedValue);
      
      default:
        return true; // Default to pass for unknown validation types
    }
  }

  private generateValidationFeedback(
    success: boolean, 
    score: number, 
    completed: string[], 
    failed: string[]
  ): string {
    if (success) {
      return `Step completed successfully! Score: ${score.toFixed(1)}%. All validation criteria met.`;
    } else {
      return `Step validation failed. Score: ${score.toFixed(1)}%. Failed criteria: ${failed.join(', ')}. Completed: ${completed.join(', ')}.`;
    }
  }

  private calculateUserSatisfaction(validation: StepValidationResult, feedback?: UserFeedback): number {
    let satisfaction = validation.success ? 4 : 2; // Base satisfaction
    
    if (feedback) {
      if (feedback.helpful) satisfaction += 1;
      if (feedback.confusing) satisfaction -= 1;
      if (feedback.tooFast || feedback.tooSlow) satisfaction -= 0.5;
    }
    
    return Math.max(1, Math.min(5, satisfaction)); // Clamp between 1-5
  }

  private extractStepAdaptations(step: LearningStep, actionResults: BrowserActionResult[]): StepAdaptation[] {
    const adaptations: StepAdaptation[] = [];
    
    // Extract adaptations from action results and convert to StepAdaptation format
    for (const result of actionResults) {
      if (result.adaptations && result.adaptations.length > 0) {
        for (const actionAdaptation of result.adaptations) {
          const stepAdaptation: StepAdaptation = {
            type: actionAdaptation.type === 'selector' ? 'approach' : 
                  actionAdaptation.type === 'timing' ? 'pace' : 
                  actionAdaptation.type === 'approach' ? 'approach' : 'tool',
            reason: actionAdaptation.reason,
            originalValue: JSON.stringify(actionAdaptation.originalAction),
            adaptedValue: JSON.stringify(actionAdaptation.adaptedAction),
            confidence: actionAdaptation.success ? 0.8 : 0.3
          };
          adaptations.push(stepAdaptation);
        }
      }
    }
    
    return adaptations;
  }

  private addToExecutionHistory(sessionId: string, result: StepResult): void {
    if (!this.executionHistory.has(sessionId)) {
      this.executionHistory.set(sessionId, []);
    }
    this.executionHistory.get(sessionId)!.push(result);
  }

  private async adaptStepForUIChanges(step: LearningStep): Promise<LearningStep> {
    // In a real implementation, this would use AI to adapt selectors
    // For now, return the original step
    return { ...step };
  }

  private async expandExplanation(explanation: string, objectives: string[]): Promise<string> {
    return `${explanation}\n\nDetailed explanation: This step helps you learn ${objectives.join(', ')}. Each action is designed to build your understanding progressively.`;
  }

  private simplifyExplanation(explanation: string): string {
    // Return first sentence only, but ensure it's shorter
    const firstSentence = explanation.split('.')[0];
    return firstSentence.length > 10 ? firstSentence.substring(0, 10) + '.' : firstSentence + '.';
  }

  private async addIntermediateActions(actions: BrowserAction[]): Promise<BrowserAction[]> {
    // For now, just return original actions
    // In a real implementation, this would add intermediate steps
    return [...actions];
  }

  private optimizeActions(actions: BrowserAction[]): BrowserAction[] {
    // For now, just return original actions
    // In a real implementation, this would combine similar actions
    return [...actions];
  }

  private increaseDifficulty(complexity: any): any {
    // Simple difficulty adjustment
    return complexity;
  }

  private decreaseDifficulty(complexity: any): any {
    // Simple difficulty adjustment
    return complexity;
  }
}