import { z } from 'zod';
import { InputType, InputTypeSchema } from './common';
import { LearningContext, LearningContextSchema } from './learning';

// AI Response Interface and Schema
export interface AIResponse {
  id: string;
  type: AIResponseType;
  content: string;
  confidence: number; // 0-1 scale
  processingTime: number; // in milliseconds
  model: string;
  timestamp: Date;
  metadata: AIResponseMetadata;
}

export enum AIResponseType {
  EXPLANATION = 'explanation',
  INSTRUCTION = 'instruction',
  QUESTION = 'question',
  CONFIRMATION = 'confirmation',
  ERROR = 'error',
  SUGGESTION = 'suggestion',
  ANALYSIS = 'analysis'
}

export const AIResponseTypeSchema = z.nativeEnum(AIResponseType);

export const AIResponseSchema = z.object({
  id: z.string().uuid(),
  type: AIResponseTypeSchema,
  content: z.string().min(1),
  confidence: z.number().min(0).max(1),
  processingTime: z.number().positive(),
  model: z.string().min(1),
  timestamp: z.date(),
  metadata: z.lazy(() => AIResponseMetadataSchema)
});

// AI Response Metadata Interface and Schema
export interface AIResponseMetadata {
  inputTokens: number;
  outputTokens: number;
  modelVersion: string;
  temperature: number;
  topP: number;
  contextLength: number;
  reasoningSteps?: string[];
  alternativeResponses?: string[];
}

export const AIResponseMetadataSchema = z.object({
  inputTokens: z.number().min(0),
  outputTokens: z.number().min(0),
  modelVersion: z.string().min(1),
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  contextLength: z.number().min(0),
  reasoningSteps: z.optional(z.array(z.string())),
  alternativeResponses: z.optional(z.array(z.string()))
});

// Processed Input Interface and Schema
export interface ProcessedInput {
  id: string;
  originalInput: string | Buffer;
  inputType: InputType;
  processedText: string;
  extractedEntities: Entity[];
  intent: InputIntent;
  sentiment: SentimentAnalysis;
  confidence: number; // 0-1 scale
  processingTime: number; // in milliseconds
  metadata: ProcessingMetadata;
}

export const ProcessedInputSchema = z.object({
  id: z.string().uuid(),
  originalInput: z.union([z.string(), z.instanceof(Buffer)]),
  inputType: InputTypeSchema,
  processedText: z.string(),
  extractedEntities: z.array(z.lazy(() => EntitySchema)),
  intent: z.lazy(() => InputIntentSchema),
  sentiment: z.lazy(() => SentimentAnalysisSchema),
  confidence: z.number().min(0).max(1),
  processingTime: z.number().positive(),
  metadata: z.lazy(() => ProcessingMetadataSchema)
});

// Entity Interface and Schema
export interface Entity {
  type: EntityType;
  value: string;
  confidence: number; // 0-1 scale
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, any>;
}

export enum EntityType {
  TOOL_NAME = 'tool_name',
  SKILL = 'skill',
  CONCEPT = 'concept',
  ACTION = 'action',
  TECHNOLOGY = 'technology',
  DIFFICULTY_LEVEL = 'difficulty_level',
  TIME_DURATION = 'time_duration',
  PROJECT_TYPE = 'project_type'
}

export const EntityTypeSchema = z.nativeEnum(EntityType);

export const EntitySchema = z.object({
  type: EntityTypeSchema,
  value: z.string().min(1),
  confidence: z.number().min(0).max(1),
  startIndex: z.number().min(0),
  endIndex: z.number().min(0),
  metadata: z.optional(z.record(z.any()))
});

// Input Intent Interface and Schema
export interface InputIntent {
  primary: IntentType;
  secondary?: IntentType[];
  confidence: number; // 0-1 scale
  parameters: IntentParameters;
  clarificationNeeded: boolean;
  suggestedQuestions?: string[];
}

export enum IntentType {
  LEARN_SKILL = 'learn_skill',
  BUILD_PROJECT = 'build_project',
  GET_HELP = 'get_help',
  NAVIGATE_TOOL = 'navigate_tool',
  UNDERSTAND_CONCEPT = 'understand_concept',
  TROUBLESHOOT = 'troubleshoot',
  CUSTOMIZE_EXPERIENCE = 'customize_experience',
  TRACK_PROGRESS = 'track_progress'
}

export const IntentTypeSchema = z.nativeEnum(IntentType);

export const InputIntentSchema = z.object({
  primary: IntentTypeSchema,
  secondary: z.optional(z.array(IntentTypeSchema)),
  confidence: z.number().min(0).max(1),
  parameters: z.lazy(() => IntentParametersSchema),
  clarificationNeeded: z.boolean(),
  suggestedQuestions: z.optional(z.array(z.string()))
});

// Intent Parameters Interface and Schema
export interface IntentParameters {
  targetSkill?: string;
  projectType?: string;
  toolPreference?: string;
  difficultyLevel?: string;
  timeConstraint?: number; // in minutes
  specificRequirements?: string[];
  context?: string;
}

export const IntentParametersSchema = z.object({
  targetSkill: z.optional(z.string()),
  projectType: z.optional(z.string()),
  toolPreference: z.optional(z.string()),
  difficultyLevel: z.optional(z.string()),
  timeConstraint: z.optional(z.number().positive()),
  specificRequirements: z.optional(z.array(z.string())),
  context: z.optional(z.string())
});

// Sentiment Analysis Interface and Schema
export interface SentimentAnalysis {
  overall: SentimentType;
  confidence: number; // 0-1 scale
  emotions: EmotionScore[];
  frustrationLevel: number; // 0-1 scale
  engagementLevel: number; // 0-1 scale
  motivationLevel: number; // 0-1 scale
}

export enum SentimentType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  MIXED = 'mixed'
}

export const SentimentTypeSchema = z.nativeEnum(SentimentType);

export const SentimentAnalysisSchema = z.object({
  overall: SentimentTypeSchema,
  confidence: z.number().min(0).max(1),
  emotions: z.array(z.lazy(() => EmotionScoreSchema)),
  frustrationLevel: z.number().min(0).max(1),
  engagementLevel: z.number().min(0).max(1),
  motivationLevel: z.number().min(0).max(1)
});

// Emotion Score Interface and Schema
export interface EmotionScore {
  emotion: EmotionType;
  intensity: number; // 0-1 scale
  confidence: number; // 0-1 scale
}

export enum EmotionType {
  JOY = 'joy',
  SADNESS = 'sadness',
  ANGER = 'anger',
  FEAR = 'fear',
  SURPRISE = 'surprise',
  DISGUST = 'disgust',
  EXCITEMENT = 'excitement',
  CONFUSION = 'confusion',
  CURIOSITY = 'curiosity',
  FRUSTRATION = 'frustration'
}

export const EmotionTypeSchema = z.nativeEnum(EmotionType);

export const EmotionScoreSchema = z.object({
  emotion: EmotionTypeSchema,
  intensity: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1)
});

// Processing Metadata Interface and Schema
export interface ProcessingMetadata {
  processingSteps: ProcessingStep[];
  modelUsed: string;
  apiCalls: number;
  cacheHit: boolean;
  errorCount: number;
  warnings: string[];
}

export const ProcessingMetadataSchema = z.object({
  processingSteps: z.array(z.lazy(() => ProcessingStepSchema)),
  modelUsed: z.string().min(1),
  apiCalls: z.number().min(0),
  cacheHit: z.boolean(),
  errorCount: z.number().min(0),
  warnings: z.array(z.string())
});

// Processing Step Interface and Schema
export interface ProcessingStep {
  step: string;
  duration: number; // in milliseconds
  success: boolean;
  output?: any;
  error?: string;
}

export const ProcessingStepSchema = z.object({
  step: z.string().min(1),
  duration: z.number().positive(),
  success: z.boolean(),
  output: z.optional(z.any()),
  error: z.optional(z.string())
});

// Multimodal Input Interface and Schema
export interface MultimodalInput {
  id: string;
  textInput?: string;
  audioInput?: AudioInput;
  imageInput?: ImageInput;
  combinedProcessing: boolean;
  timestamp: Date;
  context: LearningContext;
}

export const MultimodalInputSchema = z.object({
  id: z.string().uuid(),
  textInput: z.optional(z.string()),
  audioInput: z.optional(z.lazy(() => AudioInputSchema)),
  imageInput: z.optional(z.lazy(() => ImageInputSchema)),
  combinedProcessing: z.boolean(),
  timestamp: z.date(),
  context: LearningContextSchema
});

// Audio Input Interface and Schema
export interface AudioInput {
  data: Buffer;
  format: AudioFormat;
  duration: number; // in seconds
  sampleRate: number;
  channels: number;
  transcription?: string;
  confidence?: number; // 0-1 scale
}

export enum AudioFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  FLAC = 'flac',
  OGG = 'ogg',
  M4A = 'm4a'
}

export const AudioFormatSchema = z.nativeEnum(AudioFormat);

export const AudioInputSchema = z.object({
  data: z.instanceof(Buffer),
  format: AudioFormatSchema,
  duration: z.number().positive(),
  sampleRate: z.number().positive(),
  channels: z.number().positive(),
  transcription: z.optional(z.string()),
  confidence: z.optional(z.number().min(0).max(1))
});

// Image Input Interface and Schema
export interface ImageInput {
  data: Buffer;
  format: ImageFormat;
  dimensions: {
    width: number;
    height: number;
  };
  description?: string;
  detectedObjects?: DetectedObject[];
  textContent?: string;
}

export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  GIF = 'gif',
  WEBP = 'webp',
  BMP = 'bmp',
  SVG = 'svg'
}

export const ImageFormatSchema = z.nativeEnum(ImageFormat);

export const ImageInputSchema = z.object({
  data: z.instanceof(Buffer),
  format: ImageFormatSchema,
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive()
  }),
  description: z.optional(z.string()),
  detectedObjects: z.optional(z.array(z.lazy(() => DetectedObjectSchema))),
  textContent: z.optional(z.string())
});

// Detected Object Interface and Schema
export interface DetectedObject {
  label: string;
  confidence: number; // 0-1 scale
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes?: Record<string, any>;
}

export const DetectedObjectSchema = z.object({
  label: z.string().min(1),
  confidence: z.number().min(0).max(1),
  boundingBox: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    width: z.number().positive(),
    height: z.number().positive()
  }),
  attributes: z.optional(z.record(z.any()))
});

// AI Model Configuration Interface and Schema
export interface AIModelConfig {
  modelName: string;
  provider: AIProvider;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt?: string;
  contextWindow: number;
  capabilities: ModelCapability[];
}

export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  HUGGINGFACE = 'huggingface',
  GROQ = 'groq',
  LOCAL = 'local'
}

export enum ModelCapability {
  TEXT_GENERATION = 'text_generation',
  IMAGE_ANALYSIS = 'image_analysis',
  SPEECH_TO_TEXT = 'speech_to_text',
  TEXT_TO_SPEECH = 'text_to_speech',
  CODE_GENERATION = 'code_generation',
  REASONING = 'reasoning',
  MULTIMODAL = 'multimodal'
}

export const AIProviderSchema = z.nativeEnum(AIProvider);
export const ModelCapabilitySchema = z.nativeEnum(ModelCapability);

export const AIModelConfigSchema = z.object({
  modelName: z.string().min(1),
  provider: AIProviderSchema,
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().positive(),
  topP: z.number().min(0).max(1),
  frequencyPenalty: z.number().min(-2).max(2),
  presencePenalty: z.number().min(-2).max(2),
  systemPrompt: z.optional(z.string()),
  contextWindow: z.number().positive(),
  capabilities: z.array(ModelCapabilitySchema)
});