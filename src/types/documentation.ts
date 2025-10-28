import { z } from 'zod';
import { SkillLevel, BuilderType, Timestamp } from './common.js';

// Documentation-specific enums
export enum DocumentationType {
  TUTORIAL = 'tutorial',
  REFERENCE = 'reference',
  GUIDE = 'guide',
  API_DOCS = 'api_docs',
  TROUBLESHOOTING = 'troubleshooting'
}

export enum DocumentationTopic {
  AUTHENTICATION = 'authentication',
  PROJECT_SETUP = 'project_setup',
  UI_COMPONENTS = 'ui_components',
  DEPLOYMENT = 'deployment',
  STYLING = 'styling',
  DATA_MANAGEMENT = 'data_management',
  INTEGRATIONS = 'integrations',
  ADVANCED_FEATURES = 'advanced_features'
}

export enum DocumentationStatus {
  ACTIVE = 'active',
  OUTDATED = 'outdated',
  DEPRECATED = 'deprecated',
  UNDER_REVIEW = 'under_review'
}

// Zod schemas
export const DocumentationTypeSchema = z.nativeEnum(DocumentationType);
export const DocumentationTopicSchema = z.nativeEnum(DocumentationTopic);
export const DocumentationStatusSchema = z.nativeEnum(DocumentationStatus);

// Core documentation interfaces
export interface ToolDocumentation extends Timestamp {
  id: string;
  toolName: BuilderType;
  title: string;
  description: string;
  url: string;
  baseUrl: string;
  type: DocumentationType;
  topics: DocumentationTopic[];
  skillLevel: SkillLevel;
  status: DocumentationStatus;
  version: string;
  lastValidated: Date;
  lastUpdated: Date;
  tags: string[];
  metadata: DocumentationMetadata;
}

export interface DocumentationMetadata {
  author?: string;
  estimatedReadTime?: number; // in minutes
  prerequisites?: string[];
  relatedDocuments?: string[]; // IDs of related documentation
  difficulty?: number; // 1-10 scale
  popularity?: number; // usage/view count
}

export interface DocumentationSearchQuery {
  query?: string;
  toolName?: BuilderType;
  type?: DocumentationType;
  topics?: DocumentationTopic[];
  skillLevel?: SkillLevel;
  status?: DocumentationStatus;
  tags?: string[];
}

export interface DocumentationSearchResult {
  documentation: ToolDocumentation;
  relevanceScore: number;
  matchedFields: string[];
}

export interface DocumentationValidationResult {
  id: string;
  isValid: boolean;
  lastChecked: Date;
  issues: ValidationIssue[];
  recommendations: string[];
}

export interface ValidationIssue {
  type: 'broken_link' | 'outdated_content' | 'missing_metadata' | 'accessibility';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedFix?: string;
}

// Zod validation schemas
export const DocumentationMetadataSchema = z.object({
  author: z.string().optional(),
  estimatedReadTime: z.number().positive().optional(),
  prerequisites: z.array(z.string()).optional(),
  relatedDocuments: z.array(z.string()).optional(),
  difficulty: z.number().min(1).max(10).optional(),
  popularity: z.number().nonnegative().optional()
});

export const ToolDocumentationSchema = z.object({
  id: z.string(),
  toolName: z.nativeEnum(BuilderType),
  title: z.string().min(1),
  description: z.string().min(1),
  url: z.string().url(),
  type: DocumentationTypeSchema,
  topics: z.array(DocumentationTopicSchema),
  skillLevel: z.nativeEnum(SkillLevel),
  status: DocumentationStatusSchema,
  version: z.string(),
  lastValidated: z.date(),
  tags: z.array(z.string()),
  metadata: DocumentationMetadataSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

export const DocumentationSearchQuerySchema = z.object({
  query: z.string().optional(),
  toolName: z.nativeEnum(BuilderType).optional(),
  type: DocumentationTypeSchema.optional(),
  topics: z.array(DocumentationTopicSchema).optional(),
  skillLevel: z.nativeEnum(SkillLevel).optional(),
  status: DocumentationStatusSchema.optional(),
  tags: z.array(z.string()).optional()
});

export const ValidationIssueSchema = z.object({
  type: z.enum(['broken_link', 'outdated_content', 'missing_metadata', 'accessibility']),
  severity: z.enum(['low', 'medium', 'high']),
  description: z.string(),
  suggestedFix: z.string().optional()
});

export const DocumentationValidationResultSchema = z.object({
  id: z.string(),
  isValid: z.boolean(),
  lastChecked: z.date(),
  issues: z.array(ValidationIssueSchema),
  recommendations: z.array(z.string())
});

// Additional types needed by DocumentationAdmin
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  lastChecked: Date;
}

export interface DocumentationVersionInfo {
  version: string;
  releaseDate: Date;
  changelog: string[];
  isLatest: boolean;
}

export interface DocumentationBulkImportDto {
  toolName: BuilderType;
  documents: Partial<ToolDocumentation>[];
  overwriteExisting: boolean;
  validateBeforeImport: boolean;
}