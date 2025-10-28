import { v4 as uuidv4 } from 'uuid';
import { 
  ProcessedInput, 
  Entity, 
  EntityType,
  InputIntent,
  IntentType,
  IntentParameters,
  SentimentType
} from '../types/ai';
import { 
  LearningRequest, 
  LearningIntent, 
  LearningContext 
} from '../types/learning';
import { 
  ComplexityLevel, 
  SkillLevel, 
  BuilderType 
} from '../types/common';

/**
 * IntentAnalyzer parses learning requests and extracts objectives
 */
export class IntentAnalyzer {
  private toolMappings: Map<string, BuilderType> = new Map();
  private skillComplexityMap: Map<string, ComplexityLevel> = new Map();
  private conceptRelationships: Map<string, string[]> = new Map();

  constructor() {
    this.initializeToolMappings();
    this.initializeSkillComplexityMap();
    this.initializeConceptRelationships();
  }

  /**
   * Parse learning request and extract structured intent
   */
  async analyzeRequest(input: ProcessedInput): Promise<LearningIntent> {
    try {
      const objective = this.extractObjective(input);
      const extractedKeywords = this.extractKeywords(input);
      const requiredTools = this.identifyRequiredTools(objective, extractedKeywords);
      const estimatedComplexity = this.estimateComplexity(objective, extractedKeywords);
      const suggestedSkillLevel = this.suggestSkillLevel(input, estimatedComplexity);
      const relatedConcepts = this.findRelatedConcepts(extractedKeywords);

      return {
        objective,
        extractedKeywords,
        requiredTools,
        estimatedComplexity,
        suggestedSkillLevel,
        relatedConcepts
      };
    } catch (error) {
      throw new Error(`Intent analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract the main learning objective from processed input
   */
  extractObjective(input: ProcessedInput): string {
    const { intent, extractedEntities, processedText } = input;
    
    // Start with the primary intent
    let objective = '';
    
    switch (intent.primary) {
      case IntentType.LEARN_SKILL:
        const skill = intent.parameters.targetSkill || 
                     this.findEntityValue(extractedEntities, EntityType.SKILL) ||
                     this.findEntityValue(extractedEntities, EntityType.TECHNOLOGY);
        objective = skill ? `Learn ${skill}` : 'Learn new development skills';
        break;
        
      case IntentType.BUILD_PROJECT:
        const projectType = intent.parameters.projectType ||
                           this.findEntityValue(extractedEntities, EntityType.PROJECT_TYPE);
        objective = projectType ? `Build a ${projectType}` : 'Build a web application';
        break;
        
      case IntentType.UNDERSTAND_CONCEPT:
        const concept = this.findEntityValue(extractedEntities, EntityType.CONCEPT) ||
                       this.findEntityValue(extractedEntities, EntityType.TECHNOLOGY);
        objective = concept ? `Understand ${concept}` : 'Understand development concepts';
        break;
        
      case IntentType.NAVIGATE_TOOL:
        const tool = intent.parameters.toolPreference ||
                    this.findEntityValue(extractedEntities, EntityType.TOOL_NAME);
        objective = tool ? `Learn to use ${tool}` : 'Learn to use development tools';
        break;
        
      case IntentType.TROUBLESHOOT:
        objective = 'Troubleshoot and fix development issues';
        break;
        
      case IntentType.TRACK_PROGRESS:
        objective = 'Track learning progress and achievements';
        break;
        
      case IntentType.CUSTOMIZE_EXPERIENCE:
        objective = 'Customize learning experience and preferences';
        break;
        
      default:
        // Fallback: try to extract objective from text
        objective = this.extractObjectiveFromText(processedText);
    }

    // Enhance objective with difficulty level if specified
    const difficultyLevel = intent.parameters.difficultyLevel ||
                           this.findEntityValue(extractedEntities, EntityType.DIFFICULTY_LEVEL);
    
    if (difficultyLevel && difficultyLevel !== 'beginner') {
      objective += ` at ${difficultyLevel} level`;
    }

    return objective;
  }

  /**
   * Extract keywords from processed input
   */
  extractKeywords(input: ProcessedInput): string[] {
    const keywords = new Set<string>();
    
    // Add entity values as keywords
    input.extractedEntities.forEach(entity => {
      keywords.add(entity.value.toLowerCase());
      
      // Add metadata if available
      if (entity.metadata?.matchedText) {
        keywords.add(entity.metadata.matchedText.toLowerCase());
      }
    });
    
    // Add intent parameters as keywords
    Object.values(input.intent.parameters).forEach(param => {
      if (typeof param === 'string') {
        keywords.add(param.toLowerCase());
      }
    });
    
    // Extract additional keywords from processed text
    const textKeywords = this.extractKeywordsFromText(input.processedText);
    textKeywords.forEach(keyword => keywords.add(keyword));
    
    return Array.from(keywords).filter(keyword => keyword.length > 2);
  }

  /**
   * Identify required tools based on objective and keywords
   */
  identifyRequiredTools(objective: string, keywords: string[]): string[] {
    const tools = new Set<string>();
    const combinedText = `${objective} ${keywords.join(' ')}`.toLowerCase();
    
    // Check for explicit tool mentions
    this.toolMappings.forEach((builderType, toolName) => {
      if (combinedText.includes(toolName.toLowerCase())) {
        tools.add(toolName);
      }
    });
    
    // Infer tools based on project type and technologies
    if (combinedText.includes('website') || combinedText.includes('web app')) {
      if (combinedText.includes('react') || combinedText.includes('component')) {
        tools.add('builder.io');
      } else if (combinedText.includes('firebase') || combinedText.includes('database')) {
        tools.add('firebase');
      } else {
        tools.add('lovable'); // Default for web projects
      }
    }
    
    if (combinedText.includes('mobile') || combinedText.includes('app')) {
      tools.add('lovable');
    }
    
    if (combinedText.includes('code') || combinedText.includes('programming')) {
      tools.add('replit');
    }
    
    if (combinedText.includes('prototype') || combinedText.includes('quick')) {
      tools.add('bolt.new');
    }
    
    // If no specific tools identified, suggest based on complexity
    if (tools.size === 0) {
      if (combinedText.includes('beginner') || combinedText.includes('simple')) {
        tools.add('lovable');
      } else if (combinedText.includes('advanced') || combinedText.includes('complex')) {
        tools.add('replit');
      } else {
        tools.add('builder.io'); // Default choice
      }
    }
    
    return Array.from(tools);
  }

  /**
   * Estimate complexity level for the learning objective
   */
  estimateComplexity(objective: string, keywords: string[]): ComplexityLevel {
    const combinedText = `${objective} ${keywords.join(' ')}`.toLowerCase();
    
    // Check for explicit complexity indicators
    if (combinedText.includes('beginner') || combinedText.includes('basic') || 
        combinedText.includes('simple') || combinedText.includes('easy')) {
      return ComplexityLevel.LOW;
    }
    
    if (combinedText.includes('advanced') || combinedText.includes('expert') || 
        combinedText.includes('complex') || combinedText.includes('difficult')) {
      return ComplexityLevel.HIGH;
    }
    
    if (combinedText.includes('intermediate') || combinedText.includes('moderate')) {
      return ComplexityLevel.MEDIUM;
    }
    
    // Infer complexity from technologies and concepts
    const highComplexityIndicators = [
      'backend', 'api', 'database', 'authentication', 'deployment',
      'microservices', 'architecture', 'performance', 'security',
      'testing', 'ci/cd', 'docker', 'kubernetes'
    ];
    
    const mediumComplexityIndicators = [
      'react', 'vue', 'angular', 'javascript', 'typescript',
      'state management', 'routing', 'forms', 'components'
    ];
    
    const lowComplexityIndicators = [
      'html', 'css', 'styling', 'layout', 'design',
      'static', 'landing page', 'portfolio'
    ];
    
    const highCount = highComplexityIndicators.filter(indicator => 
      combinedText.includes(indicator)).length;
    const mediumCount = mediumComplexityIndicators.filter(indicator => 
      combinedText.includes(indicator)).length;
    const lowCount = lowComplexityIndicators.filter(indicator => 
      combinedText.includes(indicator)).length;
    
    if (highCount > 0) return ComplexityLevel.HIGH;
    if (mediumCount > lowCount) return ComplexityLevel.MEDIUM;
    if (lowCount > 0) return ComplexityLevel.LOW;
    
    // Default to medium complexity
    return ComplexityLevel.MEDIUM;
  }

  /**
   * Suggest appropriate skill level based on input and complexity
   */
  suggestSkillLevel(input: ProcessedInput, complexity: ComplexityLevel): SkillLevel {
    // Check for explicit skill level indicators
    const difficultyLevel = input.intent.parameters.difficultyLevel;
    if (difficultyLevel) {
      switch (difficultyLevel.toLowerCase()) {
        case 'beginner':
        case 'basic':
        case 'new':
          return SkillLevel.BEGINNER;
        case 'intermediate':
        case 'moderate':
          return SkillLevel.INTERMEDIATE;
        case 'advanced':
        case 'expert':
          return SkillLevel.ADVANCED;
      }
    }
    
    // Infer from sentiment and confidence
    const { sentiment, confidence } = input;
    
    // High confidence and positive sentiment might indicate some experience
    if (confidence > 0.8 && sentiment.overall === SentimentType.POSITIVE) {
      return complexity === ComplexityLevel.HIGH ? 
        SkillLevel.INTERMEDIATE : SkillLevel.ADVANCED;
    }
    
    // Low confidence or confusion might indicate beginner level
    if (confidence < 0.6 || sentiment.frustrationLevel > 0.5) {
      return SkillLevel.BEGINNER;
    }
    
    // Map complexity to skill level as fallback
    switch (complexity) {
      case ComplexityLevel.LOW:
        return SkillLevel.BEGINNER;
      case ComplexityLevel.MEDIUM:
        return SkillLevel.INTERMEDIATE;
      case ComplexityLevel.HIGH:
        return SkillLevel.ADVANCED;
      default:
        return SkillLevel.INTERMEDIATE;
    }
  }

  /**
   * Find related concepts based on keywords
   */
  findRelatedConcepts(keywords: string[]): string[] {
    const relatedConcepts = new Set<string>();
    
    keywords.forEach(keyword => {
      const related = this.conceptRelationships.get(keyword.toLowerCase());
      if (related) {
        related.forEach(concept => relatedConcepts.add(concept));
      }
    });
    
    return Array.from(relatedConcepts);
  }

  /**
   * Helper method to find entity value by type
   */
  private findEntityValue(entities: Entity[], type: EntityType): string | undefined {
    const entity = entities.find(e => e.type === type);
    return entity?.value;
  }

  /**
   * Extract objective from raw text as fallback
   */
  private extractObjectiveFromText(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Look for common patterns
    if (lowerText.includes('learn')) {
      const match = text.match(/learn\s+(?:about\s+)?(.+?)(?:\s+using|\s+with|$)/i);
      if (match) return `Learn ${match[1].trim()}`;
    }
    
    if (lowerText.includes('build') || lowerText.includes('create')) {
      const match = text.match(/(?:build|create)\s+(?:a\s+)?(.+?)(?:\s+using|\s+with|$)/i);
      if (match) return `Build ${match[1].trim()}`;
    }
    
    if (lowerText.includes('understand')) {
      const match = text.match(/understand\s+(.+?)(?:\s+in|\s+with|$)/i);
      if (match) return `Understand ${match[1].trim()}`;
    }
    
    return 'Learn web development';
  }

  /**
   * Extract keywords from text using simple NLP techniques
   */
  private extractKeywordsFromText(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Remove common stop words
    const stopWords = new Set([
      'want', 'need', 'like', 'would', 'could', 'should',
      'help', 'please', 'thank', 'thanks', 'hello', 'with',
      'from', 'they', 'them', 'this', 'that', 'have', 'been'
    ]);
    
    return words.filter(word => !stopWords.has(word));
  }

  /**
   * Initialize tool mappings
   */
  private initializeToolMappings(): void {
    this.toolMappings = new Map([
      ['builder.io', BuilderType.BUILDER_IO],
      ['builder', BuilderType.BUILDER_IO],
      ['firebase', BuilderType.FIREBASE_STUDIO],
      ['firebase studio', BuilderType.FIREBASE_STUDIO],
      ['lovable', BuilderType.LOVABLE],
      ['bolt.new', BuilderType.BOLT_NEW],
      ['bolt', BuilderType.BOLT_NEW],
      ['replit', BuilderType.REPLIT],
      ['repl.it', BuilderType.REPLIT]
    ]);
  }

  /**
   * Initialize skill complexity mappings
   */
  private initializeSkillComplexityMap(): void {
    this.skillComplexityMap = new Map([
      // Low complexity
      ['html', ComplexityLevel.LOW],
      ['css', ComplexityLevel.LOW],
      ['styling', ComplexityLevel.LOW],
      ['design', ComplexityLevel.LOW],
      ['layout', ComplexityLevel.LOW],
      
      // Medium complexity
      ['javascript', ComplexityLevel.MEDIUM],
      ['typescript', ComplexityLevel.MEDIUM],
      ['react', ComplexityLevel.MEDIUM],
      ['vue', ComplexityLevel.MEDIUM],
      ['angular', ComplexityLevel.MEDIUM],
      ['components', ComplexityLevel.MEDIUM],
      
      // High complexity
      ['backend', ComplexityLevel.HIGH],
      ['api', ComplexityLevel.HIGH],
      ['database', ComplexityLevel.HIGH],
      ['authentication', ComplexityLevel.HIGH],
      ['deployment', ComplexityLevel.HIGH],
      ['microservices', ComplexityLevel.HIGH],
      ['architecture', ComplexityLevel.HIGH]
    ]);
  }

  /**
   * Initialize concept relationships
   */
  private initializeConceptRelationships(): void {
    this.conceptRelationships = new Map([
      ['react', ['components', 'jsx', 'state', 'props', 'hooks', 'virtual dom']],
      ['javascript', ['variables', 'functions', 'objects', 'arrays', 'dom', 'events']],
      ['typescript', ['types', 'interfaces', 'generics', 'javascript', 'static typing']],
      ['css', ['selectors', 'flexbox', 'grid', 'responsive design', 'animations']],
      ['html', ['elements', 'attributes', 'semantic markup', 'accessibility']],
      ['web development', ['html', 'css', 'javascript', 'responsive design', 'apis']],
      ['frontend', ['react', 'vue', 'angular', 'css', 'javascript', 'ui/ux']],
      ['backend', ['apis', 'databases', 'authentication', 'servers', 'security']],
      ['database', ['sql', 'nosql', 'queries', 'relationships', 'indexing']],
      ['api', ['rest', 'graphql', 'endpoints', 'http', 'json', 'authentication']],
      ['deployment', ['hosting', 'ci/cd', 'docker', 'cloud', 'domains']],
      ['mobile', ['responsive design', 'pwa', 'react native', 'flutter']],
      ['ui/ux', ['design', 'usability', 'accessibility', 'user research', 'prototyping']]
    ]);
  }
}