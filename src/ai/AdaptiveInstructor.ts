import { v4 as uuidv4 } from 'uuid';
import { 
  ProcessedInput, 
  AIResponse,
  AIResponseType,
  SentimentType
} from '../types/ai';
import { 
  LearningStep, 
  LearningContext, 
  StepResult,
  StepAdaptation,
  LearningOutcome,
  UserFeedback
} from '../types/learning';
import { 
  SkillLevel, 
  ComplexityLevel 
} from '../types/common';

// Extended outcome interface for internal adaptive instructor use
interface ExtendedLearningOutcome extends LearningOutcome {
  success?: boolean;
  userSatisfaction?: number; // 1-5 scale
  completionTime?: number; // in minutes
  challengesEncountered?: string[];
  skillsAcquired?: string[];
}

/**
 * AdaptiveInstructor adjusts teaching style based on user progress
 */
export class AdaptiveInstructor {
  private userProgressHistory: Map<string, UserProgressProfile> = new Map();
  private adaptationStrategies: Map<string, AdaptationStrategy> = new Map();
  private difficultyAdjustmentThresholds: DifficultyThresholds = {
    decreaseThreshold: 0.4,
    increaseThreshold: 0.8,
    stabilityRange: 0.1
  };

  constructor() {
    this.initializeAdaptationStrategies();
    this.initializeDifficultyThresholds();
  }

  /**
   * Adjust teaching style based on user progress and preferences
   */
  async adjustTeachingStyle(
    userId: string,
    currentStep: LearningStep,
    userProgress: LearningOutcome[],
    context: LearningContext
  ): Promise<LearningStep> {
    try {
      // Validate inputs
      if (!userId || !currentStep || !currentStep.id) {
        throw new Error('Invalid input parameters');
      }
      
      // Get or create user progress profile
      const progressProfile = this.getUserProgressProfile(userId, userProgress);
      
      // Analyze current performance
      const performanceAnalysis = this.analyzePerformance(userProgress);
      
      // Determine needed adaptations
      const adaptations = this.determineAdaptations(
        progressProfile, 
        performanceAnalysis, 
        currentStep,
        context
      );
      
      // Apply adaptations to the step
      const adaptedStep = this.applyAdaptations(currentStep, adaptations);
      
      // Update user progress profile
      this.updateProgressProfile(userId, progressProfile, performanceAnalysis);
      
      return adaptedStep;
    } catch (error) {
      throw new Error(`Teaching style adjustment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze user understanding levels from progress data
   */
  analyzeUserUnderstanding(
    userId: string,
    recentOutcomes: LearningOutcome[]
  ): UserUnderstandingAnalysis {
    const progressProfile = this.userProgressHistory.get(userId);
    
    if (!recentOutcomes.length) {
      return {
        overallLevel: 0.5,
        conceptMastery: new Map(),
        learningVelocity: 0.5,
        strugglingAreas: [],
        strengths: [],
        recommendedAdjustments: ['baseline_assessment']
      };
    }

    // Calculate overall understanding level
    const successRate = recentOutcomes.filter(o => this.getSuccess(o)).length / recentOutcomes.length;
    const avgSatisfaction = recentOutcomes.reduce((sum, o) => sum + this.getUserSatisfaction(o), 0) / recentOutcomes.length;
    const avgCompletionTime = recentOutcomes.reduce((sum, o) => sum + this.getCompletionTime(o), 0) / recentOutcomes.length;
    
    const overallLevel = (successRate * 0.4 + (avgSatisfaction / 5) * 0.3 + (1 - Math.min(avgCompletionTime / 30, 1)) * 0.3);

    // Analyze concept mastery
    const conceptMastery = new Map<string, number>();
    recentOutcomes.forEach(outcome => {
      this.getSkillsAcquired(outcome).forEach(skill => {
        const currentMastery = conceptMastery.get(skill) || 0.5; // Start with baseline
        const newMastery = this.getSuccess(outcome) ? Math.min(currentMastery + 0.3, 1) : Math.max(currentMastery - 0.2, 0);
        conceptMastery.set(skill, newMastery);
      });
    });

    // Calculate learning velocity (improvement over time)
    const learningVelocity = this.calculateLearningVelocity(recentOutcomes);

    // Identify struggling areas and strengths
    const strugglingAreas = Array.from(conceptMastery.entries())
      .filter(([_, mastery]) => mastery < 0.4)
      .map(([concept, _]) => concept);

    const strengths = Array.from(conceptMastery.entries())
      .filter(([_, mastery]) => mastery > 0.7)
      .map(([concept, _]) => concept);

    // Generate recommendations
    const recommendedAdjustments = this.generateAdjustmentRecommendations(
      overallLevel, 
      learningVelocity, 
      strugglingAreas.length,
      progressProfile
    );

    return {
      overallLevel,
      conceptMastery,
      learningVelocity,
      strugglingAreas,
      strengths,
      recommendedAdjustments
    };
  }

  /**
   * Implement difficulty adjustment mechanisms
   */
  adjustDifficulty(
    currentStep: LearningStep,
    understandingAnalysis: UserUnderstandingAnalysis,
    context: LearningContext
  ): LearningStep {
    const { overallLevel, learningVelocity, strugglingAreas } = understandingAnalysis;
    const adjustedStep = { ...currentStep };

    // Adjust complexity based on understanding level
    if (overallLevel < this.difficultyAdjustmentThresholds.decreaseThreshold) {
      // Decrease difficulty
      adjustedStep.complexity = this.decreaseComplexity(currentStep.complexity);
      adjustedStep.estimatedDuration = Math.round(currentStep.estimatedDuration * 1.3);
      adjustedStep.explanation = `[Simplified] ${currentStep.explanation}`;
      adjustedStep.prerequisites = currentStep.prerequisites.slice(0, 1); // Reduce prerequisites
    } else if (overallLevel > this.difficultyAdjustmentThresholds.increaseThreshold && learningVelocity > 0.7) {
      // Increase difficulty
      adjustedStep.complexity = this.increaseComplexity(currentStep.complexity);
      adjustedStep.estimatedDuration = Math.round(currentStep.estimatedDuration * 0.8);
      adjustedStep.explanation = `[Advanced] ${currentStep.explanation}`;
      // Keep all prerequisites for advanced learners
    }

    // Adjust based on struggling areas
    if (strugglingAreas.length > 0) {
      const relevantStruggles = strugglingAreas.filter(area => 
        currentStep.learningObjectives.some(obj => obj.toLowerCase().includes(area.toLowerCase()))
      );
      
      if (relevantStruggles.length > 0) {
        adjustedStep.description += ` (Focus on: ${relevantStruggles.join(', ')})`;
        adjustedStep.estimatedDuration = Math.round(adjustedStep.estimatedDuration * 1.2);
      }
    }

    return adjustedStep;
  }

  /**
   * Add personalization based on learning style preferences
   */
  personalizeInstruction(
    step: LearningStep,
    context: LearningContext,
    progressProfile: UserProgressProfile
  ): LearningStep {
    const personalizedStep = { ...step };
    const { userPreferences } = context;

    // Adjust explanation detail level
    switch (userPreferences.explanationDetail) {
      case 'minimal':
        personalizedStep.explanation = this.simplifyExplanation(step.explanation);
        break;
      case 'detailed':
        personalizedStep.explanation = this.expandExplanation(step.explanation, step.learningObjectives);
        break;
      // 'moderate' stays as is
    }

    // Adjust pacing
    switch (userPreferences.learningPace) {
      case 'slow':
        personalizedStep.estimatedDuration = Math.round(step.estimatedDuration * 1.4);
        personalizedStep.description += ' (Take your time with this step)';
        break;
      case 'fast':
        personalizedStep.estimatedDuration = Math.round(step.estimatedDuration * 0.7);
        personalizedStep.description += ' (Quick overview)';
        break;
      // 'normal' stays as is
    }

    // Add learning style specific guidance
    if (progressProfile.preferredLearningStyle) {
      personalizedStep.explanation += this.addLearningStyleGuidance(
        step.explanation,
        progressProfile.preferredLearningStyle
      );
    }

    // Adjust for voice guidance preference
    if (userPreferences.enableVoiceGuidance) {
      personalizedStep.explanation = this.makeVoiceFriendly(personalizedStep.explanation);
    }

    return personalizedStep;
  }

  /**
   * Generate adaptive AI response based on user state
   */
  async generateAdaptiveResponse(
    input: ProcessedInput,
    context: LearningContext,
    userId: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const progressProfile = this.userProgressHistory.get(userId);
    
    try {
      // Determine response type based on user state and input
      const responseType = this.determineResponseType(input, progressProfile);
      
      // Generate personalized content
      const content = this.generatePersonalizedContent(input, context, progressProfile, responseType);
      
      // Adjust tone based on user sentiment and progress
      const adjustedContent = this.adjustResponseTone(content, input.sentiment, progressProfile);
      
      return {
        id: uuidv4(),
        type: responseType,
        content: adjustedContent,
        confidence: this.calculateResponseConfidence(input, progressProfile),
        processingTime: Date.now() - startTime,
        model: 'adaptive-instructor-v1',
        timestamp: new Date(),
        metadata: {
          inputTokens: Math.ceil(input.processedText.length / 4),
          outputTokens: Math.ceil(adjustedContent.length / 4),
          modelVersion: '1.0.0',
          temperature: this.getAdaptiveTemperature(progressProfile),
          topP: 0.9,
          contextLength: input.processedText.length,
          reasoningSteps: [
            `Analyzed user progress profile: ${progressProfile ? 'found' : 'new user'}`,
            `Determined response type: ${responseType}`,
            `Applied personalization based on learning style`,
            `Adjusted tone for sentiment: ${input.sentiment.overall}`
          ]
        }
      };
    } catch (error) {
      throw new Error(`Adaptive response generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Adapt step based on user feedback
   */
  async adaptBasedOnFeedback(
    step: LearningStep,
    feedback: UserFeedback
  ): Promise<LearningStep> {
    const adaptedStep = { ...step };

    // Adjust explanation detail based on feedback
    if (feedback.needsMoreExplanation) {
      adaptedStep.explanation = this.expandExplanation(step.explanation, step.learningObjectives);
    } else if (feedback.tooMuchExplanation) {
      adaptedStep.explanation = this.simplifyExplanation(step.explanation);
    }

    // Adjust pace based on feedback
    if (feedback.tooFast) {
      adaptedStep.estimatedDuration = Math.round(step.estimatedDuration * 1.5);
      adaptedStep.description += ' (Taking more time with this step)';
    } else if (feedback.tooSlow) {
      adaptedStep.estimatedDuration = Math.round(step.estimatedDuration * 0.7);
      adaptedStep.description += ' (Moving at a faster pace)';
    }

    // Adjust difficulty based on feedback
    if (feedback.tooEasy) {
      adaptedStep.complexity = this.increaseComplexity(step.complexity);
      adaptedStep.description += ' (Increased challenge level)';
    } else if (feedback.tooHard) {
      adaptedStep.complexity = this.decreaseComplexity(step.complexity);
      adaptedStep.description += ' (Simplified approach)';
    }

    // Add more explanation if user is confused
    if (feedback.confusing) {
      adaptedStep.explanation = this.expandExplanation(adaptedStep.explanation, step.learningObjectives);
      adaptedStep.description += ' (Added clarification)';
    }

    return adaptedStep;
  }

  /**
   * Adapt step based on learning outcome
   */
  async adaptBasedOnOutcome(
    step: LearningStep,
    outcome: LearningOutcome
  ): Promise<LearningStep | null> {
    // Only adapt if the outcome indicates issues
    if (this.getSuccess(outcome) && this.getUserSatisfaction(outcome) >= 3) {
      return null; // No adaptation needed
    }

    const adaptedStep = { ...step };

    // Adapt based on success/failure
    if (!this.getSuccess(outcome)) {
      // Step failed - make it easier
      adaptedStep.complexity = this.decreaseComplexity(step.complexity);
      adaptedStep.estimatedDuration = Math.round(step.estimatedDuration * 1.3);
      adaptedStep.explanation = this.expandExplanation(step.explanation, step.learningObjectives);
      adaptedStep.description += ' (Simplified due to previous difficulty)';
    }

    // Adapt based on satisfaction level
    if (this.getUserSatisfaction(outcome) < 3) {
      // Low satisfaction - provide more support
      adaptedStep.explanation = this.expandExplanation(adaptedStep.explanation, step.learningObjectives);
      adaptedStep.estimatedDuration = Math.round(adaptedStep.estimatedDuration * 1.2);
      adaptedStep.description += ' (Enhanced with additional guidance)';
    }

    // Adapt based on completion time
    if (this.getCompletionTime(outcome) > step.estimatedDuration * 1.5) {
      // Took too long - simplify
      adaptedStep.complexity = this.decreaseComplexity(adaptedStep.complexity);
      adaptedStep.description += ' (Streamlined approach)';
    }

    // Address specific challenges encountered
    const challengesEncountered = this.getChallengesEncountered(outcome);
    if (challengesEncountered.length > 0) {
      const challengeContext = challengesEncountered.slice(0, 2).join(', ');
      adaptedStep.explanation += ` Note: Previous challenges included ${challengeContext}. This approach addresses those issues.`;
    }

    return adaptedStep;
  }

  /**
   * Private helper methods
   */
  private getUserProgressProfile(userId: string, outcomes: LearningOutcome[]): UserProgressProfile {
    let profile = this.userProgressHistory.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        totalStepsCompleted: 0,
        successRate: 0.5,
        averageCompletionTime: 20,
        preferredLearningStyle: null,
        strugglingConcepts: [],
        masteredConcepts: [],
        adaptationHistory: [],
        lastUpdated: new Date()
      };
    }

    // Update profile with recent outcomes
    if (outcomes.length > 0) {
      profile.totalStepsCompleted += outcomes.length;
      profile.successRate = outcomes.filter(o => this.getSuccess(o)).length / outcomes.length;
      profile.averageCompletionTime = outcomes.reduce((sum, o) => sum + this.getCompletionTime(o), 0) / outcomes.length;
      profile.lastUpdated = new Date();
    }

    return profile;
  }

  private analyzePerformance(outcomes: LearningOutcome[]): PerformanceAnalysis {
    if (outcomes.length === 0) {
      return {
        successRate: 0.5,
        averageTime: 20,
        satisfactionLevel: 3,
        challengeLevel: 'appropriate',
        trendDirection: 'stable'
      };
    }

    const successRate = outcomes.filter(o => this.getSuccess(o)).length / outcomes.length;
    const averageTime = outcomes.reduce((sum, o) => sum + this.getCompletionTime(o), 0) / outcomes.length;
    const satisfactionLevel = outcomes.reduce((sum, o) => sum + this.getUserSatisfaction(o), 0) / outcomes.length;
    
    // Determine challenge level
    let challengeLevel: 'too_easy' | 'appropriate' | 'too_hard' = 'appropriate';
    if (successRate > 0.9 && (satisfactionLevel < 3 || averageTime < 10)) challengeLevel = 'too_easy';
    else if (successRate < 0.6) challengeLevel = 'too_hard';

    // Determine trend direction
    const recentOutcomes = outcomes.slice(-3);
    const olderOutcomes = outcomes.slice(0, -3);
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    
    if (recentOutcomes.length > 0 && olderOutcomes.length > 0) {
      const recentSuccess = recentOutcomes.filter(o => this.getSuccess(o)).length / recentOutcomes.length;
      const olderSuccess = olderOutcomes.filter(o => this.getSuccess(o)).length / olderOutcomes.length;
      
      if (recentSuccess > olderSuccess + 0.1) trendDirection = 'improving';
      else if (recentSuccess < olderSuccess - 0.1) trendDirection = 'declining';
    }

    return {
      successRate,
      averageTime,
      satisfactionLevel,
      challengeLevel,
      trendDirection
    };
  }

  private determineAdaptations(
    profile: UserProgressProfile,
    performance: PerformanceAnalysis,
    step: LearningStep,
    context: LearningContext
  ): StepAdaptation[] {
    const adaptations: StepAdaptation[] = [];

    // Difficulty adaptations
    if (performance.challengeLevel === 'too_hard' || performance.successRate < 0.5) {
      adaptations.push({
        type: 'difficulty',
        reason: 'User struggling with current difficulty level',
        originalValue: step.complexity,
        adaptedValue: this.decreaseComplexity(step.complexity),
        confidence: 0.8
      });
    } else if (performance.challengeLevel === 'too_easy' || (performance.successRate > 0.9 && performance.averageTime < step.estimatedDuration * 0.7)) {
      adaptations.push({
        type: 'difficulty',
        reason: 'User finding content too easy',
        originalValue: step.complexity,
        adaptedValue: this.increaseComplexity(step.complexity),
        confidence: 0.7
      });
    }

    // Pace adaptations
    if (performance.averageTime > step.estimatedDuration * 1.5) {
      adaptations.push({
        type: 'pace',
        reason: 'User taking longer than expected',
        originalValue: step.estimatedDuration.toString(),
        adaptedValue: Math.round(step.estimatedDuration * 1.3).toString(),
        confidence: 0.9
      });
    }

    // Explanation adaptations
    if (performance.satisfactionLevel < 3) {
      adaptations.push({
        type: 'explanation',
        reason: 'Low satisfaction indicates need for better explanation',
        originalValue: 'standard',
        adaptedValue: context.userPreferences.explanationDetail === 'minimal' ? 'detailed' : 'simplified',
        confidence: 0.6
      });
    }

    return adaptations;
  }

  private applyAdaptations(step: LearningStep, adaptations: StepAdaptation[]): LearningStep {
    let adaptedStep = { ...step };

    adaptations.forEach(adaptation => {
      switch (adaptation.type) {
        case 'difficulty':
          adaptedStep.complexity = adaptation.adaptedValue as ComplexityLevel;
          // Also adjust explanation and duration based on difficulty
          if (adaptation.adaptedValue === ComplexityLevel.LOW) {
            adaptedStep.explanation = `[Simplified] ${adaptedStep.explanation}`;
            adaptedStep.estimatedDuration = Math.round(adaptedStep.estimatedDuration * 1.3);
            adaptedStep.prerequisites = adaptedStep.prerequisites.slice(0, 1);
          } else if (adaptation.adaptedValue === ComplexityLevel.HIGH) {
            adaptedStep.explanation = `[Advanced] ${adaptedStep.explanation}`;
            adaptedStep.estimatedDuration = Math.round(adaptedStep.estimatedDuration * 0.8);
          }
          break;
        case 'pace':
          adaptedStep.estimatedDuration = parseInt(adaptation.adaptedValue);
          break;
        case 'explanation':
          if (adaptation.adaptedValue === 'simplified') {
            adaptedStep.explanation = this.simplifyExplanation(adaptedStep.explanation);
          } else if (adaptation.adaptedValue === 'detailed') {
            adaptedStep.explanation = this.expandExplanation(adaptedStep.explanation, adaptedStep.learningObjectives);
          }
          break;
      }
    });

    return adaptedStep;
  }

  private updateProgressProfile(
    userId: string,
    profile: UserProgressProfile,
    performance: PerformanceAnalysis
  ): void {
    profile.lastUpdated = new Date();
    
    // Update struggling concepts based on performance
    if (performance.challengeLevel === 'too_hard') {
      // Add concepts that might be causing difficulty
      // This would be enhanced with more specific tracking
    }

    this.userProgressHistory.set(userId, profile);
  }

  private calculateLearningVelocity(outcomes: LearningOutcome[]): number {
    if (outcomes.length < 2) return 0.5;

    // Calculate improvement over time
    const timeWindows = Math.min(3, Math.floor(outcomes.length / 2));
    const recentOutcomes = outcomes.slice(-timeWindows);
    const earlierOutcomes = outcomes.slice(0, timeWindows);

    const recentSuccess = recentOutcomes.filter(o => this.getSuccess(o)).length / recentOutcomes.length;
    const earlierSuccess = earlierOutcomes.filter(o => this.getSuccess(o)).length / earlierOutcomes.length;

    return Math.max(0, Math.min(1, 0.5 + (recentSuccess - earlierSuccess)));
  }

  private generateAdjustmentRecommendations(
    overallLevel: number,
    learningVelocity: number,
    strugglingAreasCount: number,
    profile?: UserProgressProfile
  ): string[] {
    const recommendations: string[] = [];

    if (overallLevel < 0.4) {
      recommendations.push('reduce_difficulty', 'increase_support', 'add_examples');
    } else if (overallLevel > 0.8) {
      recommendations.push('increase_challenge', 'accelerate_pace');
    }

    if (learningVelocity < 0.3) {
      recommendations.push('change_approach', 'add_motivation');
    }

    if (strugglingAreasCount > 2) {
      recommendations.push('focus_review', 'prerequisite_check');
    }

    return recommendations;
  }

  private decreaseComplexity(current: ComplexityLevel): ComplexityLevel {
    switch (current) {
      case ComplexityLevel.HIGH: return ComplexityLevel.MEDIUM;
      case ComplexityLevel.MEDIUM: return ComplexityLevel.LOW;
      case ComplexityLevel.LOW: return ComplexityLevel.LOW;
      default: return ComplexityLevel.LOW;
    }
  }

  private increaseComplexity(current: ComplexityLevel): ComplexityLevel {
    switch (current) {
      case ComplexityLevel.LOW: return ComplexityLevel.MEDIUM;
      case ComplexityLevel.MEDIUM: return ComplexityLevel.HIGH;
      case ComplexityLevel.HIGH: return ComplexityLevel.HIGH;
      default: return ComplexityLevel.MEDIUM;
    }
  }

  private simplifyExplanation(explanation: string): string {
    const simplified = explanation
      .replace(/\b(furthermore|moreover|additionally|consequently)\b/gi, 'Also')
      .replace(/\b(utilize|implement|facilitate)\b/gi, 'use')
      .replace(/\b(demonstrate|illustrate)\b/gi, 'show')
      .split('. ')
      .slice(0, 1) // Keep only first sentence for minimal
      .join('. ');
    
    return simplified.length > 0 ? simplified : explanation.substring(0, Math.floor(explanation.length / 2));
  }

  private expandExplanation(explanation: string, objectives: string[]): string {
    let expanded = explanation;
    
    if (objectives.length > 0) {
      expanded += ` This will help you understand ${objectives.slice(0, 2).join(' and ')}.`;
    }
    
    expanded += ' Take your time to understand each concept before moving forward.';
    return expanded;
  }

  private addLearningStyleGuidance(explanation: string, style: string): string {
    switch (style) {
      case 'visual':
        return explanation + ' Pay attention to the visual elements and layout as we work through this.';
      case 'auditory':
        return explanation + ' Listen carefully to the explanations and feel free to read them aloud.';
      case 'kinesthetic':
        return explanation + ' Focus on the hands-on practice and try to interact with each element.';
      default:
        return explanation;
    }
  }

  private makeVoiceFriendly(explanation: string): string {
    return explanation
      .replace(/\b(e\.g\.)\b/gi, 'for example')
      .replace(/\b(i\.e\.)\b/gi, 'that is')
      .replace(/\b(etc\.)\b/gi, 'and so on')
      .replace(/\b(&)\b/gi, 'and');
  }

  private determineResponseType(input: ProcessedInput, profile?: UserProgressProfile): AIResponseType {
    // Determine response type based on user progress and input
    if (input.sentiment.frustrationLevel > 0.6) {
      return AIResponseType.SUGGESTION;
    }
    
    if (input.intent.clarificationNeeded) {
      return AIResponseType.QUESTION;
    }
    
    if (profile && profile.successRate < 0.5) {
      return AIResponseType.EXPLANATION;
    }
    
    return AIResponseType.INSTRUCTION;
  }

  private generatePersonalizedContent(
    input: ProcessedInput,
    context: LearningContext,
    profile: UserProgressProfile | undefined,
    responseType: AIResponseType
  ): string {
    let content = '';
    
    // Base content generation based on response type
    switch (responseType) {
      case AIResponseType.INSTRUCTION:
        content = `Let's work on ${input.intent.parameters.targetSkill || 'this topic'} together. `;
        break;
      case AIResponseType.EXPLANATION:
        content = `I'll explain ${input.intent.parameters.targetSkill || 'this concept'} step by step. `;
        break;
      case AIResponseType.SUGGESTION:
        content = `Here are some suggestions to help you with ${input.intent.parameters.targetSkill || 'this challenge'}. `;
        break;
      case AIResponseType.QUESTION:
        content = `To help you better, could you tell me more about what you'd like to focus on? `;
        break;
      default:
        content = `I'm here to help you learn! `;
    }
    
    // Add personalization based on profile
    if (profile) {
      if (profile.successRate > 0.8) {
        content += `You've been doing great so far! `;
      } else if (profile.successRate < 0.4) {
        content += `Let's take this step by step - you've got this! `;
      }
    }
    
    return content;
  }

  private adjustResponseTone(
    content: string,
    sentiment: any,
    profile: UserProgressProfile | undefined
  ): string {
    let adjustedContent = content;
    
    if (sentiment.overall === SentimentType.NEGATIVE || sentiment.frustrationLevel > 0.5) {
      adjustedContent = `I understand this can be challenging. ${adjustedContent} We'll work through it together.`;
    } else if (sentiment.overall === SentimentType.POSITIVE) {
      adjustedContent = `Great attitude! ${adjustedContent}`;
    }
    
    return adjustedContent;
  }

  private calculateResponseConfidence(input: ProcessedInput, profile?: UserProgressProfile): number {
    let confidence = input.confidence;
    
    // Adjust confidence based on user profile
    if (profile) {
      if (profile.successRate > 0.7) {
        confidence = Math.min(1, confidence + 0.1);
      } else if (profile.successRate < 0.3) {
        confidence = Math.max(0.3, confidence - 0.1);
      }
    }
    
    return confidence;
  }

  private getAdaptiveTemperature(profile?: UserProgressProfile): number {
    if (!profile) return 0.7;
    
    // Higher temperature for struggling users (more creative responses)
    // Lower temperature for advanced users (more precise responses)
    if (profile.successRate < 0.4) return 0.8;
    if (profile.successRate > 0.8) return 0.5;
    return 0.7;
  }

  private initializeAdaptationStrategies(): void {
    this.adaptationStrategies.set('struggling_learner', {
      name: 'Struggling Learner Support',
      triggers: ['low_success_rate', 'high_frustration'],
      adjustments: ['reduce_complexity', 'increase_support', 'add_examples']
    });
    
    this.adaptationStrategies.set('advanced_learner', {
      name: 'Advanced Learner Challenge',
      triggers: ['high_success_rate', 'fast_completion'],
      adjustments: ['increase_complexity', 'reduce_guidance', 'add_challenges']
    });
  }

  private initializeDifficultyThresholds(): void {
    this.difficultyAdjustmentThresholds = {
      decreaseThreshold: 0.4,
      increaseThreshold: 0.8,
      stabilityRange: 0.1
    };
  }

  // Helper methods to safely access extended properties from base LearningOutcome
  private getSuccess(outcome: LearningOutcome): boolean {
    // Infer success from proficiency gained - if > 50%, consider successful
    return outcome.proficiencyGained > 50;
  }

  private getUserSatisfaction(outcome: LearningOutcome): number {
    // Default satisfaction based on proficiency gained
    // Map 0-100 proficiency to 1-5 satisfaction scale
    return Math.max(1, Math.min(5, Math.round((outcome.proficiencyGained / 100) * 4 + 1)));
  }

  private getCompletionTime(outcome: LearningOutcome): number {
    // Default completion time - we don't have this data, so return a reasonable default
    return 15; // 15 minutes default
  }

  private getChallengesEncountered(outcome: LearningOutcome): string[] {
    // Extract challenges from description if possible, otherwise return empty array
    const description = outcome.description.toLowerCase();
    const challenges: string[] = [];
    
    if (description.includes('error') || description.includes('failed')) {
      challenges.push('technical_error');
    }
    if (description.includes('difficult') || description.includes('hard')) {
      challenges.push('difficulty_level');
    }
    if (description.includes('confused') || description.includes('unclear')) {
      challenges.push('understanding');
    }
    
    return challenges;
  }

  private getSkillsAcquired(outcome: LearningOutcome): string[] {
    // Use the skill field as the primary skill acquired
    return [outcome.skill];
  }
}

// Supporting interfaces
interface UserProgressProfile {
  userId: string;
  totalStepsCompleted: number;
  successRate: number;
  averageCompletionTime: number;
  preferredLearningStyle: string | null;
  strugglingConcepts: string[];
  masteredConcepts: string[];
  adaptationHistory: StepAdaptation[];
  lastUpdated: Date;
}

interface UserUnderstandingAnalysis {
  overallLevel: number; // 0-1 scale
  conceptMastery: Map<string, number>;
  learningVelocity: number; // 0-1 scale
  strugglingAreas: string[];
  strengths: string[];
  recommendedAdjustments: string[];
}

interface PerformanceAnalysis {
  successRate: number;
  averageTime: number;
  satisfactionLevel: number;
  challengeLevel: 'too_easy' | 'appropriate' | 'too_hard';
  trendDirection: 'improving' | 'declining' | 'stable';
}

interface AdaptationStrategy {
  name: string;
  triggers: string[];
  adjustments: string[];
}

interface DifficultyThresholds {
  decreaseThreshold: number;
  increaseThreshold: number;
  stabilityRange: number;
}