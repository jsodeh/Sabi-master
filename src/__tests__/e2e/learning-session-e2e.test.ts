import { LearningOrchestrator } from '../../core/LearningOrchestrator';
import { BrowserController } from '../../browser/BrowserController';
import { LearningSessionManager } from '../../core/LearningSessionManager';
import { MultimodalProcessor } from '../../ai/MultimodalProcessor';
import { IntentAnalyzer } from '../../ai/IntentAnalyzer';
import { LearningPathGenerator } from '../../ai/LearningPathGenerator';
import { AdaptiveInstructor } from '../../ai/AdaptiveInstructor';
import { LearningPathExecutionEngine } from '../../core/LearningPathExecutionEngine';
import { ProjectCompletionSystem } from '../../core/ProjectCompletionSystem';
import { DeploymentGuidanceSystem } from '../../core/DeploymentGuidanceSystem';
import { ErrorHandler } from '../../core/ErrorHandler';
import { GracefulDegradationManager } from '../../core/GracefulDegradationManager';
import { 
  LearningRequest, 
  LearningStep, 
  UserFeedback,
  CompletionMetrics
} from '../../types/learning';
import { ProjectConfig, DeploymentPlatform } from '../../types/deployment';
import { BuilderType, InputType, ComplexityLevel } from '../../types/common';
import { UserProfile, AdaptationType } from '../../types/user';
import { LearningStyle, SkillLevel } from '../../types/common';
import { BrowserError, BrowserErrorType } from '../../types/browser';

// Mock all dependencies for E2E testing
jest.mock('../../browser/BrowserController');
jest.mock('../../core/LearningSessionManager');
jest.mock('../../ai/MultimodalProcessor');
jest.mock('../../ai/IntentAnalyzer');
jest.mock('../../ai/LearningPathGenerator');
jest.mock('../../ai/AdaptiveInstructor');
jest.mock('../../core/LearningPathExecutionEngine');

describe('End-to-End Learning Session Tests', () => {
  let orchestrator: LearningOrchestrator;
  let projectCompletionSystem: ProjectCompletionSystem;
  let deploymentSystem: DeploymentGuidanceSystem;
  let errorHandler: ErrorHandler;
  let degradationManager: GracefulDegradationManager;
  
  // Mock instances
  let mockBrowserController: jest.Mocked<BrowserController>;
  let mockSessionManager: jest.Mocked<LearningSessionManager>;
  let mockMultimodalProcessor: jest.Mocked<MultimodalProcessor>;
  let mockIntentAnalyzer: jest.Mocked<IntentAnalyzer>;
  let mockPathGenerator: jest.Mocked<LearningPathGenerator>;
  let mockAdaptiveInstructor: jest.Mocked<AdaptiveInstructor>;

  const mockUserProfile: UserProfile = {
    id: 'e2e-user-123',
    learningStyle: LearningStyle.VISUAL,
    skillLevel: SkillLevel.BEGINNER,
    completedProjects: [],
    preferences: {
      explanationDetail: 'detailed',
      learningPace: 'normal',
      preferredInputMethod: 'text',
      enableVoiceGuidance: true,
      showCueCards: true,
      autoAdvance: false,
      theme: 'light',
      fontSize: 'medium',
      notifications: {
        stepCompletion: true,
        errorAlerts: true,
        progressMilestones: true,
        sessionReminders: true,
        soundEnabled: true,
        vibrationEnabled: false
      },
      accessibility: {
        highContrast: false,
        screenReader: false,
        keyboardNavigation: true,
        reducedMotion: false,
        largeClickTargets: false,
        voiceCommands: true
      }
    },
    progressHistory: [],
    adaptationData: {
      userId: 'e2e-user-123',
      adaptationHistory: [],
      currentAdaptations: [],
      adaptationEffectiveness: {
        overallScore: 0.7,
        byType: {
          [AdaptationType.DIFFICULTY]: 0.7,
          [AdaptationType.PACE]: 0.8,
          [AdaptationType.EXPLANATION_DETAIL]: 0.75,
          [AdaptationType.INPUT_METHOD]: 0.6,
          [AdaptationType.TOOL_SELECTION]: 0.7,
          [AdaptationType.INTERFACE_LAYOUT]: 0.65
        },
        successRate: 0.8,
        userSatisfaction: 4,
        learningImprovement: 0.75
      },
      personalizedSettings: {
        optimalLearningTime: {
          preferredDuration: 45,
          optimalStartTime: '10:00',
          breakFrequency: 20,
          peakPerformanceHours: ['10:00', '15:00']
        },
        preferredComplexityProgression: {
          startingLevel: 0.2,
          progressionRate: 0.4,
          adaptationSensitivity: 0.8,
          fallbackThreshold: 0.3
        },
        effectiveMotivationTechniques: ['gamification', 'progress_tracking'],
        adaptiveThresholds: {
          errorRateThreshold: 0.25,
          frustrationThreshold: 3,
          boredomThreshold: 2,
          helpRequestThreshold: 3,
          timeoutThreshold: 25
        },
        customizedInterface: {
          layout: 'spacious',
          colorScheme: 'blue',
          fontFamily: 'Arial',
          animationSpeed: 'normal',
          overlayOpacity: 0.9,
          cueCardPosition: 'right'
        }
      },
      lastUpdated: new Date()
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Create mock instances
    mockBrowserController = new BrowserController() as jest.Mocked<BrowserController>;
    mockSessionManager = new LearningSessionManager({} as any, {} as any, {} as any, {} as any) as jest.Mocked<LearningSessionManager>;
    mockMultimodalProcessor = new MultimodalProcessor() as jest.Mocked<MultimodalProcessor>;
    mockIntentAnalyzer = new IntentAnalyzer() as jest.Mocked<IntentAnalyzer>;
    mockPathGenerator = new LearningPathGenerator() as jest.Mocked<LearningPathGenerator>;
    mockAdaptiveInstructor = new AdaptiveInstructor() as jest.Mocked<AdaptiveInstructor>;

    // Initialize systems
    orchestrator = new LearningOrchestrator(
      { enableRealTimeTracking: true, maxConcurrentSessions: 5 },
      mockBrowserController,
      mockSessionManager,
      mockMultimodalProcessor,
      mockIntentAnalyzer,
      mockPathGenerator,
      mockAdaptiveInstructor
    );

    projectCompletionSystem = new ProjectCompletionSystem();
    deploymentSystem = new DeploymentGuidanceSystem({}, mockBrowserController);
    errorHandler = new ErrorHandler();
    degradationManager = new GracefulDegradationManager();

    // Setup comprehensive mocks
    setupComprehensiveMocks();
  });

  afterEach(() => {
    degradationManager.destroy();
    errorHandler.clearErrorHistory();
  });

  describe('Complete Learning Session Workflow', () => {
    it('should handle full learning session from request to project completion', async () => {
      // Step 1: Process learning request
      const learningRequest: LearningRequest = {
        id: 'e2e-request-1',
        userId: mockUserProfile.id,
        objective: 'Build a complete e-commerce website using Builder.io',
        inputType: InputType.TEXT,
        rawInput: 'I want to learn how to build a complete e-commerce website with product catalog, shopping cart, and payment integration',
        timestamp: new Date()
      };

      const sessionId = await orchestrator.processLearningRequest(learningRequest);
      expect(sessionId).toBeDefined();

      // Step 2: Simulate user interaction and feedback
      const userFeedback: UserFeedback = {
        stepId: 'step-1',
        helpful: true,
        confusing: false,
        tooFast: false,
        tooSlow: false,
        tooEasy: false,
        tooHard: false,
        needsMoreExplanation: false,
        tooMuchExplanation: false,
        timestamp: new Date()
      };

      await orchestrator.provideFeedback(sessionId, userFeedback);

      // Step 3: Get session progress
      const progress = await orchestrator.getSessionProgress(sessionId);
      expect(Array.isArray(progress)).toBe(true);

      // Step 4: Complete the project and generate summary
      const projectConfig: ProjectConfig = {
        id: 'e2e-project-1',
        name: 'E-commerce Website',
        builderType: BuilderType.BUILDER_IO,
        buildCommand: 'npm run build',
        outputDirectory: 'dist'
      };

      const completionMetrics: CompletionMetrics = {
        totalTimeSpent: 7200, // 2 hours
        completionPercentage: 100,
        qualityScore: 88,
        complexityScore: 8,
        challengesEncountered: ['responsive design', 'payment integration'],
        solutionsImplemented: ['CSS Grid', 'Stripe API'],
        deploymentUrl: 'https://e2e-ecommerce.vercel.app'
      };

      const projectSummary = await projectCompletionSystem.generateProjectSummary(
        projectConfig,
        completionMetrics
      );

      expect(projectSummary.portfolioReady).toBe(true);
      expect(projectSummary.achievements.length).toBeGreaterThan(0);

      // Step 5: Deploy the project
      const recommendedPlatform = await deploymentSystem.recommendPlatform(projectConfig);
      expect(Object.values(DeploymentPlatform)).toContain(recommendedPlatform);

      // Verify complete workflow integration
      expect(mockMultimodalProcessor.processTextInput).toHaveBeenCalled();
      expect(mockIntentAnalyzer.analyzeRequest).toHaveBeenCalled();
      expect(mockPathGenerator.generatePath).toHaveBeenCalled();
      expect(mockSessionManager.startLearning).toHaveBeenCalled();
    }, 30000);

    it('should handle multi-tool navigation workflow', async () => {
      // Create a learning path that uses multiple tools
      const multiToolSteps: LearningStep[] = [
        {
          id: 'step-1',
          title: 'Design UI in Builder.io',
          description: 'Create the user interface',
          toolRequired: 'builder.io',
          actions: [],
          explanation: 'Start by designing the UI',
          expectedOutcome: 'UI design completed',
          validationCriteria: { type: 'functional' as const, criteria: [], successThreshold: 80 },
          estimatedDuration: 30,
          complexity: ComplexityLevel.MEDIUM,
          prerequisites: [],
          learningObjectives: ['UI Design']
        },
        {
          id: 'step-2',
          title: 'Setup Backend in Firebase',
          description: 'Configure Firebase backend',
          toolRequired: 'firebase',
          actions: [],
          explanation: 'Configure the backend services',
          expectedOutcome: 'Backend configured',
          validationCriteria: { type: 'functional' as const, criteria: [], successThreshold: 80 },
          estimatedDuration: 45,
          complexity: ComplexityLevel.HIGH,
          prerequisites: ['step-1'],
          learningObjectives: ['Backend Configuration']
        },
        {
          id: 'step-3',
          title: 'Deploy with Bolt.new',
          description: 'Deploy the application',
          toolRequired: 'bolt.new',
          actions: [],
          explanation: 'Deploy to production',
          expectedOutcome: 'Application deployed',
          validationCriteria: { type: 'functional' as const, criteria: [], successThreshold: 90 },
          estimatedDuration: 20,
          complexity: ComplexityLevel.MEDIUM,
          prerequisites: ['step-1', 'step-2'],
          learningObjectives: ['Deployment']
        }
      ];

      mockPathGenerator.generatePath.mockResolvedValue(multiToolSteps);

      const learningRequest: LearningRequest = {
        id: 'e2e-multi-tool-request',
        userId: mockUserProfile.id,
        objective: 'Build and deploy a full-stack application',
        inputType: InputType.TEXT,
        rawInput: 'I want to build a full-stack application using multiple tools',
        timestamp: new Date()
      };

      const sessionId = await orchestrator.processLearningRequest(learningRequest);
      expect(sessionId).toBeDefined();

      // Verify that the primary tool (most used) was opened
      expect(mockBrowserController.openTool).toHaveBeenCalled();

      // Simulate navigation between tools
      const session = mockSessionManager.getCurrentSession(sessionId);
      expect(session?.steps).toHaveLength(3);
      expect(session?.steps.map(s => s.toolRequired)).toEqual(['builder.io', 'firebase', 'bolt.new']);
    });

    it('should handle error recovery with simulated tool failures', async () => {
      // Setup error scenarios
      const errorSpy = jest.fn();
      orchestrator.on('error', errorSpy);

      // Simulate browser automation failure
      mockBrowserController.openTool.mockRejectedValueOnce(
        new Error('Browser automation failed - tool unavailable')
      );

      const learningRequest: LearningRequest = {
        id: 'e2e-error-request',
        userId: mockUserProfile.id,
        objective: 'Test error recovery',
        inputType: InputType.TEXT,
        rawInput: 'Test error handling',
        timestamp: new Date()
      };

      // Should handle the error gracefully
      await expect(orchestrator.processLearningRequest(learningRequest))
        .rejects.toThrow('Browser automation failed');

      // Test error handler integration
      const browserError: BrowserError = {
        type: BrowserErrorType.NAVIGATION_ERROR,
        message: 'Failed to navigate to tool',
        timestamp: new Date(),
        recoverable: true
      };

      const systemError = errorHandler.createBrowserError(browserError, 'test-action');
      const recoveryResult = await errorHandler.handleError(systemError);

      expect(recoveryResult).toHaveProperty('success');
      expect(recoveryResult).toHaveProperty('message');
      expect(recoveryResult).toHaveProperty('adaptations');

      // Test graceful degradation
      await degradationManager.triggerManualDegradation(
        'browser_automation' as any,
        'basic' as any
      );

      const healthReport = degradationManager.getSystemHealthReport();
      expect(healthReport.activeStrategies.length).toBeGreaterThan(0);
    });

    it('should handle performance testing for concurrent learning sessions', async () => {
      const concurrentRequests = Array.from({ length: 3 }, (_, i) => ({
        id: `concurrent-request-${i}`,
        userId: `user-${i}`,
        objective: `Learn objective ${i}`,
        inputType: InputType.TEXT,
        rawInput: `Learning request ${i}`,
        timestamp: new Date()
      }));

      // Mock different session responses
      mockSessionManager.startLearning
        .mockResolvedValueOnce(createMockSession('session-1'))
        .mockResolvedValueOnce(createMockSession('session-2'))
        .mockResolvedValueOnce(createMockSession('session-3'));

      const startTime = Date.now();
      
      // Process requests concurrently
      const sessionIds = await Promise.all(
        concurrentRequests.map(request => orchestrator.processLearningRequest(request))
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify all sessions were created
      expect(sessionIds).toHaveLength(3);
      expect(new Set(sessionIds).size).toBe(3); // All unique

      // Performance should be reasonable (under 5 seconds for 3 concurrent sessions)
      expect(processingTime).toBeLessThan(5000);

      // Verify concurrent session handling
      for (const sessionId of sessionIds) {
        const progress = await orchestrator.getSessionProgress(sessionId);
        expect(Array.isArray(progress)).toBe(true);
      }
    });

    it('should test deployment workflows end-to-end with mock platforms', async () => {
      const projectConfig: ProjectConfig = {
        id: 'e2e-deployment-test',
        name: 'E2E Deployment Test',
        builderType: BuilderType.LOVABLE,
        buildCommand: 'npm run build',
        outputDirectory: 'build'
      };

      // Test complete deployment workflow
      const platforms = [DeploymentPlatform.VERCEL, DeploymentPlatform.NETLIFY];

      for (const platform of platforms) {
        // Step 1: Generate guidance
        const guidance = await deploymentSystem.generateDeploymentGuidance(platform, projectConfig);
        expect(guidance.length).toBeGreaterThan(0);

        // Step 2: Validate readiness
        const validation = await deploymentSystem.validateDeploymentReadiness(projectConfig);
        expect(validation).toHaveProperty('isValid');

        // Step 3: Create workflow
        const deploymentConfig = {
          platform,
          projectConfig,
          platformSpecificConfig: {},
          autoDeployEnabled: true,
          buildSettings: {
            packageManager: 'npm' as const,
            buildCommand: 'npm run build',
            outputDirectory: 'build',
            environmentVariables: {}
          }
        };

        const workflow = await deploymentSystem.createDeploymentWorkflow(deploymentConfig);
        expect(workflow.status).toBe('pending');

        // Step 4: Execute workflow
        const executedWorkflow = await deploymentSystem.executeDeploymentWorkflow(workflow.id);
        expect(executedWorkflow.status).toBe('completed');

        // Step 5: Test deployment
        const testResults = await deploymentSystem.performDeploymentTesting(
          `https://e2e-test-${platform}.app`,
          projectConfig
        );
        expect(testResults.isValid).toBe(true);
      }
    });
  });

  describe('System Integration and Resilience', () => {
    it('should maintain system stability under stress conditions', async () => {
      // Simulate high load with multiple concurrent operations
      const operations = [];

      // Multiple learning sessions
      for (let i = 0; i < 5; i++) {
        operations.push(
          orchestrator.processLearningRequest({
            id: `stress-request-${i}`,
            userId: `stress-user-${i}`,
            objective: `Stress test objective ${i}`,
            inputType: InputType.TEXT,
            rawInput: `Stress test ${i}`,
            timestamp: new Date()
          })
        );
      }

      // Multiple error scenarios
      for (let i = 0; i < 3; i++) {
        operations.push(
          errorHandler.handleError(new Error(`Stress error ${i}`))
        );
      }

      // Multiple deployment workflows
      for (let i = 0; i < 2; i++) {
        const config = {
          platform: DeploymentPlatform.VERCEL,
          projectConfig: {
            id: `stress-project-${i}`,
            name: `Stress Project ${i}`,
            builderType: BuilderType.BUILDER_IO
          },
          platformSpecificConfig: {},
          autoDeployEnabled: true,
          buildSettings: {
            packageManager: 'npm' as const,
            buildCommand: 'npm run build',
            outputDirectory: 'dist',
            environmentVariables: {}
          }
        };
        operations.push(
          deploymentSystem.createDeploymentWorkflow(config)
        );
      }

      // Execute all operations concurrently
      const results = await Promise.allSettled(operations);

      // Verify system handled the load
      const successfulOperations = results.filter(r => r.status === 'fulfilled');
      expect(successfulOperations.length).toBeGreaterThan(0);

      // System should still be responsive
      const healthReport = degradationManager.getSystemHealthReport();
      expect(healthReport).toBeDefined();
      expect(healthReport.timestamp).toBeInstanceOf(Date);
    });

    it('should demonstrate complete error recovery and adaptation cycle', async () => {
      // Step 1: Start a learning session
      const sessionId = await orchestrator.processLearningRequest({
        id: 'recovery-test',
        userId: mockUserProfile.id,
        objective: 'Test recovery mechanisms',
        inputType: InputType.TEXT,
        rawInput: 'Test error recovery',
        timestamp: new Date()
      });

      // Step 2: Simulate cascading errors
      const errors = [
        new Error('Network connectivity lost'),
        new Error('Browser automation failed'),
        new Error('AI processing timeout')
      ];

      const recoveryResults = [];
      for (const error of errors) {
        const result = await errorHandler.handleError(error);
        recoveryResults.push(result);
      }

      // Step 3: Trigger graceful degradation
      await degradationManager.triggerManualDegradation(
        'network_connectivity' as any,
        'offline' as any
      );

      // Step 4: Verify system adaptation
      const healthReport = degradationManager.getSystemHealthReport();
      expect(healthReport.activeStrategies.length).toBeGreaterThan(0);

      // Step 5: Test offline capabilities
      const offlineCapabilities = degradationManager.getOfflineCapabilities();
      expect(offlineCapabilities.length).toBeGreaterThan(0);

      // Step 6: Provide user feedback to trigger further adaptation
      await orchestrator.provideFeedback(sessionId, {
        stepId: 'test-step',
        helpful: false,
        confusing: true,
        tooFast: true,
        tooSlow: false,
        tooEasy: false,
        tooHard: true,
        needsMoreExplanation: true,
        tooMuchExplanation: false,
        timestamp: new Date()
      });

      // Step 7: Verify adaptive response
      expect(mockAdaptiveInstructor.adaptBasedOnFeedback).toHaveBeenCalled();

      // Step 8: Restore system and verify recovery
      await degradationManager.restoreComponent('network_connectivity' as any);
      
      const restoredReport = degradationManager.getSystemHealthReport();
      expect(restoredReport).toBeDefined();
    });
  });

  // Helper functions
  function setupComprehensiveMocks() {
    // Multimodal processor mock
    mockMultimodalProcessor.processTextInput.mockResolvedValue({
      id: 'processed-input',
      originalInput: 'test input',
      inputType: InputType.TEXT,
      processedText: 'test input',
      extractedEntities: [],
      intent: {
        primary: 'learn_skill' as any,
        confidence: 0.9,
        parameters: {},
        clarificationNeeded: false
      },
      sentiment: {
        overall: 'positive' as any,
        confidence: 0.8,
        emotions: [],
        frustrationLevel: 0.1,
        engagementLevel: 0.9,
        motivationLevel: 0.8
      },
      confidence: 0.9,
      processingTime: 150,
      metadata: {
        processingSteps: [],
        modelUsed: 'test-model',
        apiCalls: 1,
        cacheHit: false,
        errorCount: 0,
        warnings: []
      }
    });

    // Intent analyzer mock
    mockIntentAnalyzer.analyzeRequest.mockResolvedValue({
      objective: 'Build a website',
      extractedKeywords: ['website', 'build'],
      requiredTools: ['builder.io'],
      estimatedComplexity: ComplexityLevel.MEDIUM,
      suggestedSkillLevel: SkillLevel.BEGINNER,
      relatedConcepts: ['web development']
    });

    // Path generator mock
    mockPathGenerator.generatePath.mockResolvedValue([
      {
        id: 'step-1',
        title: 'Create Project',
        description: 'Create a new project',
        toolRequired: 'builder.io',
        actions: [],
        explanation: 'Start by creating a project',
        expectedOutcome: 'Project created',
        validationCriteria: { type: 'functional' as const, criteria: [], successThreshold: 80 },
        estimatedDuration: 15,
        complexity: ComplexityLevel.LOW,
        prerequisites: [],
        learningObjectives: ['Project Setup']
      }
    ]);

    // Session manager mock
    mockSessionManager.startLearning.mockResolvedValue(createMockSession('default-session'));
    mockSessionManager.getCurrentSession.mockReturnValue(createMockSession('default-session'));

    // Browser controller mock
    mockBrowserController.openTool.mockResolvedValue({
      id: 'browser-session',
      toolType: BuilderType.BUILDER_IO,
      url: 'https://builder.io',
      isAuthenticated: true,
      sessionData: { cookies: [], localStorage: {}, sessionStorage: {} },
      startTime: new Date(),
      lastActivity: new Date(),
      status: 'active' as any
    });

    // Adaptive instructor mock
    mockAdaptiveInstructor.adaptBasedOnFeedback.mockResolvedValue({
      id: 'adapted-step',
      title: 'Adapted Step',
      description: 'Adapted based on feedback',
      toolRequired: 'builder.io',
      actions: [],
      explanation: 'Adapted explanation',
      expectedOutcome: 'Better outcome',
      validationCriteria: { type: 'functional', criteria: [], successThreshold: 85 },
      estimatedDuration: 20,
      complexity: ComplexityLevel.LOW,
      prerequisites: [],
      learningObjectives: ['Adapted Learning']
    });
  }

  function createMockSession(id: string) {
    return {
      id,
      userId: mockUserProfile.id,
      objective: 'Test objective',
      status: 'active' as any,
      currentStepIndex: 0,
      steps: [{
        id: 'step-1',
        title: 'Test Step',
        description: 'Test step description',
        toolRequired: 'builder.io',
        actions: [],
        explanation: 'Test explanation',
        expectedOutcome: 'Test outcome',
        validationCriteria: { type: 'functional' as const, criteria: [], successThreshold: 80 },
        estimatedDuration: 10,
        complexity: ComplexityLevel.LOW,
        prerequisites: [],
        learningObjectives: ['Test']
      }],
      progress: {
        completedSteps: 0,
        totalSteps: 1,
        completionPercentage: 0,
        timeSpent: 0,
        estimatedTimeRemaining: 10,
        outcomes: []
      },
      context: {
        sessionId: id,
        previousSteps: [],
        userPreferences: {
          explanationDetail: 'moderate' as const,
          learningPace: 'normal' as const,
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
      },
      startTime: new Date(),
      lastActivity: new Date(),
      analytics: {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        averageStepTime: 0,
        userSatisfactionScore: 0,
        adaptationsApplied: 0,
        toolsUsed: [],
        skillsAcquired: [],
        projectMilestones: [],
        learningEfficiency: 0,
        errorRecoveryRate: 0
      }
    };
  }
});