import { z } from 'zod';
import { 
  InputType, 
  SkillLevel, 
  ComplexityLevel, 
  InputTypeSchema, 
  SkillLevelSchema, 
  ComplexityLevelSchema,
  TimestampSchema 
} from './common';
import { BrowserAction, BrowserActionSchema } from './browser';

// Learning Request Interface and Schema
export interface LearningRequest {
  id: string;
  userId: string;
  objective: string;
  inputType: InputType;
  rawInput: string | Buffer; // For text, voice (AudioBuffer), or image (ImageBuffer)
  context?: LearningContext;
  timestamp: Date;
}

export const LearningRequestSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  objective: z.string().min(1),
  inputType: InputTypeSchema,
  rawInput: z.union([z.string(), z.instanceof(Buffer)]),
  context: z.optional(z.lazy(() => LearningContextSchema)),
  timestamp: z.date()
});

// Learning Context Interface and Schema
export interface LearningContext {
  sessionId: string;
  previousSteps: string[];
  currentTool?: string;
  userPreferences: UserPreferences;
  environmentState: EnvironmentState;
}

export const LearningContextSchema: z.ZodType<LearningContext> = z.object({
  sessionId: z.string().uuid(),
  previousSteps: z.array(z.string()),
  currentTool: z.optional(z.string()),
  userPreferences: z.lazy(() => UserPreferencesSchema),
  environmentState: z.lazy(() => EnvironmentStateSchema)
});

// Basic User Preferences for Learning Context
export interface UserPreferences {
  explanationDetail: 'minimal' | 'moderate' | 'detailed';
  learningPace: 'slow' | 'normal' | 'fast';
  preferredInputMethod: InputType;
  enableVoiceGuidance: boolean;
  showCueCards: boolean;
  autoAdvance: boolean;
}

export const UserPreferencesSchema: z.ZodType<UserPreferences> = z.object({
  explanationDetail: z.enum(['minimal', 'moderate', 'detailed']),
  learningPace: z.enum(['slow', 'normal', 'fast']),
  preferredInputMethod: InputTypeSchema,
  enableVoiceGuidance: z.boolean(),
  showCueCards: z.boolean(),
  autoAdvance: z.boolean()
});

// Environment State Interface and Schema
export interface EnvironmentState {
  activeBrowsers: string[];
  openTools: string[];
  currentScreen: ScreenInfo;
  systemResources: SystemResources;
}

export const EnvironmentStateSchema: z.ZodType<EnvironmentState> = z.object({
  activeBrowsers: z.array(z.string()),
  openTools: z.array(z.string()),
  currentScreen: z.lazy(() => ScreenInfoSchema),
  systemResources: z.lazy(() => SystemResourcesSchema)
});

// Screen Info Interface and Schema
export interface ScreenInfo {
  width: number;
  height: number;
  scaleFactor: number;
  colorDepth: number;
}

export const ScreenInfoSchema: z.ZodType<ScreenInfo> = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  scaleFactor: z.number().positive(),
  colorDepth: z.number().positive()
});

// System Resources Interface and Schema
export interface SystemResources {
  memoryUsage: number;
  cpuUsage: number;
  availableMemory: number;
}

export const SystemResourcesSchema: z.ZodType<SystemResources> = z.object({
  memoryUsage: z.number().min(0).max(100),
  cpuUsage: z.number().min(0).max(100),
  availableMemory: z.number().positive()
});

// Learning Step Interface and Schema
export interface LearningStep {
  id: string;
  title: string;
  description: string;
  toolRequired: string;
  actions: BrowserAction[];
  explanation: string;
  expectedOutcome: string;
  validationCriteria: ValidationCriteria;
  estimatedDuration: number; // in minutes
  complexity: ComplexityLevel;
  prerequisites: string[];
  learningObjectives: string[];
}

export const LearningStepSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  toolRequired: z.string().min(1),
  actions: z.array(BrowserActionSchema),
  explanation: z.string().min(1),
  expectedOutcome: z.string().min(1),
  validationCriteria: z.lazy(() => ValidationCriteriaSchema),
  estimatedDuration: z.number().positive(),
  complexity: ComplexityLevelSchema,
  prerequisites: z.array(z.string()),
  learningObjectives: z.array(z.string())
});

// Validation Criteria Interface and Schema
export interface ValidationCriteria {
  type: 'visual' | 'functional' | 'content' | 'interaction';
  criteria: ValidationRule[];
  successThreshold: number; // percentage (0-100)
}

export const ValidationCriteriaSchema: z.ZodType<ValidationCriteria> = z.object({
  type: z.enum(['visual', 'functional', 'content', 'interaction']),
  criteria: z.array(z.lazy(() => ValidationRuleSchema)),
  successThreshold: z.number().min(0).max(100)
});

// Validation Rule Interface and Schema
export interface ValidationRule {
  id: string;
  description: string;
  selector?: string; // CSS selector for element validation
  expectedValue?: string;
  validationType: 'exists' | 'contains' | 'equals' | 'matches' | 'visible';
  weight: number; // importance weight (0-1)
}

export const ValidationRuleSchema: z.ZodType<ValidationRule> = z.object({
  id: z.string().uuid(),
  description: z.string().min(1),
  selector: z.optional(z.string()),
  expectedValue: z.optional(z.string()),
  validationType: z.enum(['exists', 'contains', 'equals', 'matches', 'visible']),
  weight: z.number().min(0).max(1)
});

// Learning Intent Interface and Schema
export interface LearningIntent {
  objective: string;
  extractedKeywords: string[];
  requiredTools: string[];
  estimatedComplexity: ComplexityLevel;
  suggestedSkillLevel: SkillLevel;
  relatedConcepts: string[];
}

export const LearningIntentSchema = z.object({
  objective: z.string().min(1),
  extractedKeywords: z.array(z.string()),
  requiredTools: z.array(z.string()),
  estimatedComplexity: ComplexityLevelSchema,
  suggestedSkillLevel: SkillLevelSchema,
  relatedConcepts: z.array(z.string())
});

// Learning Outcome Interface and Schema
export interface LearningOutcome {
  skill: string;
  description: string;
  proficiencyGained: number; // percentage gained
  evidenceUrl?: string;
}

export const LearningOutcomeSchema = z.object({
  skill: z.string().min(1),
  description: z.string().min(1),
  proficiencyGained: z.number().min(0).max(100),
  evidenceUrl: z.optional(z.string().url())
});

// Step Result Interface and Schema
export interface StepResult {
  stepId: string;
  status: 'completed' | 'failed' | 'skipped' | 'in_progress';
  outcome: LearningOutcome;
  nextStepId?: string;
  adaptations: StepAdaptation[];
  timestamp: Date;
}

export const StepResultSchema = z.object({
  stepId: z.string().uuid(),
  status: z.enum(['completed', 'failed', 'skipped', 'in_progress']),
  outcome: LearningOutcomeSchema,
  nextStepId: z.optional(z.string().uuid()),
  adaptations: z.array(z.lazy(() => StepAdaptationSchema)),
  timestamp: z.date()
});

// Step Adaptation Interface and Schema
export interface StepAdaptation {
  type: 'difficulty' | 'pace' | 'explanation' | 'tool' | 'approach';
  reason: string;
  originalValue: string;
  adaptedValue: string;
  confidence: number; // 0-1
}

export const StepAdaptationSchema: z.ZodType<StepAdaptation> = z.object({
  type: z.enum(['difficulty', 'pace', 'explanation', 'tool', 'approach']),
  reason: z.string().min(1),
  originalValue: z.string(),
  adaptedValue: z.string(),
  confidence: z.number().min(0).max(1)
});

// User Feedback Interface and Schema
export interface UserFeedback {
  stepId: string;
  helpful: boolean;
  confusing: boolean;
  tooFast: boolean;
  tooSlow: boolean;
  tooEasy: boolean;
  tooHard: boolean;
  needsMoreExplanation: boolean;
  tooMuchExplanation: boolean;
  comments?: string;
  timestamp: Date;
}

export const UserFeedbackSchema: z.ZodType<UserFeedback> = z.object({
  stepId: z.string().uuid(),
  helpful: z.boolean(),
  confusing: z.boolean(),
  tooFast: z.boolean(),
  tooSlow: z.boolean(),
  tooEasy: z.boolean(),
  tooHard: z.boolean(),
  needsMoreExplanation: z.boolean(),
  tooMuchExplanation: z.boolean(),
  comments: z.optional(z.string()),
  timestamp: z.date()
});

// Project Completion and Assessment Types

// Project Summary Interface and Schema
export interface ProjectSummary {
  id: string;
  projectId: string;
  projectName: string;
  builderType: string;
  completionDate: Date;
  totalTimeSpent: number; // in seconds
  learningOutcomes: LearningOutcome[];
  technicalSkills: string[];
  achievements: string[];
  challenges: string[];
  solutions: string[];
  keyInsights: string[];
  recommendedNextSteps: string[];
  portfolioReady: boolean;
  shareableUrl?: string;
}

export const ProjectSummarySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  projectName: z.string().min(1),
  builderType: z.string(),
  completionDate: z.date(),
  totalTimeSpent: z.number().positive(),
  learningOutcomes: z.array(LearningOutcomeSchema),
  technicalSkills: z.array(z.string()),
  achievements: z.array(z.string()),
  challenges: z.array(z.string()),
  solutions: z.array(z.string()),
  keyInsights: z.array(z.string()),
  recommendedNextSteps: z.array(z.string()),
  portfolioReady: z.boolean(),
  shareableUrl: z.optional(z.string().url())
});

// Completion Metrics Interface and Schema
export interface CompletionMetrics {
  totalTimeSpent: number; // in seconds
  completionPercentage: number; // 0-100
  qualityScore?: number; // 0-100
  complexityScore?: number; // 0-10
  challengesEncountered?: string[];
  solutionsImplemented?: string[];
  deploymentUrl?: string;
}

export const CompletionMetricsSchema = z.object({
  totalTimeSpent: z.number().positive(),
  completionPercentage: z.number().min(0).max(100),
  qualityScore: z.optional(z.number().min(0).max(100)),
  complexityScore: z.optional(z.number().min(0).max(10)),
  challengesEncountered: z.optional(z.array(z.string())),
  solutionsImplemented: z.optional(z.array(z.string())),
  deploymentUrl: z.optional(z.string().url())
});

// Skill Assessment Interface and Schema
export interface SkillAssessment {
  id: string;
  userId: string;
  projectId: string;
  assessmentDate: Date;
  skillsAssessed: string[];
  skillLevels: Record<string, SkillLevel>;
  overallScore: number; // 0-100
  strengths: string[];
  improvementAreas: string[];
  progressFromPrevious: Record<string, number>; // skill -> percentage improvement
  recommendations: LearningRecommendation[];
}

export const SkillAssessmentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid(),
  assessmentDate: z.date(),
  skillsAssessed: z.array(z.string()),
  skillLevels: z.record(SkillLevelSchema),
  overallScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  improvementAreas: z.array(z.string()),
  progressFromPrevious: z.record(z.number()),
  recommendations: z.array(z.lazy(() => LearningRecommendationSchema))
});

// Learning Recommendation Interface and Schema
export interface LearningRecommendation {
  id: string;
  type: 'skill_improvement' | 'project' | 'course' | 'tutorial' | 'practice';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedTime: string;
  resources: LearningResource[];
  prerequisites: string[];
  expectedOutcome: string;
}

export const LearningRecommendationSchema: z.ZodType<LearningRecommendation> = z.object({
  id: z.string().uuid(),
  type: z.enum(['skill_improvement', 'project', 'course', 'tutorial', 'practice']),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']),
  estimatedTime: z.string(),
  resources: z.array(z.lazy(() => LearningResourceSchema)),
  prerequisites: z.array(z.string()),
  expectedOutcome: z.string()
});

// Learning Resource Interface and Schema
export interface LearningResource {
  title: string;
  url: string;
  type: 'course' | 'tutorial' | 'documentation' | 'video' | 'article' | 'book' | 'guide';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: string;
  free?: boolean;
}

export const LearningResourceSchema: z.ZodType<LearningResource> = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  type: z.enum(['course', 'tutorial', 'documentation', 'video', 'article', 'book', 'guide']),
  difficulty: z.optional(z.enum(['beginner', 'intermediate', 'advanced'])),
  estimatedTime: z.optional(z.string()),
  free: z.optional(z.boolean())
});

// Portfolio Project Interface and Schema
export interface PortfolioProject {
  id: string;
  projectId: string;
  userId: string;
  projectName: string;
  description: string;
  builderType: string;
  completionDate: Date;
  addedToPortfolioDate?: Date;
  lastUpdated?: Date;
  tags: string[];
  skillsUsed: string[];
  achievements: string[];
  liveUrl?: string;
  sourceUrl?: string;
  screenshots: string[];
  featured: boolean;
  visibility: 'public' | 'private' | 'unlisted';
}

export const PortfolioProjectSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  projectName: z.string().min(1),
  description: z.string().min(1),
  builderType: z.string(),
  completionDate: z.date(),
  addedToPortfolioDate: z.optional(z.date()),
  lastUpdated: z.optional(z.date()),
  tags: z.array(z.string()),
  skillsUsed: z.array(z.string()),
  achievements: z.array(z.string()),
  liveUrl: z.optional(z.string().url()),
  sourceUrl: z.optional(z.string().url()),
  screenshots: z.array(z.string()),
  featured: z.boolean(),
  visibility: z.enum(['public', 'private', 'unlisted'])
});

// Next Steps Recommendation Interface and Schema
export interface NextStepsRecommendation {
  id: string;
  type: 'skill_development' | 'project' | 'career' | 'learning_path' | 'certification';
  category: 'learning' | 'practice' | 'advancement' | 'structured_learning';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  relevanceScore: number; // 0-100
  estimatedTimeToComplete: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  resources: LearningResource[];
  expectedBenefits: string[];
  prerequisites: string[];
}

export const NextStepsRecommendationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['skill_development', 'project', 'career', 'learning_path', 'certification']),
  category: z.enum(['learning', 'practice', 'advancement', 'structured_learning']),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']),
  relevanceScore: z.number().min(0).max(100),
  estimatedTimeToComplete: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  resources: z.array(LearningResourceSchema),
  expectedBenefits: z.array(z.string()),
  prerequisites: z.array(z.string())
});

// Learning Path Interface and Schema
export interface LearningPath {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetSkills: string[];
  currentLevel: SkillLevel;
  targetLevel: SkillLevel;
  steps: LearningPathStep[];
  estimatedDuration: string;
  prerequisites: string[];
  createdDate: Date;
  lastUpdated: Date;
  progress: LearningPathProgress;
}

export const LearningPathSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  targetSkills: z.array(z.string()),
  currentLevel: SkillLevelSchema,
  targetLevel: SkillLevelSchema,
  steps: z.array(z.lazy(() => LearningPathStepSchema)),
  estimatedDuration: z.string(),
  prerequisites: z.array(z.string()),
  createdDate: z.date(),
  lastUpdated: z.date(),
  progress: z.lazy(() => LearningPathProgressSchema)
});

// Learning Path Step Interface and Schema
export interface LearningPathStep {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedDuration: string;
  resources: LearningResource[];
  completed: boolean;
  completedDate?: Date;
  notes?: string;
}

export const LearningPathStepSchema: z.ZodType<LearningPathStep> = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  order: z.number().positive(),
  estimatedDuration: z.string(),
  resources: z.array(LearningResourceSchema),
  completed: z.boolean(),
  completedDate: z.optional(z.date()),
  notes: z.optional(z.string())
});

// Learning Path Progress Interface and Schema
export interface LearningPathProgress {
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
  currentStepId?: string;
  estimatedTimeRemaining?: string;
  lastActivityDate?: Date;
}

export const LearningPathProgressSchema: z.ZodType<LearningPathProgress> = z.object({
  completedSteps: z.number().min(0),
  totalSteps: z.number().positive(),
  percentComplete: z.number().min(0).max(100),
  currentStepId: z.optional(z.string().uuid()),
  estimatedTimeRemaining: z.optional(z.string()),
  lastActivityDate: z.optional(z.date())
});