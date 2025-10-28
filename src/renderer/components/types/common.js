import { z } from 'zod';
// Common enums and types used across the system
export var InputType;
(function (InputType) {
    InputType["TEXT"] = "text";
    InputType["VOICE"] = "voice";
    InputType["IMAGE"] = "image";
})(InputType || (InputType = {}));
export var SkillLevel;
(function (SkillLevel) {
    SkillLevel["BEGINNER"] = "beginner";
    SkillLevel["INTERMEDIATE"] = "intermediate";
    SkillLevel["ADVANCED"] = "advanced";
})(SkillLevel || (SkillLevel = {}));
export var LearningStyle;
(function (LearningStyle) {
    LearningStyle["VISUAL"] = "visual";
    LearningStyle["AUDITORY"] = "auditory";
    LearningStyle["KINESTHETIC"] = "kinesthetic";
    LearningStyle["READING_WRITING"] = "reading_writing";
})(LearningStyle || (LearningStyle = {}));
export var ComplexityLevel;
(function (ComplexityLevel) {
    ComplexityLevel["LOW"] = "low";
    ComplexityLevel["MEDIUM"] = "medium";
    ComplexityLevel["HIGH"] = "high";
})(ComplexityLevel || (ComplexityLevel = {}));
export var BuilderType;
(function (BuilderType) {
    BuilderType["BUILDER_IO"] = "builder.io";
    BuilderType["FIREBASE_STUDIO"] = "firebase_studio";
    BuilderType["LOVABLE"] = "lovable";
    BuilderType["BOLT_NEW"] = "bolt.new";
    BuilderType["REPLIT"] = "replit";
})(BuilderType || (BuilderType = {}));
// Zod schemas for validation
export const InputTypeSchema = z.nativeEnum(InputType);
export const SkillLevelSchema = z.nativeEnum(SkillLevel);
export const LearningStyleSchema = z.nativeEnum(LearningStyle);
export const ComplexityLevelSchema = z.nativeEnum(ComplexityLevel);
export const BuilderTypeSchema = z.nativeEnum(BuilderType);
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
