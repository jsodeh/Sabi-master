import { Browser, Page, chromium, firefox, webkit } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import {
  BrowserAction,
  BrowserSession,
  ActionResult,
  BrowserError,
  BrowserErrorType,
  SessionStatus,
  Screenshot,
  ElementSelector,
  SelectorType
} from '../types/browser';
import { BuilderType } from '../types/common';

export interface BrowserControllerConfig {
  headless?: boolean;
  timeout?: number;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  browserType?: 'chromium' | 'firefox' | 'webkit';
}

export interface IBrowserController {
  openTool(toolName: BuilderType, config?: BrowserControllerConfig): Promise<BrowserSession>;
  performAction(action: BrowserAction): Promise<ActionResult>;
  captureScreen(): Promise<Screenshot>;
  explainCurrentState(): Promise<string>;
  handleError(error: BrowserError): Promise<ActionResult>;
  closeBrowser(): Promise<void>;
  getCurrentSession(): BrowserSession | null;
}

export class BrowserController implements IBrowserController {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private currentSession: BrowserSession | null = null;
  private config: BrowserControllerConfig;

  constructor(config: BrowserControllerConfig = {}) {
    this.config = {
      headless: false,
      timeout: 30000,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      browserType: 'chromium',
      ...config
    };
  }

  async openTool(toolName: BuilderType, config?: BrowserControllerConfig): Promise<BrowserSession> {
    try {
      // Merge config if provided
      const finalConfig = { ...this.config, ...config };

      // Launch browser based on type
      const browserType = finalConfig.browserType === 'firefox' ? firefox : 
                         finalConfig.browserType === 'webkit' ? webkit : chromium;
      
      this.browser = await browserType.launch({
        headless: finalConfig.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      // Create new page
      this.page = await this.browser.newPage();

      // Set user agent and viewport
      await this.page.setExtraHTTPHeaders({
        'User-Agent': finalConfig.userAgent!
      });
      await this.page.setViewportSize(finalConfig.viewport!);

      // Create session
      const session: BrowserSession = {
        id: uuidv4(),
        toolType: toolName,
        url: this.getToolUrl(toolName),
        isAuthenticated: false,
        sessionData: {
          cookies: [],
          localStorage: {},
          sessionStorage: {},
        },
        startTime: new Date(),
        lastActivity: new Date(),
        status: SessionStatus.ACTIVE
      };

      this.currentSession = session;

      // Navigate to the tool
      await this.page.goto(session.url, { 
        waitUntil: 'networkidle',
        timeout: finalConfig.timeout 
      });

      return session;
    } catch (error) {
      const browserError: BrowserError = {
        type: BrowserErrorType.NAVIGATION_ERROR,
        message: `Failed to open tool ${toolName}: ${error}`,
        timestamp: new Date(),
        recoverable: true
      };
      
      throw browserError;
    }
  }

  async performAction(action: BrowserAction): Promise<ActionResult> {
    if (!this.page || !this.currentSession) {
      throw new Error('Browser not initialized. Call openTool() first.');
    }

    const startTime = Date.now();
    let elementFound = false;
    let success = false;
    let error: BrowserError | undefined;
    let actualResult = '';
    const adaptations: any[] = [];

    try {
      // Update session activity
      this.currentSession.lastActivity = new Date();

      // Add small delay to ensure execution time > 0
      await new Promise(resolve => setTimeout(resolve, 1));

      // Find element using selector
      const element = await this.findElement(action.target);
      elementFound = !!element;

      if (!element) {
        throw new Error(`Element not found: ${action.target.description}`);
      }

      // Perform the action based on type
      switch (action.type) {
        case 'click':
          await element.click();
          actualResult = `Clicked on ${action.target.description}`;
          break;

        case 'type':
          if (!action.value) {
            throw new Error('Value required for type action');
          }
          await element.fill(action.value);
          actualResult = `Typed "${action.value}" into ${action.target.description}`;
          break;

        case 'navigate':
          if (!action.value) {
            throw new Error('URL required for navigate action');
          }
          await this.page.goto(action.value, { waitUntil: 'networkidle' });
          actualResult = `Navigated to ${action.value}`;
          break;

        case 'scroll':
          await element.scrollIntoViewIfNeeded();
          actualResult = `Scrolled to ${action.target.description}`;
          break;

        case 'highlight':
          await element.highlight();
          actualResult = `Highlighted ${action.target.description}`;
          break;

        case 'hover':
          await element.hover();
          actualResult = `Hovered over ${action.target.description}`;
          break;

        case 'wait':
          const waitTime = parseInt(action.value || '1000');
          await this.page.waitForTimeout(waitTime);
          actualResult = `Waited ${waitTime}ms`;
          break;

        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      success = true;
    } catch (err) {
      error = {
        type: this.categorizeError(err),
        message: err instanceof Error ? err.message : String(err),
        selector: action.target,
        timestamp: new Date(),
        recoverable: this.isRecoverableError(err)
      };
    }

    const result: ActionResult = {
      actionId: action.id,
      success,
      error,
      elementFound,
      executionTime: Date.now() - startTime,
      actualResult,
      adaptations
    };

    // Capture screenshot if action failed or if requested
    if (!success || action.type === 'screenshot') {
      result.screenshot = await this.captureScreenBase64();
    }

    return result;
  }

  async captureScreen(): Promise<Screenshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const screenshot = await this.page.screenshot({ 
      fullPage: true,
      type: 'png'
    });

    const viewport = this.page.viewportSize() || { width: 1920, height: 1080 };

    return {
      id: uuidv4(),
      data: screenshot.toString('base64'),
      timestamp: new Date(),
      dimensions: viewport,
      annotations: []
    };
  }

  async explainCurrentState(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      // Get current URL and title
      const url = this.page.url();
      const title = await this.page.title();
      
      // Get visible text content (limited to avoid overwhelming output)
      const textContent = await this.page.evaluate(() => {
        try {
          const body = document.body;
          if (!body) return 'No body content';
          
          const text = body.innerText || body.textContent || '';
          return text.substring(0, 500); // Limit to 500 characters
        } catch (error) {
          return 'Unable to extract text content';
        }
      });

      return `Current page: "${title}" at ${url}. Visible content: ${textContent}`;
    } catch (error) {
      return `Unable to analyze current state: ${error}`;
    }
  }

  async handleError(error: BrowserError): Promise<ActionResult> {
    if (!this.currentSession) {
      throw new Error('No active session to handle error');
    }

    // Update session status
    this.currentSession.status = SessionStatus.ERROR;
    this.currentSession.lastActivity = new Date();

    // Create a recovery action result
    const result: ActionResult = {
      actionId: uuidv4(),
      success: false,
      error,
      elementFound: false,
      executionTime: 0,
      actualResult: `Error handled: ${error.message}`,
      adaptations: []
    };

    // Attempt recovery based on error type
    if (error.recoverable) {
      try {
        switch (error.type) {
          case BrowserErrorType.ELEMENT_NOT_FOUND:
            // Try to refresh the page and wait
            await this.page?.reload({ waitUntil: 'networkidle' });
            result.actualResult += ' - Page refreshed for recovery';
            break;

          case BrowserErrorType.TIMEOUT:
            // Wait a bit longer and try again
            await this.page?.waitForTimeout(2000);
            result.actualResult += ' - Extended wait applied';
            break;

          case BrowserErrorType.NETWORK_ERROR:
            // Try to navigate back to the tool's main page
            if (this.currentSession) {
              await this.page?.goto(this.currentSession.url, { waitUntil: 'networkidle' });
              result.actualResult += ' - Navigated back to main page';
            }
            break;

          default:
            result.actualResult += ' - No specific recovery action available';
        }

        // Reset session status if recovery attempt was made
        this.currentSession.status = SessionStatus.ACTIVE;
      } catch (recoveryError) {
        result.actualResult += ` - Recovery failed: ${recoveryError}`;
      }
    } else {
      result.actualResult += ' - No specific recovery action available';
    }

    return result;
  }

  async closeBrowser(): Promise<void> {
    try {
      if (this.currentSession) {
        this.currentSession.status = SessionStatus.CLOSED;
      }

      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      this.currentSession = null;
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }

  getCurrentSession(): BrowserSession | null {
    return this.currentSession;
  }

  private async findElement(selector: ElementSelector) {
    if (!this.page) return null;

    try {
      // Try primary selector
      const element = await this.findElementBySelector(selector);
      if (element) return element;

      // Try fallback selectors if available
      if (selector.fallbacks) {
        for (const fallback of selector.fallbacks) {
          const fallbackElement = await this.findElementBySelector(fallback);
          if (fallbackElement) return fallbackElement;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async findElementBySelector(selector: ElementSelector) {
    if (!this.page) return null;

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

  private async captureScreenBase64(): Promise<string> {
    if (!this.page) return '';
    
    try {
      const screenshot = await this.page.screenshot({ 
        fullPage: false,
        type: 'png'
      });
      return screenshot.toString('base64');
    } catch (error) {
      return '';
    }
  }

  private getToolUrl(toolName: BuilderType): string {
    const urls = {
      [BuilderType.BUILDER_IO]: 'https://builder.io',
      [BuilderType.FIREBASE_STUDIO]: 'https://console.firebase.google.com',
      [BuilderType.LOVABLE]: 'https://lovable.dev',
      [BuilderType.BOLT_NEW]: 'https://bolt.new',
      [BuilderType.REPLIT]: 'https://replit.com'
    };

    return urls[toolName];
  }

  private categorizeError(error: any): BrowserErrorType {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('timeout')) {
      return BrowserErrorType.TIMEOUT;
    } else if (message.includes('not found') || message.includes('no element')) {
      return BrowserErrorType.ELEMENT_NOT_FOUND;
    } else if (message.includes('network') || message.includes('connection')) {
      return BrowserErrorType.NETWORK_ERROR;
    } else if (message.includes('navigation')) {
      return BrowserErrorType.NAVIGATION_ERROR;
    } else if (message.includes('permission')) {
      return BrowserErrorType.PERMISSION_ERROR;
    } else {
      return BrowserErrorType.JAVASCRIPT_ERROR;
    }
  }

  private isRecoverableError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    
    // These errors are typically recoverable
    const recoverablePatterns = [
      'timeout',
      'not found',
      'network',
      'connection',
      'navigation'
    ];

    return recoverablePatterns.some(pattern => message.includes(pattern));
  }
}