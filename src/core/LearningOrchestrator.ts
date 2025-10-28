import { EventEmitter } from 'events';
import { 
  LearningRequest, 
  LearningStep, 
  StepResult, 
  LearningContext,
  UserFeedback,
  LearningOutcome
} from '../types/learning';
import { BrowserController } from '../browser/BrowserController';
import { IToolNavigator, createToolNavigator } from '../browser/ToolNavigator';
import { LearningSessionManager, SessionStatus } from './LearningSessionManager';
import { LearningPathExecutionEngine, StepExecutionContext } from './LearningPathExecutionEngine';
import { MultimodalProcessor } from '../ai/MultimodalProcessor';
import { IntentAnalyzer } from '../ai/IntentAnalyzer';
import { LearningPathGenerator } from '../ai/LearningPathGenerator';
import { AdaptiveInstructor } from '../ai/AdaptiveInstructor';
import { BuilderType, InputType } from '../types/common';
import { BrowserError, BrowserErrorType } from '../types/browser';

export interface LearningOrchestratorConfig {
  enableRealTimeTracking?: boolean;
  adaptationThreshold?: number; // 0-1, threshold for triggering adaptations
  maxConcurrentSessions?: number;
  errorRecoveryAttempts?: number;
}

export interface ProcessingPipeline {
  stage: 'input' | 'intent' | 'planning' | 'execution' | 'adaptation' | 'completion';
  progress: number; // 0-100
  currentStep?: string;
  estimatedTimeRemaining?: number; // in minutes
}

export interface AdaptationTrigger {
  type: 'user_feedback' | 'performance' | 'error_rate' | 'completion_time';
  threshold: number;
  action: 'adjust_pace' | 'change_approach' | 'provide_help' | 'skip_step';
}

export interface ILearningOrchestrator {
  processLearningRequest(request: LearningRequest): Promise<string>; // Returns session ID
  getProcessingStatus(sessionId: string): Promise<ProcessingPipeline>;
  provideFeedback(sessionId: string, feedback: UserFeedback): Promise<void>;
  pauseSession(sessionId: string): Promise<void>;
  resumeSession(sessionId: string): Promise<void>;
  cancelSession(sessionId: string): Promise<void>;
  getSessionProgress(sessionId: string): Promise<LearningOutcome[]>;
}

/**
 * LearningOrchestrator is the central coordinator that manages the entire learning process
 * from user input to completion, integrating all AI and browser automation components
 */
export class LearningOrchestrator extends EventEmitter implements ILearningOrchestrator {
  private config: LearningOrchestratorConfig;
  private browserController: BrowserController;
  private sessionManager: LearningSessionManager;
  private executionEngine: LearningPathExecutionEngine;
  private multimodalProcessor: MultimodalProcessor;
  private intentAnalyzer: IntentAnalyzer;
  private pathGenerator: LearningPathGenerator;
  private adaptiveInstructor: AdaptiveInstructor;
  
  // Active sessions and their states
  private activeSessions: Map<string, ProcessingPipeline> = new Map();
  private sessionToolNavigators: Map<string, IToolNavigator> = new Map();
  private adaptationTriggers: AdaptationTrigger[] = [];
  
  // Error tracking for unified error handling
  private errorHistory: Map<string, BrowserError[]> = new Map();

  constructor(
    config: LearningOrchestratorConfig = {},
    browserController: BrowserController,
    sessionManager: LearningSessionManager,
    multimodalProcessor: MultimodalProcessor,
    intentAnalyzer: IntentAnalyzer,
    pathGenerator: LearningPathGenerator,
    adaptiveInstructor: AdaptiveInstructor
  ) {
    super();
    
    this.config = {
      enableRealTimeTracking: true,
      adaptationThreshold: 0.7,
      maxConcurrentSessions: 3,
      errorRecoveryAttempts: 3,
      ...config
    };
    
    this.browserController = browserController;
    this.sessionManager = sessionManager;
    this.multimodalProcessor = multimodalProcessor;
    this.intentAnalyzer = intentAnalyzer;
    this.pathGenerator = pathGenerator;
    this.adaptiveInstructor = adaptiveInstructor;
    
    // Initialize execution engine (will be created per session with appropriate tool navigator)
    this.executionEngine = new LearningPathExecutionEngine(
      this.browserController,
      {} as IToolNavigator, // Will be set per session
      this.pathGenerator
    );
    
    this.setupAdaptationTriggers();
    this.setupEventListeners();
  }

  /**
   * Main entry point: Process a learning request through the complete pipeline
   */
  async processLearningRequest(request: LearningRequest): Promise<string> {
    try {
      // Check concurrent session limit
      if (this.activeSessions.size >= this.config.maxConcurrentSessions!) {
        throw new Error('Maximum concurrent sessions reached. Please wait for a session to complete.');
      }

      // Initialize processing pipeline
      const pipeline: ProcessingPipeline = {
        stage: 'input',
        progress: 0,
        currentStep: 'Processing user input',
        estimatedTimeRemaining: undefined
      };
      
      this.activeSessions.set(request.id, pipeline);
      this.emit('sessionStarted', { sessionId: request.id, request });

      // Stage 1: Input Processing
      await this.updatePipeline(request.id, 'input', 10, 'Processing multimodal input');
      const processedInput = await this.multimodalProcessor.processTextInput(
        typeof request.rawInput === 'string' ? request.rawInput : 'Learning request',
        request.context
      );
      
      // Stage 2: Intent Analysis
      await this.updatePipeline(request.id, 'intent', 25, 'Analyzing learning intent');
      const intent = await this.intentAnalyzer.analyzeRequest(processedInput);
      
      // Stage 3: Learning Path Planning
      await this.updatePipeline(request.id, 'planning', 40, 'Generating learning path');
      const learningPath = await this.pathGenerator.generatePath(
        intent,
        'beginner' as any, // TODO: Get from user profile
        undefined // No time constraint
      );

      // Create learning session
      const session = await this.sessionManager.startLearning(request);
      const sessionId = session.id;

      // Move pipeline tracking to use session ID instead of request ID
      const existingPipeline = this.activeSessions.get(request.id);
      if (existingPipeline) {
        this.activeSessions.delete(request.id);
        this.activeSessions.set(sessionId, existingPipeline);
      }

      // Set up tool navigator for the required tool
      if (learningPath.length > 0) {
        const primaryTool = this.determinePrimaryTool(learningPath);
        const toolNavigator = await this.setupToolNavigator(sessionId, primaryTool);
        this.sessionToolNavigators.set(sessionId, toolNavigator);
        
        // Update execution engine with the tool navigator
        this.executionEngine = new LearningPathExecutionEngine(
          this.browserController,
          toolNavigator,
          this.pathGenerator
        );
      }

      // Stage 4: Begin Execution
      await this.updatePipeline(sessionId, 'execution', 50, 'Starting learning execution');
      
      // Start executing the learning path
      this.executeSessionAsync(sessionId, learningPath);
      
      return sessionId;
      
    } catch (error) {
      this.activeSessions.delete(request.id);
      this.emit('sessionError', { 
        sessionId: request.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Get current processing status for a session
   */
  async getProcessingStatus(sessionId: string): Promise<ProcessingPipeline> {
    const pipeline = this.activeSessions.get(sessionId);
    if (!pipeline) {
      throw new Error(`Session ${sessionId} not found or completed`);
    }
    return { ...pipeline };
  }

  /**
   * Provide user feedback to adapt the learning experience
   */
  async provideFeedback(sessionId: string, feedback: UserFeedback): Promise<void> {
    try {
      // Get current session
      const session = this.sessionManager.getCurrentSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      // Check if feedback triggers adaptation
      await this.checkAdaptationTriggers(sessionId, feedback);
      
      // Apply adaptive instruction based on feedback
      if (session.steps[session.currentStepIndex]) {
        const currentStep = session.steps[session.currentStepIndex];
        const adaptedStep = await this.adaptiveInstructor.adaptBasedOnFeedback(
          currentStep,
          feedback
        );
        
        if (adaptedStep) {
          session.steps[session.currentStepIndex] = adaptedStep;
          this.emit('stepAdapted', { sessionId, originalStep: currentStep, adaptedStep });
        }
      }
      
      this.emit('feedbackReceived', { sessionId, feedback });
      
    } catch (error) {
      this.handleError(sessionId, error as Error, 'feedback_processing');
    }
  }

  /**
   * Pause an active learning session
   */
  async pauseSession(sessionId: string): Promise<void> {
    try {
      await this.sessionManager.pauseSession(sessionId);
      const pipeline = this.activeSessions.get(sessionId);
      if (pipeline) {
        pipeline.currentStep = 'Session paused';
      }
      this.emit('sessionPaused', { sessionId });
    } catch (error) {
      this.handleError(sessionId, error as Error, 'session_pause');
    }
  }

  /**
   * Resume a paused learning session
   */
  async resumeSession(sessionId: string): Promise<void> {
    try {
      await this.sessionManager.resumeSession(sessionId);
      const session = this.sessionManager.getCurrentSession(sessionId);
      if (session) {
        // Continue execution from where it left off
        const remainingSteps = session.steps.slice(session.currentStepIndex);
        this.executeSessionAsync(sessionId, remainingSteps);
      }
      this.emit('sessionResumed', { sessionId });
    } catch (error) {
      this.handleError(sessionId, error as Error, 'session_resume');
    }
  }

  /**
   * Cancel an active learning session
   */
  async cancelSession(sessionId: string): Promise<void> {
    try {
      await this.sessionManager.cancelSession(sessionId);
      this.activeSessions.delete(sessionId);
      this.sessionToolNavigators.delete(sessionId);
      this.errorHistory.delete(sessionId);
      this.emit('sessionCancelled', { sessionId });
    } catch (error) {
      this.handleError(sessionId, error as Error, 'session_cancellation');
    }
  }

  /**
   * Get progress and outcomes for a session
   */
  async getSessionProgress(sessionId: string): Promise<LearningOutcome[]> {
    try {
      const session = this.sessionManager.getCurrentSession(sessionId);
      if (!session) return [];
      
      // Extract outcomes from completed steps
      const outcomes: LearningOutcome[] = [];
      for (let i = 0; i < session.currentStepIndex; i++) {
        const step = session.steps[i];
        if (step) {
          // Create outcomes for each learning objective
          for (const objective of step.learningObjectives) {
            outcomes.push({
              skill: objective,
              description: `Completed: ${step.title}`,
              proficiencyGained: 20, // Default proficiency gain per step
              evidenceUrl: undefined
            });
          }
        }
      }
      return outcomes;
    } catch (error) {
      this.handleError(sessionId, error as Error, 'progress_retrieval');
      return [];
    }
  }

  /**
   * Private helper methods
   */
  
  private async executeSessionAsync(sessionId: string, learningPath: LearningStep[]): Promise<void> {
    try {
      for (let i = 0; i < learningPath.length; i++) {
        const step = learningPath[i];
        const session = this.sessionManager.getCurrentSession(sessionId);
        
        if (!session || session.status === SessionStatus.PAUSED || session.status === SessionStatus.CANCELLED) {
          break;
        }

        // Update pipeline progress
        const progress = 50 + ((i / learningPath.length) * 45); // 50-95% for execution
        await this.updatePipeline(sessionId, 'execution', progress, `Executing: ${step.title}`);

        // Create execution context
        const context: StepExecutionContext = {
          stepId: step.id,
          sessionId,
          userId: session.userId,
          previousResults: [], // TODO: Get from session progress
          retryCount: 0,
          maxRetries: 3
        };

        // Execute the step
        const result = await this.executionEngine.executeStep(step, context);
        
        // Update session progress
        session.currentStepIndex = Math.min(session.currentStepIndex + 1, session.steps.length);
        session.lastActivity = new Date();
        
        // Check for adaptation needs based on result
        if (result.status === 'failed' || result.outcome.proficiencyGained < 50) {
          await this.triggerAdaptation(sessionId, result);
        }

        // Emit progress update
        this.emit('stepCompleted', { sessionId, step, result });
        
        // Real-time tracking
        if (this.config.enableRealTimeTracking) {
          this.emit('progressUpdate', { 
            sessionId, 
            progress: progress,
            currentStep: step.title,
            outcome: result.outcome
          });
        }
      }

      // Complete the session
      await this.updatePipeline(sessionId, 'completion', 100, 'Learning session completed');
      await this.sessionManager.completeSession(sessionId);
      this.activeSessions.delete(sessionId);
      this.sessionToolNavigators.delete(sessionId);
      
      this.emit('sessionCompleted', { sessionId });
      
    } catch (error) {
      await this.handleSessionError(sessionId, error as Error);
    }
  }

  private async updatePipeline(
    sessionId: string, 
    stage: ProcessingPipeline['stage'], 
    progress: number, 
    currentStep: string
  ): Promise<void> {
    const pipeline = this.activeSessions.get(sessionId);
    if (pipeline) {
      pipeline.stage = stage;
      pipeline.progress = progress;
      pipeline.currentStep = currentStep;
      
      // Estimate time remaining based on progress
      if (progress > 0 && progress < 100) {
        const elapsed = Date.now() - (pipeline as any).startTime || 0;
        pipeline.estimatedTimeRemaining = Math.round((elapsed / progress) * (100 - progress) / 60000);
      }
    }
  }

  private determinePrimaryTool(learningPath: LearningStep[]): BuilderType {
    // Count tool usage across all steps
    const toolCounts = new Map<string, number>();
    
    for (const step of learningPath) {
      const count = toolCounts.get(step.toolRequired) || 0;
      toolCounts.set(step.toolRequired, count + 1);
    }
    
    // Find the most used tool
    let primaryTool = 'builder.io';
    let maxCount = 0;
    
    for (const [tool, count] of toolCounts) {
      if (count > maxCount) {
        maxCount = count;
        primaryTool = tool;
      }
    }
    
    // Map string to BuilderType enum
    switch (primaryTool.toLowerCase()) {
      case 'firebase': return BuilderType.FIREBASE_STUDIO;
      case 'lovable': return BuilderType.LOVABLE;
      case 'bolt.new': return BuilderType.BOLT_NEW;
      case 'replit': return BuilderType.REPLIT;
      default: return BuilderType.BUILDER_IO;
    }
  }

  private async setupToolNavigator(sessionId: string, toolType: BuilderType): Promise<IToolNavigator> {
    // Open the tool in browser
    const browserSession = await this.browserController.openTool(toolType);
    
    // Create appropriate tool navigator
    const page = (this.browserController as any).page; // Access the page from browser controller
    const toolNavigator = createToolNavigator(page, toolType);
    
    return toolNavigator;
  }

  private createDefaultContext(userId: string): LearningContext {
    return {
      sessionId: '',
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
    };
  }

  private setupAdaptationTriggers(): void {
    this.adaptationTriggers = [
      {
        type: 'user_feedback',
        threshold: 0.3, // If satisfaction < 30%
        action: 'adjust_pace'
      },
      {
        type: 'error_rate',
        threshold: 0.5, // If error rate > 50%
        action: 'change_approach'
      },
      {
        type: 'completion_time',
        threshold: 1.5, // If taking 50% longer than estimated
        action: 'provide_help'
      }
    ];
  }

  private setupEventListeners(): void {
    // Listen to execution engine events
    this.executionEngine.on('stepExecutionFailed', async (data) => {
      await this.handleStepFailure(data.context.sessionId, data.step, data.error);
    });

    this.executionEngine.on('stepRetryAttempted', (data) => {
      this.emit('stepRetryAttempted', data);
    });
  }

  private async checkAdaptationTriggers(sessionId: string, feedback: UserFeedback): Promise<void> {
    for (const trigger of this.adaptationTriggers) {
      if (trigger.type === 'user_feedback') {
        const satisfaction = this.calculateFeedbackSatisfaction(feedback);
        if (satisfaction < trigger.threshold) {
          await this.executeAdaptationAction(sessionId, trigger.action, feedback);
        }
      }
    }
  }

  private calculateFeedbackSatisfaction(feedback: UserFeedback): number {
    let score = 0.5; // Base score
    
    if (feedback.helpful) score += 0.3;
    if (feedback.confusing) score -= 0.3;
    if (feedback.tooFast || feedback.tooSlow) score -= 0.2;
    if (feedback.tooEasy || feedback.tooHard) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  private async executeAdaptationAction(
    sessionId: string, 
    action: AdaptationTrigger['action'], 
    feedback: UserFeedback
  ): Promise<void> {
    const session = this.sessionManager.getCurrentSession(sessionId);
    if (!session) return;

    switch (action) {
      case 'adjust_pace':
        // Adjust the estimated duration of remaining steps
        if (feedback.tooFast) {
          for (let i = session.currentStepIndex; i < session.steps.length; i++) {
            session.steps[i].estimatedDuration = Math.round(session.steps[i].estimatedDuration * 1.5);
          }
        } else if (feedback.tooSlow) {
          for (let i = session.currentStepIndex; i < session.steps.length; i++) {
            session.steps[i].estimatedDuration = Math.round(session.steps[i].estimatedDuration * 0.7);
          }
        }
        break;
        
      case 'change_approach':
        // Generate alternative approach for current step
        const currentStep = session.steps[session.currentStepIndex];
        if (currentStep) {
          const alternativeSteps = await this.pathGenerator.generateAlternativeSteps(
            currentStep.learningObjectives,
            currentStep.toolRequired,
            'User feedback indicates current approach is not working'
          );
          
          if (alternativeSteps.length > 0) {
            session.steps[session.currentStepIndex] = alternativeSteps[0];
          }
        }
        break;
        
      case 'provide_help':
        // Emit help request event
        this.emit('helpRequested', { sessionId, feedback });
        break;
    }
  }

  private async triggerAdaptation(sessionId: string, result: StepResult): Promise<void> {
    if (result.status === 'failed' || result.outcome.proficiencyGained < 50) {
      // Low proficiency or failed step - adjust approach
      const session = this.sessionManager.getCurrentSession(sessionId);
      if (session && session.steps[session.currentStepIndex]) {
        const currentStep = session.steps[session.currentStepIndex];
        const adaptedStep = await this.adaptiveInstructor.adaptBasedOnOutcome(
          currentStep,
          result.outcome
        );
        
        if (adaptedStep) {
          session.steps[session.currentStepIndex] = adaptedStep;
          this.emit('adaptationTriggered', { sessionId, reason: 'low_proficiency', adaptedStep });
        }
      }
    }
  }

  private async handleStepFailure(sessionId: string, step: LearningStep, error: Error): Promise<void> {
    // Track error for unified error handling
    const browserError: BrowserError = {
      type: BrowserErrorType.JAVASCRIPT_ERROR,
      message: error.message,
      timestamp: new Date(),
      recoverable: true
    };
    
    this.trackError(sessionId, browserError);
    
    // Attempt recovery based on error history
    const errorCount = this.getErrorCount(sessionId);
    
    if (errorCount < this.config.errorRecoveryAttempts!) {
      // Try alternative approach
      try {
        const alternativeSteps = await this.pathGenerator.generateAlternativeSteps(
          step.learningObjectives,
          step.toolRequired,
          error.message
        );
        
        if (alternativeSteps.length > 0) {
          const session = this.sessionManager.getCurrentSession(sessionId);
          if (session) {
            session.steps[session.currentStepIndex] = alternativeSteps[0];
            this.emit('errorRecoveryAttempted', { sessionId, originalStep: step, alternativeStep: alternativeSteps[0] });
            return;
          }
        }
      } catch (recoveryError) {
        // Recovery failed, continue to session error handling
      }
    }
    
    // If recovery fails or too many errors, handle as session error
    await this.handleSessionError(sessionId, error);
  }

  private async handleSessionError(sessionId: string, error: Error): Promise<void> {
    try {
      const session = this.sessionManager.getCurrentSession(sessionId);
      if (session) {
        session.status = SessionStatus.FAILED;
        session.lastActivity = new Date();
      }
      
      this.activeSessions.delete(sessionId);
      this.sessionToolNavigators.delete(sessionId);
      
      this.emit('sessionFailed', { sessionId, error: error.message });
    } catch (handlingError) {
      // Last resort error handling
      this.emit('criticalError', { sessionId, error: error.message, handlingError: handlingError });
    }
  }

  private handleError(sessionId: string, error: Error, context: string): void {
    const browserError: BrowserError = {
      type: BrowserErrorType.JAVASCRIPT_ERROR,
      message: `${context}: ${error.message}`,
      timestamp: new Date(),
      recoverable: true
    };
    
    this.trackError(sessionId, browserError);
    this.emit('error', { sessionId, error: error.message, context });
  }

  private trackError(sessionId: string, error: BrowserError): void {
    if (!this.errorHistory.has(sessionId)) {
      this.errorHistory.set(sessionId, []);
    }
    this.errorHistory.get(sessionId)!.push(error);
  }

  private getErrorCount(sessionId: string): number {
    return this.errorHistory.get(sessionId)?.length || 0;
  }
}