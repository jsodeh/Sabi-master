import { LearningPathGenerator } from '../LearningPathGenerator';
import { LearningIntent } from '../../types/learning';
import { ComplexityLevel, SkillLevel } from '../../types/common';

describe('LearningPathGenerator', () => {
  let generator: LearningPathGenerator;

  beforeEach(() => {
    generator = new LearningPathGenerator();
  });

  describe('generatePath', () => {
    it('should generate a learning path for web development', async () => {
      const intent: LearningIntent = {
        objective: 'Build a website',
        extractedKeywords: ['website', 'web', 'html', 'css'],
        requiredTools: ['lovable'],
        estimatedComplexity: ComplexityLevel.MEDIUM,
        suggestedSkillLevel: SkillLevel.INTERMEDIATE,
        relatedConcepts: ['html', 'css', 'javascript', 'responsive design']
      };

      const path = await generator.generatePath(intent, SkillLevel.INTERMEDIATE);

      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toHaveProperty('id');
      expect(path[0]).toHaveProperty('title');
      expect(path[0]).toHaveProperty('description');
      expect(path[0]).toHaveProperty('actions');
      expect(path[0]).toHaveProperty('validationCriteria');
      expect(path[0].complexity).toBe(ComplexityLevel.MEDIUM);
    });

    it('should generate a learning path for React development', async () => {
      const intent: LearningIntent = {
        objective: 'Learn React development',
        extractedKeywords: ['react', 'components', 'javascript'],
        requiredTools: ['builder.io'],
        estimatedComplexity: ComplexityLevel.MEDIUM,
        suggestedSkillLevel: SkillLevel.INTERMEDIATE,
        relatedConcepts: ['components', 'jsx', 'state', 'props', 'hooks']
      };

      const path = await generator.generatePath(intent, SkillLevel.INTERMEDIATE);

      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThan(0);
      expect(path.some(step => step.toolRequired === 'builder.io')).toBe(true);
      expect(path.some(step => step.learningObjectives.includes('components'))).toBe(true);
    });

    it('should adapt path for beginner skill level', async () => {
      const intent: LearningIntent = {
        objective: 'Learn web development',
        extractedKeywords: ['web', 'development'],
        requiredTools: ['lovable'],
        estimatedComplexity: ComplexityLevel.LOW,
        suggestedSkillLevel: SkillLevel.BEGINNER,
        relatedConcepts: ['html', 'css']
      };

      const beginnerPath = await generator.generatePath(intent, SkillLevel.BEGINNER);
      const intermediatePath = await generator.generatePath(intent, SkillLevel.INTERMEDIATE);

      expect(beginnerPath).toBeDefined();
      expect(intermediatePath).toBeDefined();
      
      // Beginner path should have longer estimated durations
      const beginnerTotalTime = beginnerPath.reduce((sum, step) => sum + step.estimatedDuration, 0);
      const intermediateTotalTime = intermediatePath.reduce((sum, step) => sum + step.estimatedDuration, 0);
      
      expect(beginnerTotalTime).toBeGreaterThan(intermediateTotalTime);
      
      // Beginner steps should have no prerequisites
      expect(beginnerPath.every(step => step.prerequisites.length === 0)).toBe(true);
    });

    it('should adapt path for advanced skill level', async () => {
      const intent: LearningIntent = {
        objective: 'Build complex web application',
        extractedKeywords: ['complex', 'web', 'application'],
        requiredTools: ['replit'],
        estimatedComplexity: ComplexityLevel.HIGH,
        suggestedSkillLevel: SkillLevel.ADVANCED,
        relatedConcepts: ['architecture', 'performance', 'security']
      };

      const advancedPath = await generator.generatePath(intent, SkillLevel.ADVANCED);
      const intermediatePath = await generator.generatePath(intent, SkillLevel.INTERMEDIATE);

      expect(advancedPath).toBeDefined();
      expect(intermediatePath).toBeDefined();
      
      // Advanced path should have shorter estimated durations
      const advancedTotalTime = advancedPath.reduce((sum, step) => sum + step.estimatedDuration, 0);
      const intermediateTotalTime = intermediatePath.reduce((sum, step) => sum + step.estimatedDuration, 0);
      
      expect(advancedTotalTime).toBeLessThan(intermediateTotalTime);
    });

    it('should respect time constraints', async () => {
      const intent: LearningIntent = {
        objective: 'Build a website',
        extractedKeywords: ['website'],
        requiredTools: ['lovable'],
        estimatedComplexity: ComplexityLevel.MEDIUM,
        suggestedSkillLevel: SkillLevel.INTERMEDIATE,
        relatedConcepts: ['html', 'css']
      };

      const timeConstraint = 60; // 60 minutes
      const path = await generator.generatePath(intent, SkillLevel.INTERMEDIATE, timeConstraint);

      const totalTime = path.reduce((sum, step) => sum + step.estimatedDuration, 0);
      expect(totalTime).toBeLessThanOrEqual(timeConstraint);
    });

    it('should include tool-specific steps', async () => {
      const intent: LearningIntent = {
        objective: 'Learn Builder.io',
        extractedKeywords: ['builder.io', 'visual', 'editor'],
        requiredTools: ['builder.io'],
        estimatedComplexity: ComplexityLevel.MEDIUM,
        suggestedSkillLevel: SkillLevel.INTERMEDIATE,
        relatedConcepts: ['visual design', 'components']
      };

      const path = await generator.generatePath(intent, SkillLevel.INTERMEDIATE);

      expect(path.some(step => step.title.includes('Builder.io'))).toBe(true);
      expect(path.some(step => step.toolRequired === 'builder.io')).toBe(true);
    });

    it('should generate appropriate browser actions', async () => {
      const intent: LearningIntent = {
        objective: 'Create a new project',
        extractedKeywords: ['create', 'project'],
        requiredTools: ['lovable'],
        estimatedComplexity: ComplexityLevel.LOW,
        suggestedSkillLevel: SkillLevel.BEGINNER,
        relatedConcepts: ['project setup']
      };

      const path = await generator.generatePath(intent, SkillLevel.BEGINNER);

      expect(path.length).toBeGreaterThan(0);
      expect(path[0].actions.length).toBeGreaterThan(0);
      expect(path[0].actions[0]).toHaveProperty('type');
      expect(path[0].actions[0]).toHaveProperty('explanation');
      expect(path[0].actions[0]).toHaveProperty('expectedResult');
    });

    it('should generate validation criteria', async () => {
      const intent: LearningIntent = {
        objective: 'Build a website',
        extractedKeywords: ['website', 'build'],
        requiredTools: ['lovable'],
        estimatedComplexity: ComplexityLevel.MEDIUM,
        suggestedSkillLevel: SkillLevel.INTERMEDIATE,
        relatedConcepts: ['html', 'css']
      };

      const path = await generator.generatePath(intent, SkillLevel.INTERMEDIATE);

      expect(path.length).toBeGreaterThan(0);
      path.forEach(step => {
        expect(step.validationCriteria).toBeDefined();
        expect(step.validationCriteria.criteria.length).toBeGreaterThan(0);
        expect(step.validationCriteria.successThreshold).toBeGreaterThan(0);
        expect(step.validationCriteria.successThreshold).toBeLessThanOrEqual(100);
      });
    });

    it('should include learning objectives', async () => {
      const intent: LearningIntent = {
        objective: 'Learn React components',
        extractedKeywords: ['react', 'components'],
        requiredTools: ['builder.io'],
        estimatedComplexity: ComplexityLevel.MEDIUM,
        suggestedSkillLevel: SkillLevel.INTERMEDIATE,
        relatedConcepts: ['components', 'jsx', 'props', 'state']
      };

      const path = await generator.generatePath(intent, SkillLevel.INTERMEDIATE);

      expect(path.length).toBeGreaterThan(0);
      path.forEach(step => {
        expect(step.learningObjectives).toBeDefined();
        expect(Array.isArray(step.learningObjectives)).toBe(true);
      });
    });
  });

  describe('complexity adjustment', () => {
    it('should adjust steps for low complexity', async () => {
      const intent: LearningIntent = {
        objective: 'Build simple website',
        extractedKeywords: ['simple', 'website'],
        requiredTools: ['lovable'],
        estimatedComplexity: ComplexityLevel.LOW,
        suggestedSkillLevel: SkillLevel.BEGINNER,
        relatedConcepts: ['html', 'css']
      };

      const path = await generator.generatePath(intent, SkillLevel.BEGINNER);

      expect(path.every(step => step.complexity === ComplexityLevel.LOW)).toBe(true);
      expect(path.every(step => step.description.includes('basic'))).toBe(true);
    });

    it('should adjust steps for high complexity', async () => {
      const intent: LearningIntent = {
        objective: 'Build complex application',
        extractedKeywords: ['complex', 'application'],
        requiredTools: ['replit'],
        estimatedComplexity: ComplexityLevel.HIGH,
        suggestedSkillLevel: SkillLevel.ADVANCED,
        relatedConcepts: ['architecture', 'performance']
      };

      const path = await generator.generatePath(intent, SkillLevel.ADVANCED);

      expect(path.every(step => step.complexity === ComplexityLevel.HIGH)).toBe(true);
      expect(path.every(step => step.description.includes('comprehensive'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle invalid intent gracefully', async () => {
      const invalidIntent = {} as LearningIntent;

      await expect(generator.generatePath(invalidIntent, SkillLevel.BEGINNER))
        .rejects.toThrow('Learning path generation failed');
    });

    it('should handle missing required tools', async () => {
      const intent: LearningIntent = {
        objective: 'Learn programming',
        extractedKeywords: ['programming'],
        requiredTools: [],
        estimatedComplexity: ComplexityLevel.MEDIUM,
        suggestedSkillLevel: SkillLevel.INTERMEDIATE,
        relatedConcepts: ['coding']
      };

      const path = await generator.generatePath(intent, SkillLevel.INTERMEDIATE);

      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThan(0);
      // Should default to browser as tool
      expect(path[0].toolRequired).toBe('browser');
    });
  });

  describe('different learning approaches', () => {
    it('should use project-based approach for build objectives', async () => {
      const intent: LearningIntent = {
        objective: 'Build a portfolio website',
        extractedKeywords: ['build', 'portfolio', 'website'],
        requiredTools: ['lovable'],
        estimatedComplexity: ComplexityLevel.MEDIUM,
        suggestedSkillLevel: SkillLevel.INTERMEDIATE,
        relatedConcepts: ['html', 'css', 'portfolio']
      };

      const path = await generator.generatePath(intent, SkillLevel.INTERMEDIATE);

      expect(path.some(step => step.title.includes('Project') || step.title.includes('Setup'))).toBe(true);
      expect(path.some(step => step.title.includes('Design') || step.title.includes('Layout'))).toBe(true);
    });

    it('should use concept-first approach for understanding objectives', async () => {
      const intent: LearningIntent = {
        objective: 'Understand React architecture',
        extractedKeywords: ['understand', 'react', 'architecture'],
        requiredTools: ['builder.io'],
        estimatedComplexity: ComplexityLevel.HIGH,
        suggestedSkillLevel: SkillLevel.ADVANCED,
        relatedConcepts: ['components', 'state', 'props', 'architecture']
      };

      const path = await generator.generatePath(intent, SkillLevel.ADVANCED);

      expect(path[0].title).toContain('Understanding');
      expect(path[0].description).toContain('concepts');
    });

    it('should use tool-focused approach when specific tools are mentioned', async () => {
      const intent: LearningIntent = {
        objective: 'Learn Replit development',
        extractedKeywords: ['replit', 'development', 'coding'],
        requiredTools: ['replit'],
        estimatedComplexity: ComplexityLevel.MEDIUM,
        suggestedSkillLevel: SkillLevel.INTERMEDIATE,
        relatedConcepts: ['coding', 'environment']
      };

      const path = await generator.generatePath(intent, SkillLevel.INTERMEDIATE);

      expect(path.some(step => step.title.includes('Replit'))).toBe(true);
      expect(path.some(step => step.toolRequired === 'replit')).toBe(true);
    });
  });
});