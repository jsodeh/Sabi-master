import { z } from 'zod';
import { Position, PositionSchema, BuilderType, BuilderTypeSchema } from './common';

// Browser Action Interface and Schema
export interface BrowserAction {
  id: string;
  type: BrowserActionType;
  target: ElementSelector;
  value?: string;
  explanation: string;
  reasoning: string;
  expectedResult: string;
  timestamp: Date;
  screenshot?: string; // base64 encoded screenshot
  retryCount: number;
  maxRetries: number;
}

export enum BrowserActionType {
  CLICK = 'click',
  TYPE = 'type',
  NAVIGATE = 'navigate',
  SCROLL = 'scroll',
  HIGHLIGHT = 'highlight',
  WAIT = 'wait',
  SCREENSHOT = 'screenshot',
  HOVER = 'hover',
  DRAG = 'drag',
  SELECT = 'select'
}

export const BrowserActionTypeSchema = z.nativeEnum(BrowserActionType);

export const BrowserActionSchema = z.object({
  id: z.string().uuid(),
  type: BrowserActionTypeSchema,
  target: z.lazy(() => ElementSelectorSchema),
  value: z.optional(z.string()),
  explanation: z.string().min(1),
  reasoning: z.string().min(1),
  expectedResult: z.string().min(1),
  timestamp: z.date(),
  screenshot: z.optional(z.string()),
  retryCount: z.number().min(0),
  maxRetries: z.number().min(1)
});

// Element Selector Interface and Schema
export interface ElementSelector {
  type: SelectorType;
  value: string;
  fallbacks?: ElementSelector[];
  position?: Position;
  description: string;
}

export enum SelectorType {
  CSS = 'css',
  XPATH = 'xpath',
  TEXT = 'text',
  PLACEHOLDER = 'placeholder',
  ARIA_LABEL = 'aria-label',
  DATA_TESTID = 'data-testid',
  ID = 'id',
  CLASS = 'class'
}

export const SelectorTypeSchema = z.nativeEnum(SelectorType);

export const ElementSelectorSchema: z.ZodType<ElementSelector> = z.object({
  type: SelectorTypeSchema,
  value: z.string().min(1),
  fallbacks: z.optional(z.array(z.lazy(() => ElementSelectorSchema))),
  position: z.optional(PositionSchema),
  description: z.string().min(1)
});

// Browser Session Interface and Schema
export interface BrowserSession {
  id: string;
  toolType: BuilderType;
  url: string;
  isAuthenticated: boolean;
  sessionData: SessionData;
  startTime: Date;
  lastActivity: Date;
  status: SessionStatus;
}

export enum SessionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  CLOSED = 'closed'
}

export const SessionStatusSchema = z.nativeEnum(SessionStatus);

export const BrowserSessionSchema = z.object({
  id: z.string().uuid(),
  toolType: BuilderTypeSchema,
  url: z.string().url(),
  isAuthenticated: z.boolean(),
  sessionData: z.lazy(() => SessionDataSchema),
  startTime: z.date(),
  lastActivity: z.date(),
  status: SessionStatusSchema
});

// Session Data Interface and Schema
export interface SessionData {
  cookies: Cookie[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  currentProject?: ProjectInfo;
}

export const SessionDataSchema = z.object({
  cookies: z.array(z.lazy(() => CookieSchema)),
  localStorage: z.record(z.string()),
  sessionStorage: z.record(z.string()),
  currentProject: z.optional(z.lazy(() => ProjectInfoSchema))
});

// Cookie Interface and Schema
export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: Date;
  httpOnly: boolean;
  secure: boolean;
}

export const CookieSchema = z.object({
  name: z.string().min(1),
  value: z.string(),
  domain: z.string().min(1),
  path: z.string().min(1),
  expires: z.optional(z.date()),
  httpOnly: z.boolean(),
  secure: z.boolean()
});

// Project Info Interface and Schema
export interface ProjectInfo {
  id: string;
  name: string;
  type: string;
  url: string;
  status: ProjectStatus;
  createdAt: Date;
  lastModified: Date;
}

export enum ProjectStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DEPLOYED = 'deployed',
  ERROR = 'error'
}

export const ProjectStatusSchema = z.nativeEnum(ProjectStatus);

export const ProjectInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.string().min(1),
  url: z.string().url(),
  status: ProjectStatusSchema,
  createdAt: z.date(),
  lastModified: z.date()
});

// Action Result Interface and Schema
export interface ActionResult {
  actionId: string;
  success: boolean;
  error?: BrowserError;
  screenshot?: string;
  elementFound: boolean;
  executionTime: number; // in milliseconds
  actualResult: string;
  adaptations: ActionAdaptation[];
}

export const ActionResultSchema = z.object({
  actionId: z.string().uuid(),
  success: z.boolean(),
  error: z.optional(z.lazy(() => BrowserErrorSchema)),
  screenshot: z.optional(z.string()),
  elementFound: z.boolean(),
  executionTime: z.number().positive(),
  actualResult: z.string(),
  adaptations: z.array(z.lazy(() => ActionAdaptationSchema))
});

// Browser Error Interface and Schema
export interface BrowserError {
  type: BrowserErrorType;
  message: string;
  code?: string;
  selector?: ElementSelector;
  screenshot?: string;
  timestamp: Date;
  recoverable: boolean;
}

export enum BrowserErrorType {
  ELEMENT_NOT_FOUND = 'element_not_found',
  TIMEOUT = 'timeout',
  NAVIGATION_ERROR = 'navigation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  NETWORK_ERROR = 'network_error',
  JAVASCRIPT_ERROR = 'javascript_error',
  PERMISSION_ERROR = 'permission_error'
}

export const BrowserErrorTypeSchema = z.nativeEnum(BrowserErrorType);

export const BrowserErrorSchema = z.object({
  type: BrowserErrorTypeSchema,
  message: z.string().min(1),
  code: z.optional(z.string()),
  selector: z.optional(ElementSelectorSchema),
  screenshot: z.optional(z.string()),
  timestamp: z.date(),
  recoverable: z.boolean()
});

// Type alias for compatibility
export type BrowserActionResult = ActionResult;

// Action Adaptation Interface and Schema
export interface ActionAdaptation {
  type: 'selector' | 'timing' | 'approach' | 'fallback';
  reason: string;
  originalAction: Partial<BrowserAction>;
  adaptedAction: Partial<BrowserAction>;
  success: boolean;
}

export const ActionAdaptationSchema = z.object({
  type: z.enum(['selector', 'timing', 'approach', 'fallback']),
  reason: z.string().min(1),
  originalAction: z.record(z.any()),
  adaptedAction: z.record(z.any()),
  success: z.boolean()
});

// Screenshot Interface and Schema
export interface Screenshot {
  id: string;
  data: string; // base64 encoded
  timestamp: Date;
  dimensions: {
    width: number;
    height: number;
  };
  annotations?: ScreenAnnotation[];
}

export const ScreenshotSchema = z.object({
  id: z.string().uuid(),
  data: z.string().min(1),
  timestamp: z.date(),
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive()
  }),
  annotations: z.optional(z.array(z.lazy(() => ScreenAnnotationSchema)))
});

// Screen Annotation Interface and Schema
export interface ScreenAnnotation {
  id: string;
  type: 'highlight' | 'arrow' | 'text' | 'circle';
  position: Position;
  dimensions?: {
    width: number;
    height: number;
  };
  text?: string;
  color: string;
}

export const ScreenAnnotationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['highlight', 'arrow', 'text', 'circle']),
  position: PositionSchema,
  dimensions: z.optional(z.object({
    width: z.number().positive(),
    height: z.number().positive()
  })),
  text: z.optional(z.string()),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
});