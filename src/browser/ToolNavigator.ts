import { Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { BuilderType } from '../types/common';
import { 
  BrowserAction, 
  BrowserActionType, 
  SelectorType, 
  ActionResult,
  BrowserError,
  BrowserErrorType,
  ProjectInfo,
  ProjectStatus
} from '../types/browser';

export interface AuthCredentials {
  email?: string;
  password?: string;
  token?: string;
  provider?: 'google' | 'github' | 'email';
}

export interface ProjectConfig {
  name: string;
  type: string;
  template?: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface DeploymentResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  error?: string;
}

export interface IToolNavigator {
  navigateToBuilder(): Promise<void>;
  authenticateUser(credentials: AuthCredentials): Promise<boolean>;
  createNewProject(projectConfig: ProjectConfig): Promise<string>;
  deployProject(projectId: string): Promise<DeploymentResult>;
  getCurrentProject(): Promise<ProjectInfo | null>;
  handleToolSpecificError(error: BrowserError): Promise<ActionResult>;
}

export abstract class BaseToolNavigator implements IToolNavigator {
  protected page: Page;
  protected toolType: BuilderType;
  protected baseUrl: string;

  constructor(page: Page, toolType: BuilderType, baseUrl: string) {
    this.page = page;
    this.toolType = toolType;
    this.baseUrl = baseUrl;
  }

  async navigateToBuilder(): Promise<void> {
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });
    await this.waitForPageLoad();
  }

  abstract authenticateUser(credentials: AuthCredentials): Promise<boolean>;
  abstract createNewProject(projectConfig: ProjectConfig): Promise<string>;
  abstract deployProject(projectId: string): Promise<DeploymentResult>;
  abstract getCurrentProject(): Promise<ProjectInfo | null>;

  async handleToolSpecificError(error: BrowserError): Promise<ActionResult> {
    const result: ActionResult = {
      actionId: uuidv4(),
      success: false,
      error,
      elementFound: false,
      executionTime: 0,
      actualResult: `Tool-specific error handled for ${this.toolType}: ${error.message}`,
      adaptations: []
    };

    // Default error handling - can be overridden by specific implementations
    if (error.recoverable) {
      try {
        await this.page.reload({ waitUntil: 'networkidle' });
        result.actualResult += ' - Page reloaded for recovery';
      } catch (recoveryError) {
        result.actualResult += ` - Recovery failed: ${recoveryError}`;
      }
    }

    return result;
  }

  protected async waitForPageLoad(): Promise<void> {
    // Wait for common loading indicators to disappear
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch (error) {
      // Continue if timeout - page might still be usable
    }
  }

  protected async clickElement(selector: string, description: string): Promise<void> {
    const element = await this.page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout: 10000 });
    await element.click();
  }

  protected async typeInElement(selector: string, text: string, description: string): Promise<void> {
    const element = await this.page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout: 10000 });
    await element.fill(text);
  }

  protected async waitForElement(selector: string, timeout: number = 10000): Promise<boolean> {
    try {
      await this.page.locator(selector).first().waitFor({ state: 'visible', timeout });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export class BuilderIONavigator extends BaseToolNavigator {
  constructor(page: Page) {
    super(page, BuilderType.BUILDER_IO, 'https://builder.io');
  }

  async authenticateUser(credentials: AuthCredentials): Promise<boolean> {
    try {
      // Check if already authenticated
      if (await this.waitForElement('[data-testid="user-menu"]', 3000)) {
        return true;
      }

      // Look for login button
      if (await this.waitForElement('button:has-text("Sign in")', 3000)) {
        await this.clickElement('button:has-text("Sign in")', 'Sign in button');
      }

      // Handle different authentication methods
      if (credentials.provider === 'google') {
        await this.clickElement('button:has-text("Continue with Google")', 'Google auth button');
        // Note: Google OAuth flow would happen in popup - simplified for demo
        return true;
      } else if (credentials.provider === 'github') {
        await this.clickElement('button:has-text("Continue with GitHub")', 'GitHub auth button');
        return true;
      } else if (credentials.email && credentials.password) {
        await this.typeInElement('input[type="email"]', credentials.email, 'Email input');
        await this.typeInElement('input[type="password"]', credentials.password, 'Password input');
        await this.clickElement('button[type="submit"]', 'Submit button');
      }

      // Wait for authentication to complete
      await this.waitForElement('[data-testid="user-menu"]', 15000);
      return true;
    } catch (error) {
      console.error('Builder.io authentication failed:', error);
      return false;
    }
  }

  async createNewProject(projectConfig: ProjectConfig): Promise<string> {
    try {
      // Navigate to create new project
      await this.clickElement('button:has-text("New")', 'New project button');
      
      // Select project type if template specified
      if (projectConfig.template) {
        await this.clickElement(`[data-template="${projectConfig.template}"]`, `Template: ${projectConfig.template}`);
      }

      // Enter project name
      await this.typeInElement('input[placeholder*="name"]', projectConfig.name, 'Project name input');
      
      // Enter description if provided
      if (projectConfig.description) {
        await this.typeInElement('textarea[placeholder*="description"]', projectConfig.description, 'Project description');
      }

      // Create project
      await this.clickElement('button:has-text("Create")', 'Create project button');

      // Wait for project to be created and get project ID
      await this.waitForElement('[data-testid="project-dashboard"]', 15000);
      
      const projectId = await this.page.evaluate(() => {
        const url = window.location.href;
        const match = url.match(/\/projects\/([^\/]+)/);
        return match ? match[1] : '';
      });

      return projectId || uuidv4();
    } catch (error) {
      throw new Error(`Failed to create Builder.io project: ${error}`);
    }
  }

  async deployProject(projectId: string): Promise<DeploymentResult> {
    try {
      // Navigate to project if not already there
      if (!this.page.url().includes(projectId)) {
        await this.page.goto(`${this.baseUrl}/projects/${projectId}`, { waitUntil: 'networkidle' });
      }

      // Look for deploy button
      await this.clickElement('button:has-text("Deploy")', 'Deploy button');

      // Wait for deployment to complete
      await this.waitForElement('[data-testid="deployment-success"]', 30000);

      // Get deployment URL
      const deploymentUrl = await this.page.evaluate(() => {
        const urlElement = document.querySelector('[data-testid="deployment-url"]');
        return urlElement?.textContent || '';
      });

      return {
        success: true,
        url: deploymentUrl,
        deploymentId: uuidv4()
      };
    } catch (error) {
      return {
        success: false,
        error: `Builder.io deployment failed: ${error}`
      };
    }
  }

  async getCurrentProject(): Promise<ProjectInfo | null> {
    try {
      const url = this.page.url();
      const projectMatch = url.match(/\/projects\/([^\/]+)/);
      
      if (!projectMatch) return null;

      const projectId = projectMatch[1];
      const projectName = await this.page.evaluate(() => {
        const nameElement = document.querySelector('[data-testid="project-name"]');
        return nameElement?.textContent || 'Untitled Project';
      });

      return {
        id: projectId,
        name: projectName,
        type: 'builder.io',
        url: url,
        status: ProjectStatus.IN_PROGRESS,
        createdAt: new Date(),
        lastModified: new Date()
      };
    } catch (error) {
      return null;
    }
  }
}

export class FirebaseStudioNavigator extends BaseToolNavigator {
  constructor(page: Page) {
    super(page, BuilderType.FIREBASE_STUDIO, 'https://console.firebase.google.com');
  }

  async authenticateUser(credentials: AuthCredentials): Promise<boolean> {
    try {
      // Check if already authenticated
      if (await this.waitForElement('[data-testid="account-menu"]', 3000)) {
        return true;
      }

      // Firebase typically uses Google OAuth
      if (await this.waitForElement('button:has-text("Sign in")', 3000)) {
        await this.clickElement('button:has-text("Sign in")', 'Sign in button');
      }

      // Handle Google authentication
      if (credentials.email && credentials.password) {
        await this.typeInElement('input[type="email"]', credentials.email, 'Email input');
        await this.clickElement('button:has-text("Next")', 'Next button');
        await this.typeInElement('input[type="password"]', credentials.password, 'Password input');
        await this.clickElement('button:has-text("Next")', 'Next button');
      }

      // Wait for authentication to complete
      await this.waitForElement('[data-testid="account-menu"]', 15000);
      return true;
    } catch (error) {
      console.error('Firebase authentication failed:', error);
      return false;
    }
  }

  async createNewProject(projectConfig: ProjectConfig): Promise<string> {
    try {
      // Click create project button
      await this.clickElement('button:has-text("Create a project")', 'Create project button');
      
      // Enter project name
      await this.typeInElement('input[placeholder*="Project name"]', projectConfig.name, 'Project name input');
      
      // Continue through setup steps
      await this.clickElement('button:has-text("Continue")', 'Continue button');
      
      // Handle analytics setup (usually skip for demo)
      if (await this.waitForElement('button:has-text("Create project")', 5000)) {
        await this.clickElement('button:has-text("Create project")', 'Create project button');
      }

      // Wait for project creation
      await this.waitForElement('[data-testid="project-overview"]', 30000);

      const projectId = await this.page.evaluate(() => {
        const url = window.location.href;
        const match = url.match(/\/project\/([^\/]+)/);
        return match ? match[1] : '';
      });

      return projectId || uuidv4();
    } catch (error) {
      throw new Error(`Failed to create Firebase project: ${error}`);
    }
  }

  async deployProject(projectId: string): Promise<DeploymentResult> {
    try {
      // Navigate to hosting section
      await this.page.goto(`${this.baseUrl}/project/${projectId}/hosting`, { waitUntil: 'networkidle' });

      // Set up hosting if not already done
      if (await this.waitForElement('button:has-text("Get started")', 3000)) {
        await this.clickElement('button:has-text("Get started")', 'Get started button');
        // Follow hosting setup flow
        await this.clickElement('button:has-text("Next")', 'Next button');
        await this.clickElement('button:has-text("Done")', 'Done button');
      }

      // Deploy (this would typically be done via CLI, but simulating UI flow)
      await this.clickElement('button:has-text("Deploy")', 'Deploy button');

      return {
        success: true,
        url: `https://${projectId}.web.app`,
        deploymentId: uuidv4()
      };
    } catch (error) {
      return {
        success: false,
        error: `Firebase deployment failed: ${error}`
      };
    }
  }

  async getCurrentProject(): Promise<ProjectInfo | null> {
    try {
      const url = this.page.url();
      const projectMatch = url.match(/\/project\/([^\/]+)/);
      
      if (!projectMatch) return null;

      const projectId = projectMatch[1];
      const projectName = await this.page.evaluate(() => {
        const nameElement = document.querySelector('[data-testid="project-name"]');
        return nameElement?.textContent || projectId;
      });

      return {
        id: projectId,
        name: projectName,
        type: 'firebase',
        url: url,
        status: ProjectStatus.IN_PROGRESS,
        createdAt: new Date(),
        lastModified: new Date()
      };
    } catch (error) {
      return null;
    }
  }
}

export class LovableNavigator extends BaseToolNavigator {
  constructor(page: Page) {
    super(page, BuilderType.LOVABLE, 'https://lovable.dev');
  }

  async authenticateUser(credentials: AuthCredentials): Promise<boolean> {
    try {
      // Check if already authenticated
      if (await this.waitForElement('[data-testid="user-avatar"]', 3000)) {
        return true;
      }

      // Look for login options
      if (await this.waitForElement('button:has-text("Sign in")', 3000)) {
        await this.clickElement('button:has-text("Sign in")', 'Sign in button');
      }

      // Handle GitHub authentication (common for dev tools)
      if (credentials.provider === 'github') {
        await this.clickElement('button:has-text("Continue with GitHub")', 'GitHub auth button');
        return true;
      } else if (credentials.email && credentials.password) {
        await this.typeInElement('input[type="email"]', credentials.email, 'Email input');
        await this.typeInElement('input[type="password"]', credentials.password, 'Password input');
        await this.clickElement('button[type="submit"]', 'Submit button');
      }

      await this.waitForElement('[data-testid="user-avatar"]', 15000);
      return true;
    } catch (error) {
      console.error('Lovable authentication failed:', error);
      return false;
    }
  }

  async createNewProject(projectConfig: ProjectConfig): Promise<string> {
    try {
      // Create new project
      await this.clickElement('button:has-text("New Project")', 'New project button');
      
      // Enter project details
      await this.typeInElement('input[placeholder*="project name"]', projectConfig.name, 'Project name input');
      
      if (projectConfig.description) {
        await this.typeInElement('textarea[placeholder*="description"]', projectConfig.description, 'Project description');
      }

      // Select template if specified
      if (projectConfig.template) {
        await this.clickElement(`[data-template="${projectConfig.template}"]`, `Template: ${projectConfig.template}`);
      }

      // Create project
      await this.clickElement('button:has-text("Create Project")', 'Create project button');

      // Wait for project to load
      await this.waitForElement('[data-testid="project-editor"]', 15000);

      const projectId = await this.page.evaluate(() => {
        const url = window.location.href;
        const match = url.match(/\/projects\/([^\/]+)/);
        return match ? match[1] : '';
      });

      return projectId || uuidv4();
    } catch (error) {
      throw new Error(`Failed to create Lovable project: ${error}`);
    }
  }

  async deployProject(projectId: string): Promise<DeploymentResult> {
    try {
      // Look for deploy button in the editor
      await this.clickElement('button:has-text("Deploy")', 'Deploy button');

      // Wait for deployment process
      await this.waitForElement('[data-testid="deployment-status"]', 30000);

      const deploymentUrl = await this.page.evaluate(() => {
        const urlElement = document.querySelector('[data-testid="live-url"]');
        return urlElement?.textContent || '';
      });

      return {
        success: true,
        url: deploymentUrl,
        deploymentId: uuidv4()
      };
    } catch (error) {
      return {
        success: false,
        error: `Lovable deployment failed: ${error}`
      };
    }
  }

  async getCurrentProject(): Promise<ProjectInfo | null> {
    try {
      const url = this.page.url();
      const projectMatch = url.match(/\/projects\/([^\/]+)/);
      
      if (!projectMatch) return null;

      const projectId = projectMatch[1];
      const projectName = await this.page.evaluate(() => {
        const nameElement = document.querySelector('[data-testid="project-title"]');
        return nameElement?.textContent || 'Untitled Project';
      });

      return {
        id: projectId,
        name: projectName,
        type: 'lovable',
        url: url,
        status: ProjectStatus.IN_PROGRESS,
        createdAt: new Date(),
        lastModified: new Date()
      };
    } catch (error) {
      return null;
    }
  }
}

export class BoltNewNavigator extends BaseToolNavigator {
  constructor(page: Page) {
    super(page, BuilderType.BOLT_NEW, 'https://bolt.new');
  }

  async authenticateUser(credentials: AuthCredentials): Promise<boolean> {
    try {
      // Bolt.new might not require authentication for basic use
      // Check if we can access the main interface
      if (await this.waitForElement('[data-testid="chat-input"]', 5000)) {
        return true;
      }

      // If authentication is required
      if (await this.waitForElement('button:has-text("Sign in")', 3000)) {
        await this.clickElement('button:has-text("Sign in")', 'Sign in button');
        
        if (credentials.provider === 'github') {
          await this.clickElement('button:has-text("Continue with GitHub")', 'GitHub auth button');
        }
      }

      return true;
    } catch (error) {
      console.error('Bolt.new authentication failed:', error);
      return false;
    }
  }

  async createNewProject(projectConfig: ProjectConfig): Promise<string> {
    try {
      // Bolt.new uses chat interface to create projects
      const chatInput = 'textarea[placeholder*="Describe"], input[placeholder*="Describe"]';
      
      await this.typeInElement(
        chatInput, 
        `Create a ${projectConfig.type} project called "${projectConfig.name}". ${projectConfig.description || ''}`,
        'Chat input'
      );

      // Send the message
      await this.clickElement('button[type="submit"], button:has-text("Send")', 'Send button');

      // Wait for project to be generated
      await this.waitForElement('[data-testid="project-preview"]', 30000);

      // Generate a project ID based on the session
      const projectId = uuidv4();
      return projectId;
    } catch (error) {
      throw new Error(`Failed to create Bolt.new project: ${error}`);
    }
  }

  async deployProject(projectId: string): Promise<DeploymentResult> {
    try {
      // Look for deploy or share button
      if (await this.waitForElement('button:has-text("Deploy")', 3000)) {
        await this.clickElement('button:has-text("Deploy")', 'Deploy button');
      } else if (await this.waitForElement('button:has-text("Share")', 3000)) {
        await this.clickElement('button:has-text("Share")', 'Share button');
      }

      // Get the shared/deployed URL
      const deploymentUrl = await this.page.evaluate(() => {
        const urlElement = document.querySelector('[data-testid="share-url"], input[readonly]');
        return urlElement?.getAttribute('value') || urlElement?.textContent || '';
      });

      return {
        success: true,
        url: deploymentUrl,
        deploymentId: uuidv4()
      };
    } catch (error) {
      return {
        success: false,
        error: `Bolt.new deployment failed: ${error}`
      };
    }
  }

  async getCurrentProject(): Promise<ProjectInfo | null> {
    try {
      // Bolt.new projects are session-based
      const projectName = await this.page.evaluate(() => {
        const titleElement = document.querySelector('h1, [data-testid="project-title"]');
        return titleElement?.textContent || 'Bolt Project';
      });

      return {
        id: uuidv4(),
        name: projectName,
        type: 'bolt.new',
        url: this.page.url(),
        status: ProjectStatus.IN_PROGRESS,
        createdAt: new Date(),
        lastModified: new Date()
      };
    } catch (error) {
      return null;
    }
  }
}

export class ReplitNavigator extends BaseToolNavigator {
  constructor(page: Page) {
    super(page, BuilderType.REPLIT, 'https://replit.com');
  }

  async authenticateUser(credentials: AuthCredentials): Promise<boolean> {
    try {
      // Check if already authenticated
      if (await this.waitForElement('[data-testid="user-menu"]', 3000)) {
        return true;
      }

      // Look for login button
      if (await this.waitForElement('button:has-text("Log in")', 3000)) {
        await this.clickElement('button:has-text("Log in")', 'Log in button');
      }

      // Handle different authentication methods
      if (credentials.provider === 'github') {
        await this.clickElement('button:has-text("Continue with GitHub")', 'GitHub auth button');
      } else if (credentials.provider === 'google') {
        await this.clickElement('button:has-text("Continue with Google")', 'Google auth button');
      } else if (credentials.email && credentials.password) {
        await this.typeInElement('input[type="email"]', credentials.email, 'Email input');
        await this.typeInElement('input[type="password"]', credentials.password, 'Password input');
        await this.clickElement('button[type="submit"]', 'Submit button');
      }

      await this.waitForElement('[data-testid="user-menu"]', 15000);
      return true;
    } catch (error) {
      console.error('Replit authentication failed:', error);
      return false;
    }
  }

  async createNewProject(projectConfig: ProjectConfig): Promise<string> {
    try {
      // Create new repl
      await this.clickElement('button:has-text("Create Repl")', 'Create Repl button');
      
      // Select template/language
      if (projectConfig.template) {
        await this.clickElement(`[data-template="${projectConfig.template}"]`, `Template: ${projectConfig.template}`);
      } else {
        // Default to a common template
        await this.clickElement('[data-template="html-css-js"]', 'HTML/CSS/JS template');
      }

      // Enter repl name
      await this.typeInElement('input[placeholder*="name"]', projectConfig.name, 'Repl name input');
      
      // Create the repl
      await this.clickElement('button:has-text("Create Repl")', 'Create Repl button');

      // Wait for editor to load
      await this.waitForElement('[data-testid="repl-editor"]', 15000);

      const projectId = await this.page.evaluate(() => {
        const url = window.location.href;
        const match = url.match(/@[^\/]+\/([^\/]+)/);
        return match ? match[1] : '';
      });

      return projectId || uuidv4();
    } catch (error) {
      throw new Error(`Failed to create Replit project: ${error}`);
    }
  }

  async deployProject(projectId: string): Promise<DeploymentResult> {
    try {
      // Run the project first
      await this.clickElement('button:has-text("Run")', 'Run button');

      // Wait for the project to start
      await this.waitForElement('[data-testid="webview"]', 15000);

      // Get the preview URL
      const deploymentUrl = await this.page.evaluate(() => {
        const webview = document.querySelector('[data-testid="webview"]');
        return webview?.getAttribute('src') || '';
      });

      return {
        success: true,
        url: deploymentUrl,
        deploymentId: uuidv4()
      };
    } catch (error) {
      return {
        success: false,
        error: `Replit deployment failed: ${error}`
      };
    }
  }

  async getCurrentProject(): Promise<ProjectInfo | null> {
    try {
      const url = this.page.url();
      const projectMatch = url.match(/@[^\/]+\/([^\/]+)/);
      
      if (!projectMatch) return null;

      const projectId = projectMatch[1];
      const projectName = await this.page.evaluate(() => {
        const nameElement = document.querySelector('[data-testid="repl-name"]');
        return nameElement?.textContent || 'Untitled Repl';
      });

      return {
        id: projectId,
        name: projectName,
        type: 'replit',
        url: url,
        status: ProjectStatus.IN_PROGRESS,
        createdAt: new Date(),
        lastModified: new Date()
      };
    } catch (error) {
      return null;
    }
  }
}

// Factory function to create appropriate navigator
export function createToolNavigator(page: Page, toolType: BuilderType): IToolNavigator {
  switch (toolType) {
    case BuilderType.BUILDER_IO:
      return new BuilderIONavigator(page);
    case BuilderType.FIREBASE_STUDIO:
      return new FirebaseStudioNavigator(page);
    case BuilderType.LOVABLE:
      return new LovableNavigator(page);
    case BuilderType.BOLT_NEW:
      return new BoltNewNavigator(page);
    case BuilderType.REPLIT:
      return new ReplitNavigator(page);
    default:
      throw new Error(`Unsupported tool type: ${toolType}`);
  }
}