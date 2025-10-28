import { z } from 'zod';
import { 
  LearningStyle, 
  SkillLevel, 
  LearningStyleSchema, 
  SkillLevelSchema,
  TimestampSchema 
} from './common';
import { LearningOutcome, LearningOutcomeSchema } from './learning';

// User Profile Interface and Schema
export interface UserProfile {
  id: string;
  learningStyle: LearningStyle;
  skillLevel: SkillLevel;
  completedProjects: string[];
  preferences: ExtendedUserPreferences;
  progressHistory: LearningProgress[];
  adaptationData: AdaptationData;
  createdAt: Date;
  updatedAt: Date;
}

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  learningStyle: LearningStyleSchema,
  skillLevel: SkillLevelSchema,
  completedProjects: z.array(z.string().uuid()),
  preferences: z.lazy(() => ExtendedUserPreferencesSchema),
  progressHistory: z.array(z.lazy(() => LearningProgressSchema)),
  adaptationData: z.lazy(() => AdaptationDataSchema),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Extended User Preferences Interface
export interface ExtendedUserPreferences {
  explanationDetail: 'minimal' | 'moderate' | 'detailed';
  learningPace: 'slow' | 'normal' | 'fast';
  preferredInputMethod: 'text' | 'voice' | 'image';
  enableVoiceGuidance: boolean;
  showCueCards: boolean;
  autoAdvance: boolean;
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  notifications: NotificationPreferences;
  accessibility: AccessibilityPreferences;
}

export const ExtendedUserPreferencesSchema: z.ZodType<ExtendedUserPreferences> = z.object({
  explanationDetail: z.enum(['minimal', 'moderate', 'detailed']),
  learningPace: z.enum(['slow', 'normal', 'fast']),
  preferredInputMethod: z.enum(['text', 'voice', 'image']),
  enableVoiceGuidance: z.boolean(),
  showCueCards: z.boolean(),
  autoAdvance: z.boolean(),
  theme: z.enum(['light', 'dark', 'auto']),
  fontSize: z.enum(['small', 'medium', 'large']),
  notifications: z.lazy(() => NotificationPreferencesSchema),
  accessibility: z.lazy(() => AccessibilityPreferencesSchema)
});

// Notification Preferences Interface and Schema
export interface NotificationPreferences {
  stepCompletion: boolean;
  errorAlerts: boolean;
  progressMilestones: boolean;
  sessionReminders: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export const NotificationPreferencesSchema = z.object({
  stepCompletion: z.boolean(),
  errorAlerts: z.boolean(),
  progressMilestones: z.boolean(),
  sessionReminders: z.boolean(),
  soundEnabled: z.boolean(),
  vibrationEnabled: z.boolean()
});

// Accessibility Preferences Interface and Schema
export interface AccessibilityPreferences {
  highContrast: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  reducedMotion: boolean;
  largeClickTargets: boolean;
  voiceCommands: boolean;
}

export const AccessibilityPreferencesSchema = z.object({
  highContrast: z.boolean(),
  screenReader: z.boolean(),
  keyboardNavigation: z.boolean(),
  reducedMotion: z.boolean(),
  largeClickTargets: z.boolean(),
  voiceCommands: z.boolean()
});

// Learning Progress Interface and Schema
export interface LearningProgress {
  id: string;
  userId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  failedSteps: number;
  averageStepTime: number; // in minutes
  skillsAcquired: SkillAcquisition[];
  challengesEncountered: Challenge[];
  overallSatisfaction: number; // 1-5 scale
  learningEfficiency: number; // 0-1 scale
  adaptationsMade: number;
  toolsUsed: string[];
  outcomes: LearningOutcome[];
  analytics: ProgressAnalytics;
}

export const LearningProgressSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  startTime: z.date(),
  endTime: z.optional(z.date()),
  totalSteps: z.number().min(0),
  completedSteps: z.number().min(0),
  skippedSteps: z.number().min(0),
  failedSteps: z.number().min(0),
  averageStepTime: z.number().positive(),
  skillsAcquired: z.array(z.lazy(() => SkillAcquisitionSchema)),
  challengesEncountered: z.array(z.lazy(() => ChallengeSchema)),
  overallSatisfaction: z.number().min(1).max(5),
  learningEfficiency: z.number().min(0).max(1),
  adaptationsMade: z.number().min(0),
  toolsUsed: z.array(z.string()),
  outcomes: z.array(LearningOutcomeSchema),
  analytics: z.lazy(() => ProgressAnalyticsSchema)
});

// Skill Acquisition Interface and Schema
export interface SkillAcquisition {
  skillName: string;
  category: string;
  proficiencyLevel: number; // 0-1 scale
  acquisitionTime: number; // in minutes
  practiceCount: number;
  lastPracticed: Date;
  retentionScore: number; // 0-1 scale
  relatedSkills: string[];
}

export const SkillAcquisitionSchema = z.object({
  skillName: z.string().min(1),
  category: z.string().min(1),
  proficiencyLevel: z.number().min(0).max(1),
  acquisitionTime: z.number().positive(),
  practiceCount: z.number().min(0),
  lastPracticed: z.date(),
  retentionScore: z.number().min(0).max(1),
  relatedSkills: z.array(z.string())
});

// Challenge Interface and Schema
export interface Challenge {
  id: string;
  type: ChallengeType;
  description: string;
  stepId: string;
  severity: 'low' | 'medium' | 'high';
  resolutionTime: number; // in minutes
  resolutionMethod: string;
  wasResolved: boolean;
  userFrustrationLevel: number; // 1-5 scale
  adaptationTriggered: boolean;
}

export enum ChallengeType {
  TECHNICAL = 'technical',
  CONCEPTUAL = 'conceptual',
  INTERFACE = 'interface',
  TIMING = 'timing',
  AUTHENTICATION = 'authentication',
  NAVIGATION = 'navigation'
}

export const ChallengeTypeSchema = z.nativeEnum(ChallengeType);

export const ChallengeSchema = z.object({
  id: z.string().uuid(),
  type: ChallengeTypeSchema,
  description: z.string().min(1),
  stepId: z.string().uuid(),
  severity: z.enum(['low', 'medium', 'high']),
  resolutionTime: z.number().positive(),
  resolutionMethod: z.string().min(1),
  wasResolved: z.boolean(),
  userFrustrationLevel: z.number().min(1).max(5),
  adaptationTriggered: z.boolean()
});

// Progress Analytics Interface and Schema
export interface ProgressAnalytics {
  learningVelocity: number; // steps per hour
  errorRate: number; // 0-1 scale
  helpRequestFrequency: number; // requests per session
  conceptRetention: number; // 0-1 scale
  toolProficiency: ToolProficiency[];
  learningPatterns: LearningPattern[];
  improvementAreas: string[];
  strengths: string[];
}

export const ProgressAnalyticsSchema = z.object({
  learningVelocity: z.number().positive(),
  errorRate: z.number().min(0).max(1),
  helpRequestFrequency: z.number().min(0),
  conceptRetention: z.number().min(0).max(1),
  toolProficiency: z.array(z.lazy(() => ToolProficiencySchema)),
  learningPatterns: z.array(z.lazy(() => LearningPatternSchema)),
  improvementAreas: z.array(z.string()),
  strengths: z.array(z.string())
});

// Tool Proficiency Interface and Schema
export interface ToolProficiency {
  toolName: string;
  proficiencyScore: number; // 0-1 scale
  timeSpent: number; // in minutes
  tasksCompleted: number;
  errorCount: number;
  lastUsed: Date;
  improvementRate: number; // 0-1 scale
}

export const ToolProficiencySchema = z.object({
  toolName: z.string().min(1),
  proficiencyScore: z.number().min(0).max(1),
  timeSpent: z.number().positive(),
  tasksCompleted: z.number().min(0),
  errorCount: z.number().min(0),
  lastUsed: z.date(),
  improvementRate: z.number().min(0).max(1)
});

// Learning Pattern Interface and Schema
export interface LearningPattern {
  patternType: PatternType;
  frequency: number;
  contexts: string[];
  effectiveness: number; // 0-1 scale
  description: string;
}

export enum PatternType {
  TRIAL_AND_ERROR = 'trial_and_error',
  SYSTEMATIC = 'systematic',
  EXPLORATORY = 'exploratory',
  HELP_SEEKING = 'help_seeking',
  REPETITIVE = 'repetitive',
  INNOVATIVE = 'innovative'
}

export const PatternTypeSchema = z.nativeEnum(PatternType);

export const LearningPatternSchema = z.object({
  patternType: PatternTypeSchema,
  frequency: z.number().min(0),
  contexts: z.array(z.string()),
  effectiveness: z.number().min(0).max(1),
  description: z.string().min(1)
});

// Adaptation Data Interface and Schema
export interface AdaptationData {
  userId: string;
  adaptationHistory: AdaptationEvent[];
  currentAdaptations: ActiveAdaptation[];
  adaptationEffectiveness: AdaptationEffectiveness;
  personalizedSettings: PersonalizedSettings;
  lastUpdated: Date;
}

export const AdaptationDataSchema = z.object({
  userId: z.string().uuid(),
  adaptationHistory: z.array(z.lazy(() => AdaptationEventSchema)),
  currentAdaptations: z.array(z.lazy(() => ActiveAdaptationSchema)),
  adaptationEffectiveness: z.lazy(() => AdaptationEffectivenessSchema),
  personalizedSettings: z.lazy(() => PersonalizedSettingsSchema),
  lastUpdated: z.date()
});

// Adaptation Event Interface and Schema
export interface AdaptationEvent {
  id: string;
  type: AdaptationType;
  trigger: string;
  originalValue: any;
  adaptedValue: any;
  timestamp: Date;
  effectiveness: number; // 0-1 scale
  userFeedback?: string;
  automaticReversal: boolean;
}

export enum AdaptationType {
  DIFFICULTY = 'difficulty',
  PACE = 'pace',
  EXPLANATION_DETAIL = 'explanation_detail',
  INPUT_METHOD = 'input_method',
  TOOL_SELECTION = 'tool_selection',
  INTERFACE_LAYOUT = 'interface_layout'
}

export const AdaptationTypeSchema = z.nativeEnum(AdaptationType);

export const AdaptationEventSchema = z.object({
  id: z.string().uuid(),
  type: AdaptationTypeSchema,
  trigger: z.string().min(1),
  originalValue: z.any(),
  adaptedValue: z.any(),
  timestamp: z.date(),
  effectiveness: z.number().min(0).max(1),
  userFeedback: z.optional(z.string()),
  automaticReversal: z.boolean()
});

// Active Adaptation Interface and Schema
export interface ActiveAdaptation {
  id: string;
  type: AdaptationType;
  currentValue: any;
  confidence: number; // 0-1 scale
  duration: number; // in minutes
  context: string;
  canRevert: boolean;
}

export const ActiveAdaptationSchema = z.object({
  id: z.string().uuid(),
  type: AdaptationTypeSchema,
  currentValue: z.any(),
  confidence: z.number().min(0).max(1),
  duration: z.number().positive(),
  context: z.string().min(1),
  canRevert: z.boolean()
});

// Adaptation Effectiveness Interface and Schema
export interface AdaptationEffectiveness {
  overallScore: number; // 0-1 scale
  byType: Record<AdaptationType, number>;
  successRate: number; // 0-1 scale
  userSatisfaction: number; // 1-5 scale
  learningImprovement: number; // 0-1 scale
}

export const AdaptationEffectivenessSchema = z.object({
  overallScore: z.number().min(0).max(1),
  byType: z.record(z.nativeEnum(AdaptationType), z.number().min(0).max(1)),
  successRate: z.number().min(0).max(1),
  userSatisfaction: z.number().min(1).max(5),
  learningImprovement: z.number().min(0).max(1)
});

// Personalized Settings Interface and Schema
export interface PersonalizedSettings {
  optimalLearningTime: TimePreference;
  preferredComplexityProgression: ComplexityProgression;
  effectiveMotivationTechniques: string[];
  adaptiveThresholds: AdaptiveThresholds;
  customizedInterface: InterfaceCustomization;
}

export const PersonalizedSettingsSchema = z.object({
  optimalLearningTime: z.lazy(() => TimePreferenceSchema),
  preferredComplexityProgression: z.lazy(() => ComplexityProgressionSchema),
  effectiveMotivationTechniques: z.array(z.string()),
  adaptiveThresholds: z.lazy(() => AdaptiveThresholdsSchema),
  customizedInterface: z.lazy(() => InterfaceCustomizationSchema)
});

// Time Preference Interface and Schema
export interface TimePreference {
  preferredDuration: number; // in minutes
  optimalStartTime: string; // HH:MM format
  breakFrequency: number; // minutes between breaks
  peakPerformanceHours: string[];
}

export const TimePreferenceSchema = z.object({
  preferredDuration: z.number().positive(),
  optimalStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  breakFrequency: z.number().positive(),
  peakPerformanceHours: z.array(z.string())
});

// Complexity Progression Interface and Schema
export interface ComplexityProgression {
  startingLevel: number; // 0-1 scale
  progressionRate: number; // 0-1 scale
  adaptationSensitivity: number; // 0-1 scale
  fallbackThreshold: number; // 0-1 scale
}

export const ComplexityProgressionSchema = z.object({
  startingLevel: z.number().min(0).max(1),
  progressionRate: z.number().min(0).max(1),
  adaptationSensitivity: z.number().min(0).max(1),
  fallbackThreshold: z.number().min(0).max(1)
});

// Adaptive Thresholds Interface and Schema
export interface AdaptiveThresholds {
  errorRateThreshold: number; // 0-1 scale
  frustrationThreshold: number; // 1-5 scale
  boredomThreshold: number; // 1-5 scale
  helpRequestThreshold: number;
  timeoutThreshold: number; // in minutes
}

export const AdaptiveThresholdsSchema = z.object({
  errorRateThreshold: z.number().min(0).max(1),
  frustrationThreshold: z.number().min(1).max(5),
  boredomThreshold: z.number().min(1).max(5),
  helpRequestThreshold: z.number().min(0),
  timeoutThreshold: z.number().positive()
});

// Interface Customization Interface and Schema
export interface InterfaceCustomization {
  layout: 'compact' | 'standard' | 'spacious';
  colorScheme: string;
  fontFamily: string;
  animationSpeed: 'slow' | 'normal' | 'fast' | 'none';
  overlayOpacity: number; // 0-1 scale
  cueCardPosition: 'top' | 'bottom' | 'left' | 'right';
}

export const InterfaceCustomizationSchema = z.object({
  layout: z.enum(['compact', 'standard', 'spacious']),
  colorScheme: z.string().min(1),
  fontFamily: z.string().min(1),
  animationSpeed: z.enum(['slow', 'normal', 'fast', 'none']),
  overlayOpacity: z.number().min(0).max(1),
  cueCardPosition: z.enum(['top', 'bottom', 'left', 'right'])
});