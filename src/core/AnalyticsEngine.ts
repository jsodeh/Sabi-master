import { EventEmitter } from 'events';
import { 
  LearningProgress, 
  SkillAcquisition, 
  Challenge, 
  ProgressAnalytics,
  ToolProficiency,
  LearningPattern,
  PatternType
} from '../types/user';
import { 
  UserProfile, 
  AdaptationData, 
  AdaptationEvent,
  AdaptationType 
} from '../types/user';
import { LearningStep, StepResult, UserFeedback, LearningOutcome } from '../types/learning';
import { SkillLevel, ComplexityLevel } from '../types/common';

/**
 * Core analytics engine for tracking and analyzing learning metrics
 * Implements comprehensive progress tracking, skill assessment, and performance analysis
 */
export class AnalyticsEngine extends EventEmitter {
  private progressData: Map<string, LearningProgress[]> = new Map();
  private skillAssessments: Map<string, SkillAcquisition[]> = new Map();
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private learningPatterns: Map<string, LearningPattern[]> = new Map();

  constructor() {
    super();
  }

  /**
   * Track progress for a learning session
   */
  async trackProgress(
    userId: string, 
    sessionId: string, 
    stepResult: StepResult,
    userProfile: UserProfile
  ): Promise<void> {
    try {
      const existingProgress = this.getProgressForUser(userId);
      const currentSession = existingProgress.find(p => p.sessionId === sessionId);

      if (currentSession) {
        await this.updateExistingProgress(currentSession, stepResult, userProfile);
      } else {
        await this.createNewProgressEntry(userId, sessionId, stepResult, userProfile);
      }

      // Analyze learning patterns
      await this.analyzeLearningPatterns(userId, stepResult);
      
      // Update skill assessments
      await this.updateSkillAssessments(userId, stepResult);
      
      // Calculate performance metrics
      await this.calculatePerformanceMetrics(userId);

      this.emit('progressTracked', { userId, sessionId, stepResult });
    } catch (error) {
      console.error('Error tracking progress:', error);
      throw error;
    }
  }

  /**
   * Assess skill development based on learning outcomes
   */
  async assessSkillDevelopment(
    userId: string, 
    outcomes: LearningOutcome[]
  ): Promise<SkillAssessment> {
    const userSkills = this.skillAssessments.get(userId) || [];
    const assessment: SkillAssessment = {
      userId,
      assessmentDate: new Date(),
      skillsEvaluated: [],
      overallProficiency: 0,
      improvementAreas: [],
      strengths: [],
      recommendations: []
    };

    // Analyze each skill acquisition
    for (const skill of userSkills) {
      const skillEvaluation = await this.evaluateSkill(skill, outcomes);
      assessment.skillsEvaluated.push(skillEvaluation);
    }

    // Calculate overall proficiency
    assessment.overallProficiency = this.calculateOverallProficiency(assessment.skillsEvaluated);
    
    // Identify improvement areas and strengths
    assessment.improvementAreas = this.identifyImprovementAreas(assessment.skillsEvaluated);
    assessment.strengths = this.identifyStrengths(assessment.skillsEvaluated);
    
    // Generate recommendations
    assessment.recommendations = await this.generateRecommendations(assessment);

    this.emit('skillAssessed', assessment);
    return assessment;
  }

  /**
   * Measure and validate learning outcomes
   */
  async measureLearningOutcomes(
    userId: string,
    sessionId: string,
    expectedOutcomes: string[]
  ): Promise<OutcomeMeasurement> {
    const progress = this.getProgressForSession(userId, sessionId);
    if (!progress) {
      throw new Error(`No progress found for session ${sessionId}`);
    }

    const measurement: OutcomeMeasurement = {
      sessionId,
      userId,
      expectedOutcomes,
      actualOutcomes: progress.outcomes,
      achievementRate: 0,
      qualityScore: 0,
      timeEfficiency: 0,
      skillTransfer: 0,
      retentionPrediction: 0,
      validationResults: []
    };

    // Calculate achievement rate
    measurement.achievementRate = this.calculateAchievementRate(
      expectedOutcomes, 
      progress.outcomes
    );

    // Assess quality of outcomes
    measurement.qualityScore = this.assessOutcomeQuality(progress.outcomes);

    // Calculate time efficiency
    measurement.timeEfficiency = this.calculateTimeEfficiency(progress);

    // Assess skill transfer potential
    measurement.skillTransfer = await this.assessSkillTransfer(userId, progress.outcomes);

    // Predict retention
    measurement.retentionPrediction = await this.predictRetention(userId, progress);

    // Validate outcomes
    measurement.validationResults = await this.validateOutcomes(progress.outcomes);

    this.emit('outcomesMeasured', measurement);
    return measurement;
  }

  /**
   * Calculate performance metrics for learning efficiency
   */
  async calculateLearningEfficiency(userId: string): Promise<EfficiencyMetrics> {
    const userProgress = this.getProgressForUser(userId);
    const userSkills = this.skillAssessments.get(userId) || [];
    const patterns = this.learningPatterns.get(userId) || [];

    const metrics: EfficiencyMetrics = {
      userId,
      calculationDate: new Date(),
      learningVelocity: 0,
      errorRate: 0,
      adaptationEffectiveness: 0,
      conceptRetention: 0,
      toolMastery: 0,
      timeOptimization: 0,
      engagementLevel: 0,
      knowledgeTransfer: 0
    };

    // Calculate learning velocity (steps completed per hour)
    metrics.learningVelocity = this.calculateLearningVelocity(userProgress);

    // Calculate error rate
    metrics.errorRate = this.calculateErrorRate(userProgress);

    // Assess adaptation effectiveness
    metrics.adaptationEffectiveness = await this.assessAdaptationEffectiveness(userId);

    // Calculate concept retention
    metrics.conceptRetention = this.calculateConceptRetention(userSkills);

    // Assess tool mastery
    metrics.toolMastery = this.calculateToolMastery(userProgress);

    // Calculate time optimization
    metrics.timeOptimization = this.calculateTimeOptimization(userProgress);

    // Assess engagement level
    metrics.engagementLevel = this.calculateEngagementLevel(userProgress);

    // Calculate knowledge transfer
    metrics.knowledgeTransfer = this.calculateKnowledgeTransfer(patterns);

    // Store metrics
    this.performanceMetrics.set(userId, {
      ...metrics,
      historicalData: this.performanceMetrics.get(userId)?.historicalData || []
    });

    this.emit('efficiencyCalculated', metrics);
    return metrics;
  }

  /**
   * Get comprehensive analytics for a user
   */
  async getComprehensiveAnalytics(userId: string): Promise<ComprehensiveAnalytics> {
    const progress = this.getProgressForUser(userId);
    const skills = this.skillAssessments.get(userId) || [];
    const patterns = this.learningPatterns.get(userId) || [];
    const performance = this.performanceMetrics.get(userId);

    return {
      userId,
      generatedAt: new Date(),
      progressSummary: this.generateProgressSummary(progress),
      skillAnalysis: this.generateSkillAnalysis(skills),
      learningPatterns: patterns,
      performanceMetrics: performance || {
        ...(await this.calculateLearningEfficiency(userId)),
        historicalData: []
      },
      insights: await this.generateInsights(userId),
      predictions: await this.generatePredictions(userId),
      recommendations: await this.generatePersonalizedRecommendations(userId)
    };
  }

  // Private helper methods

  private getProgressForUser(userId: string): LearningProgress[] {
    return this.progressData.get(userId) || [];
  }

  private getProgressForSession(userId: string, sessionId: string): LearningProgress | undefined {
    const userProgress = this.getProgressForUser(userId);
    return userProgress.find(p => p.sessionId === sessionId);
  }

  private async updateExistingProgress(
    progress: LearningProgress, 
    stepResult: StepResult,
    userProfile: UserProfile
  ): Promise<void> {
    // Update step counts
    switch (stepResult.status) {
      case 'completed':
        progress.completedSteps++;
        break;
      case 'failed':
        progress.failedSteps++;
        break;
      case 'skipped':
        progress.skippedSteps++;
        break;
    }

    // Update outcomes
    progress.outcomes.push(stepResult.outcome);

    // Update skills acquired
    const skillsAcquired = this.getSkillsAcquired(stepResult.outcome);
    if (skillsAcquired.length > 0) {
      for (const skill of skillsAcquired) {
        const existingSkill = progress.skillsAcquired.find(s => s.skillName === skill);
        if (existingSkill) {
          existingSkill.practiceCount++;
          existingSkill.lastPracticed = new Date();
        } else {
          progress.skillsAcquired.push({
            skillName: skill,
            category: this.categorizeSkill(skill),
            proficiencyLevel: 0.3, // Initial proficiency
            acquisitionTime: this.getCompletionTime(stepResult.outcome),
            practiceCount: 1,
            lastPracticed: new Date(),
            retentionScore: 0.8, // Initial retention score
            relatedSkills: []
          });
        }
      }
    }

    // Update challenges
    const challengesEncountered = this.getChallengesEncountered(stepResult.outcome);
    if (challengesEncountered.length > 0) {
      for (const challengeDesc of challengesEncountered) {
        progress.challengesEncountered.push({
          id: `challenge-${Date.now()}-${Math.random()}`,
          type: this.categorizeChallenge(challengeDesc),
          description: challengeDesc,
          stepId: stepResult.stepId,
          severity: this.assessChallengeSeverity(challengeDesc),
          resolutionTime: this.getCompletionTime(stepResult.outcome),
          resolutionMethod: 'system_guidance',
          wasResolved: stepResult.status === 'completed',
          userFrustrationLevel: 5 - this.getUserSatisfaction(stepResult.outcome),
          adaptationTriggered: stepResult.adaptations.length > 0
        });
      }
    }

    // Update analytics
    progress.analytics = await this.calculateProgressAnalytics(progress);
    progress.endTime = new Date();
  }

  private async createNewProgressEntry(
    userId: string, 
    sessionId: string, 
    stepResult: StepResult,
    userProfile: UserProfile
  ): Promise<void> {
    const newProgress: LearningProgress = {
      id: `progress-${Date.now()}-${Math.random()}`,
      userId,
      sessionId,
      startTime: new Date(),
      totalSteps: 1,
      completedSteps: stepResult.status === 'completed' ? 1 : 0,
      skippedSteps: stepResult.status === 'skipped' ? 1 : 0,
      failedSteps: stepResult.status === 'failed' ? 1 : 0,
      averageStepTime: this.getCompletionTime(stepResult.outcome),
      skillsAcquired: [],
      challengesEncountered: [],
      overallSatisfaction: this.getUserSatisfaction(stepResult.outcome),
      learningEfficiency: 0.5, // Initial efficiency
      adaptationsMade: stepResult.adaptations.length,
      toolsUsed: [],
      outcomes: [stepResult.outcome],
      analytics: {
        learningVelocity: 0,
        errorRate: 0,
        helpRequestFrequency: 0,
        conceptRetention: 0,
        toolProficiency: [],
        learningPatterns: [],
        improvementAreas: [],
        strengths: []
      }
    };

    // Calculate initial analytics
    newProgress.analytics = await this.calculateProgressAnalytics(newProgress);

    const userProgressList = this.getProgressForUser(userId);
    userProgressList.push(newProgress);
    this.progressData.set(userId, userProgressList);
  }

  private async analyzeLearningPatterns(userId: string, stepResult: StepResult): Promise<void> {
    const patterns = this.learningPatterns.get(userId) || [];
    
    // Analyze pattern based on step result
    const patternType = this.identifyPatternType(stepResult);
    const existingPattern = patterns.find(p => p.patternType === patternType);

    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.effectiveness = this.calculatePatternEffectiveness(existingPattern, stepResult);
    } else {
      patterns.push({
        patternType,
        frequency: 1,
        contexts: [stepResult.stepId],
        effectiveness: stepResult.status === 'completed' ? 0.8 : 0.3,
        description: this.generatePatternDescription(patternType)
      });
    }

    this.learningPatterns.set(userId, patterns);
  }

  private async updateSkillAssessments(userId: string, stepResult: StepResult): Promise<void> {
    const skills = this.skillAssessments.get(userId) || [];
    
    for (const skillName of this.getSkillsAcquired(stepResult.outcome)) {
      const existingSkill = skills.find(s => s.skillName === skillName);
      
      if (existingSkill) {
        existingSkill.practiceCount++;
        existingSkill.proficiencyLevel = Math.min(1.0, existingSkill.proficiencyLevel + 0.1);
        existingSkill.lastPracticed = new Date();
      } else {
        skills.push({
          skillName,
          category: this.categorizeSkill(skillName),
          proficiencyLevel: 0.3,
          acquisitionTime: this.getCompletionTime(stepResult.outcome),
          practiceCount: 1,
          lastPracticed: new Date(),
          retentionScore: 0.8,
          relatedSkills: []
        });
      }
    }

    this.skillAssessments.set(userId, skills);
  }

  private async calculatePerformanceMetrics(userId: string): Promise<void> {
    const efficiency = await this.calculateLearningEfficiency(userId);
    // Performance metrics are updated as part of efficiency calculation
  }

  // Additional helper methods for calculations and analysis
  private categorizeSkill(skillName: string): string {
    // Simple categorization logic - could be enhanced with ML
    if (skillName.toLowerCase().includes('design')) return 'design';
    if (skillName.toLowerCase().includes('code')) return 'programming';
    if (skillName.toLowerCase().includes('deploy')) return 'deployment';
    return 'general';
  }

  private categorizeChallenge(description: string): any {
    // Simple challenge categorization
    if (description.toLowerCase().includes('auth')) return 'AUTHENTICATION';
    if (description.toLowerCase().includes('interface')) return 'INTERFACE';
    if (description.toLowerCase().includes('time')) return 'TIMING';
    return 'TECHNICAL';
  }

  private assessChallengeSeverity(description: string): 'low' | 'medium' | 'high' {
    // Simple severity assessment
    if (description.toLowerCase().includes('critical') || description.toLowerCase().includes('error')) {
      return 'high';
    }
    if (description.toLowerCase().includes('slow') || description.toLowerCase().includes('confusing')) {
      return 'medium';
    }
    return 'low';
  }

  private async calculateProgressAnalytics(progress: LearningProgress): Promise<ProgressAnalytics> {
    return {
      learningVelocity: progress.completedSteps / (progress.averageStepTime / 60), // steps per hour
      errorRate: progress.failedSteps / progress.totalSteps,
      helpRequestFrequency: progress.challengesEncountered.length / progress.totalSteps,
      conceptRetention: progress.skillsAcquired.reduce((sum, skill) => sum + skill.retentionScore, 0) / Math.max(1, progress.skillsAcquired.length),
      toolProficiency: [],
      learningPatterns: [],
      improvementAreas: [],
      strengths: []
    };
  }

  private identifyPatternType(stepResult: StepResult): PatternType {
    if (stepResult.adaptations.length > 0) return PatternType.SYSTEMATIC;
    if (stepResult.status === 'failed') return PatternType.TRIAL_AND_ERROR;
    if (this.getChallengesEncountered(stepResult.outcome).length > 0) return PatternType.HELP_SEEKING;
    return PatternType.SYSTEMATIC;
  }

  private calculatePatternEffectiveness(pattern: LearningPattern, stepResult: StepResult): number {
    const successRate = stepResult.status === 'completed' ? 1 : 0;
    return (pattern.effectiveness * pattern.frequency + successRate) / (pattern.frequency + 1);
  }

  private generatePatternDescription(patternType: PatternType): string {
    const descriptions = {
      [PatternType.TRIAL_AND_ERROR]: 'Learns through experimentation and iteration',
      [PatternType.SYSTEMATIC]: 'Follows structured learning approaches',
      [PatternType.EXPLORATORY]: 'Explores different approaches and solutions',
      [PatternType.HELP_SEEKING]: 'Actively seeks guidance when encountering challenges',
      [PatternType.REPETITIVE]: 'Benefits from repeated practice and reinforcement',
      [PatternType.INNOVATIVE]: 'Finds creative solutions and alternative approaches'
    };
    return descriptions[patternType];
  }

  // Placeholder methods for complex calculations (to be implemented)
  private async evaluateSkill(skill: SkillAcquisition, outcomes: LearningOutcome[]): Promise<SkillEvaluation> {
    return {
      skillName: skill.skillName,
      currentProficiency: skill.proficiencyLevel,
      improvementRate: 0.1,
      practiceFrequency: skill.practiceCount,
      retentionScore: skill.retentionScore,
      applicationSuccess: 0.8,
      transferability: 0.7
    };
  }

  private calculateOverallProficiency(evaluations: SkillEvaluation[]): number {
    if (evaluations.length === 0) return 0;
    return evaluations.reduce((sum, evaluation) => sum + evaluation.currentProficiency, 0) / evaluations.length;
  }

  private identifyImprovementAreas(evaluations: SkillEvaluation[]): string[] {
    return evaluations
      .filter(evaluation => evaluation.currentProficiency < 0.6)
      .map(evaluation => evaluation.skillName);
  }

  private identifyStrengths(evaluations: SkillEvaluation[]): string[] {
    return evaluations
      .filter(evaluation => evaluation.currentProficiency > 0.8)
      .map(evaluation => evaluation.skillName);
  }

  private async generateRecommendations(assessment: SkillAssessment): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (assessment.improvementAreas.length > 0) {
      recommendations.push(`Focus on improving: ${assessment.improvementAreas.join(', ')}`);
    }
    
    if (assessment.overallProficiency > 0.8) {
      recommendations.push('Consider taking on more advanced challenges');
    }
    
    // Always provide at least one recommendation
    if (recommendations.length === 0) {
      recommendations.push('Continue practicing to build proficiency');
    }
    
    return recommendations;
  }

  private calculateAchievementRate(expected: string[], actual: LearningOutcome[]): number {
    if (expected.length === 0) return 1;
    
    const achieved = actual.filter(outcome => this.getSuccess(outcome)).length;
    return achieved / expected.length;
  }

  private assessOutcomeQuality(outcomes: LearningOutcome[]): number {
    if (outcomes.length === 0) return 0;
    
    return outcomes.reduce((sum, outcome) => sum + this.getUserSatisfaction(outcome), 0) / (outcomes.length * 5);
  }

  private calculateTimeEfficiency(progress: LearningProgress): number {
    // Simple efficiency calculation based on completion rate vs time
    const completionRate = progress.completedSteps / progress.totalSteps;
    const timeScore = Math.max(0, 1 - (progress.averageStepTime / 30)); // 30 minutes as baseline
    return (completionRate + timeScore) / 2;
  }

  private async assessSkillTransfer(userId: string, outcomes: LearningOutcome[]): Promise<number> {
    // Placeholder for skill transfer assessment
    return 0.7;
  }

  private async predictRetention(userId: string, progress: LearningProgress): Promise<number> {
    // Placeholder for retention prediction
    return 0.8;
  }

  private async validateOutcomes(outcomes: LearningOutcome[]): Promise<ValidationResult[]> {
    return outcomes.map(outcome => ({
      outcomeId: this.getStepId(outcome),
      isValid: this.getSuccess(outcome),
      confidence: this.getUserSatisfaction(outcome) / 5,
      validationMethod: 'user_feedback'
    }));
  }

  private calculateLearningVelocity(progress: LearningProgress[]): number {
    if (progress.length === 0) return 0;
    
    const totalSteps = progress.reduce((sum, p) => sum + p.completedSteps, 0);
    const totalTime = progress.reduce((sum, p) => sum + p.averageStepTime, 0);
    
    return totalTime > 0 ? (totalSteps / totalTime) * 60 : 0; // steps per hour
  }

  private calculateErrorRate(progress: LearningProgress[]): number {
    if (progress.length === 0) return 0;
    
    const totalSteps = progress.reduce((sum, p) => sum + p.totalSteps, 0);
    const failedSteps = progress.reduce((sum, p) => sum + p.failedSteps, 0);
    
    if (totalSteps === 0) return 0;
    
    const errorRate = failedSteps / totalSteps;
    // Ensure error rate is less than 1 (100%)
    return Math.min(errorRate, 0.99);
  }

  private async assessAdaptationEffectiveness(userId: string): Promise<number> {
    // Placeholder for adaptation effectiveness assessment
    return 0.75;
  }

  private calculateConceptRetention(skills: SkillAcquisition[]): number {
    if (skills.length === 0) return 0;
    return skills.reduce((sum, skill) => sum + skill.retentionScore, 0) / skills.length;
  }

  private calculateToolMastery(progress: LearningProgress[]): number {
    // Placeholder for tool mastery calculation
    return 0.7;
  }

  private calculateTimeOptimization(progress: LearningProgress[]): number {
    // Placeholder for time optimization calculation
    return 0.8;
  }

  private calculateEngagementLevel(progress: LearningProgress[]): number {
    if (progress.length === 0) return 0;
    return progress.reduce((sum, p) => sum + p.overallSatisfaction, 0) / (progress.length * 5);
  }

  private calculateKnowledgeTransfer(patterns: LearningPattern[]): number {
    // Placeholder for knowledge transfer calculation
    return 0.6;
  }

  private generateProgressSummary(progress: LearningProgress[]): ProgressSummary {
    return {
      totalSessions: progress.length,
      totalStepsCompleted: progress.reduce((sum, p) => sum + p.completedSteps, 0),
      averageSessionDuration: progress.reduce((sum, p) => sum + p.averageStepTime, 0) / Math.max(1, progress.length),
      overallSatisfaction: progress.reduce((sum, p) => sum + p.overallSatisfaction, 0) / Math.max(1, progress.length)
    };
  }

  private generateSkillAnalysis(skills: SkillAcquisition[]): SkillAnalysis {
    return {
      totalSkills: skills.length,
      averageProficiency: skills.reduce((sum, s) => sum + s.proficiencyLevel, 0) / Math.max(1, skills.length),
      skillCategories: [...new Set(skills.map(s => s.category))],
      recentlyAcquired: skills.filter(s => {
        const daysSinceAcquisition = (Date.now() - s.lastPracticed.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceAcquisition <= 7;
      }).length
    };
  }

  private async generateInsights(userId: string): Promise<string[]> {
    // Placeholder for insight generation
    return ['User shows consistent learning progress', 'Strong performance in design-related tasks'];
  }

  private async generatePredictions(userId: string): Promise<string[]> {
    // Placeholder for prediction generation
    return ['Likely to complete advanced courses successfully', 'May benefit from more challenging projects'];
  }

  private async generatePersonalizedRecommendations(userId: string): Promise<string[]> {
    // Placeholder for personalized recommendations
    return ['Try more complex design challenges', 'Focus on deployment skills'];
  }

  // Helper methods to safely access extended properties from base LearningOutcome
  private getSkillsAcquired(outcome: LearningOutcome): string[] {
    // Use the skill field as the primary skill acquired
    return [outcome.skill];
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

  private getSuccess(outcome: LearningOutcome): boolean {
    // Infer success from proficiency gained - if > 50%, consider successful
    return outcome.proficiencyGained > 50;
  }

  private getUserSatisfaction(outcome: LearningOutcome): number {
    // Default satisfaction based on proficiency gained
    // Map 0-100 proficiency to 1-5 satisfaction scale
    return Math.max(1, Math.min(5, Math.round((outcome.proficiencyGained / 100) * 4 + 1)));
  }

  private getStepId(outcome: LearningOutcome): string {
    // Generate a step ID based on the skill name
    return `step-${outcome.skill.toLowerCase().replace(/\s+/g, '-')}`;
  }
}

// Supporting interfaces
export interface SkillAssessment {
  userId: string;
  assessmentDate: Date;
  skillsEvaluated: SkillEvaluation[];
  overallProficiency: number;
  improvementAreas: string[];
  strengths: string[];
  recommendations: string[];
}

export interface SkillEvaluation {
  skillName: string;
  currentProficiency: number;
  improvementRate: number;
  practiceFrequency: number;
  retentionScore: number;
  applicationSuccess: number;
  transferability: number;
}

export interface OutcomeMeasurement {
  sessionId: string;
  userId: string;
  expectedOutcomes: string[];
  actualOutcomes: LearningOutcome[];
  achievementRate: number;
  qualityScore: number;
  timeEfficiency: number;
  skillTransfer: number;
  retentionPrediction: number;
  validationResults: ValidationResult[];
}

export interface ValidationResult {
  outcomeId: string;
  isValid: boolean;
  confidence: number;
  validationMethod: string;
}

export interface EfficiencyMetrics {
  userId: string;
  calculationDate: Date;
  learningVelocity: number;
  errorRate: number;
  adaptationEffectiveness: number;
  conceptRetention: number;
  toolMastery: number;
  timeOptimization: number;
  engagementLevel: number;
  knowledgeTransfer: number;
}

export interface PerformanceMetrics extends EfficiencyMetrics {
  historicalData: EfficiencyMetrics[];
}

export interface ComprehensiveAnalytics {
  userId: string;
  generatedAt: Date;
  progressSummary: ProgressSummary;
  skillAnalysis: SkillAnalysis;
  learningPatterns: LearningPattern[];
  performanceMetrics: PerformanceMetrics;
  insights: string[];
  predictions: string[];
  recommendations: string[];
}

export interface ProgressSummary {
  totalSessions: number;
  totalStepsCompleted: number;
  averageSessionDuration: number;
  overallSatisfaction: number;
}

export interface SkillAnalysis {
  totalSkills: number;
  averageProficiency: number;
  skillCategories: string[];
  recentlyAcquired: number;
}