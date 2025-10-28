import { AdaptiveInstructor } from '../AdaptiveInstructor';
import { 
  ProcessedInput, 
  SentimentType,
  IntentType,
  AIResponseType
} from '../../types/ai';
import { 
  LearningStep, 
  LearningContext, 
  LearningOutcome
} from '../../types/learning';
import { 
  InputType, 
  ComplexityLevel, 
  SkillLevel 
} from '../../types/common';

describe('AdaptiveInstructor', () => {
  let instructor: AdaptiveInstructor;
  
  const mockLearningContext: LearningContext = {
    sessionId: 'test-session-123',
    previousSteps: [],
    currentTool: 'builder.io',
    userPreferences: {
      explanationDetail: 'moderate',
      learningPace: 'normal',
      preferredInputMethod: InputType.TEXT,
      enableVoiceGuidance: false,
      showCueCards: true,
      autoAdvance: false
    },
    environmentState: {
      activeBrowsers: ['chrome'],
      openTools: ['builder.io'],
      currentScreen: {
        width: 1920,
        height: 1080,
        scaleFactor: 1,
        colorDepth: 24
      },
      systemResources: {
        memoryUsage: 45,
        cpuUsage: 20,
        availableMemory: 8192
      }
    }
  };

  const mockLearningStep: LearningStep = {
    id: 'step-123',
    title: 'Create React Component',
    description: 'Learn to create a basic React component',
    toolRequired: 'builder.io',
    actions: [],
    explanation: 'We will create a simple React component to understand the basics',
    expectedOutcome: 'A functional React component is created',
    validationCriteria: {
      type: 'functional',
      criteria: [],
      successThreshold: 70
    },
    estimatedDuration: 20,
    complexity: ComplexityLevel.MEDIUM,
    prerequisites: ['JavaScript basics'],
    learningObjectives: ['React components', 'JSX syntax']
  };

  beforeEach(() => {
    instructor = new AdaptiveInstructor();
  });

  describe('adjustTeachingStyle', () => {
    it('should adjust teaching style for struggling learner', async () => {
      const strugglingOutcomes: LearningOutcome[] = [
        {
          stepId: 'step-1',
          success: false,
          completionTime: 35,
          userSatisfaction: 2,
          skillsAcquired: [],
          challengesEncountered: ['Complex syntax'],
          feedback: 'Found it difficult'
        },
        {
          stepId: 'step-2',
          success: false,
          completionTime: 40,
          userSatisfaction: 2,
          skillsAcquired: [],
          challengesEncountered: ['Understanding concepts'],
          feedback: 'Still struggling'
        }
      ];

      const adjustedStep = await instructor.adjustTeachingStyle(
        'user-123',
        mockLearningStep,
        strugglingOutcomes,
        mockLearningContext
      );

      expect(adjustedStep).toBeDefined();
      expect(adjustedStep.complexity).toBe(ComplexityLevel.LOW);
      expect(adjustedStep.estimatedDuration).toBeGreaterThan(mockLearningStep.estimatedDuration);
      expect(adjustedStep.explanation).toContain('[Simplified]');
    });

    it('should adjust teaching style for advanced learner', async () => {
      const advancedOutcomes: LearningOutcome[] = [
        {
          stepId: 'step-1',
          success: true,
          completionTime: 5, // Very fast completion
          userSatisfaction: 2, // Low satisfaction due to being too easy
          skillsAcquired: ['React components'],
          challengesEncountered: [],
          feedback: 'Too easy'
        },
        {
          stepId: 'step-2',
          success: true,
          completionTime: 6, // Very fast completion
          userSatisfaction: 2, // Low satisfaction due to being too easy
          skillsAcquired: ['JSX syntax'],
          challengesEncountered: [],
          feedback: 'Need more challenge'
        }
      ];

      const adjustedStep = await instructor.adjustTeachingStyle(
        'user-456',
        mockLearningStep,
        advancedOutcomes,
        mockLearningContext
      );

      expect(adjustedStep).toBeDefined();
      expect(adjustedStep.complexity).toBe(ComplexityLevel.HIGH);
      expect(adjustedStep.estimatedDuration).toBeLessThan(mockLearningStep.estimatedDuration);
      expect(adjustedStep.explanation).toContain('[Advanced]');
    });

    it('should handle new user with no progress history', async () => {
      const adjustedStep = await instructor.adjustTeachingStyle(
        'new-user-789',
        mockLearningStep,
        [],
        mockLearningContext
      );

      expect(adjustedStep).toBeDefined();
      expect(adjustedStep.id).toBe(mockLearningStep.id);
      expect(adjustedStep.complexity).toBe(mockLearningStep.complexity);
    });
  });

  describe('analyzeUserUnderstanding', () => {
    it('should analyze understanding for successful learner', () => {
      const successfulOutcomes: LearningOutcome[] = [
        {
          stepId: 'step-1',
          success: true,
          completionTime: 15,
          userSatisfaction: 4,
          skillsAcquired: ['React components'],
          challengesEncountered: [],
          feedback: 'Good progress'
        },
        {
          stepId: 'step-2',
          success: true,
          completionTime: 18,
          userSatisfaction: 5,
          skillsAcquired: ['JSX syntax'],
          challengesEncountered: [],
          feedback: 'Understanding well'
        }
      ];

      const analysis = instructor.analyzeUserUnderstanding('user-123', successfulOutcomes);

      expect(analysis).toBeDefined();
      expect(analysis.overallLevel).toBeGreaterThan(0.6);
      expect(analysis.conceptMastery.size).toBeGreaterThan(0);
      expect(analysis.strengths.length).toBeGreaterThan(0);
      expect(analysis.strugglingAreas.length).toBe(0);
    });

    it('should analyze understanding for struggling learner', () => {
      const strugglingOutcomes: LearningOutcome[] = [
        {
          stepId: 'step-1',
          success: false,
          completionTime: 45,
          userSatisfaction: 2,
          skillsAcquired: [],
          challengesEncountered: ['Complex syntax', 'Understanding JSX'],
          feedback: 'Very difficult'
        },
        {
          stepId: 'step-2',
          success: false,
          completionTime: 50,
          userSatisfaction: 1,
          skillsAcquired: [],
          challengesEncountered: ['React concepts'],
          feedback: 'Still confused'
        }
      ];

      const analysis = instructor.analyzeUserUnderstanding('user-456', strugglingOutcomes);

      expect(analysis).toBeDefined();
      expect(analysis.overallLevel).toBeLessThan(0.4);
      expect(analysis.recommendedAdjustments).toContain('reduce_difficulty');
      expect(analysis.strugglingAreas.length).toBe(0); // No skills acquired to analyze
    });

    it('should handle empty outcomes gracefully', () => {
      const analysis = instructor.analyzeUserUnderstanding('user-789', []);

      expect(analysis).toBeDefined();
      expect(analysis.overallLevel).toBe(0.5);
      expect(analysis.learningVelocity).toBe(0.5);
      expect(analysis.recommendedAdjustments).toContain('baseline_assessment');
    });
  });

  describe('adjustDifficulty', () => {
    it('should decrease difficulty for low understanding', () => {
      const lowUnderstandingAnalysis = {
        overallLevel: 0.3,
        conceptMastery: new Map(),
        learningVelocity: 0.2,
        strugglingAreas: ['React components', 'JSX'],
        strengths: [],
        recommendedAdjustments: ['reduce_difficulty']
      };

      const adjustedStep = instructor.adjustDifficulty(
        mockLearningStep,
        lowUnderstandingAnalysis,
        mockLearningContext
      );

      expect(adjustedStep.complexity).toBe(ComplexityLevel.LOW);
      expect(adjustedStep.estimatedDuration).toBeGreaterThan(mockLearningStep.estimatedDuration);
      expect(adjustedStep.explanation).toContain('[Simplified]');
      expect(adjustedStep.prerequisites.length).toBeLessThanOrEqual(1);
    });

    it('should increase difficulty for high understanding', () => {
      const highUnderstandingAnalysis = {
        overallLevel: 0.9,
        conceptMastery: new Map([['React components', 0.9], ['JSX', 0.8]]),
        learningVelocity: 0.8,
        strugglingAreas: [],
        strengths: ['React components', 'JSX'],
        recommendedAdjustments: ['increase_challenge']
      };

      const adjustedStep = instructor.adjustDifficulty(
        mockLearningStep,
        highUnderstandingAnalysis,
        mockLearningContext
      );

      expect(adjustedStep.complexity).toBe(ComplexityLevel.HIGH);
      expect(adjustedStep.estimatedDuration).toBeLessThan(mockLearningStep.estimatedDuration);
      expect(adjustedStep.explanation).toContain('[Advanced]');
    });

    it('should focus on struggling areas', () => {
      const strugglingAnalysis = {
        overallLevel: 0.6,
        conceptMastery: new Map(),
        learningVelocity: 0.5,
        strugglingAreas: ['React components'],
        strengths: [],
        recommendedAdjustments: []
      };

      const adjustedStep = instructor.adjustDifficulty(
        mockLearningStep,
        strugglingAnalysis,
        mockLearningContext
      );

      expect(adjustedStep.description).toContain('Focus on: React components');
      expect(adjustedStep.estimatedDuration).toBeGreaterThan(mockLearningStep.estimatedDuration);
    });
  });

  describe('personalizeInstruction', () => {
    it('should personalize for minimal explanation preference', () => {
      const minimalContext = {
        ...mockLearningContext,
        userPreferences: {
          ...mockLearningContext.userPreferences,
          explanationDetail: 'minimal' as const
        }
      };

      const mockProfile = {
        userId: 'user-123',
        totalStepsCompleted: 5,
        successRate: 0.8,
        averageCompletionTime: 15,
        preferredLearningStyle: null,
        strugglingConcepts: [],
        masteredConcepts: [],
        adaptationHistory: [],
        lastUpdated: new Date()
      };

      const personalizedStep = instructor.personalizeInstruction(
        mockLearningStep,
        minimalContext,
        mockProfile
      );

      expect(personalizedStep.explanation.length).toBeLessThanOrEqual(mockLearningStep.explanation.length);
    });

    it('should personalize for detailed explanation preference', () => {
      const detailedContext = {
        ...mockLearningContext,
        userPreferences: {
          ...mockLearningContext.userPreferences,
          explanationDetail: 'detailed' as const
        }
      };

      const mockProfile = {
        userId: 'user-123',
        totalStepsCompleted: 5,
        successRate: 0.8,
        averageCompletionTime: 15,
        preferredLearningStyle: null,
        strugglingConcepts: [],
        masteredConcepts: [],
        adaptationHistory: [],
        lastUpdated: new Date()
      };

      const personalizedStep = instructor.personalizeInstruction(
        mockLearningStep,
        detailedContext,
        mockProfile
      );

      expect(personalizedStep.explanation.length).toBeGreaterThan(mockLearningStep.explanation.length);
      expect(personalizedStep.explanation).toContain('This will help you understand');
    });

    it('should adjust pacing for slow learners', () => {
      const slowContext = {
        ...mockLearningContext,
        userPreferences: {
          ...mockLearningContext.userPreferences,
          learningPace: 'slow' as const
        }
      };

      const mockProfile = {
        userId: 'user-123',
        totalStepsCompleted: 5,
        successRate: 0.8,
        averageCompletionTime: 15,
        preferredLearningStyle: null,
        strugglingConcepts: [],
        masteredConcepts: [],
        adaptationHistory: [],
        lastUpdated: new Date()
      };

      const personalizedStep = instructor.personalizeInstruction(
        mockLearningStep,
        slowContext,
        mockProfile
      );

      expect(personalizedStep.estimatedDuration).toBeGreaterThan(mockLearningStep.estimatedDuration);
      expect(personalizedStep.description).toContain('Take your time');
    });

    it('should adjust pacing for fast learners', () => {
      const fastContext = {
        ...mockLearningContext,
        userPreferences: {
          ...mockLearningContext.userPreferences,
          learningPace: 'fast' as const
        }
      };

      const mockProfile = {
        userId: 'user-123',
        totalStepsCompleted: 5,
        successRate: 0.8,
        averageCompletionTime: 15,
        preferredLearningStyle: null,
        strugglingConcepts: [],
        masteredConcepts: [],
        adaptationHistory: [],
        lastUpdated: new Date()
      };

      const personalizedStep = instructor.personalizeInstruction(
        mockLearningStep,
        fastContext,
        mockProfile
      );

      expect(personalizedStep.estimatedDuration).toBeLessThan(mockLearningStep.estimatedDuration);
      expect(personalizedStep.description).toContain('Quick overview');
    });

    it('should add learning style guidance', () => {
      const mockProfile = {
        userId: 'user-123',
        totalStepsCompleted: 5,
        successRate: 0.8,
        averageCompletionTime: 15,
        preferredLearningStyle: 'visual',
        strugglingConcepts: [],
        masteredConcepts: [],
        adaptationHistory: [],
        lastUpdated: new Date()
      };

      const personalizedStep = instructor.personalizeInstruction(
        mockLearningStep,
        mockLearningContext,
        mockProfile
      );

      expect(personalizedStep.explanation).toContain('visual elements');
    });

    it('should make content voice-friendly when enabled', () => {
      const voiceContext = {
        ...mockLearningContext,
        userPreferences: {
          ...mockLearningContext.userPreferences,
          enableVoiceGuidance: true
        }
      };

      const mockProfile = {
        userId: 'user-123',
        totalStepsCompleted: 5,
        successRate: 0.8,
        averageCompletionTime: 15,
        preferredLearningStyle: null,
        strugglingConcepts: [],
        masteredConcepts: [],
        adaptationHistory: [],
        lastUpdated: new Date()
      };

      const personalizedStep = instructor.personalizeInstruction(
        mockLearningStep,
        voiceContext,
        mockProfile
      );

      // Voice-friendly text should not contain abbreviations
      expect(personalizedStep.explanation).not.toContain('e.g.');
      expect(personalizedStep.explanation).not.toContain('i.e.');
    });
  });

  describe('generateAdaptiveResponse', () => {
    it('should generate adaptive response for new user', async () => {
      const processedInput: ProcessedInput = {
        id: 'input-123',
        originalInput: 'I want to learn React',
        inputType: InputType.TEXT,
        processedText: 'i want to learn react',
        extractedEntities: [],
        intent: {
          primary: IntentType.LEARN_SKILL,
          confidence: 0.8,
          parameters: { targetSkill: 'React' },
          clarificationNeeded: false
        },
        sentiment: {
          overall: SentimentType.POSITIVE,
          confidence: 0.7,
          emotions: [],
          frustrationLevel: 0,
          engagementLevel: 0.8,
          motivationLevel: 0.9
        },
        confidence: 0.8,
        processingTime: 100,
        metadata: {
          processingSteps: [],
          modelUsed: 'test-model',
          apiCalls: 1,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };

      const response = await instructor.generateAdaptiveResponse(
        processedInput,
        mockLearningContext,
        'new-user-123'
      );

      expect(response).toBeDefined();
      expect(response.type).toBe(AIResponseType.INSTRUCTION);
      expect(response.content).toContain('React');
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.metadata.reasoningSteps).toContain('Analyzed user progress profile: new user');
    });

    it('should generate supportive response for frustrated user', async () => {
      const frustratedInput: ProcessedInput = {
        id: 'input-456',
        originalInput: 'This is too difficult, I am stuck',
        inputType: InputType.TEXT,
        processedText: 'this is too difficult, i am stuck',
        extractedEntities: [],
        intent: {
          primary: IntentType.GET_HELP,
          confidence: 0.7,
          parameters: {},
          clarificationNeeded: false
        },
        sentiment: {
          overall: SentimentType.NEGATIVE,
          confidence: 0.8,
          emotions: [],
          frustrationLevel: 0.8,
          engagementLevel: 0.3,
          motivationLevel: 0.2
        },
        confidence: 0.6,
        processingTime: 120,
        metadata: {
          processingSteps: [],
          modelUsed: 'test-model',
          apiCalls: 1,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };

      const response = await instructor.generateAdaptiveResponse(
        frustratedInput,
        mockLearningContext,
        'frustrated-user-456'
      );

      expect(response).toBeDefined();
      expect(response.type).toBe(AIResponseType.SUGGESTION);
      expect(response.content).toContain('challenging');
      expect(response.content).toContain('together');
    });

    it('should generate encouraging response for positive user', async () => {
      const positiveInput: ProcessedInput = {
        id: 'input-789',
        originalInput: 'I love learning React, what is next?',
        inputType: InputType.TEXT,
        processedText: 'i love learning react, what is next?',
        extractedEntities: [],
        intent: {
          primary: IntentType.LEARN_SKILL,
          confidence: 0.9,
          parameters: { targetSkill: 'React' },
          clarificationNeeded: false
        },
        sentiment: {
          overall: SentimentType.POSITIVE,
          confidence: 0.9,
          emotions: [],
          frustrationLevel: 0,
          engagementLevel: 0.9,
          motivationLevel: 0.9
        },
        confidence: 0.9,
        processingTime: 80,
        metadata: {
          processingSteps: [],
          modelUsed: 'test-model',
          apiCalls: 1,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };

      const response = await instructor.generateAdaptiveResponse(
        positiveInput,
        mockLearningContext,
        'positive-user-789'
      );

      expect(response).toBeDefined();
      expect(response.content).toContain('Great attitude!');
    });
  });

  describe('error handling', () => {
    it('should handle teaching style adjustment errors gracefully', async () => {
      // Pass invalid parameters to trigger error
      await expect(
        instructor.adjustTeachingStyle(
          '', // empty userId
          {} as LearningStep, // invalid step
          [],
          mockLearningContext
        )
      ).rejects.toThrow('Teaching style adjustment failed');
    });

    it('should handle adaptive response generation errors gracefully', async () => {
      const invalidInput = {} as ProcessedInput;

      await expect(
        instructor.generateAdaptiveResponse(
          invalidInput,
          mockLearningContext,
          'user-123'
        )
      ).rejects.toThrow('Adaptive response generation failed');
    });
  });
});