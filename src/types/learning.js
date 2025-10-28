import { z } from 'zod';
import { InputTypeSchema, SkillLevelSchema, ComplexityLevelSchema } from './common';
import { BrowserActionSchema } from './browser';
export const LearningRequestSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    objective: z.string().min(1),
    inputType: InputTypeSchema,
    rawInput: z.union([z.string(), z.instanceof(Buffer)]),
    context: z.optional(z.lazy(() => LearningContextSchema)),
    timestamp: z.date()
});
export const LearningContextSchema = z.object({
    sessionId: z.string().uuid(),
    previousSteps: z.array(z.string()),
    currentTool: z.optional(z.string()),
    userPreferences: z.lazy(() => UserPreferencesSchema),
    environmentState: z.lazy(() => EnvironmentStateSchema)
});
export const UserPreferencesSchema = z.object({
    explanationDetail: z.enum(['minimal', 'moderate', 'detailed']),
    learningPace: z.enum(['slow', 'normal', 'fast']),
    preferredInputMethod: InputTypeSchema,
    enableVoiceGuidance: z.boolean(),
    showCueCards: z.boolean(),
    autoAdvance: z.boolean()
});
export const EnvironmentStateSchema = z.object({
    activeBrowsers: z.array(z.string()),
    openTools: z.array(z.string()),
    currentScreen: z.lazy(() => ScreenInfoSchema),
    systemResources: z.lazy(() => SystemResourcesSchema)
});
export const ScreenInfoSchema = z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    scaleFactor: z.number().positive(),
    colorDepth: z.number().positive()
});
export const SystemResourcesSchema = z.object({
    memoryUsage: z.number().min(0).max(100),
    cpuUsage: z.number().min(0).max(100),
    availableMemory: z.number().positive()
});
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
export const ValidationCriteriaSchema = z.object({
    type: z.enum(['visual', 'functional', 'content', 'interaction']),
    criteria: z.array(z.lazy(() => ValidationRuleSchema)),
    successThreshold: z.number().min(0).max(100)
});
export const ValidationRuleSchema = z.object({
    id: z.string().uuid(),
    description: z.string().min(1),
    selector: z.optional(z.string()),
    expectedValue: z.optional(z.string()),
    validationType: z.enum(['exists', 'contains', 'equals', 'matches', 'visible']),
    weight: z.number().min(0).max(1)
});
export const LearningIntentSchema = z.object({
    objective: z.string().min(1),
    extractedKeywords: z.array(z.string()),
    requiredTools: z.array(z.string()),
    estimatedComplexity: ComplexityLevelSchema,
    suggestedSkillLevel: SkillLevelSchema,
    relatedConcepts: z.array(z.string())
});
export const LearningOutcomeSchema = z.object({
    stepId: z.string().uuid(),
    success: z.boolean(),
    completionTime: z.number().positive(),
    userSatisfaction: z.number().min(1).max(5),
    skillsAcquired: z.array(z.string()),
    challengesEncountered: z.array(z.string()),
    feedback: z.string()
});
export const StepResultSchema = z.object({
    stepId: z.string().uuid(),
    status: z.enum(['completed', 'failed', 'skipped', 'in_progress']),
    outcome: LearningOutcomeSchema,
    nextStepId: z.optional(z.string().uuid()),
    adaptations: z.array(z.lazy(() => StepAdaptationSchema)),
    timestamp: z.date()
});
export const StepAdaptationSchema = z.object({
    type: z.enum(['difficulty', 'pace', 'explanation', 'tool', 'approach']),
    reason: z.string().min(1),
    originalValue: z.string(),
    adaptedValue: z.string(),
    confidence: z.number().min(0).max(1)
});
export const UserFeedbackSchema = z.object({
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
