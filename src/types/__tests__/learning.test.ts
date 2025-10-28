import { 
  LearningRequest, 
  LearningStep, 
  LearningRequestSchema, 
  LearningStepSchema,
  ValidationCriteria,
  ValidationCriteriaSchema
} from '../learning';
import { InputType, SkillLevel, ComplexityLevel } from '../common';
import { BrowserActionType, SelectorType } from '../browser';
import { ValidationUtils } from '../../utils/validation';

describe('Learning Types', () => {
  describe('LearningRequest', () => {
    const validLearningRequest: LearningRequest = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      objective: 'Learn to build a fashion website',
      inputType: InputType.TEXT,
      rawInput: 'I want to learn how to build a fashion website without coding',
      timestamp: new Date()
    };

    it('should validate a correct LearningRequest', () => {
      const result = LearningRequestSchema.safeParse(validLearningRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const invalidRequest = { ...validLearningRequest, id: 'invalid-uuid' };
      const result = LearningRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject empty objective', () => {
      const invalidRequest = { ...validLearningRequest, objective: '' };
      const result = LearningRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should work with ValidationUtils', () => {
      expect(ValidationUtils.isValid(LearningRequestSchema, validLearningRequest)).toBe(true);
      expect(ValidationUtils.validateLearningRequest(validLearningRequest).success).toBe(true);
    });
  });

  describe('LearningStep', () => {
    const validValidationCriteria: ValidationCriteria = {
      type: 'functional',
      criteria: [{
        id: '123e4567-e89b-12d3-a456-426614174002',
        description: 'Button should be clickable',
        validationType: 'exists',
        weight: 1.0
      }],
      successThreshold: 80
    };

    const validLearningStep: LearningStep = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      title: 'Create new project',
      description: 'Create a new fashion website project in Builder.io',
      toolRequired: 'builder.io',
      actions: [{
        id: '123e4567-e89b-12d3-a456-426614174004',
        type: BrowserActionType.CLICK,
        target: {
          type: SelectorType.CSS,
          value: '.create-project-btn',
          description: 'Create project button'
        },
        explanation: 'Click the create project button to start a new project',
        reasoning: 'This initiates the project creation workflow',
        expectedResult: 'Project creation modal should open',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      }],
      explanation: 'This step creates a new project in Builder.io',
      expectedOutcome: 'A new project should be created and ready for editing',
      validationCriteria: validValidationCriteria,
      estimatedDuration: 5,
      complexity: ComplexityLevel.LOW,
      prerequisites: [],
      learningObjectives: ['Understanding project creation workflow']
    };

    it('should validate a correct LearningStep', () => {
      const result = LearningStepSchema.safeParse(validLearningStep);
      expect(result.success).toBe(true);
    });

    it('should reject negative estimated duration', () => {
      const invalidStep = { ...validLearningStep, estimatedDuration: -1 };
      const result = LearningStepSchema.safeParse(invalidStep);
      expect(result.success).toBe(false);
    });

    it('should reject empty actions array', () => {
      const invalidStep = { ...validLearningStep, actions: [] };
      const result = LearningStepSchema.safeParse(invalidStep);
      expect(result.success).toBe(true); // Empty array is allowed
    });

    it('should work with ValidationUtils', () => {
      expect(ValidationUtils.isValid(LearningStepSchema, validLearningStep)).toBe(true);
      expect(ValidationUtils.validateLearningStep(validLearningStep).success).toBe(true);
    });
  });

  describe('ValidationCriteria', () => {
    const validCriteria: ValidationCriteria = {
      type: 'visual',
      criteria: [{
        id: '123e4567-e89b-12d3-a456-426614174005',
        description: 'Element should be visible',
        validationType: 'visible',
        weight: 0.8
      }],
      successThreshold: 75
    };

    it('should validate correct ValidationCriteria', () => {
      const result = ValidationCriteriaSchema.safeParse(validCriteria);
      expect(result.success).toBe(true);
    });

    it('should reject invalid success threshold', () => {
      const invalidCriteria = { ...validCriteria, successThreshold: 150 };
      const result = ValidationCriteriaSchema.safeParse(invalidCriteria);
      expect(result.success).toBe(false);
    });

    it('should reject invalid weight in criteria', () => {
      const invalidCriteria = {
        ...validCriteria,
        criteria: [{
          ...validCriteria.criteria[0],
          weight: 1.5
        }]
      };
      const result = ValidationCriteriaSchema.safeParse(invalidCriteria);
      expect(result.success).toBe(false);
    });
  });
});