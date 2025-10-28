import { z } from 'zod';
import {
  LearningRequestSchema,
  LearningStepSchema,
  UserProfileSchema,
  BrowserActionSchema,
  AIResponseSchema,
  ProcessedInputSchema
} from '../types';

// Validation utility functions
export class ValidationUtils {
  /**
   * Validates a learning request object
   */
  static validateLearningRequest(data: unknown) {
    return LearningRequestSchema.safeParse(data);
  }

  /**
   * Validates a learning step object
   */
  static validateLearningStep(data: unknown) {
    return LearningStepSchema.safeParse(data);
  }

  /**
   * Validates a user profile object
   */
  static validateUserProfile(data: unknown) {
    return UserProfileSchema.safeParse(data);
  }

  /**
   * Validates a browser action object
   */
  static validateBrowserAction(data: unknown) {
    return BrowserActionSchema.safeParse(data);
  }

  /**
   * Validates an AI response object
   */
  static validateAIResponse(data: unknown) {
    return AIResponseSchema.safeParse(data);
  }

  /**
   * Validates a processed input object
   */
  static validateProcessedInput(data: unknown) {
    return ProcessedInputSchema.safeParse(data);
  }

  /**
   * Generic validation function that throws on failure
   */
  static validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, errorMessage?: string): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new Error(errorMessage || `Validation failed: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Validates and returns formatted error messages
   */
  static getValidationErrors<T>(schema: z.ZodSchema<T>, data: unknown): string[] {
    const result = schema.safeParse(data);
    if (result.success) {
      return [];
    }
    
    return result.error.errors.map(error => {
      const path = error.path.join('.');
      return `${path}: ${error.message}`;
    });
  }

  /**
   * Checks if data is valid without throwing
   */
  static isValid<T>(schema: z.ZodSchema<T>, data: unknown): boolean {
    return schema.safeParse(data).success;
  }
}

// Type guards for runtime type checking
export const isLearningRequest = (data: unknown): data is import('../types').LearningRequest => {
  return ValidationUtils.isValid(LearningRequestSchema, data);
};

export const isLearningStep = (data: unknown): data is import('../types').LearningStep => {
  return ValidationUtils.isValid(LearningStepSchema, data);
};

export const isUserProfile = (data: unknown): data is import('../types').UserProfile => {
  return ValidationUtils.isValid(UserProfileSchema, data);
};

export const isBrowserAction = (data: unknown): data is import('../types').BrowserAction => {
  return ValidationUtils.isValid(BrowserActionSchema, data);
};

export const isAIResponse = (data: unknown): data is import('../types').AIResponse => {
  return ValidationUtils.isValid(AIResponseSchema, data);
};

export const isProcessedInput = (data: unknown): data is import('../types').ProcessedInput => {
  return ValidationUtils.isValid(ProcessedInputSchema, data);
};