import { v4 as uuidv4 } from 'uuid';
import { 
  LearningStep, 
  LearningIntent, 
  ValidationCriteria,
  ValidationRule
} from '../types/learning';
import { 
  ComplexityLevel, 
  SkillLevel, 
  BuilderType 
} from '../types/common';
import { BrowserAction, BrowserActionType, ElementSelector, SelectorType } from '../types/browser';

/**
 * LearningPathGenerator creates step-by-step learning plans
 */
export class LearningPathGenerator {
  private stepTemplates: Map<string, Partial<LearningStep>[]> = new Map();
  private toolWorkflows: Map<BuilderType, Partial<LearningStep>[]> = new Map();
  private complexityModifiers: Map<ComplexityLevel, { 
    stepMultiplier: number; 
    detailLevel: string; 
    prerequisiteDepth: number; 
  }> = new Map();

  constructor() {
    this.initializeStepTemplates();
    this.initializeToolWorkflows();
    this.initializeComplexityModifiers();
  }

  /**
   * Generate a complete learning path based on intent and user level
   */
  async generatePath(
    intent: LearningIntent, 
    userLevel: SkillLevel,
    timeConstraint?: number
  ): Promise<LearningStep[]> {
    try {
      // Determine the learning approach based on objective
      const approach = this.determineLearningApproach(intent);
      
      // Get base steps for the objective
      const baseSteps = this.getBaseSteps(intent, approach);
      
      // Adapt steps for user skill level
      const adaptedSteps = this.adaptStepsForSkillLevel(baseSteps, userLevel);
      
      // Add tool-specific steps
      const toolSteps = this.addToolSpecificSteps(adaptedSteps, intent.requiredTools);
      
      // Adjust for complexity
      const complexityAdjustedSteps = this.adjustForComplexity(toolSteps, intent.estimatedComplexity);
      
      // Apply time constraints if specified
      const timeAdjustedSteps = timeConstraint ? 
        this.adjustForTimeConstraint(complexityAdjustedSteps, timeConstraint) : 
        complexityAdjustedSteps;
      
      // Add validation criteria and finalize
      const finalSteps = this.finalizeSteps(timeAdjustedSteps, intent);
      
      return finalSteps;
    } catch (error) {
      throw new Error(`Learning path generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Determine the best learning approach based on the intent
   */
  private determineLearningApproach(intent: LearningIntent): 'project-based' | 'concept-first' | 'tool-focused' | 'problem-solving' {
    const { objective, extractedKeywords, estimatedComplexity } = intent;
    
    if (objective.toLowerCase().includes('build') || objective.toLowerCase().includes('create')) {
      return 'project-based';
    }
    
    if (objective.toLowerCase().includes('understand') || objective.toLowerCase().includes('learn')) {
      return estimatedComplexity === ComplexityLevel.HIGH ? 'concept-first' : 'project-based';
    }
    
    if (intent.requiredTools.length > 0 && extractedKeywords.some(k => 
      ['builder.io', 'firebase', 'lovable', 'bolt.new', 'replit'].includes(k))) {
      return 'tool-focused';
    }
    
    if (objective.toLowerCase().includes('fix') || objective.toLowerCase().includes('troubleshoot')) {
      return 'problem-solving';
    }
    
    return 'project-based'; // Default approach
  }

  /**
   * Get base learning steps based on intent and approach
   */
  private getBaseSteps(intent: LearningIntent, approach: string): Partial<LearningStep>[] {
    const steps: Partial<LearningStep>[] = [];
    
    switch (approach) {
      case 'project-based':
        steps.push(...this.getProjectBasedSteps(intent));
        break;
      case 'concept-first':
        steps.push(...this.getConceptFirstSteps(intent));
        break;
      case 'tool-focused':
        steps.push(...this.getToolFocusedSteps(intent));
        break;
      case 'problem-solving':
        steps.push(...this.getProblemSolvingSteps(intent));
        break;
    }
    
    return steps;
  }

  /**
   * Get project-based learning steps
   */
  private getProjectBasedSteps(intent: LearningIntent): Partial<LearningStep>[] {
    const projectType = this.extractProjectType(intent.objective);
    const baseTemplate = this.stepTemplates.get(projectType) || this.stepTemplates.get('default')!;
    
    return baseTemplate.map(template => ({
      ...template,
      prerequisites: intent.relatedConcepts.slice(0, 3),
      learningObjectives: this.generateLearningObjectives(intent, template.title || '')
    }));
  }

  /**
   * Get concept-first learning steps
   */
  private getConceptFirstSteps(intent: LearningIntent): Partial<LearningStep>[] {
    const steps: Partial<LearningStep>[] = [];
    
    // Start with foundational concepts
    steps.push({
      title: 'Understanding Core Concepts',
      description: `Learn the fundamental concepts behind ${intent.objective.toLowerCase()}`,
      explanation: 'We\'ll start by understanding the key concepts and terminology',
      estimatedDuration: 15,
      complexity: ComplexityLevel.LOW,
      prerequisites: [],
      learningObjectives: intent.relatedConcepts.slice(0, 5)
    });
    
    // Add practical application steps
    steps.push(...this.getProjectBasedSteps(intent).slice(1));
    
    return steps;
  }

  /**
   * Get tool-focused learning steps
   */
  private getToolFocusedSteps(intent: LearningIntent): Partial<LearningStep>[] {
    const steps: Partial<LearningStep>[] = [];
    
    intent.requiredTools.forEach(toolName => {
      const builderType = this.getBuilderTypeFromName(toolName);
      if (builderType) {
        const toolSteps = this.toolWorkflows.get(builderType) || [];
        steps.push(...toolSteps);
      }
    });
    
    return steps.length > 0 ? steps : this.getProjectBasedSteps(intent);
  }

  /**
   * Get problem-solving learning steps
   */
  private getProblemSolvingSteps(intent: LearningIntent): Partial<LearningStep>[] {
    return [
      {
        title: 'Problem Analysis',
        description: 'Analyze and understand the problem or issue',
        explanation: 'Let\'s break down the problem and identify the root cause',
        estimatedDuration: 10,
        complexity: ComplexityLevel.MEDIUM,
        prerequisites: [],
        learningObjectives: ['Problem identification', 'Root cause analysis']
      },
      {
        title: 'Solution Research',
        description: 'Research potential solutions and approaches',
        explanation: 'We\'ll explore different ways to solve this problem',
        estimatedDuration: 15,
        complexity: ComplexityLevel.MEDIUM,
        prerequisites: ['Problem Analysis'],
        learningObjectives: ['Solution evaluation', 'Best practices research']
      },
      {
        title: 'Implementation',
        description: 'Implement the chosen solution step by step',
        explanation: 'Now we\'ll apply the solution and test it',
        estimatedDuration: 30,
        complexity: ComplexityLevel.HIGH,
        prerequisites: ['Solution Research'],
        learningObjectives: ['Solution implementation', 'Testing and validation']
      }
    ];
  }

  /**
   * Adapt steps based on user skill level
   */
  private adaptStepsForSkillLevel(steps: Partial<LearningStep>[], skillLevel: SkillLevel): Partial<LearningStep>[] {
    return steps.map(step => {
      const adapted = { ...step };
      
      switch (skillLevel) {
        case SkillLevel.BEGINNER:
          adapted.estimatedDuration = (step.estimatedDuration || 20) * 1.5;
          adapted.explanation = `[Beginner-friendly] ${step.explanation || ''}`;
          adapted.prerequisites = []; // Remove prerequisites for beginners
          break;
          
        case SkillLevel.INTERMEDIATE:
          adapted.estimatedDuration = step.estimatedDuration || 20;
          adapted.explanation = step.explanation || '';
          break;
          
        case SkillLevel.ADVANCED:
          adapted.estimatedDuration = (step.estimatedDuration || 20) * 0.7;
          adapted.explanation = `[Advanced] ${step.explanation || ''}`;
          // Keep all prerequisites for advanced users
          break;
      }
      
      return adapted;
    });
  }

  /**
   * Add tool-specific steps to the learning path
   */
  private addToolSpecificSteps(steps: Partial<LearningStep>[], requiredTools: string[]): Partial<LearningStep>[] {
    const enhancedSteps = [...steps];
    
    requiredTools.forEach(toolName => {
      const builderType = this.getBuilderTypeFromName(toolName);
      if (builderType) {
        const toolWorkflow = this.toolWorkflows.get(builderType);
        if (toolWorkflow) {
          // Insert tool-specific steps at appropriate points
          const insertIndex = Math.floor(enhancedSteps.length / 2);
          enhancedSteps.splice(insertIndex, 0, ...toolWorkflow);
        }
      }
    });
    
    return enhancedSteps;
  }

  /**
   * Adjust steps based on complexity level
   */
  private adjustForComplexity(steps: Partial<LearningStep>[], complexity: ComplexityLevel): Partial<LearningStep>[] {
    const modifier = this.complexityModifiers.get(complexity)!;
    
    return steps.map(step => ({
      ...step,
      complexity,
      estimatedDuration: Math.round((step.estimatedDuration || 20) * modifier.stepMultiplier),
      description: `${step.description} (${modifier.detailLevel} detail)`,
      prerequisites: (step.prerequisites || []).slice(0, modifier.prerequisiteDepth)
    }));
  }

  /**
   * Adjust steps for time constraints
   */
  private adjustForTimeConstraint(steps: Partial<LearningStep>[], timeConstraintMinutes: number): Partial<LearningStep>[] {
    const totalEstimatedTime = steps.reduce((sum, step) => sum + (step.estimatedDuration || 20), 0);
    
    if (totalEstimatedTime <= timeConstraintMinutes) {
      return steps; // No adjustment needed
    }
    
    // Calculate compression ratio
    const compressionRatio = timeConstraintMinutes / totalEstimatedTime;
    
    // Prioritize steps and compress time
    return steps
      .map(step => ({
        ...step,
        estimatedDuration: Math.max(5, Math.round((step.estimatedDuration || 20) * compressionRatio))
      }))
      .slice(0, Math.ceil(steps.length * compressionRatio)); // Remove some steps if necessary
  }

  /**
   * Finalize steps with IDs, validation criteria, and browser actions
   */
  private finalizeSteps(steps: Partial<LearningStep>[], intent: LearningIntent): LearningStep[] {
    return steps.map((step, index) => ({
      id: uuidv4(),
      title: step.title || `Step ${index + 1}`,
      description: step.description || 'Learning step',
      toolRequired: intent.requiredTools[0] || 'browser',
      actions: this.generateBrowserActions(step, intent),
      explanation: step.explanation || 'This step will help you progress in your learning journey',
      expectedOutcome: this.generateExpectedOutcome(step, intent),
      validationCriteria: this.generateValidationCriteria(step),
      estimatedDuration: step.estimatedDuration || 20,
      complexity: step.complexity || intent.estimatedComplexity,
      prerequisites: step.prerequisites || [],
      learningObjectives: step.learningObjectives || []
    }));
  }

  /**
   * Generate browser actions for a step
   */
  private generateBrowserActions(step: Partial<LearningStep>, intent: LearningIntent): BrowserAction[] {
    const actions: BrowserAction[] = [];
    
    // Add navigation action if tool is required
    if (intent.requiredTools.length > 0) {
      actions.push({
        id: uuidv4(),
        type: BrowserActionType.NAVIGATE,
        target: { 
          type: SelectorType.CSS, 
          value: 'body', 
          description: `Navigate to ${intent.requiredTools[0]}` 
        },
        value: this.getToolUrl(intent.requiredTools[0]),
        explanation: `Opening ${intent.requiredTools[0]} to begin the learning activity`,
        reasoning: `We need to use ${intent.requiredTools[0]} for this step`,
        expectedResult: `${intent.requiredTools[0]} interface is loaded and ready`,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      });
    }
    
    // Add step-specific actions based on title/description
    const stepContent = `${step.title} ${step.description}`.toLowerCase();
    
    if (stepContent.includes('create') || stepContent.includes('new')) {
      actions.push({
        id: uuidv4(),
        type: BrowserActionType.CLICK,
        target: { 
          type: SelectorType.CSS, 
          value: '[data-testid="create-button"], .create-btn, button:contains("Create")', 
          description: 'Create button' 
        },
        explanation: 'Clicking the create button to start a new project',
        reasoning: 'We need to create a new project for this learning exercise',
        expectedResult: 'New project creation dialog or interface appears',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      });
    }
    
    if (stepContent.includes('design') || stepContent.includes('layout')) {
      actions.push({
        id: uuidv4(),
        type: BrowserActionType.CLICK,
        target: { 
          type: SelectorType.CSS, 
          value: '.design-panel, [data-testid="design-tab"]', 
          description: 'Design panel' 
        },
        explanation: 'Opening the design interface to work on layout',
        reasoning: 'Design tools are needed for this step',
        expectedResult: 'Design interface is visible with available tools',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      });
    }
    
    return actions;
  }

  /**
   * Generate expected outcome for a step
   */
  private generateExpectedOutcome(step: Partial<LearningStep>, intent: LearningIntent): string {
    const stepTitle = step.title?.toLowerCase() || '';
    
    if (stepTitle.includes('setup') || stepTitle.includes('initialize')) {
      return 'Development environment is properly configured and ready for use';
    }
    
    if (stepTitle.includes('create') || stepTitle.includes('build')) {
      return 'New project or component is successfully created and functional';
    }
    
    if (stepTitle.includes('design') || stepTitle.includes('style')) {
      return 'Visual design is implemented and matches the intended appearance';
    }
    
    if (stepTitle.includes('deploy') || stepTitle.includes('publish')) {
      return 'Project is successfully deployed and accessible online';
    }
    
    return `Step completed successfully with understanding of ${intent.relatedConcepts.slice(0, 2).join(' and ')}`;
  }

  /**
   * Generate validation criteria for a step
   */
  private generateValidationCriteria(step: Partial<LearningStep>): ValidationCriteria {
    const rules: ValidationRule[] = [];
    const stepTitle = step.title?.toLowerCase() || '';
    
    // Add common validation rules
    rules.push({
      id: uuidv4(),
      description: 'Step completion indicator is visible',
      validationType: 'visible',
      weight: 0.3
    });
    
    // Add step-specific validation rules
    if (stepTitle.includes('create') || stepTitle.includes('new')) {
      rules.push({
        id: uuidv4(),
        description: 'New item or project appears in interface',
        selector: '.project-item, .new-project, [data-testid="project"]',
        validationType: 'exists',
        weight: 0.7
      });
    }
    
    if (stepTitle.includes('design') || stepTitle.includes('style')) {
      rules.push({
        id: uuidv4(),
        description: 'Design changes are reflected in preview',
        selector: '.preview, .design-preview, iframe',
        validationType: 'visible',
        weight: 0.6
      });
    }
    
    if (stepTitle.includes('save') || stepTitle.includes('publish')) {
      rules.push({
        id: uuidv4(),
        description: 'Success message or confirmation appears',
        selector: '.success-message, .notification, [data-testid="success"]',
        validationType: 'contains',
        expectedValue: 'success',
        weight: 0.8
      });
    }
    
    return {
      type: 'functional',
      criteria: rules,
      successThreshold: 70 // 70% of criteria must pass
    };
  }

  /**
   * Generate learning objectives for a step
   */
  private generateLearningObjectives(intent: LearningIntent, stepTitle: string): string[] {
    const objectives: string[] = [];
    const title = stepTitle.toLowerCase();
    
    // Add step-specific objectives
    if (title.includes('setup') || title.includes('initialize')) {
      objectives.push('Understand project setup process', 'Configure development environment');
    }
    
    if (title.includes('create') || title.includes('build')) {
      objectives.push('Learn creation workflow', 'Understand project structure');
    }
    
    if (title.includes('design') || title.includes('style')) {
      objectives.push('Apply design principles', 'Use design tools effectively');
    }
    
    // Add related concepts as objectives
    objectives.push(...intent.relatedConcepts.slice(0, 2));
    
    return objectives.slice(0, 4); // Limit to 4 objectives per step
  }

  /**
   * Helper methods
   */
  private extractProjectType(objective: string): string {
    const lowerObjective = objective.toLowerCase();
    
    if (lowerObjective.includes('website')) return 'website';
    if (lowerObjective.includes('app')) return 'app';
    if (lowerObjective.includes('dashboard')) return 'dashboard';
    if (lowerObjective.includes('portfolio')) return 'portfolio';
    if (lowerObjective.includes('blog')) return 'blog';
    
    return 'default';
  }

  private getBuilderTypeFromName(toolName: string): BuilderType | null {
    const mapping: Record<string, BuilderType> = {
      'builder.io': BuilderType.BUILDER_IO,
      'builder': BuilderType.BUILDER_IO,
      'firebase': BuilderType.FIREBASE_STUDIO,
      'lovable': BuilderType.LOVABLE,
      'bolt.new': BuilderType.BOLT_NEW,
      'bolt': BuilderType.BOLT_NEW,
      'replit': BuilderType.REPLIT
    };
    
    return mapping[toolName.toLowerCase()] || null;
  }

  private getToolUrl(toolName: string): string {
    const urls: Record<string, string> = {
      'builder.io': 'https://builder.io',
      'firebase': 'https://console.firebase.google.com',
      'lovable': 'https://lovable.dev',
      'bolt.new': 'https://bolt.new',
      'replit': 'https://replit.com'
    };
    
    return urls[toolName.toLowerCase()] || 'https://example.com';
  }

  /**
   * Initialize step templates for different project types
   */
  private initializeStepTemplates(): void {
    this.stepTemplates = new Map([
      ['website', [
        {
          title: 'Project Setup',
          description: 'Initialize a new website project',
          estimatedDuration: 10,
          complexity: ComplexityLevel.LOW
        },
        {
          title: 'Design Layout',
          description: 'Create the basic layout and structure',
          estimatedDuration: 25,
          complexity: ComplexityLevel.MEDIUM
        },
        {
          title: 'Add Content',
          description: 'Add text, images, and other content',
          estimatedDuration: 20,
          complexity: ComplexityLevel.LOW
        },
        {
          title: 'Style and Polish',
          description: 'Apply styling and visual enhancements',
          estimatedDuration: 30,
          complexity: ComplexityLevel.MEDIUM
        },
        {
          title: 'Test and Deploy',
          description: 'Test functionality and deploy the website',
          estimatedDuration: 15,
          complexity: ComplexityLevel.MEDIUM
        }
      ]],
      ['app', [
        {
          title: 'App Initialization',
          description: 'Set up a new application project',
          estimatedDuration: 15,
          complexity: ComplexityLevel.MEDIUM
        },
        {
          title: 'Core Features',
          description: 'Implement main application features',
          estimatedDuration: 45,
          complexity: ComplexityLevel.HIGH
        },
        {
          title: 'User Interface',
          description: 'Design and implement the user interface',
          estimatedDuration: 35,
          complexity: ComplexityLevel.MEDIUM
        },
        {
          title: 'Testing and Refinement',
          description: 'Test the application and make improvements',
          estimatedDuration: 25,
          complexity: ComplexityLevel.MEDIUM
        }
      ]],
      ['default', [
        {
          title: 'Getting Started',
          description: 'Begin the learning journey',
          estimatedDuration: 10,
          complexity: ComplexityLevel.LOW
        },
        {
          title: 'Core Implementation',
          description: 'Build the main functionality',
          estimatedDuration: 30,
          complexity: ComplexityLevel.MEDIUM
        },
        {
          title: 'Enhancement and Polish',
          description: 'Add improvements and finishing touches',
          estimatedDuration: 20,
          complexity: ComplexityLevel.MEDIUM
        }
      ]]
    ]);
  }

  /**
   * Initialize tool-specific workflows
   */
  private initializeToolWorkflows(): void {
    this.toolWorkflows = new Map([
      [BuilderType.BUILDER_IO, [
        {
          title: 'Builder.io Setup',
          description: 'Set up Builder.io account and create first project',
          toolRequired: 'builder.io',
          estimatedDuration: 10
        },
        {
          title: 'Visual Editor Introduction',
          description: 'Learn to use the visual page builder',
          toolRequired: 'builder.io',
          estimatedDuration: 20
        }
      ]],
      [BuilderType.LOVABLE, [
        {
          title: 'Lovable Project Creation',
          description: 'Create a new project in Lovable',
          toolRequired: 'lovable',
          estimatedDuration: 8
        },
        {
          title: 'Component Building',
          description: 'Build components using Lovable\'s interface',
          toolRequired: 'lovable',
          estimatedDuration: 25
        }
      ]],
      [BuilderType.REPLIT, [
        {
          title: 'Replit Environment Setup',
          description: 'Set up coding environment in Replit',
          toolRequired: 'replit',
          estimatedDuration: 12
        },
        {
          title: 'Code Development',
          description: 'Write and test code in Replit',
          toolRequired: 'replit',
          estimatedDuration: 35
        }
      ]]
    ]);
  }

  /**
   * Generate alternative steps when the original approach fails
   */
  async generateAlternativeSteps(
    learningObjectives: string[],
    toolRequired: string,
    failureReason: string
  ): Promise<LearningStep[]> {
    // Create a mock intent for alternative generation
    const alternativeIntent: LearningIntent = {
      objective: `Alternative approach for: ${learningObjectives.join(', ')}`,
      extractedKeywords: learningObjectives,
      requiredTools: [toolRequired],
      estimatedComplexity: ComplexityLevel.MEDIUM,
      suggestedSkillLevel: SkillLevel.INTERMEDIATE,
      relatedConcepts: learningObjectives
    };

    // Generate alternative steps based on failure reason
    let alternativeSteps: Partial<LearningStep>[] = [];

    if (failureReason.toLowerCase().includes('element not found') || 
        failureReason.toLowerCase().includes('selector')) {
      // UI-related failure - try different interaction approach
      alternativeSteps = this.generateUIAlternativeSteps(alternativeIntent);
    } else if (failureReason.toLowerCase().includes('timeout') || 
               failureReason.toLowerCase().includes('network')) {
      // Network/timing failure - try simpler approach
      alternativeSteps = this.generateSimplifiedSteps(alternativeIntent);
    } else {
      // Generic failure - try different tool or approach
      alternativeSteps = this.generateGenericAlternativeSteps(alternativeIntent);
    }

    return this.finalizeSteps(alternativeSteps, alternativeIntent);
  }

  /**
   * Generate UI-focused alternative steps
   */
  private generateUIAlternativeSteps(intent: LearningIntent): Partial<LearningStep>[] {
    return [
      {
        title: 'Manual Navigation Alternative',
        description: 'Use alternative navigation method to reach the same goal',
        explanation: 'We\'ll try a different way to navigate the interface',
        estimatedDuration: 15,
        complexity: ComplexityLevel.MEDIUM,
        prerequisites: [],
        learningObjectives: intent.relatedConcepts.slice(0, 3)
      }
    ];
  }

  /**
   * Generate simplified alternative steps
   */
  private generateSimplifiedSteps(intent: LearningIntent): Partial<LearningStep>[] {
    return [
      {
        title: 'Simplified Approach',
        description: 'Use a simpler method to achieve the same learning objectives',
        explanation: 'Let\'s try a more straightforward approach',
        estimatedDuration: 10,
        complexity: ComplexityLevel.LOW,
        prerequisites: [],
        learningObjectives: intent.relatedConcepts.slice(0, 2)
      }
    ];
  }

  /**
   * Generate generic alternative steps
   */
  private generateGenericAlternativeSteps(intent: LearningIntent): Partial<LearningStep>[] {
    return [
      {
        title: 'Alternative Learning Path',
        description: 'Try a different approach to learn the same concepts',
        explanation: 'We\'ll explore an alternative way to achieve your learning goals',
        estimatedDuration: 20,
        complexity: ComplexityLevel.MEDIUM,
        prerequisites: [],
        learningObjectives: intent.relatedConcepts
      }
    ];
  }

  /**
   * Initialize complexity modifiers
   */
  private initializeComplexityModifiers(): void {
    this.complexityModifiers = new Map([
      [ComplexityLevel.LOW, {
        stepMultiplier: 0.8,
        detailLevel: 'basic',
        prerequisiteDepth: 1
      }],
      [ComplexityLevel.MEDIUM, {
        stepMultiplier: 1.0,
        detailLevel: 'moderate',
        prerequisiteDepth: 2
      }],
      [ComplexityLevel.HIGH, {
        stepMultiplier: 1.3,
        detailLevel: 'comprehensive',
        prerequisiteDepth: 3
      }]
    ]);
  }
}