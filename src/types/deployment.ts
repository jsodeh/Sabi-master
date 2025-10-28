import { z } from 'zod';
import { BuilderType } from './common';

// Deployment platform types
export enum DeploymentPlatform {
  VERCEL = 'vercel',
  NETLIFY = 'netlify',
  FIREBASE_HOSTING = 'firebase_hosting',
  GITHUB_PAGES = 'github_pages',
  HEROKU = 'heroku',
  AWS_S3 = 'aws_s3',
  CLOUDFLARE_PAGES = 'cloudflare_pages'
}

export const DeploymentPlatformSchema = z.nativeEnum(DeploymentPlatform);

// Deployment status
export enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export const DeploymentStatusSchema = z.nativeEnum(DeploymentStatus);

// Project configuration for deployment
export interface ProjectConfig {
  id: string;
  name: string;
  builderType: BuilderType;
  sourceUrl?: string;
  buildCommand?: string;
  outputDirectory?: string;
  environmentVariables?: Record<string, string>;
  customDomain?: string;
  sslEnabled?: boolean;
}

export const ProjectConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  builderType: z.nativeEnum(BuilderType),
  sourceUrl: z.optional(z.string().url()),
  buildCommand: z.optional(z.string()),
  outputDirectory: z.optional(z.string()),
  environmentVariables: z.optional(z.record(z.string())),
  customDomain: z.optional(z.string()),
  sslEnabled: z.optional(z.boolean())
});

// Deployment configuration
export interface DeploymentConfig {
  platform: DeploymentPlatform;
  projectConfig: ProjectConfig;
  platformSpecificConfig: PlatformConfig;
  autoDeployEnabled: boolean;
  branchToDeploy?: string;
  buildSettings: BuildSettings;
}

export const DeploymentConfigSchema = z.object({
  platform: DeploymentPlatformSchema,
  projectConfig: ProjectConfigSchema,
  platformSpecificConfig: z.lazy(() => PlatformConfigSchema),
  autoDeployEnabled: z.boolean(),
  branchToDeploy: z.optional(z.string()),
  buildSettings: z.lazy(() => BuildSettingsSchema)
});

// Platform-specific configuration
export interface PlatformConfig {
  // Vercel specific
  vercelTeamId?: string;
  vercelProjectId?: string;
  
  // Netlify specific
  netlifySiteId?: string;
  netlifyBuildHook?: string;
  
  // Firebase specific
  firebaseProjectId?: string;
  firebaseHostingTarget?: string;
  
  // GitHub Pages specific
  githubRepository?: string;
  githubBranch?: string;
  
  // Heroku specific
  herokuAppName?: string;
  herokuStack?: string;
  
  // AWS S3 specific
  awsBucketName?: string;
  awsRegion?: string;
  awsCloudFrontDistributionId?: string;
  
  // Cloudflare Pages specific
  cloudflareAccountId?: string;
  cloudflareProjectName?: string;
}

export const PlatformConfigSchema: z.ZodType<PlatformConfig> = z.object({
  vercelTeamId: z.optional(z.string()),
  vercelProjectId: z.optional(z.string()),
  netlifySiteId: z.optional(z.string()),
  netlifyBuildHook: z.optional(z.string()),
  firebaseProjectId: z.optional(z.string()),
  firebaseHostingTarget: z.optional(z.string()),
  githubRepository: z.optional(z.string()),
  githubBranch: z.optional(z.string()),
  herokuAppName: z.optional(z.string()),
  herokuStack: z.optional(z.string()),
  awsBucketName: z.optional(z.string()),
  awsRegion: z.optional(z.string()),
  awsCloudFrontDistributionId: z.optional(z.string()),
  cloudflareAccountId: z.optional(z.string()),
  cloudflareProjectName: z.optional(z.string())
});

// Build settings
export interface BuildSettings {
  nodeVersion?: string;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  buildCommand: string;
  outputDirectory: string;
  installCommand?: string;
  environmentVariables: Record<string, string>;
}

export const BuildSettingsSchema: z.ZodType<BuildSettings> = z.object({
  nodeVersion: z.optional(z.string()),
  packageManager: z.enum(['npm', 'yarn', 'pnpm']),
  buildCommand: z.string(),
  outputDirectory: z.string(),
  installCommand: z.optional(z.string()),
  environmentVariables: z.record(z.string())
});

// Deployment workflow step
export interface DeploymentStep {
  id: string;
  title: string;
  description: string;
  status: DeploymentStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in seconds
  logs: string[];
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export const DeploymentStepSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  status: DeploymentStatusSchema,
  startTime: z.optional(z.date()),
  endTime: z.optional(z.date()),
  duration: z.optional(z.number().positive()),
  logs: z.array(z.string()),
  error: z.optional(z.string()),
  retryCount: z.number().min(0),
  maxRetries: z.number().min(0)
});

// Deployment workflow
export interface DeploymentWorkflow {
  id: string;
  projectId: string;
  userId: string;
  config: DeploymentConfig;
  steps: DeploymentStep[];
  status: DeploymentStatus;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number; // in seconds
  deploymentUrl?: string;
  previewUrl?: string;
  buildLogs: string[];
  deploymentLogs: string[];
}

export const DeploymentWorkflowSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  config: DeploymentConfigSchema,
  steps: z.array(DeploymentStepSchema),
  status: DeploymentStatusSchema,
  startTime: z.date(),
  endTime: z.optional(z.date()),
  totalDuration: z.optional(z.number().positive()),
  deploymentUrl: z.optional(z.string().url()),
  previewUrl: z.optional(z.string().url()),
  buildLogs: z.array(z.string()),
  deploymentLogs: z.array(z.string())
});

// Deployment validation result
export interface DeploymentValidation {
  isValid: boolean;
  checks: ValidationCheck[];
  overallScore: number; // 0-100
  recommendations: string[];
}

export const DeploymentValidationSchema = z.object({
  isValid: z.boolean(),
  checks: z.array(z.lazy(() => ValidationCheckSchema)),
  overallScore: z.number().min(0).max(100),
  recommendations: z.array(z.string())
});

// Individual validation check
export interface ValidationCheck {
  id: string;
  name: string;
  description: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  score: number; // 0-100
  message: string;
  details?: string;
  fixSuggestion?: string;
}

export const ValidationCheckSchema: z.ZodType<ValidationCheck> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['passed', 'failed', 'warning', 'skipped']),
  score: z.number().min(0).max(100),
  message: z.string(),
  details: z.optional(z.string()),
  fixSuggestion: z.optional(z.string())
});

// Hosting platform capabilities
export interface PlatformCapabilities {
  platform: DeploymentPlatform;
  supportedBuilders: BuilderType[];
  features: PlatformFeature[];
  limitations: string[];
  pricingTier: 'free' | 'paid' | 'enterprise';
  setupComplexity: 'easy' | 'medium' | 'complex';
}

export const PlatformCapabilitiesSchema = z.object({
  platform: DeploymentPlatformSchema,
  supportedBuilders: z.array(z.nativeEnum(BuilderType)),
  features: z.array(z.lazy(() => PlatformFeatureSchema)),
  limitations: z.array(z.string()),
  pricingTier: z.enum(['free', 'paid', 'enterprise']),
  setupComplexity: z.enum(['easy', 'medium', 'complex'])
});

// Platform feature
export interface PlatformFeature {
  name: string;
  description: string;
  available: boolean;
  requiresPaidPlan?: boolean;
}

export const PlatformFeatureSchema: z.ZodType<PlatformFeature> = z.object({
  name: z.string(),
  description: z.string(),
  available: z.boolean(),
  requiresPaidPlan: z.optional(z.boolean())
});

// Deployment guidance step
export interface GuidanceStep {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  expectedOutcome: string;
  troubleshooting: TroubleshootingTip[];
  estimatedTime: number; // in minutes
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisites: string[];
}

export const GuidanceStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  instructions: z.array(z.string()),
  expectedOutcome: z.string(),
  troubleshooting: z.array(z.lazy(() => TroubleshootingTipSchema)),
  estimatedTime: z.number().positive(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  prerequisites: z.array(z.string())
});

// Troubleshooting tip
export interface TroubleshootingTip {
  issue: string;
  solution: string;
  preventionTip?: string;
}

export const TroubleshootingTipSchema: z.ZodType<TroubleshootingTip> = z.object({
  issue: z.string(),
  solution: z.string(),
  preventionTip: z.optional(z.string())
});