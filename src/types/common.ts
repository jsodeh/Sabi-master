import { z } from 'zod';

// Common enums and types used across the system
export enum InputType {
  TEXT = 'text',
  VOICE = 'voice',
  IMAGE = 'image'
}

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum LearningStyle {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING_WRITING = 'reading_writing'
}

export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum BuilderType {
  BUILDER_IO = 'builder.io',
  FIREBASE_STUDIO = 'firebase_studio',
  LOVABLE = 'lovable',
  BOLT_NEW = 'bolt.new',
  REPLIT = 'replit'
}

// Zod schemas for validation
export const InputTypeSchema = z.nativeEnum(InputType);
export const SkillLevelSchema = z.nativeEnum(SkillLevel);
export const LearningStyleSchema = z.nativeEnum(LearningStyle);
export const ComplexityLevelSchema = z.nativeEnum(ComplexityLevel);
export const BuilderTypeSchema = z.nativeEnum(BuilderType);

// Common interfaces
export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Timestamp {
  createdAt: Date;
  updatedAt: Date;
}

// Validation schemas
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number()
});

export const DimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive()
});

export const TimestampSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date()
});