import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { 
  LearningRequest, 
  LearningStep, 
  LearningContext,
  StepResult,
  LearningOutcome,
  StepAdaptation
} from '../types/learning';
import { 
  InputType, 
  SkillLevel 
} from '../types/common';
import { 
  ProcessedInput,
  IntentType,
  SentimentType
} from '../types/ai';
import { LearningPathGenerator } from '../ai/LearningPathGenerator';
import { AdaptiveInstructor } from '../ai/AdaptiveInstructor';
import { BrowserController } from '../browser/BrowserController';
import { IntentAnalyzer } from '../ai/IntentAnalyzer';

export interface LearningSession {
  id: string;
  userId: string;
  objective: string;
  status: SessionStatus;
  currentStepIndex: number;
  steps: LearningStep[];
  progress: SessionProgress;
  context: LearningContext;
  startTime: Date;
  lastActivity: Date;
  pausedAt?: Date;
  completedAt?: Date;
  analytics: SessionAnalytics;
}

export enum SessionStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface SessionProgress {
  completedSteps: number;
  totalSteps: number;
  completionPercentage: number;
  timeSpent: number; // in minutes
  estimatedTimeRemaining: number; // in minutes
  outcomes: LearningOutcome[];
}

export interface SessionAnalytics {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  averageStepTime: number;
  userSatisfactionScore: number;
  adaptationsApplied: number;
  toolsUsed: string[];
  skillsAcquired: string[];
  deploymentPhase?: DeploymentPhase;
  projectMilestones: ProjectMilestone[];
  learningEfficiency: number; // 0-1 scale
  errorRecoveryRate: number; // 0-1 scale
}

export enum DeploymentPhase {
  CONCEPT = 'concept',
  DESIGN = 'design',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  COMPLETED = 'completed'
}

export interface SessionMetrics {
  sessionId: string;
  totalDuration: number; // in minutes
  stepsCompleted: number;
  successRate: number; // 0-1
  averageStepTime: number;
  userSatisfaction: number; // 1-5 scale
  toolsUsed: number;
  skillsAcquired: number;
  adaptationsApplied: number;
}

export interface ProjectMilestone {
  id: string;
  name: string;
  phase: DeploymentPhase;
  completedAt?: Date;
  estimatedCompletion?: Date;
  progress: number; // 0-100
}

export interface DeploymentProgress {
  currentPhase: DeploymentPhase;
  overallProgress: number; // 0-100
  milestones: ProjectMilestone[];
  estimatedCompletion: Date;
  blockers: string[];
}

export interface SessionState {
  session: LearningSession;
  deploymentProgress: DeploymentProgress | null;
  learningEfficiency: number;
  nextActions: string[];
  integrationPoints: {
    aiProcessingReady: boolean;
    browserAutomationReady: boolean;
    userInputRequired: boolean;
  };
}

export interface ILearningSessionManager {
  startLearning(request: LearningRequest): Promise<LearningSession>;
  pauseSession(sessionId: string): Promise<void>;
  resumeSession(sessionId: string): Promise<void>;
  completeSession(sessionId: string): Promise<void>;
  executeNextStep(sessionId: string): Promise<StepResult>;
  getCurrentSession(sessionId: string): LearningSession | null;
  getSessionAnalytics(sessionId: string): SessionAnalytics | null;
  persistSession(session: LearningSession): Promise<void>;
  recoverSession(sessionId: string): Promise<LearningSession | null>;
  updateDeploymentPhase(sessionId: string, phase: DeploymentPhase): Promise<void>;
  trackProjectMilestone(sessionId: string, milestone: ProjectMilestone): Promise<void>;
  getDeploymentProgress(sessionId: string): DeploymentProgress | null;
  calculateLearningEfficiency(sessionId: string): number;
}

/**
 * LearningSessionManager handles the lifecycle of learning sessions
 */
export class LearningSessionManager extends EventEmitter implements ILearningSessionManager {
  private activeSessions: Map<string, LearningSession> = new Map();
  private sessionStorage: Map<string, LearningSession> = new Map();
  private learningPathGenerator: LearningPathGenerator;
  private adaptiveInstructor: AdaptiveInstructor;
  private browserController: BrowserController;
  private intentAnalyzer: IntentAnalyzer;

  // Export DeploymentPhase for external access
  public static DeploymentPhase = DeploymentPhase;
  public DeploymentPhase = DeploymentPhase;

  constructor(
    learningPathGenerator: LearningPathGenerator,
    adaptiveInstructor: AdaptiveInstructor,
    browserController: BrowserController,
    intentAnalyzer: IntentAnalyzer
  ) {
    super();
    this.learningPathGenerator = learningPathGenerator;
    this.adaptiveInstructor = adaptiveInstructor;
    this.browserController = browserController;
    this.intentAnalyzer = intentAnalyzer;
  }

  /**
   * Start a new learning session
   */
  async startLearning(request: LearningRequest): Promise<LearningSession> {
    try {
      // Create a ProcessedInput from the learning request
      const processedInput = this.createProcessedInputFromRequest(request);
      
      // Analyze the learning request to extract intent
      const intent = await this.intentAnalyzer.analyzeRequest(processedInput);
      
      // Generate learning path based on intent
      const steps = await this.learningPathGenerator.generatePath(
        intent,
        request.context?.userPreferences?.preferredInputMethod === InputType.TEXT ? SkillLevel.INTERMEDIATE : SkillLevel.BEGINNER
      );

      // Create new session
      const session: LearningSession = {
        id: uuidv4(),
        userId: request.userId,
        objective: request.objective,
        status: SessionStatus.CREATED,
        currentStepIndex: 0,
        steps,
        progress: {
          completedSteps: 0,
          totalSteps: steps.length,
          completionPercentage: 0,
          timeSpent: 0,
          estimatedTimeRemaining: steps.reduce((sum, step) => sum + step.estimatedDuration, 0),
          outcomes: []
        },
        context: request.context || this.createDefaultContext(request.userId),
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
          deploymentPhase: DeploymentPhase.CONCEPT,
          projectMilestones: [],
          learningEfficiency: 0,
          errorRecoveryRate: 0
        }
      };

      // Store session
      this.activeSessions.set(session.id, session);
      await this.persistSession(session);

      // Update status to active
      session.status = SessionStatus.ACTIVE;
      session.lastActivity = new Date();

      // Emit session started event
      this.emit('sessionStarted', session);

      return session;
    } catch (error) {
      throw new Error(`Failed to start learning session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pause an active session
   */
  async pauseSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error(`Cannot pause session in status: ${session.status}`);
    }

    session.status = SessionStatus.PAUSED;
    session.pausedAt = new Date();
    session.lastActivity = new Date();

    await this.persistSession(session);
    this.emit('sessionPaused', session);
  }

  /**
   * Resume a paused session (Requirement 7.4 - resume with appropriate context)
   */
  async resumeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId) || await this.recoverSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== SessionStatus.PAUSED) {
      throw new Error(`Cannot resume session in status: ${session.status}`);
    }

    // Restore session context and update environment state
    session.status = SessionStatus.ACTIVE;
    session.pausedAt = undefined;
    session.lastActivity = new Date();

    // Update context with current environment state
    session.context.environmentState.systemResources = {
      memoryUsage: Math.floor(Math.random() * 100), // In real implementation, get actual system metrics
      cpuUsage: Math.floor(Math.random() * 100),
      availableMemory: 8192
    };

    // Update previous steps context for better continuity
    if (session.currentStepIndex > 0) {
      session.context.previousSteps = session.steps
        .slice(0, session.currentStepIndex)
        .map(step => step.id);
    }

    // Add session back to active sessions if it was recovered
    this.activeSessions.set(sessionId, session);

    await this.persistSession(session);
    this.emit('sessionResumed', { session, contextRestored: true });
  }

  /**
   * Complete a session
   */
  async completeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = SessionStatus.COMPLETED;
    session.completedAt = new Date();
    session.lastActivity = new Date();
    session.progress.completionPercentage = 100;

    // Calculate final analytics
    this.updateSessionAnalytics(session);

    await this.persistSession(session);
    this.activeSessions.delete(sessionId);
    this.emit('sessionCompleted', session);
  }  /*
*
   * Execute the next step in the learning session
   */
  async executeNextStep(sessionId: string): Promise<StepResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error(`Cannot execute step for session in status: ${session.status}`);
    }

    if (session.currentStepIndex >= session.steps.length) {
      throw new Error('No more steps to execute');
    }

    const stepStartTime = Date.now();
    const currentStep = session.steps[session.currentStepIndex];
    
    try {
      // Adapt the step based on user progress
      const adaptedStep = await this.adaptiveInstructor.adjustTeachingStyle(
        session.userId,
        currentStep,
        session.progress.outcomes,
        session.context
      );

      // Update the step in the session if adaptations were made
      if (JSON.stringify(adaptedStep) !== JSON.stringify(currentStep)) {
        session.steps[session.currentStepIndex] = adaptedStep;
        session.analytics.adaptationsApplied++;
      }

      // Execute browser actions for this step
      const actionResults = [];
      for (const action of adaptedStep.actions) {
        try {
          const result = await this.browserController.performAction(action);
          actionResults.push(result);
          
          // Update analytics
          session.analytics.totalActions++;
          if (result.success) {
            session.analytics.successfulActions++;
          } else {
            session.analytics.failedActions++;
          }
        } catch (error) {
          session.analytics.failedActions++;
          actionResults.push({
            actionId: action.id,
            success: false,
            error: {
              type: 'execution_error',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date(),
              recoverable: true
            },
            elementFound: false,
            executionTime: 0,
            actualResult: 'Action failed to execute',
            adaptations: []
          });
        }
      }

      // Validate step completion
      const validationResult = await this.validateStepCompletion(adaptedStep, actionResults);
      
      // Create learning outcome
      const outcome: LearningOutcome = {
        skill: adaptedStep.learningObjectives[0] || 'General Learning',
        description: validationResult.feedback,
        proficiencyGained: validationResult.success ? 25 : 5, // Proficiency gained based on success
        evidenceUrl: undefined
      };

      // Create step result
      const stepResult: StepResult = {
        stepId: adaptedStep.id,
        status: validationResult.success ? 'completed' : 'failed',
        outcome,
        nextStepId: session.currentStepIndex + 1 < session.steps.length ? 
          session.steps[session.currentStepIndex + 1].id : undefined,
        adaptations: this.extractAdaptations(currentStep, adaptedStep),
        timestamp: new Date()
      };

      // Update session progress
      this.updateSessionProgress(session, outcome, stepResult);

      // Move to next step if current step was successful
      if (validationResult.success) {
        session.currentStepIndex++;
        
        // Check if session is complete
        if (session.currentStepIndex >= session.steps.length) {
          // Update session status but don't remove from active sessions yet
          // This allows the test to verify the final state before completion
          session.status = SessionStatus.COMPLETED;
          session.completedAt = new Date();
          session.progress.completionPercentage = 100;
          this.updateSessionAnalytics(session);
          await this.persistSession(session);
          this.emit('sessionCompleted', session);
          // Remove from active sessions after emitting event
          this.activeSessions.delete(sessionId);
        }
      }

      session.lastActivity = new Date();
      await this.persistSession(session);

      this.emit('stepExecuted', { session, stepResult });
      return stepResult;

    } catch (error) {
      // Handle step execution failure
      const failureOutcome: LearningOutcome = {
        skill: currentStep.learningObjectives[0] || 'General Learning',
        description: 'Step execution failed due to technical error',
        proficiencyGained: 0,
        evidenceUrl: undefined
      };

      const failureResult: StepResult = {
        stepId: currentStep.id,
        status: 'failed',
        outcome: failureOutcome,
        adaptations: [],
        timestamp: new Date()
      };

      this.updateSessionProgress(session, failureOutcome, failureResult);
      session.lastActivity = new Date();
      await this.persistSession(session);

      this.emit('stepFailed', { session, stepResult: failureResult, error });
      return failureResult;
    }
  }

  /**
   * Get current session by ID
   */
  getCurrentSession(sessionId: string): LearningSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics(sessionId: string): SessionAnalytics | null {
    const session = this.activeSessions.get(sessionId) || this.sessionStorage.get(sessionId);
    return session ? session.analytics : null;
  }

  /**
   * Persist session to storage
   */
  async persistSession(session: LearningSession): Promise<void> {
    try {
      // Store in memory (in a real implementation, this would be database/file storage)
      this.sessionStorage.set(session.id, { ...session });
      
      // Emit persistence event for external storage handlers
      this.emit('sessionPersisted', session);
    } catch (error) {
      throw new Error(`Failed to persist session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Recover session from storage
   */
  async recoverSession(sessionId: string): Promise<LearningSession | null> {
    try {
      const session = this.sessionStorage.get(sessionId);
      if (session) {
        // Emit recovery event
        this.emit('sessionRecovered', session);
        return { ...session };
      }
      return null;
    } catch (error) {
      console.error(`Failed to recover session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Get all active sessions for a user
   */
  getUserActiveSessions(userId: string): LearningSession[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId && session.status === SessionStatus.ACTIVE);
  }

  /**
   * Cancel a session
   */
  async cancelSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = SessionStatus.CANCELLED;
    session.lastActivity = new Date();

    await this.persistSession(session);
    this.activeSessions.delete(sessionId);
    this.emit('sessionCancelled', { session, reason });
  }

  /**
   * Get session performance metrics
   */
  getSessionMetrics(sessionId: string): SessionMetrics | null {
    const session = this.activeSessions.get(sessionId) || this.sessionStorage.get(sessionId);
    if (!session) return null;

    const totalTime = session.completedAt ? 
      (session.completedAt.getTime() - session.startTime.getTime()) / 60000 : // Convert to minutes
      (Date.now() - session.startTime.getTime()) / 60000;

    return {
      sessionId: session.id,
      totalDuration: totalTime,
      stepsCompleted: session.progress.completedSteps,
      successRate: session.progress.outcomes.length > 0 ? 
        session.progress.outcomes.filter(o => o.proficiencyGained > 0).length / session.progress.outcomes.length : 0,
      averageStepTime: session.analytics.averageStepTime,
      userSatisfaction: session.analytics.userSatisfactionScore,
      toolsUsed: session.analytics.toolsUsed.length,
      skillsAcquired: session.analytics.skillsAcquired.length,
      adaptationsApplied: session.analytics.adaptationsApplied
    };
  }

  /**
   * Update deployment phase for a session (Requirements 6.1, 6.2)
   */
  async updateDeploymentPhase(sessionId: string, phase: DeploymentPhase): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const previousPhase = session.analytics.deploymentPhase;
    session.analytics.deploymentPhase = phase;
    session.lastActivity = new Date();

    // Create milestone for phase completion
    if (previousPhase && previousPhase !== phase) {
      const milestone: ProjectMilestone = {
        id: uuidv4(),
        name: `${previousPhase} phase completed`,
        phase: previousPhase,
        completedAt: new Date(),
        progress: 100
      };
      session.analytics.projectMilestones.push(milestone);
    }

    await this.persistSession(session);
    this.emit('deploymentPhaseUpdated', { session, previousPhase, newPhase: phase });
  }

  /**
   * Track project milestone completion (Requirements 6.1, 6.2)
   */
  async trackProjectMilestone(sessionId: string, milestone: ProjectMilestone): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Update existing milestone or add new one
    const existingIndex = session.analytics.projectMilestones.findIndex(m => m.id === milestone.id);
    if (existingIndex >= 0) {
      session.analytics.projectMilestones[existingIndex] = milestone;
    } else {
      session.analytics.projectMilestones.push(milestone);
    }

    session.lastActivity = new Date();
    await this.persistSession(session);
    this.emit('milestoneTracked', { session, milestone });
  }

  /**
   * Get deployment progress for a session (Requirements 6.1, 6.2)
   */
  getDeploymentProgress(sessionId: string): DeploymentProgress | null {
    const session = this.activeSessions.get(sessionId) || this.sessionStorage.get(sessionId);
    if (!session) return null;

    const phases = Object.values(DeploymentPhase);
    const currentPhaseIndex = phases.indexOf(session.analytics.deploymentPhase || DeploymentPhase.CONCEPT);
    const overallProgress = ((currentPhaseIndex + 1) / phases.length) * 100;

    // Calculate estimated completion based on current progress and average step time
    const remainingPhases = phases.length - currentPhaseIndex - 1;
    const avgPhaseTime = session.analytics.averageStepTime * 5; // Estimate 5 steps per phase
    const estimatedCompletion = new Date(Date.now() + (remainingPhases * avgPhaseTime * 60000));

    // Identify blockers based on failed actions and challenges
    const blockers = session.progress.outcomes
      .filter(o => o.proficiencyGained === 0)
      .map(o => `Low proficiency in ${o.skill}`)
      .filter((blocker, index, arr) => arr.indexOf(blocker) === index) // Remove duplicates
      .slice(0, 5); // Limit to top 5 blockers

    return {
      currentPhase: session.analytics.deploymentPhase || DeploymentPhase.CONCEPT,
      overallProgress,
      milestones: session.analytics.projectMilestones,
      estimatedCompletion,
      blockers
    };
  }

  /**
   * Calculate learning efficiency for a session (Requirement 10.1)
   */
  calculateLearningEfficiency(sessionId: string): number {
    const session = this.activeSessions.get(sessionId) || this.sessionStorage.get(sessionId);
    if (!session || session.progress.outcomes.length === 0) return 0;

    const { outcomes } = session.progress;
    const successRate = outcomes.filter(o => o.proficiencyGained > 0).length / outcomes.length;
    const avgProficiency = outcomes.reduce((sum, o) => sum + o.proficiencyGained, 0) / outcomes.length;
    const timeEfficiency = session.progress.estimatedTimeRemaining > 0 ? 
      Math.min(1, session.progress.timeSpent / (session.progress.timeSpent + session.progress.estimatedTimeRemaining)) : 1;

    // Weighted calculation: 40% success rate, 30% satisfaction, 30% time efficiency
    const efficiency = (successRate * 0.4) + ((avgProficiency / 100) * 0.3) + (timeEfficiency * 0.3);
    
    return efficiency;
  }

  /**
   * Get comprehensive session state for external integrations
   */
  getSessionState(sessionId: string): SessionState | null {
    const session = this.activeSessions.get(sessionId) || this.sessionStorage.get(sessionId);
    if (!session) return null;

    return {
      session,
      deploymentProgress: this.getDeploymentProgress(sessionId),
      learningEfficiency: this.calculateLearningEfficiency(sessionId),
      nextActions: this.getNextRecommendedActions(sessionId),
      integrationPoints: {
        aiProcessingReady: session.status === SessionStatus.ACTIVE,
        browserAutomationReady: session.context.environmentState.activeBrowsers.length > 0,
        userInputRequired: this.isUserInputRequired(session)
      }
    };
  }

  /**
   * Get next recommended actions for a session
   */
  private getNextRecommendedActions(sessionId: string): string[] {
    const session = this.activeSessions.get(sessionId) || this.sessionStorage.get(sessionId);
    if (!session) return [];

    const actions: string[] = [];

    if (session.status === SessionStatus.PAUSED) {
      actions.push('Resume session to continue learning');
    } else if (session.currentStepIndex < session.steps.length) {
      actions.push(`Execute next step: ${session.steps[session.currentStepIndex].title}`);
    } else if (session.status === SessionStatus.ACTIVE) {
      actions.push('Complete session - all steps finished');
    }

    // Add deployment-specific recommendations
    const deploymentProgress = this.getDeploymentProgress(sessionId);
    if (deploymentProgress && deploymentProgress.blockers.length > 0) {
      actions.push(`Address blockers: ${deploymentProgress.blockers.slice(0, 2).join(', ')}`);
    }

    return actions;
  }

  /**
   * Check if user input is required for the session
   */
  private isUserInputRequired(session: LearningSession): boolean {
    if (session.status !== SessionStatus.ACTIVE) return false;
    
    // Check if current step requires user confirmation or input
    const currentStep = session.steps[session.currentStepIndex];
    if (!currentStep) return false;

    // Check if there are validation failures that need user attention
    const recentOutcomes = session.progress.outcomes.slice(-3);
    const hasRecentFailures = recentOutcomes.some(o => o.proficiencyGained === 0);
    
    return hasRecentFailures || session.analytics.userSatisfactionScore < 3;
  }

  /**
   * Batch update multiple sessions (for performance optimization)
   */
  async batchUpdateSessions(updates: Array<{ sessionId: string; update: Partial<LearningSession> }>): Promise<void> {
    const updatePromises = updates.map(async ({ sessionId, update }) => {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        Object.assign(session, update);
        session.lastActivity = new Date();
        await this.persistSession(session);
      }
    });

    await Promise.all(updatePromises);
    this.emit('batchSessionsUpdated', { updatedCount: updates.length });
  }

  /**
   * Private helper methods
   */
  private createDefaultContext(userId: string): LearningContext {
    return {
      sessionId: uuidv4(),
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

  /**
   * Create ProcessedInput from LearningRequest for IntentAnalyzer
   */
  private createProcessedInputFromRequest(request: LearningRequest): ProcessedInput {
    return {
      id: uuidv4(),
      originalInput: typeof request.rawInput === 'string' ? request.rawInput : request.objective,
      processedText: request.objective,
      inputType: request.inputType,
      intent: {
        primary: IntentType.LEARN_SKILL, // Default intent type
        confidence: 0.8,
        parameters: {
          targetSkill: request.objective
        },
        clarificationNeeded: false
      },
      extractedEntities: [],
      sentiment: {
        overall: SentimentType.NEUTRAL,
        confidence: 0.7,
        emotions: [],
        frustrationLevel: 0.0,
        engagementLevel: 0.5,
        motivationLevel: 0.5
      },
      confidence: 0.8,
      processingTime: 100,
      metadata: {
        processingSteps: [],
        modelUsed: 'default',
        apiCalls: 0,
        cacheHit: false,
        errorCount: 0,
        warnings: []
      }
    };
  }

  private async validateStepCompletion(
    step: LearningStep, 
    actionResults: any[]
  ): Promise<{ success: boolean; feedback: string }> {
    const { validationCriteria } = step;
    const successfulActions = actionResults.filter(r => r.success).length;
    const totalActions = actionResults.length;
    
    // Basic validation based on action success rate
    const actionSuccessRate = totalActions > 0 ? successfulActions / totalActions : 0;
    
    // Apply validation criteria threshold
    const success = actionSuccessRate >= (validationCriteria.successThreshold / 100);
    
    const feedback = success ? 
      `Step completed successfully! ${successfulActions}/${totalActions} actions succeeded.` :
      `Step needs attention. Only ${successfulActions}/${totalActions} actions succeeded. Expected ${validationCriteria.successThreshold}% success rate.`;

    return { success, feedback };
  }

  private extractAdaptations(originalStep: LearningStep, adaptedStep: LearningStep): StepAdaptation[] {
    const adaptations: StepAdaptation[] = [];

    if (originalStep.complexity !== adaptedStep.complexity) {
      adaptations.push({
        type: 'difficulty',
        reason: 'Complexity adjusted based on user progress',
        originalValue: originalStep.complexity,
        adaptedValue: adaptedStep.complexity,
        confidence: 0.8
      });
    }

    if (originalStep.estimatedDuration !== adaptedStep.estimatedDuration) {
      adaptations.push({
        type: 'pace',
        reason: 'Duration adjusted based on user performance',
        originalValue: originalStep.estimatedDuration.toString(),
        adaptedValue: adaptedStep.estimatedDuration.toString(),
        confidence: 0.7
      });
    }

    if (originalStep.explanation !== adaptedStep.explanation) {
      adaptations.push({
        type: 'explanation',
        reason: 'Explanation adapted for user understanding level',
        originalValue: 'standard',
        adaptedValue: 'adapted',
        confidence: 0.6
      });
    }

    return adaptations;
  }

  private updateSessionProgress(
    session: LearningSession, 
    outcome: LearningOutcome, 
    stepResult: StepResult
  ): void {
    // Add outcome to progress
    session.progress.outcomes.push(outcome);

    // Update completion metrics
    if (stepResult.status === 'completed') {
      session.progress.completedSteps++;
    }

    // Update completion percentage
    session.progress.completionPercentage = 
      (session.progress.completedSteps / session.progress.totalSteps) * 100;

    // Update time spent (estimate based on step duration)
    const currentStep = session.steps[session.currentStepIndex - 1];
    session.progress.timeSpent += currentStep ? currentStep.estimatedDuration : 5;

    // Update estimated time remaining
    const remainingSteps = session.steps.length - session.currentStepIndex - 1;
    const avgTimePerStep = session.progress.timeSpent / (session.currentStepIndex + 1);
    session.progress.estimatedTimeRemaining = remainingSteps * avgTimePerStep;

    // Update analytics
    this.updateSessionAnalytics(session);
  }

  private updateSessionAnalytics(session: LearningSession): void {
    const { outcomes } = session.progress;
    
    if (outcomes.length === 0) return;

    // Update average step time (estimate based on completed steps)
    const completedSteps = session.steps.slice(0, session.currentStepIndex);
    session.analytics.averageStepTime = completedSteps.length > 0 ?
      completedSteps.reduce((sum, step) => sum + step.estimatedDuration, 0) / completedSteps.length : 0;

    // Update user satisfaction score (based on proficiency gained)
    session.analytics.userSatisfactionScore = 
      outcomes.reduce((sum, o) => sum + (o.proficiencyGained / 20), 0) / outcomes.length;

    // Update skills acquired
    const allSkills = outcomes.map(o => o.skill);
    session.analytics.skillsAcquired = [...new Set(allSkills)];

    // Update tools used
    const toolsFromSteps = session.steps.map(s => s.toolRequired);
    session.analytics.toolsUsed = [...new Set(toolsFromSteps)];

    // Update learning efficiency and error recovery rate
    session.analytics.learningEfficiency = this.calculateLearningEfficiency(session.id);
    session.analytics.errorRecoveryRate = session.analytics.failedActions > 0 ? 
      session.analytics.successfulActions / (session.analytics.successfulActions + session.analytics.failedActions) : 1;
  }
}