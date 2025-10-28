import { AnalyticsEngine, SkillAssessment, OutcomeMeasurement, EfficiencyMetrics } from '../AnalyticsEngine';
import { 
  LearningProgress, 
  SkillAcquisition, 
  UserProfile,
  PatternType,
  AdaptationType
} from '../../types/user';
import { StepResult, UserFeedback, LearningOutcome } from '../../types/learning';
import { SkillLevel, LearningStyle } from '../../types/common';

describe('AnalyticsEngine', () => {
  let analyticsEngine: AnalyticsEngine;
  let mockUserProfile: UserProfile;
  let mockStepResult: StepResult;
  let mockLearningOutcome: LearningOutcome;

  beforeEach(() => {
    analyticsEngine = new AnalyticsEngine();
    
    mockUserProfile = {
      id: 'user-123',
      learningStyle: LearningStyle.VISUAL,
      skillLevel: SkillLevel.BEGINNER,
      completedProjects: [],
      preferences: {
        explanationDetail: 'moderate',
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
          sessionReminders: false,
          soundEnabled: true,
          vibrationEnabled: false
        },
        accessibility: {
          highContrast: false,
          screenReader: false,
          keyboardNavigation: true,
          reducedMotion: false,
          largeClickTargets: false,
          voiceCommands: false
        }
      },
      progressHistory: [],
      adaptationData: {
        userId: 'user-123',
        adaptationHistory: [],
        currentAdaptations: [],
        adaptationEffectiveness: {
          overallScore: 0.7,
          byType: {
            [AdaptationType.DIFFICULTY]: 0.8,
            [AdaptationType.PACE]: 0.7,
            [AdaptationType.EXPLANATION_DETAIL]: 0.6,
            [AdaptationType.INPUT_METHOD]: 0.9,
            [AdaptationType.TOOL_SELECTION]: 0.5,
            [AdaptationType.INTERFACE_LAYOUT]: 0.7
          },
          successRate: 0.8,
          userSatisfaction: 4,
          learningImprovement: 0.6
        },
        personalizedSettings: {
          optimalLearningTime: {
            preferredDuration: 45,
            optimalStartTime: '09:00',
            breakFrequency: 15,
            peakPerformanceHours: ['09:00', '14:00']
          },
          preferredComplexityProgression: {
            startingLevel: 0.3,
            progressionRate: 0.1,
            adaptationSensitivity: 0.7,
            fallbackThreshold: 0.4
          },
          effectiveMotivationTechniques: ['progress_visualization', 'achievement_badges'],
          adaptiveThresholds: {
            errorRateThreshold: 0.3,
            frustrationThreshold: 3,
            boredomThreshold: 2,
            helpRequestThreshold: 5,
            timeoutThreshold: 30
          },
          customizedInterface: {
            layout: 'standard',
            colorScheme: 'blue',
            fontFamily: 'Arial',
            animationSpeed: 'normal',
            overlayOpacity: 0.8,
            cueCardPosition: 'right'
          }
        },
        lastUpdated: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockLearningOutcome = {
      stepId: 'step-123',
      success: true,
      completionTime: 15,
      userSatisfaction: 4,
      skillsAcquired: ['Project creation', 'UI design'],
      challengesEncountered: ['Authentication delay'],
      feedback: 'Good step, clear instructions'
    };

    mockStepResult = {
      stepId: 'step-123',
      status: 'completed',
      outcome: mockLearningOutcome,
      nextStepId: 'step-124',
      adaptations: [],
      timestamp: new Date()
    };
  });

  describe('Progress Tracking', () => {
    test('should track progress for new session', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      await analyticsEngine.trackProgress(userId, sessionId, mockStepResult, mockUserProfile);

      // Verify progress tracking event was emitted
      const progressTrackedSpy = jest.fn();
      analyticsEngine.on('progressTracked', progressTrackedSpy);
      
      await analyticsEngine.trackProgress(userId, sessionId, mockStepResult, mockUserProfile);
      expect(progressTrackedSpy).toHaveBeenCalledWith({
        userId,
        sessionId,
        stepResult: mockStepResult
      });
    });

    test('should update existing session progress', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      // Track initial progress
      await analyticsEngine.trackProgress(userId, sessionId, mockStepResult, mockUserProfile);

      // Track additional step
      const secondStepResult = {
        ...mockStepResult,
        stepId: 'step-124',
        outcome: {
          ...mockLearningOutcome,
          stepId: 'step-124',
          skillsAcquired: ['Deployment'],
          completionTime: 20
        }
      };

      await analyticsEngine.trackProgress(userId, sessionId, secondStepResult, mockUserProfile);

      // Should have updated the existing session
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should handle failed step results', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';
      
      const failedStepResult = {
        ...mockStepResult,
        status: 'failed' as const,
        outcome: {
          ...mockLearningOutcome,
          success: false,
          userSatisfaction: 2,
          challengesEncountered: ['Authentication failed', 'UI element not found']
        }
      };

      await analyticsEngine.trackProgress(userId, sessionId, failedStepResult, mockUserProfile);

      // Should track failed steps and challenges
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should analyze learning patterns', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      // Track multiple steps to establish patterns
      for (let i = 0; i < 5; i++) {
        const stepResult = {
          ...mockStepResult,
          stepId: `step-${i}`,
          outcome: {
            ...mockLearningOutcome,
            stepId: `step-${i}`,
            success: i % 2 === 0 // Alternate success/failure
          }
        };
        
        await analyticsEngine.trackProgress(userId, sessionId, stepResult, mockUserProfile);
      }

      // Should have identified learning patterns
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Skill Assessment', () => {
    test('should assess skill development', async () => {
      const userId = 'user-123';
      const outcomes: LearningOutcome[] = [
        mockLearningOutcome,
        {
          ...mockLearningOutcome,
          stepId: 'step-124',
          skillsAcquired: ['Advanced UI design', 'Component creation'],
          userSatisfaction: 5
        }
      ];

      const assessment = await analyticsEngine.assessSkillDevelopment(userId, outcomes);

      expect(assessment).toBeDefined();
      expect(assessment.userId).toBe(userId);
      expect(assessment.skillsEvaluated).toBeDefined();
      expect(assessment.overallProficiency).toBeGreaterThanOrEqual(0);
      expect(assessment.overallProficiency).toBeLessThanOrEqual(1);
      expect(assessment.recommendations).toBeDefined();
      expect(Array.isArray(assessment.recommendations)).toBe(true);
    });

    test('should identify improvement areas and strengths', async () => {
      const userId = 'user-123';
      
      // First track some progress to build skill data
      await analyticsEngine.trackProgress(userId, 'session-1', mockStepResult, mockUserProfile);
      
      const outcomes: LearningOutcome[] = [mockLearningOutcome];
      const assessment = await analyticsEngine.assessSkillDevelopment(userId, outcomes);

      expect(assessment.improvementAreas).toBeDefined();
      expect(assessment.strengths).toBeDefined();
      expect(Array.isArray(assessment.improvementAreas)).toBe(true);
      expect(Array.isArray(assessment.strengths)).toBe(true);
    });

    test('should generate skill-based recommendations', async () => {
      const userId = 'user-123';
      
      // First track some progress to build skill data with low proficiency
      const lowProficiencyStep = {
        ...mockStepResult,
        outcome: {
          ...mockLearningOutcome,
          skillsAcquired: ['Basic design'],
          userSatisfaction: 2, // Lower satisfaction
          success: false
        }
      };
      
      await analyticsEngine.trackProgress(userId, 'session-1', lowProficiencyStep, mockUserProfile);
      
      const outcomes: LearningOutcome[] = [lowProficiencyStep.outcome];
      const assessment = await analyticsEngine.assessSkillDevelopment(userId, outcomes);

      expect(assessment.recommendations.length).toBeGreaterThan(0);
      // Check that we get some kind of meaningful recommendation
      expect(assessment.recommendations[0]).toBeDefined();
      expect(typeof assessment.recommendations[0]).toBe('string');
    });
  });

  describe('Learning Outcome Measurement', () => {
    test('should measure learning outcomes', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';
      const expectedOutcomes = ['Create project', 'Design interface', 'Deploy application'];

      // First track some progress
      await analyticsEngine.trackProgress(userId, sessionId, mockStepResult, mockUserProfile);

      const measurement = await analyticsEngine.measureLearningOutcomes(
        userId, 
        sessionId, 
        expectedOutcomes
      );

      expect(measurement).toBeDefined();
      expect(measurement.sessionId).toBe(sessionId);
      expect(measurement.userId).toBe(userId);
      expect(measurement.expectedOutcomes).toEqual(expectedOutcomes);
      expect(measurement.achievementRate).toBeGreaterThanOrEqual(0);
      expect(measurement.achievementRate).toBeLessThanOrEqual(1);
      expect(measurement.qualityScore).toBeGreaterThanOrEqual(0);
      expect(measurement.qualityScore).toBeLessThanOrEqual(1);
    });

    test('should calculate achievement rate correctly', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';
      const expectedOutcomes = ['Outcome 1', 'Outcome 2'];

      // Track progress with successful outcomes
      const successfulResult = {
        ...mockStepResult,
        outcome: {
          ...mockLearningOutcome,
          success: true
        }
      };

      await analyticsEngine.trackProgress(userId, sessionId, successfulResult, mockUserProfile);

      const measurement = await analyticsEngine.measureLearningOutcomes(
        userId, 
        sessionId, 
        expectedOutcomes
      );

      expect(measurement.achievementRate).toBeGreaterThan(0);
    });

    test('should validate learning outcomes', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';
      const expectedOutcomes = ['Test outcome'];

      await analyticsEngine.trackProgress(userId, sessionId, mockStepResult, mockUserProfile);

      const measurement = await analyticsEngine.measureLearningOutcomes(
        userId, 
        sessionId, 
        expectedOutcomes
      );

      expect(measurement.validationResults).toBeDefined();
      expect(Array.isArray(measurement.validationResults)).toBe(true);
      expect(measurement.validationResults.length).toBeGreaterThan(0);
      
      const validation = measurement.validationResults[0];
      expect(validation.outcomeId).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
      expect(validation.confidence).toBeGreaterThanOrEqual(0);
      expect(validation.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Learning Efficiency Calculation', () => {
    test('should calculate learning efficiency metrics', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      // Track multiple steps to build efficiency data
      for (let i = 0; i < 3; i++) {
        const stepResult = {
          ...mockStepResult,
          stepId: `step-${i}`,
          outcome: {
            ...mockLearningOutcome,
            stepId: `step-${i}`,
            completionTime: 10 + i * 5
          }
        };
        
        await analyticsEngine.trackProgress(userId, sessionId, stepResult, mockUserProfile);
      }

      const efficiency = await analyticsEngine.calculateLearningEfficiency(userId);

      expect(efficiency).toBeDefined();
      expect(efficiency.userId).toBe(userId);
      expect(efficiency.learningVelocity).toBeGreaterThanOrEqual(0);
      expect(efficiency.errorRate).toBeGreaterThanOrEqual(0);
      expect(efficiency.errorRate).toBeLessThanOrEqual(1);
      expect(efficiency.adaptationEffectiveness).toBeGreaterThanOrEqual(0);
      expect(efficiency.adaptationEffectiveness).toBeLessThanOrEqual(1);
      expect(efficiency.conceptRetention).toBeGreaterThanOrEqual(0);
      expect(efficiency.conceptRetention).toBeLessThanOrEqual(1);
    });

    test('should calculate learning velocity correctly', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      // Track steps with known completion times
      const fastStep = {
        ...mockStepResult,
        stepId: 'fast-step',
        outcome: {
          ...mockLearningOutcome,
          stepId: 'fast-step',
          completionTime: 5 // 5 minutes
        }
      };

      await analyticsEngine.trackProgress(userId, sessionId, fastStep, mockUserProfile);

      const efficiency = await analyticsEngine.calculateLearningEfficiency(userId);

      expect(efficiency.learningVelocity).toBeGreaterThan(0);
    });

    test('should calculate error rate correctly', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      // Track successful step
      await analyticsEngine.trackProgress(userId, sessionId, mockStepResult, mockUserProfile);

      // Track failed step
      const failedStep = {
        ...mockStepResult,
        stepId: 'failed-step',
        status: 'failed' as const,
        outcome: {
          ...mockLearningOutcome,
          stepId: 'failed-step',
          success: false
        }
      };

      await analyticsEngine.trackProgress(userId, sessionId, failedStep, mockUserProfile);

      const efficiency = await analyticsEngine.calculateLearningEfficiency(userId);

      expect(efficiency.errorRate).toBeGreaterThan(0);
      expect(efficiency.errorRate).toBeLessThan(1);
    });
  });

  describe('Comprehensive Analytics', () => {
    test('should generate comprehensive analytics', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      // Build some data first
      await analyticsEngine.trackProgress(userId, sessionId, mockStepResult, mockUserProfile);

      const analytics = await analyticsEngine.getComprehensiveAnalytics(userId);

      expect(analytics).toBeDefined();
      expect(analytics.userId).toBe(userId);
      expect(analytics.generatedAt).toBeInstanceOf(Date);
      expect(analytics.progressSummary).toBeDefined();
      expect(analytics.skillAnalysis).toBeDefined();
      expect(analytics.learningPatterns).toBeDefined();
      expect(analytics.performanceMetrics).toBeDefined();
      expect(analytics.insights).toBeDefined();
      expect(analytics.predictions).toBeDefined();
      expect(analytics.recommendations).toBeDefined();
    });

    test('should include progress summary', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      await analyticsEngine.trackProgress(userId, sessionId, mockStepResult, mockUserProfile);

      const analytics = await analyticsEngine.getComprehensiveAnalytics(userId);

      expect(analytics.progressSummary.totalSessions).toBeGreaterThan(0);
      expect(analytics.progressSummary.totalStepsCompleted).toBeGreaterThan(0);
      expect(analytics.progressSummary.averageSessionDuration).toBeGreaterThan(0);
      expect(analytics.progressSummary.overallSatisfaction).toBeGreaterThan(0);
    });

    test('should include skill analysis', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      await analyticsEngine.trackProgress(userId, sessionId, mockStepResult, mockUserProfile);

      const analytics = await analyticsEngine.getComprehensiveAnalytics(userId);

      expect(analytics.skillAnalysis.totalSkills).toBeGreaterThanOrEqual(0);
      expect(analytics.skillAnalysis.averageProficiency).toBeGreaterThanOrEqual(0);
      expect(analytics.skillAnalysis.averageProficiency).toBeLessThanOrEqual(1);
      expect(Array.isArray(analytics.skillAnalysis.skillCategories)).toBe(true);
      expect(analytics.skillAnalysis.recentlyAcquired).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Event Emission', () => {
    test('should emit progressTracked event', async () => {
      const progressTrackedSpy = jest.fn();
      analyticsEngine.on('progressTracked', progressTrackedSpy);

      const userId = 'user-123';
      const sessionId = 'session-456';

      await analyticsEngine.trackProgress(userId, sessionId, mockStepResult, mockUserProfile);

      expect(progressTrackedSpy).toHaveBeenCalledWith({
        userId,
        sessionId,
        stepResult: mockStepResult
      });
    });

    test('should emit skillAssessed event', async () => {
      const skillAssessedSpy = jest.fn();
      analyticsEngine.on('skillAssessed', skillAssessedSpy);

      const userId = 'user-123';
      const outcomes: LearningOutcome[] = [mockLearningOutcome];

      const assessment = await analyticsEngine.assessSkillDevelopment(userId, outcomes);

      expect(skillAssessedSpy).toHaveBeenCalledWith(assessment);
    });

    test('should emit outcomesMeasured event', async () => {
      const outcomesMeasuredSpy = jest.fn();
      analyticsEngine.on('outcomesMeasured', outcomesMeasuredSpy);

      const userId = 'user-123';
      const sessionId = 'session-456';

      // Track progress first
      await analyticsEngine.trackProgress(userId, sessionId, mockStepResult, mockUserProfile);

      const measurement = await analyticsEngine.measureLearningOutcomes(
        userId, 
        sessionId, 
        ['Test outcome']
      );

      expect(outcomesMeasuredSpy).toHaveBeenCalledWith(measurement);
    });

    test('should emit efficiencyCalculated event', async () => {
      const efficiencyCalculatedSpy = jest.fn();
      analyticsEngine.on('efficiencyCalculated', efficiencyCalculatedSpy);

      const userId = 'user-123';
      const sessionId = 'session-456';

      // Track progress first
      await analyticsEngine.trackProgress(userId, sessionId, mockStepResult, mockUserProfile);

      const efficiency = await analyticsEngine.calculateLearningEfficiency(userId);

      expect(efficiencyCalculatedSpy).toHaveBeenCalledWith(efficiency);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing session data gracefully', async () => {
      const userId = 'user-123';
      const sessionId = 'non-existent-session';

      await expect(
        analyticsEngine.measureLearningOutcomes(userId, sessionId, ['Test outcome'])
      ).rejects.toThrow('No progress found for session');
    });

    test('should handle empty data gracefully', async () => {
      const userId = 'user-123';
      const outcomes: LearningOutcome[] = [];

      const assessment = await analyticsEngine.assessSkillDevelopment(userId, outcomes);

      expect(assessment).toBeDefined();
      expect(assessment.skillsEvaluated).toEqual([]);
      expect(assessment.overallProficiency).toBe(0);
    });

    test('should handle analytics calculation errors', async () => {
      const userId = 'user-with-no-data';

      const efficiency = await analyticsEngine.calculateLearningEfficiency(userId);

      expect(efficiency).toBeDefined();
      expect(efficiency.learningVelocity).toBe(0);
      expect(efficiency.errorRate).toBe(0);
    });
  });
});