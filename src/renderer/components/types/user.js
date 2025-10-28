import { z } from 'zod';
import { LearningStyleSchema, SkillLevelSchema } from './common';
import { LearningOutcomeSchema } from './learning';
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
export const ExtendedUserPreferencesSchema = z.object({
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
export const NotificationPreferencesSchema = z.object({
    stepCompletion: z.boolean(),
    errorAlerts: z.boolean(),
    progressMilestones: z.boolean(),
    sessionReminders: z.boolean(),
    soundEnabled: z.boolean(),
    vibrationEnabled: z.boolean()
});
export const AccessibilityPreferencesSchema = z.object({
    highContrast: z.boolean(),
    screenReader: z.boolean(),
    keyboardNavigation: z.boolean(),
    reducedMotion: z.boolean(),
    largeClickTargets: z.boolean(),
    voiceCommands: z.boolean()
});
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
export var ChallengeType;
(function (ChallengeType) {
    ChallengeType["TECHNICAL"] = "technical";
    ChallengeType["CONCEPTUAL"] = "conceptual";
    ChallengeType["INTERFACE"] = "interface";
    ChallengeType["TIMING"] = "timing";
    ChallengeType["AUTHENTICATION"] = "authentication";
    ChallengeType["NAVIGATION"] = "navigation";
})(ChallengeType || (ChallengeType = {}));
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
export const ToolProficiencySchema = z.object({
    toolName: z.string().min(1),
    proficiencyScore: z.number().min(0).max(1),
    timeSpent: z.number().positive(),
    tasksCompleted: z.number().min(0),
    errorCount: z.number().min(0),
    lastUsed: z.date(),
    improvementRate: z.number().min(0).max(1)
});
export var PatternType;
(function (PatternType) {
    PatternType["TRIAL_AND_ERROR"] = "trial_and_error";
    PatternType["SYSTEMATIC"] = "systematic";
    PatternType["EXPLORATORY"] = "exploratory";
    PatternType["HELP_SEEKING"] = "help_seeking";
    PatternType["REPETITIVE"] = "repetitive";
    PatternType["INNOVATIVE"] = "innovative";
})(PatternType || (PatternType = {}));
export const PatternTypeSchema = z.nativeEnum(PatternType);
export const LearningPatternSchema = z.object({
    patternType: PatternTypeSchema,
    frequency: z.number().min(0),
    contexts: z.array(z.string()),
    effectiveness: z.number().min(0).max(1),
    description: z.string().min(1)
});
export const AdaptationDataSchema = z.object({
    userId: z.string().uuid(),
    adaptationHistory: z.array(z.lazy(() => AdaptationEventSchema)),
    currentAdaptations: z.array(z.lazy(() => ActiveAdaptationSchema)),
    adaptationEffectiveness: z.lazy(() => AdaptationEffectivenessSchema),
    personalizedSettings: z.lazy(() => PersonalizedSettingsSchema),
    lastUpdated: z.date()
});
export var AdaptationType;
(function (AdaptationType) {
    AdaptationType["DIFFICULTY"] = "difficulty";
    AdaptationType["PACE"] = "pace";
    AdaptationType["EXPLANATION_DETAIL"] = "explanation_detail";
    AdaptationType["INPUT_METHOD"] = "input_method";
    AdaptationType["TOOL_SELECTION"] = "tool_selection";
    AdaptationType["INTERFACE_LAYOUT"] = "interface_layout";
})(AdaptationType || (AdaptationType = {}));
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
export const ActiveAdaptationSchema = z.object({
    id: z.string().uuid(),
    type: AdaptationTypeSchema,
    currentValue: z.any(),
    confidence: z.number().min(0).max(1),
    duration: z.number().positive(),
    context: z.string().min(1),
    canRevert: z.boolean()
});
export const AdaptationEffectivenessSchema = z.object({
    overallScore: z.number().min(0).max(1),
    byType: z.record(z.nativeEnum(AdaptationType), z.number().min(0).max(1)),
    successRate: z.number().min(0).max(1),
    userSatisfaction: z.number().min(1).max(5),
    learningImprovement: z.number().min(0).max(1)
});
export const PersonalizedSettingsSchema = z.object({
    optimalLearningTime: z.lazy(() => TimePreferenceSchema),
    preferredComplexityProgression: z.lazy(() => ComplexityProgressionSchema),
    effectiveMotivationTechniques: z.array(z.string()),
    adaptiveThresholds: z.lazy(() => AdaptiveThresholdsSchema),
    customizedInterface: z.lazy(() => InterfaceCustomizationSchema)
});
export const TimePreferenceSchema = z.object({
    preferredDuration: z.number().positive(),
    optimalStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    breakFrequency: z.number().positive(),
    peakPerformanceHours: z.array(z.string())
});
export const ComplexityProgressionSchema = z.object({
    startingLevel: z.number().min(0).max(1),
    progressionRate: z.number().min(0).max(1),
    adaptationSensitivity: z.number().min(0).max(1),
    fallbackThreshold: z.number().min(0).max(1)
});
export const AdaptiveThresholdsSchema = z.object({
    errorRateThreshold: z.number().min(0).max(1),
    frustrationThreshold: z.number().min(1).max(5),
    boredomThreshold: z.number().min(1).max(5),
    helpRequestThreshold: z.number().min(0),
    timeoutThreshold: z.number().positive()
});
export const InterfaceCustomizationSchema = z.object({
    layout: z.enum(['compact', 'standard', 'spacious']),
    colorScheme: z.string().min(1),
    fontFamily: z.string().min(1),
    animationSpeed: z.enum(['slow', 'normal', 'fast', 'none']),
    overlayOpacity: z.number().min(0).max(1),
    cueCardPosition: z.enum(['top', 'bottom', 'left', 'right'])
});
