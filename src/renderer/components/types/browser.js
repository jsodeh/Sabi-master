import { z } from 'zod';
import { PositionSchema, BuilderTypeSchema } from './common';
export var BrowserActionType;
(function (BrowserActionType) {
    BrowserActionType["CLICK"] = "click";
    BrowserActionType["TYPE"] = "type";
    BrowserActionType["NAVIGATE"] = "navigate";
    BrowserActionType["SCROLL"] = "scroll";
    BrowserActionType["HIGHLIGHT"] = "highlight";
    BrowserActionType["WAIT"] = "wait";
    BrowserActionType["SCREENSHOT"] = "screenshot";
    BrowserActionType["HOVER"] = "hover";
    BrowserActionType["DRAG"] = "drag";
    BrowserActionType["SELECT"] = "select";
})(BrowserActionType || (BrowserActionType = {}));
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
export var SelectorType;
(function (SelectorType) {
    SelectorType["CSS"] = "css";
    SelectorType["XPATH"] = "xpath";
    SelectorType["TEXT"] = "text";
    SelectorType["PLACEHOLDER"] = "placeholder";
    SelectorType["ARIA_LABEL"] = "aria-label";
    SelectorType["DATA_TESTID"] = "data-testid";
    SelectorType["ID"] = "id";
    SelectorType["CLASS"] = "class";
})(SelectorType || (SelectorType = {}));
export const SelectorTypeSchema = z.nativeEnum(SelectorType);
export const ElementSelectorSchema = z.object({
    type: SelectorTypeSchema,
    value: z.string().min(1),
    fallbacks: z.optional(z.array(z.lazy(() => ElementSelectorSchema))),
    position: z.optional(PositionSchema),
    description: z.string().min(1)
});
export var SessionStatus;
(function (SessionStatus) {
    SessionStatus["ACTIVE"] = "active";
    SessionStatus["INACTIVE"] = "inactive";
    SessionStatus["ERROR"] = "error";
    SessionStatus["CLOSED"] = "closed";
})(SessionStatus || (SessionStatus = {}));
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
export const SessionDataSchema = z.object({
    cookies: z.array(z.lazy(() => CookieSchema)),
    localStorage: z.record(z.string()),
    sessionStorage: z.record(z.string()),
    currentProject: z.optional(z.lazy(() => ProjectInfoSchema))
});
export const CookieSchema = z.object({
    name: z.string().min(1),
    value: z.string(),
    domain: z.string().min(1),
    path: z.string().min(1),
    expires: z.optional(z.date()),
    httpOnly: z.boolean(),
    secure: z.boolean()
});
export var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["DRAFT"] = "draft";
    ProjectStatus["IN_PROGRESS"] = "in_progress";
    ProjectStatus["COMPLETED"] = "completed";
    ProjectStatus["DEPLOYED"] = "deployed";
    ProjectStatus["ERROR"] = "error";
})(ProjectStatus || (ProjectStatus = {}));
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
export var BrowserErrorType;
(function (BrowserErrorType) {
    BrowserErrorType["ELEMENT_NOT_FOUND"] = "element_not_found";
    BrowserErrorType["TIMEOUT"] = "timeout";
    BrowserErrorType["NAVIGATION_ERROR"] = "navigation_error";
    BrowserErrorType["AUTHENTICATION_ERROR"] = "authentication_error";
    BrowserErrorType["NETWORK_ERROR"] = "network_error";
    BrowserErrorType["JAVASCRIPT_ERROR"] = "javascript_error";
    BrowserErrorType["PERMISSION_ERROR"] = "permission_error";
})(BrowserErrorType || (BrowserErrorType = {}));
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
export const ActionAdaptationSchema = z.object({
    type: z.enum(['selector', 'timing', 'approach', 'fallback']),
    reason: z.string().min(1),
    originalAction: z.record(z.any()),
    adaptedAction: z.record(z.any()),
    success: z.boolean()
});
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
