import 'openai/shims/node';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { 
  ProcessedInput, 
  Entity, 
  EntityType,
  InputIntent, 
  IntentType,
  SentimentAnalysis, 
  SentimentType,
  EmotionType,
  AIResponse,
  AIResponseType
} from '../../types/ai';
import { LearningContext } from '../../types/learning';

/**
 * TextProcessor handles natural language understanding for text inputs
 */
export class TextProcessor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-development'
    });
  }

  /**
   * Process raw text input with basic cleaning and normalization
   */
  async processText(text: string): Promise<string> {
    // Basic text cleaning and normalization
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters except basic punctuation
      .toLowerCase();
  }

  /**
   * Extract entities from text using pattern matching and NLP
   */
  async extractEntities(text: string): Promise<Entity[]> {
    const entities: Entity[] = [];
    const lowerText = text.toLowerCase();

    // Tool name patterns
    const toolPatterns = [
      { pattern: /builder\.?io|builder/gi, type: EntityType.TOOL_NAME, value: 'builder.io' },
      { pattern: /firebase|firebase studio/gi, type: EntityType.TOOL_NAME, value: 'firebase' },
      { pattern: /lovable/gi, type: EntityType.TOOL_NAME, value: 'lovable' },
      { pattern: /bolt\.?new|bolt/gi, type: EntityType.TOOL_NAME, value: 'bolt.new' },
      { pattern: /replit|repl\.it/gi, type: EntityType.TOOL_NAME, value: 'replit' }
    ];

    // Skill patterns
    const skillPatterns = [
      { pattern: /web development|web dev|frontend|backend/gi, type: EntityType.SKILL, value: 'web development' },
      { pattern: /react|reactjs/gi, type: EntityType.TECHNOLOGY, value: 'react' },
      { pattern: /javascript|js/gi, type: EntityType.TECHNOLOGY, value: 'javascript' },
      { pattern: /typescript|ts/gi, type: EntityType.TECHNOLOGY, value: 'typescript' },
      { pattern: /html|css/gi, type: EntityType.TECHNOLOGY, value: 'html/css' },
      { pattern: /node\.?js|nodejs/gi, type: EntityType.TECHNOLOGY, value: 'nodejs' }
    ];

    // Project type patterns
    const projectPatterns = [
      { pattern: /website|web app|web application/gi, type: EntityType.PROJECT_TYPE, value: 'website' },
      { pattern: /mobile app|mobile application/gi, type: EntityType.PROJECT_TYPE, value: 'mobile app' },
      { pattern: /dashboard|admin panel/gi, type: EntityType.PROJECT_TYPE, value: 'dashboard' },
      { pattern: /e-?commerce|online store|shop/gi, type: EntityType.PROJECT_TYPE, value: 'ecommerce' },
      { pattern: /blog|portfolio/gi, type: EntityType.PROJECT_TYPE, value: 'portfolio' }
    ];

    // Action patterns
    const actionPatterns = [
      { pattern: /build|create|make|develop/gi, type: EntityType.ACTION, value: 'build' },
      { pattern: /learn|teach|understand|study/gi, type: EntityType.ACTION, value: 'learn' },
      { pattern: /deploy|publish|launch/gi, type: EntityType.ACTION, value: 'deploy' },
      { pattern: /fix|debug|troubleshoot/gi, type: EntityType.ACTION, value: 'fix' }
    ];

    // Difficulty level patterns
    const difficultyPatterns = [
      { pattern: /beginner|basic|simple|easy|start/gi, type: EntityType.DIFFICULTY_LEVEL, value: 'beginner' },
      { pattern: /intermediate|medium|moderate/gi, type: EntityType.DIFFICULTY_LEVEL, value: 'intermediate' },
      { pattern: /advanced|complex|difficult|expert/gi, type: EntityType.DIFFICULTY_LEVEL, value: 'advanced' }
    ];

    // Time duration patterns
    const timePatterns = [
      { pattern: /(\d+)\s*(hour|hr|hours|hrs)/gi, type: EntityType.TIME_DURATION, value: 'hours' },
      { pattern: /(\d+)\s*(minute|min|minutes|mins)/gi, type: EntityType.TIME_DURATION, value: 'minutes' },
      { pattern: /(\d+)\s*(day|days)/gi, type: EntityType.TIME_DURATION, value: 'days' },
      { pattern: /quick|fast|rapid/gi, type: EntityType.TIME_DURATION, value: 'quick' },
      { pattern: /slow|detailed|thorough/gi, type: EntityType.TIME_DURATION, value: 'detailed' }
    ];

    const allPatterns = [
      ...toolPatterns,
      ...skillPatterns,
      ...projectPatterns,
      ...actionPatterns,
      ...difficultyPatterns,
      ...timePatterns
    ];

    // Extract entities using pattern matching
    allPatterns.forEach(({ pattern, type, value }) => {
      const matches = Array.from(text.matchAll(pattern));
      matches.forEach(match => {
        if (match.index !== undefined) {
          entities.push({
            type,
            value,
            confidence: 0.8, // Pattern matching confidence
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            metadata: { matchedText: match[0] }
          });
        }
      });
    });

    // Remove duplicate entities
    const uniqueEntities = entities.filter((entity, index, self) => 
      index === self.findIndex(e => 
        e.type === entity.type && 
        e.value === entity.value && 
        Math.abs(e.startIndex - entity.startIndex) < 10
      )
    );

    return uniqueEntities;
  }

  /**
   * Analyze user intent from text input
   */
  async analyzeIntent(text: string, context?: LearningContext): Promise<InputIntent> {
    const lowerText = text.toLowerCase();
    
    // Intent classification based on keywords and patterns
    let primaryIntent: IntentType = IntentType.GET_HELP;
    let confidence = 0.5;
    const parameters: any = {};
    let clarificationNeeded = false;
    const suggestedQuestions: string[] = [];

    // Learning intent patterns
    if (/learn|teach|understand|study|how to|show me/i.test(text)) {
      primaryIntent = IntentType.LEARN_SKILL;
      confidence = 0.8;
      
      // Extract what they want to learn
      const skillMatch = text.match(/learn\s+(about\s+)?(.+?)(?:\s+using|\s+with|\s+in|$)/i);
      if (skillMatch) {
        parameters.targetSkill = skillMatch[2].trim();
      }
    }

    // Building/creating intent patterns
    else if (/build|create|make|develop|design/i.test(text)) {
      primaryIntent = IntentType.BUILD_PROJECT;
      confidence = 0.8;
      
      // Extract project type
      const projectMatch = text.match(/(?:build|create|make)\s+(?:a\s+)?(.+?)(?:\s+using|\s+with|\s+in|$)/i);
      if (projectMatch) {
        parameters.projectType = projectMatch[1].trim();
      }
    }

    // Navigation intent patterns
    else if (/open|go to|navigate|use|start/i.test(text)) {
      primaryIntent = IntentType.NAVIGATE_TOOL;
      confidence = 0.7;
      
      // Extract tool preference
      const toolMatch = text.match(/(?:open|go to|navigate|use|start)\s+(.+?)(?:\s+to|\s+for|$)/i);
      if (toolMatch) {
        parameters.toolPreference = toolMatch[1].trim();
      }
    }

    // Help/troubleshooting intent patterns
    else if (/help|problem|issue|error|fix|debug|stuck/i.test(text)) {
      primaryIntent = IntentType.TROUBLESHOOT;
      confidence = 0.7;
    }

    // Understanding/concept intent patterns
    else if (/what is|explain|understand|concept|definition/i.test(text)) {
      primaryIntent = IntentType.UNDERSTAND_CONCEPT;
      confidence = 0.7;
    }

    // Progress tracking intent patterns
    else if (/progress|status|how am i doing|track|analytics/i.test(text)) {
      primaryIntent = IntentType.TRACK_PROGRESS;
      confidence = 0.7;
    }

    // Customization intent patterns
    else if (/settings|preferences|customize|configure|change/i.test(text)) {
      primaryIntent = IntentType.CUSTOMIZE_EXPERIENCE;
      confidence = 0.7;
    }

    // Extract additional parameters
    if (/beginner|basic|simple|easy|new to/i.test(text)) {
      parameters.difficultyLevel = 'beginner';
    } else if (/intermediate|medium|some experience/i.test(text)) {
      parameters.difficultyLevel = 'intermediate';
    } else if (/advanced|expert|experienced/i.test(text)) {
      parameters.difficultyLevel = 'advanced';
    }

    // Extract time constraints
    const timeMatch = text.match(/(\d+)\s*(hour|minute|day)s?/i);
    if (timeMatch) {
      const amount = parseInt(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();
      parameters.timeConstraint = unit === 'hour' ? amount * 60 : 
                                 unit === 'minute' ? amount : 
                                 amount * 24 * 60; // days to minutes
    }

    // Check if clarification is needed
    if (confidence < 0.6 || text.length < 10 || /what|how|when|where|why/i.test(text)) {
      clarificationNeeded = true;
      
      if (primaryIntent === IntentType.LEARN_SKILL && !parameters.targetSkill) {
        suggestedQuestions.push('What specific skill would you like to learn?');
      }
      if (primaryIntent === IntentType.BUILD_PROJECT && !parameters.projectType) {
        suggestedQuestions.push('What type of project would you like to build?');
      }
      if (!parameters.difficultyLevel) {
        suggestedQuestions.push('What is your experience level with this topic?');
      }
    }

    return {
      primary: primaryIntent,
      confidence,
      parameters,
      clarificationNeeded,
      suggestedQuestions: suggestedQuestions.length > 0 ? suggestedQuestions : undefined
    };
  }

  /**
   * Analyze sentiment and emotional state from text
   */
  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    const lowerText = text.toLowerCase();
    
    // Basic sentiment analysis using keyword patterns
    let overall: SentimentType = SentimentType.NEUTRAL;
    let confidence = 0.6;
    
    // Positive indicators
    const positiveWords = ['great', 'awesome', 'love', 'excited', 'amazing', 'perfect', 'excellent', 'wonderful'];
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    
    // Negative indicators
    const negativeWords = ['hate', 'terrible', 'awful', 'frustrated', 'confused', 'stuck', 'problem', 'error'];
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    // Neutral/question indicators
    const questionWords = ['how', 'what', 'when', 'where', 'why', 'can you', 'please'];
    const questionCount = questionWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount && positiveCount > 0) {
      overall = SentimentType.POSITIVE;
      confidence = Math.min(0.9, 0.6 + (positiveCount * 0.1));
    } else if (negativeCount > positiveCount && negativeCount > 0) {
      overall = SentimentType.NEGATIVE;
      confidence = Math.min(0.9, 0.6 + (negativeCount * 0.1));
    } else if (positiveCount > 0 && negativeCount > 0) {
      overall = SentimentType.MIXED;
      confidence = 0.7;
    }

    // Emotion detection
    const emotions = [];
    
    if (lowerText.includes('excited') || lowerText.includes('love')) {
      emotions.push({ emotion: EmotionType.JOY, intensity: 0.7, confidence: 0.8 });
    }
    if (lowerText.includes('confused') || lowerText.includes('don\'t understand')) {
      emotions.push({ emotion: EmotionType.CONFUSION, intensity: 0.6, confidence: 0.7 });
    }
    if (lowerText.includes('frustrated') || lowerText.includes('stuck')) {
      emotions.push({ emotion: EmotionType.FRUSTRATION, intensity: 0.7, confidence: 0.8 });
    }
    if (questionCount > 2) {
      emotions.push({ emotion: EmotionType.CURIOSITY, intensity: 0.6, confidence: 0.7 });
    }

    // Calculate engagement and motivation levels
    const engagementLevel = Math.min(1, (text.length / 100) + (questionCount * 0.1) + (positiveCount * 0.1));
    const motivationLevel = overall === SentimentType.POSITIVE ? 0.8 : 
                           overall === SentimentType.NEGATIVE ? 0.3 : 0.5;
    const frustrationLevel = negativeCount > 0 ? Math.min(1, negativeCount * 0.2) : 0;

    return {
      overall,
      confidence,
      emotions,
      frustrationLevel,
      engagementLevel,
      motivationLevel
    };
  }

  /**
   * Generate AI response based on processed input
   */
  async generateResponse(input: ProcessedInput, context: LearningContext): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Determine response type based on intent
      let responseType: AIResponseType = AIResponseType.EXPLANATION;
      
      switch (input.intent.primary) {
        case IntentType.LEARN_SKILL:
          responseType = AIResponseType.INSTRUCTION;
          break;
        case IntentType.BUILD_PROJECT:
          responseType = AIResponseType.INSTRUCTION;
          break;
        case IntentType.GET_HELP:
          responseType = AIResponseType.EXPLANATION;
          break;
        case IntentType.TROUBLESHOOT:
          responseType = AIResponseType.SUGGESTION;
          break;
        case IntentType.UNDERSTAND_CONCEPT:
          responseType = AIResponseType.EXPLANATION;
          break;
        default:
          responseType = AIResponseType.EXPLANATION;
      }

      // Generate contextual response
      const content = await this.generateContextualResponse(input, context, responseType);
      
      return {
        id: uuidv4(),
        type: responseType,
        content,
        confidence: input.confidence,
        processingTime: Date.now() - startTime,
        model: 'text-processor-v1',
        timestamp: new Date(),
        metadata: {
          inputTokens: Math.ceil(input.processedText.length / 4), // Rough token estimate
          outputTokens: Math.ceil(content.length / 4),
          modelVersion: '1.0.0',
          temperature: 0.7,
          topP: 0.9,
          contextLength: input.processedText.length,
          reasoningSteps: [
            `Analyzed intent: ${input.intent.primary}`,
            `Detected entities: ${input.extractedEntities.length}`,
            `Sentiment: ${input.sentiment.overall}`,
            `Generated ${responseType} response`
          ]
        }
      };
    } catch (error) {
      throw new Error(`Response generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate contextual response based on input and context
   */
  private async generateContextualResponse(
    input: ProcessedInput, 
    context: LearningContext, 
    responseType: AIResponseType
  ): Promise<string> {
    const { intent, extractedEntities, sentiment } = input;
    
    // Build response based on intent and context
    let response = '';
    
    switch (intent.primary) {
      case IntentType.LEARN_SKILL:
        response = this.generateLearningResponse(intent, extractedEntities, context);
        break;
      case IntentType.BUILD_PROJECT:
        response = this.generateProjectResponse(intent, extractedEntities, context);
        break;
      case IntentType.GET_HELP:
        response = this.generateHelpResponse(intent, extractedEntities, context);
        break;
      case IntentType.TROUBLESHOOT:
        response = this.generateTroubleshootResponse(intent, extractedEntities, context);
        break;
      case IntentType.UNDERSTAND_CONCEPT:
        response = this.generateConceptResponse(intent, extractedEntities, context);
        break;
      default:
        response = "I'd be happy to help you learn! Could you tell me more about what you'd like to work on?";
    }

    // Adjust tone based on sentiment
    if (sentiment.overall === SentimentType.NEGATIVE || sentiment.frustrationLevel > 0.5) {
      response = "I understand this can be challenging. " + response + " Let's take it step by step.";
    } else if (sentiment.overall === SentimentType.POSITIVE) {
      response = "Great enthusiasm! " + response;
    }

    return response;
  }

  private generateLearningResponse(intent: InputIntent, entities: Entity[], context: LearningContext): string {
    const skill = intent.parameters.targetSkill || 'web development';
    const level = intent.parameters.difficultyLevel || 'beginner';
    
    return `I'll help you learn ${skill} at a ${level} level. Let me create a personalized learning path for you that includes hands-on practice with the right tools.`;
  }

  private generateProjectResponse(intent: InputIntent, entities: Entity[], context: LearningContext): string {
    const projectType = intent.parameters.projectType || 'web application';
    const toolEntities = entities.filter(e => e.type === EntityType.TOOL_NAME);
    
    let response = `Let's build a ${projectType} together! `;
    
    if (toolEntities.length > 0) {
      response += `I'll guide you through using ${toolEntities[0].value} to create your project.`;
    } else {
      response += `I'll help you choose the best tool and guide you through the entire process.`;
    }
    
    return response;
  }

  private generateHelpResponse(intent: InputIntent, entities: Entity[], context: LearningContext): string {
    return "I'm here to help you learn and build amazing projects! You can ask me to teach you new skills, help you build something specific, or guide you through using different development tools. What would you like to work on?";
  }

  private generateTroubleshootResponse(intent: InputIntent, entities: Entity[], context: LearningContext): string {
    return "I'll help you troubleshoot this issue. Let me analyze what's happening and guide you through the solution step by step.";
  }

  private generateConceptResponse(intent: InputIntent, entities: Entity[], context: LearningContext): string {
    const concepts = entities.filter(e => e.type === EntityType.CONCEPT || e.type === EntityType.TECHNOLOGY);
    
    if (concepts.length > 0) {
      return `Let me explain ${concepts[0].value} in a way that's easy to understand, with practical examples you can try.`;
    }
    
    return "I'll explain that concept clearly with examples and show you how it applies in real projects.";
  }
}