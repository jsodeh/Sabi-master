import { Page } from 'playwright';
import { ActionRecord, ActionContext, ElementContext } from './ActionRecorder';
import {
  BrowserAction,
  BrowserActionType,
  ActionResult,
  Screenshot
} from '../types/browser';

export interface ExplanationContext {
  currentAction: BrowserAction;
  previousActions: BrowserAction[];
  userIntent: string;
  pageContext: PageContext;
  learningObjective: string;
}

export interface PageContext {
  url: string;
  title: string;
  domain: string;
  toolType: string;
  currentSection: string;
}

export interface ActionExplanation {
  id: string;
  action: BrowserAction;
  realTimeExplanation: string;
  detailedReasoning: string;
  learningPoints: string[];
  nextSteps: string[];
  visualContext: VisualContext;
  timestamp: Date;
}

export interface VisualContext {
  screenshot?: string;
  elementHighlight?: ElementHighlight;
  annotations: ScreenAnnotation[];
}

export interface ElementHighlight {
  selector: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: string;
  description: string;
}

export interface ScreenAnnotation {
  type: 'arrow' | 'circle' | 'text' | 'highlight';
  position: { x: number; y: number };
  content: string;
  color: string;
}

export interface IActionExplainer {
  explainAction(action: BrowserAction, context: ExplanationContext): Promise<ActionExplanation>;
  explainActionSequence(actions: BrowserAction[], userIntent: string): Promise<string>;
  generateRealTimeExplanation(action: BrowserAction, result: ActionResult): string;
  generateLearningPoints(action: BrowserAction, context: ExplanationContext): string[];
  captureVisualContext(action: BrowserAction): Promise<VisualContext>;
}

export class ActionExplainer implements IActionExplainer {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async explainAction(action: BrowserAction, context: ExplanationContext): Promise<ActionExplanation> {
    try {
      // Generate real-time explanation
      const realTimeExplanation = this.generateRealTimeExplanation(action, {
        actionId: action.id,
        success: true,
        elementFound: true,
        executionTime: 0,
        actualResult: action.expectedResult,
        adaptations: []
      });

      // Generate detailed reasoning
      const detailedReasoning = this.generateDetailedReasoning(action, context);

      // Generate learning points
      const learningPoints = this.generateLearningPoints(action, context);

      // Generate next steps
      const nextSteps = this.generateNextSteps(action, context);

      // Capture visual context
      const visualContext = await this.captureVisualContext(action);

      return {
        id: action.id,
        action,
        realTimeExplanation,
        detailedReasoning,
        learningPoints,
        nextSteps,
        visualContext,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Failed to explain action:', error);
      throw error;
    }
  }

  async explainActionSequence(actions: BrowserAction[], userIntent: string): Promise<string> {
    if (actions.length === 0) {
      return 'No actions to explain.';
    }

    const explanations: string[] = [];
    explanations.push(`To achieve "${userIntent}", we need to perform ${actions.length} actions:`);
    explanations.push('');

    actions.forEach((action, index) => {
      const stepNumber = index + 1;
      const explanation = this.generateSequenceStepExplanation(action, stepNumber, userIntent);
      explanations.push(`${stepNumber}. ${explanation}`);
    });

    explanations.push('');
    explanations.push(this.generateSequenceSummary(actions, userIntent));

    return explanations.join('\n');
  }

  generateRealTimeExplanation(action: BrowserAction, result: ActionResult): string {
    if (!result.success) {
      return `❌ Failed to ${action.type}: ${result.error?.message || 'Unknown error'}`;
    }

    const actionVerb = this.getActionVerb(action.type);
    const elementDescription = this.getElementDescription(action);
    const purpose = this.inferActionPurpose(action);

    return `✅ ${actionVerb} ${elementDescription} ${purpose}`;
  }

  generateLearningPoints(action: BrowserAction, context: ExplanationContext): string[] {
    const points: string[] = [];

    // Add action-specific learning points
    switch (action.type) {
      case BrowserActionType.CLICK:
        points.push('Clicking is the primary way to interact with buttons, links, and interactive elements');
        points.push('Always ensure the element is visible and clickable before attempting to click');
        if (context.pageContext.toolType) {
          points.push(`In ${context.pageContext.toolType}, clicking this element typically ${this.getToolSpecificClickBehavior(context.pageContext.toolType, action)}`);
        }
        break;

      case BrowserActionType.TYPE:
        points.push('Text input requires the field to be focused and editable');
        points.push('Clear existing content before typing new text to avoid conflicts');
        points.push('Validate input format matches field requirements (email, phone, etc.)');
        break;

      case BrowserActionType.NAVIGATE:
        points.push('Navigation changes the current page context and may reset form data');
        points.push('Wait for page load completion before interacting with new elements');
        points.push('Check for authentication requirements on the target page');
        break;

      case BrowserActionType.SCROLL:
        points.push('Scrolling ensures elements are visible in the viewport');
        points.push('Some elements only become interactive when scrolled into view');
        break;

      case BrowserActionType.HOVER:
        points.push('Hovering can reveal hidden menus, tooltips, or additional options');
        points.push('Some interfaces require hover before click for proper interaction');
        break;
    }

    // Add context-specific learning points
    if (context.learningObjective) {
      points.push(`This action contributes to: ${context.learningObjective}`);
    }

    // Add workflow learning points
    if (context.previousActions.length > 0) {
      points.push(`This is step ${context.previousActions.length + 1} in the workflow sequence`);
    }

    return points;
  }

  async captureVisualContext(action: BrowserAction): Promise<VisualContext> {
    try {
      // Capture screenshot
      const screenshot = await this.page.screenshot({ 
        fullPage: false,
        type: 'png'
      });

      // Try to get element bounds for highlighting
      let elementHighlight: ElementHighlight | undefined;
      try {
        const element = await this.findElement(action);
        if (element) {
          const bounds = await element.boundingBox();
          if (bounds) {
            elementHighlight = {
              selector: action.target.value,
              bounds,
              color: '#ff6b35',
              description: action.target.description
            };
          }
        }
      } catch (error) {
        // Element highlighting is optional
      }

      // Generate annotations based on action type
      const annotations = this.generateAnnotations(action, elementHighlight);

      return {
        screenshot: screenshot.toString('base64'),
        elementHighlight,
        annotations
      };
    } catch (error) {
      console.error('Failed to capture visual context:', error);
      return {
        annotations: []
      };
    }
  }

  private generateDetailedReasoning(action: BrowserAction, context: ExplanationContext): string {
    const reasoning: string[] = [];

    // Explain the action in context
    reasoning.push(`Action: ${this.getActionVerb(action.type)} ${action.target.description}`);
    reasoning.push(`Purpose: ${action.reasoning}`);
    reasoning.push('');

    // Explain why this action is necessary
    reasoning.push('Why this action is necessary:');
    reasoning.push(`• ${this.explainActionNecessity(action, context)}`);
    reasoning.push(`• This action moves us closer to: ${context.userIntent}`);
    
    if (context.previousActions.length > 0) {
      reasoning.push(`• Builds upon previous actions: ${this.summarizePreviousActions(context.previousActions)}`);
    }
    reasoning.push('');

    // Explain the expected outcome
    reasoning.push('Expected outcome:');
    reasoning.push(`• ${action.expectedResult}`);
    reasoning.push(`• This will enable the next step in the process`);
    reasoning.push('');

    // Add tool-specific context
    if (context.pageContext.toolType) {
      reasoning.push(`Tool-specific context (${context.pageContext.toolType}):`);
      reasoning.push(`• ${this.getToolSpecificContext(action, context.pageContext.toolType)}`);
    }

    return reasoning.join('\n');
  }

  private generateNextSteps(action: BrowserAction, context: ExplanationContext): string[] {
    const nextSteps: string[] = [];

    // Predict immediate next steps based on action type
    switch (action.type) {
      case BrowserActionType.CLICK:
        if (action.target.description.toLowerCase().includes('submit')) {
          nextSteps.push('Wait for form submission to complete');
          nextSteps.push('Check for success confirmation or error messages');
        } else if (action.target.description.toLowerCase().includes('create')) {
          nextSteps.push('Fill out the creation form with required information');
          nextSteps.push('Review and submit the new item');
        } else {
          nextSteps.push('Wait for the interface to respond to the click');
          nextSteps.push('Observe any changes in the page layout or content');
        }
        break;

      case BrowserActionType.TYPE:
        nextSteps.push('Verify the text was entered correctly');
        nextSteps.push('Move to the next input field or submit the form');
        break;

      case BrowserActionType.NAVIGATE:
        nextSteps.push('Wait for the new page to fully load');
        nextSteps.push('Identify key elements on the new page');
        nextSteps.push('Continue with the workflow on the new page');
        break;
    }

    // Add context-specific next steps
    if (context.learningObjective) {
      nextSteps.push(`Continue working toward: ${context.learningObjective}`);
    }

    return nextSteps;
  }

  private generateSequenceStepExplanation(action: BrowserAction, stepNumber: number, userIntent: string): string {
    const actionVerb = this.getActionVerb(action.type);
    const elementDesc = this.getElementDescription(action);
    const purpose = this.inferActionPurpose(action);

    return `${actionVerb} ${elementDesc} ${purpose}`;
  }

  private generateSequenceSummary(actions: BrowserAction[], userIntent: string): string {
    const actionTypes = actions.map(a => a.type);
    const uniqueTypes = [...new Set(actionTypes)];
    
    let summary = `This sequence involves ${uniqueTypes.join(', ')} actions `;
    summary += `to accomplish: ${userIntent}. `;
    summary += `Each step builds upon the previous one to create a complete workflow.`;

    return summary;
  }

  private async findElement(action: BrowserAction) {
    try {
      switch (action.target.type) {
        case 'css':
          return await this.page.locator(action.target.value).first();
        case 'xpath':
          return await this.page.locator(`xpath=${action.target.value}`).first();
        case 'text':
          return await this.page.getByText(action.target.value).first();
        case 'placeholder':
          return await this.page.getByPlaceholder(action.target.value).first();
        case 'aria-label':
          return await this.page.getByLabel(action.target.value).first();
        case 'data-testid':
          return await this.page.getByTestId(action.target.value).first();
        case 'id':
          return await this.page.locator(`#${action.target.value}`).first();
        case 'class':
          return await this.page.locator(`.${action.target.value}`).first();
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  private generateAnnotations(action: BrowserAction, elementHighlight?: ElementHighlight): ScreenAnnotation[] {
    const annotations: ScreenAnnotation[] = [];

    if (elementHighlight) {
      // Add arrow pointing to the element
      annotations.push({
        type: 'arrow',
        position: {
          x: elementHighlight.bounds.x + elementHighlight.bounds.width / 2,
          y: elementHighlight.bounds.y - 20
        },
        content: `${this.getActionVerb(action.type)} here`,
        color: '#ff6b35'
      });

      // Add text explanation near the element
      annotations.push({
        type: 'text',
        position: {
          x: elementHighlight.bounds.x,
          y: elementHighlight.bounds.y - 40
        },
        content: action.explanation,
        color: '#333333'
      });
    }

    return annotations;
  }

  private getActionVerb(actionType: BrowserActionType): string {
    const verbs = {
      [BrowserActionType.CLICK]: 'Click',
      [BrowserActionType.TYPE]: 'Type into',
      [BrowserActionType.NAVIGATE]: 'Navigate to',
      [BrowserActionType.SCROLL]: 'Scroll to',
      [BrowserActionType.HIGHLIGHT]: 'Highlight',
      [BrowserActionType.HOVER]: 'Hover over',
      [BrowserActionType.WAIT]: 'Wait',
      [BrowserActionType.SCREENSHOT]: 'Capture',
      [BrowserActionType.DRAG]: 'Drag',
      [BrowserActionType.SELECT]: 'Select'
    };

    return verbs[actionType] || 'Interact with';
  }

  private getElementDescription(action: BrowserAction): string {
    if (action.target.description) {
      return `the ${action.target.description}`;
    }
    
    return `element with ${action.target.type} "${action.target.value}"`;
  }

  private inferActionPurpose(action: BrowserAction): string {
    const explanation = action.explanation.toLowerCase();
    
    if (explanation.includes('submit') || explanation.includes('save')) {
      return 'to submit the form';
    }
    if (explanation.includes('create') || explanation.includes('add')) {
      return 'to create something new';
    }
    if (explanation.includes('login') || explanation.includes('sign in')) {
      return 'to authenticate';
    }
    if (explanation.includes('search')) {
      return 'to search for content';
    }
    
    return 'to proceed with the task';
  }

  private explainActionNecessity(action: BrowserAction, context: ExplanationContext): string {
    switch (action.type) {
      case BrowserActionType.CLICK:
        return 'User interaction is required to activate this interface element';
      case BrowserActionType.TYPE:
        return 'Information input is required to complete this form field';
      case BrowserActionType.NAVIGATE:
        return 'Page navigation is required to access the needed functionality';
      case BrowserActionType.SCROLL:
        return 'Element visibility is required for proper interaction';
      default:
        return 'This action is required to progress in the workflow';
    }
  }

  private summarizePreviousActions(actions: BrowserAction[]): string {
    if (actions.length === 0) return 'none';
    if (actions.length === 1) return `${actions[0].type} action`;
    
    const types = actions.map(a => a.type);
    const uniqueTypes = [...new Set(types)];
    return `${uniqueTypes.join(', ')} actions`;
  }

  private getToolSpecificContext(action: BrowserAction, toolType: string): string {
    const contexts = {
      'builder.io': 'Builder.io uses drag-and-drop interface with component-based design',
      'firebase': 'Firebase Console requires project selection before accessing services',
      'lovable': 'Lovable focuses on AI-assisted development with chat interface',
      'bolt.new': 'Bolt.new uses conversational AI to generate and modify code',
      'replit': 'Replit provides online IDE with real-time collaboration features'
    };

    return contexts[toolType as keyof typeof contexts] || `${toolType} has specific interface patterns`;
  }

  private getToolSpecificClickBehavior(toolType: string, action: BrowserAction): string {
    const behaviors = {
      'builder.io': 'opens component properties or triggers design actions',
      'firebase': 'navigates to service configuration or project settings',
      'lovable': 'initiates AI assistance or code generation',
      'bolt.new': 'sends prompts to AI or modifies generated code',
      'replit': 'opens files, runs code, or accesses collaboration features'
    };

    return behaviors[toolType as keyof typeof behaviors] || 'performs tool-specific actions';
  }
}