import { z } from 'zod';
import { BrowserError, BrowserErrorType } from './browser';
import { AIResponse } from './ai';

// Core Error Classification System
export enum ErrorCategory {
  BROWSER_AUTOMATION = 'browser_automation',
  AI_PROCESSING = 'ai_processing',
  USER_INTERFACE = 'user_interface',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  DATA_VALIDATION = 'data_validation',
  SYSTEM = 'system',
  USER_INPUT = 'user_input'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  ALTERNATIVE_APPROACH = 'alternative_approach',
  USER_INTERVENTION = 'user_intervention',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  ABORT = 'abort'
}

// Base Error Interface
export interface SystemError {
  id: string;
  category: ErrorCategory;
  type: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  context: ErrorContext;
  recoverable: boolean;
  recoveryStrategies: RecoveryStrategy[];
  metadata: ErrorMetadata;
  stackTrace?: string;
  userFacing: boolean;
  userMessage?: string;
}

export interface ErrorContext {
  sessionId?: string;
  userId?: string;
  learningStepId?: string;
  toolType?: string;
  url?: string;
  userAgent?: string;
  systemInfo: SystemInfo;
  previousErrors: string[]; // IDs of related errors
}

export interface SystemInfo {
  platform: string;
  version: string;
  memory: {
    used: number;
    total: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
}

export interface ErrorMetadata {
  retryCount: number;
  maxRetries: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  frequency: number;
  relatedComponents: string[];
  debugInfo: Record<string, any>;
}

// Specific Error Types
export interface BrowserAutomationError extends SystemError {
  category: ErrorCategory.BROWSER_AUTOMATION;
  browserError: BrowserError;
  actionId?: string;
  elementSelector?: string;
  screenshot?: string;
}

export interface AIProcessingError extends SystemError {
  category: ErrorCategory.AI_PROCESSING;
  modelName: string;
  inputType: string;
  processingStep: string;
  apiResponse?: any;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

export interface NetworkError extends SystemError {
  category: ErrorCategory.NETWORK;
  statusCode?: number;
  endpoint: string;
  method: string;
  responseTime?: number;
  retryAfter?: number;
}

export interface AuthenticationError extends SystemError {
  category: ErrorCategory.AUTHENTICATION;
  authProvider: string;
  authMethod: string;
  tokenExpired: boolean;
  requiresReauth: boolean;
}

export interface UserInterfaceError extends SystemError {
  category: ErrorCategory.USER_INTERFACE;
  component: string;
  renderingError: boolean;
  interactionError: boolean;
  overlayId?: string;
}

export interface DataValidationError extends SystemError {
  category: ErrorCategory.DATA_VALIDATION;
  validationSchema: string;
  invalidFields: ValidationFailure[];
  inputData: any;
}

export interface ValidationFailure {
  field: string;
  value: any;
  expectedType: string;
  constraint: string;
  message: string;
}

// Recovery Action Interface
export interface RecoveryAction {
  id: string;
  strategy: RecoveryStrategy;
  description: string;
  automated: boolean;
  estimatedTime: number; // in milliseconds
  successProbability: number; // 0-1 scale
  prerequisites: string[];
  execute: () => Promise<RecoveryResult>;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  newError?: SystemError;
  adaptations: string[];
  timeElapsed: number;
}

// Error Notification Interface
export interface ErrorNotification {
  id: string;
  errorId: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  actions: NotificationAction[];
  dismissed: boolean;
  autoHide: boolean;
  duration?: number; // in milliseconds
}

export enum NotificationType {
  TOAST = 'toast',
  MODAL = 'modal',
  BANNER = 'banner',
  INLINE = 'inline',
  SYSTEM = 'system'
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: () => Promise<void>;
}

// Zod Schemas
export const ErrorCategorySchema = z.nativeEnum(ErrorCategory);
export const ErrorSeveritySchema = z.nativeEnum(ErrorSeverity);
export const RecoveryStrategySchema = z.nativeEnum(RecoveryStrategy);
export const NotificationTypeSchema = z.nativeEnum(NotificationType);

export const SystemInfoSchema = z.object({
  platform: z.string(),
  version: z.string(),
  memory: z.object({
    used: z.number(),
    total: z.number()
  }),
  cpu: z.object({
    usage: z.number(),
    cores: z.number()
  })
});

export const ErrorContextSchema = z.object({
  sessionId: z.optional(z.string()),
  userId: z.optional(z.string()),
  learningStepId: z.optional(z.string()),
  toolType: z.optional(z.string()),
  url: z.optional(z.string()),
  userAgent: z.optional(z.string()),
  systemInfo: SystemInfoSchema,
  previousErrors: z.array(z.string())
});

export const ErrorMetadataSchema = z.object({
  retryCount: z.number().min(0),
  maxRetries: z.number().min(0),
  firstOccurrence: z.date(),
  lastOccurrence: z.date(),
  frequency: z.number().min(0),
  relatedComponents: z.array(z.string()),
  debugInfo: z.record(z.any())
});

export const SystemErrorSchema = z.object({
  id: z.string().uuid(),
  category: ErrorCategorySchema,
  type: z.string(),
  message: z.string(),
  severity: ErrorSeveritySchema,
  timestamp: z.date(),
  context: ErrorContextSchema,
  recoverable: z.boolean(),
  recoveryStrategies: z.array(RecoveryStrategySchema),
  metadata: ErrorMetadataSchema,
  stackTrace: z.optional(z.string()),
  userFacing: z.boolean(),
  userMessage: z.optional(z.string())
});

export const ValidationFailureSchema = z.object({
  field: z.string(),
  value: z.any(),
  expectedType: z.string(),
  constraint: z.string(),
  message: z.string()
});

export const RecoveryResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  newError: z.optional(SystemErrorSchema),
  adaptations: z.array(z.string()),
  timeElapsed: z.number()
});

export const NotificationActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['primary', 'secondary', 'danger']),
  action: z.function()
});

export const ErrorNotificationSchema = z.object({
  id: z.string().uuid(),
  errorId: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  severity: ErrorSeveritySchema,
  timestamp: z.date(),
  actions: z.array(NotificationActionSchema),
  dismissed: z.boolean(),
  autoHide: z.boolean(),
  duration: z.optional(z.number())
});