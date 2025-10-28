import { IntentAnalyzer } from '../IntentAnalyzer';
import { 
  ProcessedInput, 
  Entity, 
  EntityType,
  InputIntent,
  IntentType,
  SentimentType
} from '../../types/ai';
import { InputType, ComplexityLevel, SkillLevel } from '../../types/common';

describe('IntentAnalyzer', () => {
  let analyzer: IntentAnalyzer;

  beforeEach(() => {
    analyzer = new IntentAnalyzer();
  });

  describe('analyzeRequest', () => {
    it('should analyze a learning request correctly', async () => {
      const processedInput: ProcessedInput = {
        id: 'test-123',
        originalInput: 'I want to learn React development',
        inputType: InputType.TEXT,
        processedText: 'i want to learn react development',
        extractedEntities: [
          {
            type: EntityType.TECHNOLOGY,
            value: 'react',
            confidence: 0.9,
            startIndex: 17,
            endIndex: 22
          },
          {
            type: EntityType.SKILL,
            value: 'development',
            confidence: 0.8,
            startIndex: 23,
            endIndex: 34
          }
        ],
        intent: {
          primary: IntentType.LEARN_SKILL,
          confidence: 0.8,
          parameters: { targetSkill: 'react development' },
          clarificationNeeded: false
        },
        sentiment: {
          overall: SentimentType.POSITIVE,
          confidence: 0.7,
          emotions: [],
          frustrationLevel: 0,
          engagementLevel: 0.8,
          motivationLevel: 0.9
        },
        confidence: 0.8,
        processingTime: 100,
        metadata: {
          processingSteps: [],
          modelUsed: 'test-model',
          apiCalls: 1,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };

      const result = await analyzer.analyzeRequest(processedInput);

      expect(result).toBeDefined();
      expect(result.objective.toLowerCase()).toContain('react');
      expect(result.extractedKeywords).toContain('react');
      expect(result.extractedKeywords).toContain('development');
      expect(result.requiredTools.length).toBeGreaterThan(0);
      expect(result.estimatedComplexity).toBeDefined();
      expect(result.suggestedSkillLevel).toBeDefined();
      expect(result.relatedConcepts.length).toBeGreaterThan(0);
    });

    it('should handle build project intent', async () => {
      const processedInput: ProcessedInput = {
        id: 'test-456',
        originalInput: 'I want to build a website',
        inputType: InputType.TEXT,
        processedText: 'i want to build a website',
        extractedEntities: [
          {
            type: EntityType.PROJECT_TYPE,
            value: 'website',
            confidence: 0.9,
            startIndex: 17,
            endIndex: 24
          }
        ],
        intent: {
          primary: IntentType.BUILD_PROJECT,
          confidence: 0.9,
          parameters: { projectType: 'website' },
          clarificationNeeded: false
        },
        sentiment: {
          overall: SentimentType.POSITIVE,
          confidence: 0.8,
          emotions: [],
          frustrationLevel: 0,
          engagementLevel: 0.7,
          motivationLevel: 0.8
        },
        confidence: 0.85,
        processingTime: 120,
        metadata: {
          processingSteps: [],
          modelUsed: 'test-model',
          apiCalls: 1,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };

      const result = await analyzer.analyzeRequest(processedInput);

      expect(result.objective).toContain('Build a website');
      expect(result.extractedKeywords).toContain('website');
      expect(result.requiredTools).toContain('lovable');
      expect(result.estimatedComplexity).toBe(ComplexityLevel.MEDIUM);
    });
  });

  describe('extractObjective', () => {
    it('should extract learning objective correctly', () => {
      const processedInput: ProcessedInput = {
        id: 'test-123',
        originalInput: 'I want to learn JavaScript',
        inputType: InputType.TEXT,
        processedText: 'i want to learn javascript',
        extractedEntities: [
          {
            type: EntityType.TECHNOLOGY,
            value: 'javascript',
            confidence: 0.9,
            startIndex: 17,
            endIndex: 27
          }
        ],
        intent: {
          primary: IntentType.LEARN_SKILL,
          confidence: 0.8,
          parameters: { targetSkill: 'javascript' },
          clarificationNeeded: false
        },
        sentiment: {
          overall: SentimentType.NEUTRAL,
          confidence: 0.6,
          emotions: [],
          frustrationLevel: 0,
          engagementLevel: 0.5,
          motivationLevel: 0.5
        },
        confidence: 0.8,
        processingTime: 100,
        metadata: {
          processingSteps: [],
          modelUsed: 'test-model',
          apiCalls: 1,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };

      const objective = analyzer.extractObjective(processedInput);

      expect(objective).toBe('Learn javascript');
    });

    it('should extract build objective correctly', () => {
      const processedInput: ProcessedInput = {
        id: 'test-456',
        originalInput: 'I want to build a mobile app',
        inputType: InputType.TEXT,
        processedText: 'i want to build a mobile app',
        extractedEntities: [
          {
            type: EntityType.PROJECT_TYPE,
            value: 'mobile app',
            confidence: 0.9,
            startIndex: 17,
            endIndex: 27
          }
        ],
        intent: {
          primary: IntentType.BUILD_PROJECT,
          confidence: 0.9,
          parameters: { projectType: 'mobile app' },
          clarificationNeeded: false
        },
        sentiment: {
          overall: SentimentType.POSITIVE,
          confidence: 0.7,
          emotions: [],
          frustrationLevel: 0,
          engagementLevel: 0.8,
          motivationLevel: 0.9
        },
        confidence: 0.85,
        processingTime: 120,
        metadata: {
          processingSteps: [],
          modelUsed: 'test-model',
          apiCalls: 1,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };

      const objective = analyzer.extractObjective(processedInput);

      expect(objective).toBe('Build a mobile app');
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from entities and text', () => {
      const processedInput: ProcessedInput = {
        id: 'test-789',
        originalInput: 'Learn React components and hooks',
        inputType: InputType.TEXT,
        processedText: 'learn react components and hooks',
        extractedEntities: [
          {
            type: EntityType.TECHNOLOGY,
            value: 'react',
            confidence: 0.9,
            startIndex: 6,
            endIndex: 11
          },
          {
            type: EntityType.CONCEPT,
            value: 'components',
            confidence: 0.8,
            startIndex: 12,
            endIndex: 22
          }
        ],
        intent: {
          primary: IntentType.LEARN_SKILL,
          confidence: 0.8,
          parameters: { targetSkill: 'react' },
          clarificationNeeded: false
        },
        sentiment: {
          overall: SentimentType.NEUTRAL,
          confidence: 0.6,
          emotions: [],
          frustrationLevel: 0,
          engagementLevel: 0.5,
          motivationLevel: 0.5
        },
        confidence: 0.8,
        processingTime: 100,
        metadata: {
          processingSteps: [],
          modelUsed: 'test-model',
          apiCalls: 1,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };

      const keywords = analyzer.extractKeywords(processedInput);

      expect(keywords).toContain('react');
      expect(keywords).toContain('components');
      expect(keywords).toContain('hooks');
      expect(keywords.length).toBeGreaterThan(2);
    });
  });

  describe('identifyRequiredTools', () => {
    it('should identify tools for web development', () => {
      const objective = 'Build a React website';
      const keywords = ['react', 'website', 'components'];

      const tools = analyzer.identifyRequiredTools(objective, keywords);

      expect(tools).toContain('builder.io');
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should identify tools for mobile development', () => {
      const objective = 'Build a mobile app';
      const keywords = ['mobile', 'app'];

      const tools = analyzer.identifyRequiredTools(objective, keywords);

      expect(tools).toContain('lovable');
    });

    it('should identify tools for coding projects', () => {
      const objective = 'Learn programming';
      const keywords = ['code', 'programming'];

      const tools = analyzer.identifyRequiredTools(objective, keywords);

      expect(tools).toContain('replit');
    });
  });

  describe('estimateComplexity', () => {
    it('should estimate low complexity for basic projects', () => {
      const objective = 'Build a simple website';
      const keywords = ['simple', 'website', 'basic'];

      const complexity = analyzer.estimateComplexity(objective, keywords);

      expect(complexity).toBe(ComplexityLevel.LOW);
    });

    it('should estimate high complexity for advanced projects', () => {
      const objective = 'Build a complex backend API';
      const keywords = ['complex', 'backend', 'api', 'database'];

      const complexity = analyzer.estimateComplexity(objective, keywords);

      expect(complexity).toBe(ComplexityLevel.HIGH);
    });

    it('should estimate medium complexity for intermediate projects', () => {
      const objective = 'Build a React application';
      const keywords = ['react', 'application', 'components'];

      const complexity = analyzer.estimateComplexity(objective, keywords);

      expect(complexity).toBe(ComplexityLevel.MEDIUM);
    });
  });

  describe('suggestSkillLevel', () => {
    it('should suggest beginner level for low confidence input', () => {
      const processedInput: ProcessedInput = {
        id: 'test-low-confidence',
        originalInput: 'I am new to programming',
        inputType: InputType.TEXT,
        processedText: 'i am new to programming',
        extractedEntities: [],
        intent: {
          primary: IntentType.LEARN_SKILL,
          confidence: 0.4,
          parameters: { difficultyLevel: 'beginner' },
          clarificationNeeded: true
        },
        sentiment: {
          overall: SentimentType.NEUTRAL,
          confidence: 0.5,
          emotions: [],
          frustrationLevel: 0.6,
          engagementLevel: 0.3,
          motivationLevel: 0.4
        },
        confidence: 0.4,
        processingTime: 100,
        metadata: {
          processingSteps: [],
          modelUsed: 'test-model',
          apiCalls: 1,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };

      const skillLevel = analyzer.suggestSkillLevel(processedInput, ComplexityLevel.LOW);

      expect(skillLevel).toBe(SkillLevel.BEGINNER);
    });

    it('should suggest advanced level for high confidence and complex projects', () => {
      const processedInput: ProcessedInput = {
        id: 'test-high-confidence',
        originalInput: 'I want to build a microservices architecture',
        inputType: InputType.TEXT,
        processedText: 'i want to build a microservices architecture',
        extractedEntities: [],
        intent: {
          primary: IntentType.BUILD_PROJECT,
          confidence: 0.9,
          parameters: { difficultyLevel: 'advanced' },
          clarificationNeeded: false
        },
        sentiment: {
          overall: SentimentType.POSITIVE,
          confidence: 0.8,
          emotions: [],
          frustrationLevel: 0,
          engagementLevel: 0.9,
          motivationLevel: 0.9
        },
        confidence: 0.9,
        processingTime: 100,
        metadata: {
          processingSteps: [],
          modelUsed: 'test-model',
          apiCalls: 1,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };

      const skillLevel = analyzer.suggestSkillLevel(processedInput, ComplexityLevel.HIGH);

      expect(skillLevel).toBe(SkillLevel.ADVANCED);
    });
  });

  describe('findRelatedConcepts', () => {
    it('should find related concepts for React', () => {
      const keywords = ['react', 'javascript'];

      const relatedConcepts = analyzer.findRelatedConcepts(keywords);

      expect(relatedConcepts).toContain('components');
      expect(relatedConcepts).toContain('jsx');
      expect(relatedConcepts).toContain('variables');
      expect(relatedConcepts).toContain('functions');
    });

    it('should find related concepts for web development', () => {
      const keywords = ['web development', 'frontend'];

      const relatedConcepts = analyzer.findRelatedConcepts(keywords);

      expect(relatedConcepts.length).toBeGreaterThan(0);
      expect(relatedConcepts).toContain('html');
      expect(relatedConcepts).toContain('css');
    });
  });

  describe('error handling', () => {
    it('should handle analysis errors gracefully', async () => {
      const invalidInput = {} as ProcessedInput;

      await expect(analyzer.analyzeRequest(invalidInput)).rejects.toThrow('Intent analysis failed');
    });
  });
});