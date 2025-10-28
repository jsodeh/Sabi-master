import { LearningSessionManager, SessionStatus } from '../LearningSessionManager';
import { LearningPathGenerator } from '../../ai/LearningPathGenerator';
import { AdaptiveInstructor } from '../../ai/AdaptiveInstructor';
import { BrowserController } from '../../browser/BrowserController';
import { IntentAnalyzer } from '../../ai/IntentAnalyzer';
import { 
  LearningRequest, 
  LearningStep,
  LearningContext,
  LearningOutcome
} from '../../types/learning';
import { 
  ComplexityLevel, 
  SkillLevel,
  InputType 
} from '../../types/common';
import { BrowserActionType, SelectorType, BrowserErrorType } from '../../types/browser';

// Mock dependencies
jest.mock('../../ai/LearningPathGenerator');
jest.mock('../../ai/AdaptiveInstructor');
jest.mock('../../browser/BrowserController');
jest.mock('../../ai/IntentAnalyzer');

describe('LearningSessionManager', () => {
  let sessionManager: LearningSessionManager;
  let mockLearningPathGenerator: jest.Mocked<LearningPathGenerator>;
  let mockAdaptiveInstructor: jest.Mocked<AdaptiveInstructor>;
  let mockBrowserController: jest.Mocked<BrowserController>;
  let mockIntentAnalyzer: jest.Mocked<IntentAnalyzer>;

  const mockLearningRequest: LearningRequest = {
    id: 'test-request-id',
    userId: 'test-user-id',
    objective: 'Learn to build a website',
    inputType: InputType.TEXT,
    rawInput: 'I want to learn how to build a website',
    timestamp: new Date(),
    context: {
      sessionId: 'test-session-id',
      previousSteps: [],
      userPreferences: {
        explanationDetail: 'moderate',
        learningPace: 'normal',
        preferredInputMethod: InputType.TEXT,
        enableVoiceGuidance: false,
        showCueCards: true,
        autoAdvance: false
      },
      environmentState: {
        activeBrowsers: [],
        openTools: [],
        currentScreen: {
          width: 1920,
          height: 1080,
          scaleFactor: 1,
          colorDepth: 24
        },
        systemResources: {
          memoryUsage: 50,
          cpuUsage: 30,
          availableMemory: 8192
        }
      }
    }
  };

  const mockLearningStep: LearningStep = {
    id: 'test-step-id',
    title: 'Create New Project',
    description: 'Set up a new website project',
    toolRequired: 'builder.io',
    actions: [{
      id: 'test-action-id',
      type: BrowserActionType.CLICK,
      target: {
        type: SelectorType.CSS,
        value: '.create-button',
        description: 'Create button'
      },
      explanation: 'Click to create new project',
      reasoning: 'Need to start a new project',
      expectedResult: 'New project dialog opens',
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3
    }],
    explanation: 'This step will create a new project',
    expectedOutcome: 'Project is created successfully',
    validationCriteria: {
      type: 'functional',
      criteria: [{
        id: 'test-validation-id',
        description: 'Project appears in list',
        validationType: 'exists',
        weight: 1.0
      }],
      successThreshold: 80
    },
    estimatedDuration: 10,
    complexity: ComplexityLevel.LOW,
    prerequisites: [],
    learningObjectives: ['Project creation', 'Tool navigation']
  };

  beforeEach(() => {
    // Create mocked instances
    mockLearningPathGenerator = new LearningPathGenerator() as jest.Mocked<LearningPathGenerator>;
    mockAdaptiveInstructor = new AdaptiveInstructor() as jest.Mocked<AdaptiveInstructor>;
    mockBrowserController = new BrowserController() as jest.Mocked<BrowserController>;
    mockIntentAnalyzer = new IntentAnalyzer() as jest.Mocked<IntentAnalyzer>;

    // Setup default mock implementations
    mockIntentAnalyzer.analyzeRequest.mockResolvedValue({
      objective: 'Learn to build a website',
      extractedKeywords: ['website', 'build', 'learn'],
      requiredTools: ['builder.io'],
      estimatedComplexity: ComplexityLevel.MEDIUM,
      suggestedSkillLevel: SkillLevel.BEGINNER,
      relatedConcepts: ['HTML', 'CSS', 'Design']
    });

    const mockLearningStep2: LearningStep = {
      ...mockLearningStep,
      id: 'test-step-2-id',
      title: 'Configure Project',
      description: 'Configure the project settings'
    };
    
    mockLearningPathGenerator.generatePath.mockResolvedValue([mockLearningStep, mockLearningStep2]);

    mockAdaptiveInstructor.adjustTeachingStyle.mockResolvedValue(mockLearningStep);

    mockBrowserController.performAction.mockResolvedValue({
      actionId: 'test-action-id',
      success: true,
      elementFound: true,
      executionTime: 1000,
      actualResult: 'Action completed successfully',
      adaptations: []
    });

    // Create session manager instance
    sessionManager = new LearningSessionManager(
      mockLearningPathGenerator,
      mockAdaptiveInstructor,
      mockBrowserController,
      mockIntentAnalyzer
    );
  });

  describe('Session Lifecycle Management', () => {
    test('should start a new learning session successfully', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(mockLearningRequest.userId);
      expect(session.objective).toBe(mockLearningRequest.objective);
      expect(session.status).toBe(SessionStatus.ACTIVE);
      expect(session.steps).toHaveLength(2);
      expect(session.currentStepIndex).toBe(0);
      expect(session.progress.totalSteps).toBe(2);
      expect(session.progress.completedSteps).toBe(0);
      expect(session.progress.completionPercentage).toBe(0);

      // Verify dependencies were called
      expect(mockIntentAnalyzer.analyzeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          processedText: mockLearningRequest.objective,
          inputType: mockLearningRequest.inputType
        })
      );
      expect(mockLearningPathGenerator.generatePath).toHaveBeenCalled();
    });

    test('should pause an active session', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      
      await sessionManager.pauseSession(session.id);
      
      const updatedSession = sessionManager.getCurrentSession(session.id);
      expect(updatedSession?.status).toBe(SessionStatus.PAUSED);
      expect(updatedSession?.pausedAt).toBeDefined();
    });

    test('should resume a paused session', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      await sessionManager.pauseSession(session.id);
      
      await sessionManager.resumeSession(session.id);
      
      const updatedSession = sessionManager.getCurrentSession(session.id);
      expect(updatedSession?.status).toBe(SessionStatus.ACTIVE);
      expect(updatedSession?.pausedAt).toBeUndefined();
    });

    test('should complete a session', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      
      await sessionManager.completeSession(session.id);
      
      // Session should be removed from active sessions
      const activeSession = sessionManager.getCurrentSession(session.id);
      expect(activeSession).toBeNull();
    });

    test('should cancel a session', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      
      await sessionManager.cancelSession(session.id, 'User requested cancellation');
      
      const activeSession = sessionManager.getCurrentSession(session.id);
      expect(activeSession).toBeNull();
    });

    test('should throw error when trying to pause non-existent session', async () => {
      await expect(sessionManager.pauseSession('non-existent-id'))
        .rejects.toThrow('Session non-existent-id not found');
    });

    test('should throw error when trying to pause non-active session', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      await sessionManager.completeSession(session.id);
      
      await expect(sessionManager.pauseSession(session.id))
        .rejects.toThrow(`Session ${session.id} not found`);
    });
  });

  describe('Step Execution', () => {
    test('should execute next step successfully', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      
      const stepResult = await sessionManager.executeNextStep(session.id);
      
      expect(stepResult).toBeDefined();
      expect(stepResult.stepId).toBe(mockLearningStep.id);
      expect(stepResult.status).toBe('completed');
      expect(stepResult.outcome.success).toBe(true);
      
      // Verify dependencies were called
      expect(mockAdaptiveInstructor.adjustTeachingStyle).toHaveBeenCalled();
      expect(mockBrowserController.performAction).toHaveBeenCalled();
      
      // Check session progress was updated
      const updatedSession = sessionManager.getCurrentSession(session.id);
      expect(updatedSession?.progress.completedSteps).toBe(1);
      expect(updatedSession?.progress.completionPercentage).toBe(50); // 1 of 2 steps completed
      expect(updatedSession?.currentStepIndex).toBe(1);
    });

    test('should handle step execution failure gracefully', async () => {
      // Mock browser action to fail
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

      const session = await sessionManager.startLearning(mockLearningRequest);
      const stepResult = await sessionManager.executeNextStep(session.id);
      
      expect(stepResult.status).toBe('failed');
      expect(stepResult.outcome.success).toBe(false);
      expect(stepResult.outcome.challengesEncountered).toContain('Element not found');
    });

    test('should complete session when all steps are executed', async () => {
      // Mock single step for this test
      mockLearningPathGenerator.generatePath.mockResolvedValueOnce([mockLearningStep]);
      
      const session = await sessionManager.startLearning(mockLearningRequest);
      
      // Execute the single step
      await sessionManager.executeNextStep(session.id);
      
      // Session should be completed automatically
      const activeSession = sessionManager.getCurrentSession(session.id);
      expect(activeSession).toBeNull(); // Removed from active sessions
    });

    test('should throw error when trying to execute step on non-existent session', async () => {
      await expect(sessionManager.executeNextStep('non-existent-id'))
        .rejects.toThrow('Session non-existent-id not found');
    });

    test('should throw error when trying to execute step on non-active session', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      await sessionManager.pauseSession(session.id);
      
      await expect(sessionManager.executeNextStep(session.id))
        .rejects.toThrow('Cannot execute step for session in status: paused');
    });

    test('should throw error when no more steps to execute', async () => {
      // Mock single step for this test
      mockLearningPathGenerator.generatePath.mockResolvedValueOnce([mockLearningStep]);
      
      const session = await sessionManager.startLearning(mockLearningRequest);
      
      // Execute the single step
      await sessionManager.executeNextStep(session.id);
      
      // Try to execute another step - should fail since session is completed
      await expect(sessionManager.executeNextStep(session.id))
        .rejects.toThrow(`Session ${session.id} not found`);
    });
  });

  describe('Session Persistence and Recovery', () => {
    test('should persist session data', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      
      // Persistence is called automatically during session creation
      // We can verify this by checking if the session can be recovered
      const recoveredSession = await sessionManager.recoverSession(session.id);
      expect(recoveredSession).toBeDefined();
      expect(recoveredSession?.id).toBe(session.id);
    });

    test('should recover session from storage', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      const originalSessionId = session.id;
      
      const recoveredSession = await sessionManager.recoverSession(originalSessionId);
      
      expect(recoveredSession).toBeDefined();
      expect(recoveredSession?.id).toBe(originalSessionId);
      expect(recoveredSession?.userId).toBe(session.userId);
      expect(recoveredSession?.objective).toBe(session.objective);
    });

    test('should return null when trying to recover non-existent session', async () => {
      const recoveredSession = await sessionManager.recoverSession('non-existent-id');
      expect(recoveredSession).toBeNull();
    });
  });

  describe('Analytics and Metrics', () => {
    test('should track session analytics', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      await sessionManager.executeNextStep(session.id);
      
      const analytics = sessionManager.getSessionAnalytics(session.id);
      
      expect(analytics).toBeDefined();
      expect(analytics?.totalActions).toBe(1);
      expect(analytics?.successfulActions).toBe(1);
      expect(analytics?.failedActions).toBe(0);
      expect(analytics?.toolsUsed).toContain('builder.io');
      expect(analytics?.skillsAcquired).toContain('Project creation');
    });

    test('should calculate session metrics', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      await sessionManager.executeNextStep(session.id);
      
      const metrics = sessionManager.getSessionMetrics(session.id);
      
      expect(metrics).toBeDefined();
      expect(metrics?.sessionId).toBe(session.id);
      expect(metrics?.stepsCompleted).toBe(1);
      expect(metrics?.successRate).toBe(1);
      expect(metrics?.toolsUsed).toBe(1);
      expect(metrics?.skillsAcquired).toBe(2); // 'Project creation', 'Tool navigation'
    });

    test('should return null analytics for non-existent session', () => {
      const analytics = sessionManager.getSessionAnalytics('non-existent-id');
      expect(analytics).toBeNull();
    });

    test('should return null metrics for non-existent session', () => {
      const metrics = sessionManager.getSessionMetrics('non-existent-id');
      expect(metrics).toBeNull();
    });

    test('should calculate learning efficiency', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      await sessionManager.executeNextStep(session.id);
      
      const efficiency = sessionManager.calculateLearningEfficiency(session.id);
      
      expect(efficiency).toBeGreaterThan(0);
      expect(efficiency).toBeLessThanOrEqual(1);
    });
  });

  describe('Deployment Progress Tracking', () => {
    test('should update deployment phase', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      
      await sessionManager.updateDeploymentPhase(session.id, sessionManager.DeploymentPhase.DESIGN);
      
      const updatedSession = sessionManager.getCurrentSession(session.id);
      expect(updatedSession?.analytics.deploymentPhase).toBe(sessionManager.DeploymentPhase.DESIGN);
    });

    test('should track project milestones', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      const milestone = {
        id: 'test-milestone-id',
        name: 'Design completed',
        phase: sessionManager.DeploymentPhase.DESIGN,
        progress: 100,
        completedAt: new Date()
      };
      
      await sessionManager.trackProjectMilestone(session.id, milestone);
      
      const updatedSession = sessionManager.getCurrentSession(session.id);
      expect(updatedSession?.analytics.projectMilestones).toContainEqual(milestone);
    });

    test('should get deployment progress', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      await sessionManager.updateDeploymentPhase(session.id, sessionManager.DeploymentPhase.DEVELOPMENT);
      
      const progress = sessionManager.getDeploymentProgress(session.id);
      
      expect(progress).toBeDefined();
      expect(progress?.currentPhase).toBe(sessionManager.DeploymentPhase.DEVELOPMENT);
      expect(progress?.overallProgress).toBeGreaterThan(0);
    });

    test('should return null deployment progress for non-existent session', () => {
      const progress = sessionManager.getDeploymentProgress('non-existent-id');
      expect(progress).toBeNull();
    });
  });

  describe('Session State Management', () => {
    test('should get comprehensive session state', async () => {
      const session = await sessionManager.startLearning(mockLearningRequest);
      await sessionManager.executeNextStep(session.id);
      
      const sessionState = sessionManager.getSessionState(session.id);
      
      expect(sessionState).toBeDefined();
      expect(sessionState?.session.id).toBe(session.id);
      expect(sessionState?.learningEfficiency).toBeGreaterThan(0);
      expect(sessionState?.nextActions).toBeDefined();
      expect(sessionState?.integrationPoints).toBeDefined();
    });

    test('should return null session state for non-existent session', () => {
      const sessionState = sessionManager.getSessionState('non-existent-id');
      expect(sessionState).toBeNull();
    });

    test('should batch update multiple sessions', async () => {
      const session1 = await sessionManager.startLearning(mockLearningRequest);
      const session2 = await sessionManager.startLearning({
        ...mockLearningRequest,
        id: 'test-request-2',
        objective: 'Learn React'
      });

      const updates = [
        { sessionId: session1.id, update: { objective: 'Updated objective 1' } },
        { sessionId: session2.id, update: { objective: 'Updated objective 2' } }
      ];

      await sessionManager.batchUpdateSessions(updates);

      const updatedSession1 = sessionManager.getCurrentSession(session1.id);
      const updatedSession2 = sessionManager.getCurrentSession(session2.id);
      
      expect(updatedSession1?.objective).toBe('Updated objective 1');
      expect(updatedSession2?.objective).toBe('Updated objective 2');
    });
  });

  describe('User Session Management', () => {
    test('should get active sessions for a user', async () => {
      const session1 = await sessionManager.startLearning(mockLearningRequest);
      const session2 = await sessionManager.startLearning({
        ...mockLearningRequest,
        id: 'test-request-2',
        objective: 'Learn React'
      });
      
      const activeSessions = sessionManager.getUserActiveSessions(mockLearningRequest.userId);
      
      expect(activeSessions).toHaveLength(2);
      expect(activeSessions.map(s => s.id)).toContain(session1.id);
      expect(activeSessions.map(s => s.id)).toContain(session2.id);
    });

    test('should filter active sessions by user', async () => {
      await sessionManager.startLearning(mockLearningRequest);
      await sessionManager.startLearning({
        ...mockLearningRequest,
        id: 'test-request-2',
        userId: 'different-user-id'
      });
      
      const activeSessions = sessionManager.getUserActiveSessions(mockLearningRequest.userId);
      
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].userId).toBe(mockLearningRequest.userId);
    });
  });

  describe('Event Emission', () => {
    test('should emit sessionStarted event', async () => {
      const eventSpy = jest.fn();
      sessionManager.on('sessionStarted', eventSpy);
      
      const session = await sessionManager.startLearning(mockLearningRequest);
      
      expect(eventSpy).toHaveBeenCalledWith(session);
    });

    test('should emit sessionPaused event', async () => {
      const eventSpy = jest.fn();
      sessionManager.on('sessionPaused', eventSpy);
      
      const session = await sessionManager.startLearning(mockLearningRequest);
      await sessionManager.pauseSession(session.id);
      
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        id: session.id,
        status: SessionStatus.PAUSED
      }));
    });

    test('should emit sessionCompleted event', async () => {
      const eventSpy = jest.fn();
      sessionManager.on('sessionCompleted', eventSpy);
      
      const session = await sessionManager.startLearning(mockLearningRequest);
      await sessionManager.completeSession(session.id);
      
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        id: session.id,
        status: SessionStatus.COMPLETED
      }));
    });

    test('should emit stepExecuted event', async () => {
      const eventSpy = jest.fn();
      sessionManager.on('stepExecuted', eventSpy);
      
      const session = await sessionManager.startLearning(mockLearningRequest);
      await sessionManager.executeNextStep(session.id);
      
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        session: expect.objectContaining({ id: session.id }),
        stepResult: expect.objectContaining({ stepId: mockLearningStep.id })
      }));
    });
  });

  describe('Error Handling', () => {
    test('should handle intent analysis failure', async () => {
      mockIntentAnalyzer.analyzeRequest.mockRejectedValue(new Error('Intent analysis failed'));
      
      await expect(sessionManager.startLearning(mockLearningRequest))
        .rejects.toThrow('Failed to start learning session: Intent analysis failed');
    });

    test('should handle learning path generation failure', async () => {
      mockLearningPathGenerator.generatePath.mockRejectedValue(new Error('Path generation failed'));
      
      await expect(sessionManager.startLearning(mockLearningRequest))
        .rejects.toThrow('Failed to start learning session: Path generation failed');
    });

    test('should handle step execution errors gracefully', async () => {
      mockBrowserController.performAction.mockRejectedValue(new Error('Browser action failed'));
      
      const session = await sessionManager.startLearning(mockLearningRequest);
      const stepResult = await sessionManager.executeNextStep(session.id);
      
      expect(stepResult.status).toBe('failed');
      expect(stepResult.outcome.success).toBe(false);
      expect(stepResult.outcome.challengesEncountered).toContain('Browser action failed');
    });
  });
});