import { LearningPathExecutionEngine, StepExecutionContext } from '../LearningPathExecutionEngine';
import { BrowserController } from '../../browser/BrowserController';
import { IToolNavigator } from '../../browser/ToolNavigator';
import { LearningPathGenerator } from '../../ai/LearningPathGenerator';
import { 
  LearningStep,
  UserFeedback,
  ValidationCriteria
} from '../../types/learning';
import { 
  BrowserAction,
  BrowserActionResult,
  BrowserActionType,
  SelectorType,
  BrowserErrorType
} from '../../types/browser';
import { ComplexityLevel } from '../../types/common';

// Mock dependencies
jest.mock('../../browser/BrowserController');
jest.mock('../../browser/ToolNavigator');
jest.mock('../../ai/LearningPathGenerator');

describe('LearningPathExecutionEngine', () => {
  let executionEngine: LearningPathExecutionEngine;
  let mockBrowserController: jest.Mocked<BrowserController>;
  let mockToolNavigator: jest.Mocked<IToolNavigator>;
  let mockLearningPathGenerator: jest.Mocked<LearningPathGenerator>;

  const mockBrowserAction: BrowserAction = {
    id: 'test-action-id',
    type: BrowserActionType.CLICK,
    target: {
      type: SelectorType.CSS,
      value: '.test-button',
      description: 'Test button'
    },
    explanation: 'Click the test button',
    reasoning: 'Need to trigger test action',
    expectedResult: 'Button is clicked',
    timestamp: new Date(),
    retryCount: 0,
    maxRetries: 3
  };

  const mockLearningStep: LearningStep = {
    id: 'test-step-id',
    title: 'Test Step',
    description: 'A test learning step',
    toolRequired: 'builder.io',
    actions: [mockBrowserAction],
    explanation: 'This is a test step',
    expectedOutcome: 'Test action completed',
    validationCriteria: {
      type: 'functional',
      criteria: [{
        id: 'test-validation-id',
        description: 'Button should be clicked',
        validationType: 'exists',
        weight: 1.0
      }],
      successThreshold: 80
    },
    estimatedDuration: 5,
    complexity: ComplexityLevel.LOW,
    prerequisites: [],
    learningObjectives: ['Button clicking', 'UI interaction']
  };

  const mockExecutionContext: StepExecutionContext = {
    stepId: 'test-step-id',
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    previousResults: [],
    retryCount: 0,
    maxRetries: 3
  };

  beforeEach(() => {
    // Create mocked instances
    mockBrowserController = new BrowserController() as jest.Mocked<BrowserController>;
    mockToolNavigator = {
      navigateToBuilder: jest.fn(),
      authenticateUser: jest.fn(),
      createNewProject: jest.fn(),
      deployProject: jest.fn(),
      getCurrentProject: jest.fn(),
      handleToolSpecificError: jest.fn()
    } as jest.Mocked<IToolNavigator>;
    mockLearningPathGenerator = new LearningPathGenerator() as jest.Mocked<LearningPathGenerator>;

    // Setup default mock implementations
    mockToolNavigator.navigateToBuilder.mockResolvedValue();

    mockBrowserController.performAction.mockResolvedValue({
      actionId: 'test-action-id',
      success: true,
      elementFound: true,
      executionTime: 1000,
      actualResult: 'Action completed successfully',
      adaptations: []
    });

    mockLearningPathGenerator.generateAlternativeSteps.mockResolvedValue([{
      ...mockLearningStep,
      id: 'alternative-step-id',
      title: 'Alternative Step'
    }]);

    // Create execution engine instance
    executionEngine = new LearningPathExecutionEngine(
      mockBrowserController,
      mockToolNavigator,
      mockLearningPathGenerator
    );
  });

  describe('Step Execution', () => {
    test('should execute step successfully', async () => {
      const result = await executionEngine.executeStep(mockLearningStep, mockExecutionContext);

      expect(result).toBeDefined();
      expect(result.stepId).toBe(mockLearningStep.id);
      expect(result.status).toBe('completed');
      expect(result.outcome.success).toBe(true);
      expect(result.outcome.skillsAcquired).toEqual(mockLearningStep.learningObjectives);

      // Verify dependencies were called
      expect(mockToolNavigator.navigateToBuilder).toHaveBeenCalled();
      expect(mockBrowserController.performAction).toHaveBeenCalledWith(mockBrowserAction);
    });

    test('should handle tool navigation', async () => {
      const result = await executionEngine.executeStep(mockLearningStep, mockExecutionContext);

      expect(result.status).toBe('completed');
      expect(mockToolNavigator.navigateToBuilder).toHaveBeenCalled();
    });

    test('should handle browser action failure gracefully', async () => {
      mockBrowserController.performAction.mockResolvedValue({
        actionId: 'test-action-id',
        success: false,
        error: {
          type: BrowserErrorType.ELEMENT_NOT_FOUND,
          message: 'Element not found',
          timestamp: new Date(),
          recoverable: true
        },
        elementFound: false,
        executionTime: 1000,
        actualResult: 'Action failed',
        adaptations: []
      });

      const result = await executionEngine.executeStep(mockLearningStep, mockExecutionContext);

      expect(result.status).toBe('failed');
      expect(result.outcome.success).toBe(false);
      expect(result.outcome.challengesEncountered).toContain('Action success rate (0.0%) below threshold (80%)');
    });

    test('should retry failed step when retries are available', async () => {
      mockBrowserController.performAction.mockRejectedValueOnce(new Error('Network error'));
      mockBrowserController.performAction.mockResolvedValueOnce({
        actionId: 'test-action-id',
        success: true,
        elementFound: true,
        executionTime: 1000,
        actualResult: 'Action completed successfully',
        adaptations: []
      });

      const result = await executionEngine.executeStep(mockLearningStep, mockExecutionContext);

      expect(result.status).toBe('completed');
      expect(result.outcome.success).toBe(true);
      expect(mockBrowserController.performAction).toHaveBeenCalledTimes(2);
    });

    test('should fail step when max retries exceeded', async () => {
      mockBrowserController.performAction.mockRejectedValue(new Error('Persistent error'));

      const contextWithMaxRetries: StepExecutionContext = {
        ...mockExecutionContext,
        retryCount: 3,
        maxRetries: 3
      };

      const result = await executionEngine.executeStep(mockLearningStep, contextWithMaxRetries);

      expect(result.status).toBe('failed');
      expect(result.outcome.success).toBe(false);
      expect(result.outcome.challengesEncountered.some(challenge => challenge.includes('Persistent error'))).toBe(true);
    });
  });

  describe('Step Validation', () => {
    test('should validate step completion successfully', async () => {
      const actionResults: BrowserActionResult[] = [{
        actionId: 'test-action-id',
        success: true,
        elementFound: true,
        executionTime: 1000,
        actualResult: 'Action completed successfully',
        adaptations: []
      }];

      const validationResult = await executionEngine.validateStepCompletion(mockLearningStep, actionResults);

      expect(validationResult.success).toBe(true);
      expect(validationResult.score).toBe(100);
      expect(validationResult.completedCriteria).toContain('action_success_rate');
      expect(validationResult.completedCriteria).toContain('test-validation-id');
      expect(validationResult.errors).toHaveLength(0);
    });

    test('should fail validation when success threshold not met', async () => {
      const actionResults: BrowserActionResult[] = [{
        actionId: 'test-action-id',
        success: false,
        error: {
          type: BrowserErrorType.ELEMENT_NOT_FOUND,
          message: 'Element not found',
          timestamp: new Date(),
          recoverable: true
        },
        elementFound: false,
        executionTime: 1000,
        actualResult: 'Action failed',
        adaptations: []
      }];

      const validationResult = await executionEngine.validateStepCompletion(mockLearningStep, actionResults);

      expect(validationResult.success).toBe(false);
      expect(validationResult.score).toBe(0);
      expect(validationResult.failedCriteria).toContain('action_success_rate');
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });

    test('should handle validation criteria properly', async () => {
      const actionResults: BrowserActionResult[] = [{
        actionId: 'test-action-id',
        success: true,
        elementFound: true,
        executionTime: 1000,
        actualResult: 'Expected content',
        adaptations: []
      }];

      const stepWithContainsCriteria: LearningStep = {
        ...mockLearningStep,
        validationCriteria: {
          type: 'content',
          criteria: [{
            id: 'contains-test',
            description: 'Should contain expected content',
            validationType: 'contains',
            expectedValue: 'Expected',
            weight: 1.0
          }],
          successThreshold: 80
        }
      };

      const validationResult = await executionEngine.validateStepCompletion(stepWithContainsCriteria, actionResults);

      expect(validationResult.success).toBe(true);
      expect(validationResult.completedCriteria).toContain('contains-test');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle element not found error with adaptation', async () => {
      const error = new Error('element not found');
      const recoveryAction = await executionEngine.handleStepFailure(mockLearningStep, error, mockExecutionContext);

      expect(recoveryAction.type).toBe('adapt');
      expect(recoveryAction.reason).toContain('UI elements changed');
      expect(recoveryAction.adaptedStep).toBeDefined();
    });

    test('should handle timeout error with retry', async () => {
      const error = new Error('timeout occurred');
      const recoveryAction = await executionEngine.handleStepFailure(mockLearningStep, error, mockExecutionContext);

      expect(recoveryAction.type).toBe('retry');
      expect(recoveryAction.reason).toContain('Network or timing issue');
    });

    test('should handle authentication error with manual intervention', async () => {
      const error = new Error('authentication failed');
      const recoveryAction = await executionEngine.handleStepFailure(mockLearningStep, error, mockExecutionContext);

      expect(recoveryAction.type).toBe('manual_intervention');
      expect(recoveryAction.reason).toContain('Authentication required');
      expect(recoveryAction.userInstructions).toBeDefined();
    });

    test('should generate alternative approach for unknown errors', async () => {
      const error = new Error('unknown error');
      const recoveryAction = await executionEngine.handleStepFailure(mockLearningStep, error, mockExecutionContext);

      expect(recoveryAction.type).toBe('alternative_approach');
      expect(recoveryAction.adaptedStep).toBeDefined();
      expect(mockLearningPathGenerator.generateAlternativeSteps).toHaveBeenCalled();
    });

    test('should skip step when alternative generation fails', async () => {
      mockLearningPathGenerator.generateAlternativeSteps.mockRejectedValue(new Error('Cannot generate alternative'));
      
      const error = new Error('unknown error');
      const recoveryAction = await executionEngine.handleStepFailure(mockLearningStep, error, mockExecutionContext);

      expect(recoveryAction.type).toBe('skip');
      expect(recoveryAction.reason).toContain('Could not recover from error');
    });
  });

  describe('Step Adaptation', () => {
    test('should adapt step based on user feedback for more explanation', async () => {
      const feedback: UserFeedback = {
        stepId: 'test-step-id',
        helpful: true,
        confusing: false,
        tooFast: false,
        tooSlow: false,
        tooEasy: false,
        tooHard: false,
        needsMoreExplanation: true,
        tooMuchExplanation: false,
        timestamp: new Date()
      };

      const adaptedStep = await executionEngine.adaptStepBasedOnFeedback(mockLearningStep, feedback);

      expect(adaptedStep.explanation).toContain('Detailed explanation');
      expect(adaptedStep.explanation.length).toBeGreaterThan(mockLearningStep.explanation.length);
    });

    test('should adapt step based on user feedback for less explanation', async () => {
      const feedback: UserFeedback = {
        stepId: 'test-step-id',
        helpful: true,
        confusing: false,
        tooFast: false,
        tooSlow: false,
        tooEasy: false,
        tooHard: false,
        needsMoreExplanation: false,
        tooMuchExplanation: true,
        timestamp: new Date()
      };

      const adaptedStep = await executionEngine.adaptStepBasedOnFeedback(mockLearningStep, feedback);

      expect(adaptedStep.explanation.length).toBeLessThan(mockLearningStep.explanation.length);
    });

    test('should adapt step pace based on user feedback', async () => {
      const feedbackTooFast: UserFeedback = {
        stepId: 'test-step-id',
        helpful: true,
        confusing: false,
        tooFast: true,
        tooSlow: false,
        tooEasy: false,
        tooHard: false,
        needsMoreExplanation: false,
        tooMuchExplanation: false,
        timestamp: new Date()
      };

      const adaptedStep = await executionEngine.adaptStepBasedOnFeedback(mockLearningStep, feedbackTooFast);

      expect(adaptedStep.estimatedDuration).toBeGreaterThan(mockLearningStep.estimatedDuration);
    });

    test('should generate alternative approach successfully', async () => {
      const alternativeStep = await executionEngine.generateAlternativeApproach(mockLearningStep, 'UI changed');

      expect(alternativeStep.id).toBe('test-step-id_alt');
      expect(alternativeStep.title).toContain('Alternative Approach');
      expect(mockLearningPathGenerator.generateAlternativeSteps).toHaveBeenCalledWith(
        mockLearningStep.learningObjectives,
        mockLearningStep.toolRequired,
        'UI changed'
      );
    });

    test('should throw error when alternative generation fails', async () => {
      mockLearningPathGenerator.generateAlternativeSteps.mockResolvedValue([]);

      await expect(executionEngine.generateAlternativeApproach(mockLearningStep, 'UI changed'))
        .rejects.toThrow('Could not generate alternative approach');
    });
  });

  describe('Execution History', () => {
    test('should track execution history', async () => {
      const result = await executionEngine.executeStep(mockLearningStep, mockExecutionContext);
      
      const history = executionEngine.getExecutionHistory(mockExecutionContext.sessionId);
      
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(result);
    });

    test('should clear execution history', async () => {
      await executionEngine.executeStep(mockLearningStep, mockExecutionContext);
      
      executionEngine.clearExecutionHistory(mockExecutionContext.sessionId);
      
      const history = executionEngine.getExecutionHistory(mockExecutionContext.sessionId);
      expect(history).toHaveLength(0);
    });

    test('should return empty array for non-existent session history', () => {
      const history = executionEngine.getExecutionHistory('non-existent-session');
      expect(history).toHaveLength(0);
    });
  });

  describe('Event Emission', () => {
    test('should emit stepExecutionStarted event', async () => {
      const eventSpy = jest.fn();
      executionEngine.on('stepExecutionStarted', eventSpy);

      await executionEngine.executeStep(mockLearningStep, mockExecutionContext);

      expect(eventSpy).toHaveBeenCalledWith({
        step: mockLearningStep,
        context: mockExecutionContext
      });
    });

    test('should emit stepExecutionCompleted event', async () => {
      const eventSpy = jest.fn();
      executionEngine.on('stepExecutionCompleted', eventSpy);

      const result = await executionEngine.executeStep(mockLearningStep, mockExecutionContext);

      expect(eventSpy).toHaveBeenCalledWith({
        step: mockLearningStep,
        stepResult: result,
        context: mockExecutionContext
      });
    });

    test('should emit actionCompleted event', async () => {
      const eventSpy = jest.fn();
      executionEngine.on('actionCompleted', eventSpy);

      await executionEngine.executeStep(mockLearningStep, mockExecutionContext);

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        action: mockBrowserAction,
        result: expect.any(Object),
        step: mockLearningStep,
        context: mockExecutionContext
      }));
    });

    test('should emit toolActivated event', async () => {
      const eventSpy = jest.fn();
      executionEngine.on('toolActivated', eventSpy);

      await executionEngine.executeStep(mockLearningStep, mockExecutionContext);

      expect(eventSpy).toHaveBeenCalledWith({
        toolName: 'builder.io',
        context: mockExecutionContext
      });
    });

    test('should emit stepExecutionFailed event on failure', async () => {
      mockBrowserController.performAction.mockRejectedValue(new Error('Critical failure'));
      
      const contextWithMaxRetries: StepExecutionContext = {
        ...mockExecutionContext,
        retryCount: 3,
        maxRetries: 3
      };

      const eventSpy = jest.fn();
      executionEngine.on('stepExecutionFailed', eventSpy);

      await executionEngine.executeStep(mockLearningStep, contextWithMaxRetries);

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        step: mockLearningStep,
        stepResult: expect.objectContaining({ status: 'failed' }),
        context: contextWithMaxRetries,
        error: expect.any(Error)
      }));
    });
  });

  describe('Tool Integration', () => {
    test('should handle tool navigation failure', async () => {
      mockToolNavigator.navigateToBuilder.mockRejectedValue(new Error('Navigation failed'));

      await expect(executionEngine.executeStep(mockLearningStep, mockExecutionContext))
        .rejects.toThrow('Failed to ensure tool builder.io is ready: Navigation failed');
    });
  });
});