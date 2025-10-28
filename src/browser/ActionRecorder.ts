import { Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import {
  BrowserAction,
  BrowserActionType,
  ActionResult,
  Screenshot,
  ElementSelector,
  SelectorType
} from '../types/browser';

export interface ActionRecord {
  id: string;
  action: BrowserAction;
  result: ActionResult;
  timestamp: Date;
  context: ActionContext;
  explanation: string;
  reasoning: string;
}

export interface ActionContext {
  pageUrl: string;
  pageTitle: string;
  elementContext: ElementContext;
  userIntent: string;
  sessionId: string;
}

export interface ElementContext {
  elementType: string;
  elementText: string;
  elementAttributes: Record<string, string>;
  parentElements: string[];
  siblingElements: string[];
}

export interface IActionRecorder {
  startRecording(sessionId: string): void;
  stopRecording(): void;
  recordAction(action: BrowserAction, result: ActionResult, userIntent: string): Promise<ActionRecord>;
  getActionHistory(): ActionRecord[];
  getActionsBySession(sessionId: string): ActionRecord[];
  exportRecording(): string;
  clearHistory(): void;
}

export class ActionRecorder implements IActionRecorder {
  private page: Page;
  private isRecording: boolean = false;
  private currentSessionId: string | null = null;
  private actionHistory: ActionRecord[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  startRecording(sessionId: string): void {
    this.isRecording = true;
    this.currentSessionId = sessionId;
    console.log(`Action recording started for session: ${sessionId}`);
  }

  stopRecording(): void {
    this.isRecording = false;
    this.currentSessionId = null;
    console.log('Action recording stopped');
  }

  async recordAction(action: BrowserAction, result: ActionResult, userIntent: string): Promise<ActionRecord> {
    if (!this.isRecording || !this.currentSessionId) {
      throw new Error('Recording not started. Call startRecording() first.');
    }

    try {
      // Capture current page context
      const context = await this.captureActionContext(action, userIntent);
      
      // Generate explanation and reasoning
      const explanation = this.generateActionExplanation(action, result, context);
      const reasoning = this.generateActionReasoning(action, context, userIntent);

      // Create action record
      const record: ActionRecord = {
        id: uuidv4(),
        action,
        result,
        timestamp: new Date(),
        context,
        explanation,
        reasoning
      };

      // Store in history
      this.actionHistory.push(record);

      return record;
    } catch (error) {
      console.error('Failed to record action:', error);
      throw error;
    }
  }

  getActionHistory(): ActionRecord[] {
    return [...this.actionHistory];
  }

  getActionsBySession(sessionId: string): ActionRecord[] {
    return this.actionHistory.filter(record => record.context.sessionId === sessionId);
  }

  exportRecording(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalActions: this.actionHistory.length,
      sessions: this.groupActionsBySession(),
      actions: this.actionHistory
    };

    return JSON.stringify(exportData, null, 2);
  }

  clearHistory(): void {
    this.actionHistory = [];
  }

  private async captureActionContext(action: BrowserAction, userIntent: string): Promise<ActionContext> {
    try {
      const pageUrl = this.page.url();
      const pageTitle = await this.page.title();
      const elementContext = await this.captureElementContext(action.target);

      return {
        pageUrl,
        pageTitle,
        elementContext,
        userIntent,
        sessionId: this.currentSessionId!
      };
    } catch (error) {
      // Return minimal context if capture fails
      return {
        pageUrl: this.page.url(),
        pageTitle: 'Unknown',
        elementContext: {
          elementType: 'unknown',
          elementText: '',
          elementAttributes: {},
          parentElements: [],
          siblingElements: []
        },
        userIntent,
        sessionId: this.currentSessionId!
      };
    }
  }

  private async captureElementContext(selector: ElementSelector): Promise<ElementContext> {
    try {
      const element = await this.findElement(selector);
      
      if (!element) {
        return {
          elementType: 'not-found',
          elementText: '',
          elementAttributes: {},
          parentElements: [],
          siblingElements: []
        };
      }

      // Get element information
      const elementInfo = await element.evaluate((el) => {
        const getElementPath = (element: Element): string[] => {
          const path: string[] = [];
          let current = element.parentElement;
          let depth = 0;
          
          while (current && depth < 3) {
            const tag = current.tagName.toLowerCase();
            const id = current.id ? `#${current.id}` : '';
            const classes = current.className ? `.${current.className.split(' ').join('.')}` : '';
            path.push(`${tag}${id}${classes}`);
            current = current.parentElement;
            depth++;
          }
          
          return path;
        };

        const getSiblings = (element: Element): string[] => {
          if (!element.parentElement) return [];
          
          return Array.from(element.parentElement.children)
            .filter(child => child !== element)
            .slice(0, 5) // Limit to 5 siblings
            .map(sibling => {
              const tag = sibling.tagName.toLowerCase();
              const text = sibling.textContent?.trim().substring(0, 50) || '';
              return `${tag}: ${text}`;
            });
        };

        const attributes: Record<string, string> = {};
        for (let i = 0; i < el.attributes.length && i < 10; i++) {
          const attr = el.attributes[i];
          attributes[attr.name] = attr.value;
        }

        return {
          elementType: el.tagName.toLowerCase(),
          elementText: el.textContent?.trim().substring(0, 100) || '',
          elementAttributes: attributes,
          parentElements: getElementPath(el),
          siblingElements: getSiblings(el)
        };
      });

      return elementInfo;
    } catch (error) {
      return {
        elementType: 'error',
        elementText: '',
        elementAttributes: {},
        parentElements: [],
        siblingElements: []
      };
    }
  }

  private async findElement(selector: ElementSelector) {
    try {
      switch (selector.type) {
        case SelectorType.CSS:
          return await this.page.locator(selector.value).first();
        case SelectorType.XPATH:
          return await this.page.locator(`xpath=${selector.value}`).first();
        case SelectorType.TEXT:
          return await this.page.getByText(selector.value).first();
        case SelectorType.PLACEHOLDER:
          return await this.page.getByPlaceholder(selector.value).first();
        case SelectorType.ARIA_LABEL:
          return await this.page.getByLabel(selector.value).first();
        case SelectorType.DATA_TESTID:
          return await this.page.getByTestId(selector.value).first();
        case SelectorType.ID:
          return await this.page.locator(`#${selector.value}`).first();
        case SelectorType.CLASS:
          return await this.page.locator(`.${selector.value}`).first();
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  private generateActionExplanation(action: BrowserAction, result: ActionResult, context: ActionContext): string {
    const elementDesc = context.elementContext.elementText 
      ? `"${context.elementContext.elementText}"` 
      : action.target.description;

    if (!result.success) {
      return `Failed to ${action.type} on ${elementDesc}. ${result.error?.message || 'Unknown error occurred.'}`;
    }

    switch (action.type) {
      case BrowserActionType.CLICK:
        return `Clicked on ${elementDesc} to ${this.inferClickPurpose(context)}`;
      
      case BrowserActionType.TYPE:
        return `Entered "${action.value}" into ${elementDesc} to ${this.inferTypePurpose(context)}`;
      
      case BrowserActionType.NAVIGATE:
        return `Navigated to ${action.value} to ${this.inferNavigationPurpose(context)}`;
      
      case BrowserActionType.SCROLL:
        return `Scrolled to ${elementDesc} to bring it into view`;
      
      case BrowserActionType.HIGHLIGHT:
        return `Highlighted ${elementDesc} to draw attention to it`;
      
      case BrowserActionType.HOVER:
        return `Hovered over ${elementDesc} to ${this.inferHoverPurpose(context)}`;
      
      case BrowserActionType.WAIT:
        return `Waited ${action.value}ms for the page to load or update`;
      
      default:
        return `Performed ${action.type} action on ${elementDesc}`;
    }
  }

  private generateActionReasoning(action: BrowserAction, context: ActionContext, userIntent: string): string {
    const baseReasoning = `This action supports the user's intent: "${userIntent}".`;
    
    switch (action.type) {
      case BrowserActionType.CLICK:
        return `${baseReasoning} Clicking on ${action.target.description} is necessary to ${this.inferClickReasoning(context, action)}`;
      
      case BrowserActionType.TYPE:
        return `${baseReasoning} Entering "${action.value}" provides the required input for ${this.inferTypeReasoning(context, action)}`;
      
      case BrowserActionType.NAVIGATE:
        return `${baseReasoning} Navigation to ${action.value} is required to access the necessary functionality`;
      
      case BrowserActionType.SCROLL:
        return `${baseReasoning} Scrolling ensures the target element is visible and interactable`;
      
      case BrowserActionType.HIGHLIGHT:
        return `${baseReasoning} Highlighting helps the user understand which element is being referenced`;
      
      case BrowserActionType.HOVER:
        return `${baseReasoning} Hovering may reveal additional options or information needed for the task`;
      
      case BrowserActionType.WAIT:
        return `${baseReasoning} Waiting ensures the page has fully loaded before proceeding with the next action`;
      
      default:
        return `${baseReasoning} This action is part of the sequence needed to complete the task`;
    }
  }

  private inferClickPurpose(context: ActionContext): string {
    const elementType = context.elementContext.elementType;
    const elementText = context.elementContext.elementText.toLowerCase();
    
    if (elementType === 'button') {
      if (elementText.includes('submit') || elementText.includes('save')) return 'submit the form';
      if (elementText.includes('create') || elementText.includes('new')) return 'create something new';
      if (elementText.includes('delete') || elementText.includes('remove')) return 'remove an item';
      if (elementText.includes('edit') || elementText.includes('modify')) return 'edit content';
      return 'trigger an action';
    }
    
    if (elementType === 'a' || elementType === 'link') return 'navigate to another page';
    if (elementType === 'input' && context.elementContext.elementAttributes.type === 'checkbox') return 'toggle an option';
    if (elementType === 'select') return 'open selection options';
    
    return 'interact with the element';
  }

  private inferTypePurpose(context: ActionContext): string {
    const inputType = context.elementContext.elementAttributes.type;
    const placeholder = context.elementContext.elementAttributes.placeholder?.toLowerCase() || '';
    
    if (inputType === 'email' || placeholder.includes('email')) return 'provide email address';
    if (inputType === 'password' || placeholder.includes('password')) return 'enter password';
    if (placeholder.includes('search')) return 'search for content';
    if (placeholder.includes('name')) return 'provide name information';
    if (inputType === 'url') return 'enter a web address';
    
    return 'provide required information';
  }

  private inferNavigationPurpose(context: ActionContext): string {
    const url = context.pageUrl;
    if (url.includes('login') || url.includes('auth')) return 'access authentication';
    if (url.includes('dashboard') || url.includes('home')) return 'access main interface';
    if (url.includes('settings') || url.includes('config')) return 'modify settings';
    if (url.includes('create') || url.includes('new')) return 'create new content';
    
    return 'access required functionality';
  }

  private inferHoverPurpose(context: ActionContext): string {
    const elementType = context.elementContext.elementType;
    if (elementType === 'button') return 'see available options';
    if (elementType === 'a') return 'preview the destination';
    return 'reveal additional information';
  }

  private inferClickReasoning(context: ActionContext, action: BrowserAction): string {
    const elementType = context.elementContext.elementType;
    const elementText = context.elementContext.elementText.toLowerCase();
    
    if (elementType === 'button' && elementText.includes('submit')) {
      return 'submit the completed form and proceed to the next step';
    }
    if (elementType === 'button' && elementText.includes('create')) {
      return 'initiate the creation process for the new item';
    }
    
    return `activate the ${action.target.description} functionality`;
  }

  private inferTypeReasoning(context: ActionContext, action: BrowserAction): string {
    const inputType = context.elementContext.elementAttributes.type;
    
    if (inputType === 'email') {
      return 'user authentication and account identification';
    }
    if (inputType === 'password') {
      return 'secure access to the user account';
    }
    
    return `the ${action.target.description} field to complete the form`;
  }

  private groupActionsBySession(): Record<string, ActionRecord[]> {
    const sessions: Record<string, ActionRecord[]> = {};
    
    this.actionHistory.forEach(record => {
      const sessionId = record.context.sessionId;
      if (!sessions[sessionId]) {
        sessions[sessionId] = [];
      }
      sessions[sessionId].push(record);
    });
    
    return sessions;
  }
}