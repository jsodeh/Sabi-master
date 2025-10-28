import { Page } from 'playwright';
import { BuilderType } from '../../types/common';
import { BrowserErrorType, ProjectStatus } from '../../types/browser';
import {
  createToolNavigator,
  BuilderIONavigator,
  FirebaseStudioNavigator,
  LovableNavigator,
  BoltNewNavigator,
  ReplitNavigator,
  AuthCredentials,
  ProjectConfig
} from '../ToolNavigator';

// Mock Playwright Page
const createMockPage = (): jest.Mocked<Page> => ({
  goto: jest.fn().mockResolvedValue(undefined),
  locator: jest.fn().mockReturnValue({
    first: jest.fn().mockReturnValue({
      waitFor: jest.fn().mockResolvedValue(undefined),
      click: jest.fn().mockResolvedValue(undefined),
      fill: jest.fn().mockResolvedValue(undefined)
    })
  }),
  waitForLoadState: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn().mockResolvedValue(undefined),
  url: jest.fn().mockReturnValue('https://example.com'),
  evaluate: jest.fn().mockResolvedValue('mock-id-123')
} as any);

describe('ToolNavigator', () => {
  let mockPage: jest.Mocked<Page>;

  beforeEach(() => {
    mockPage = createMockPage();
  });

  describe('createToolNavigator', () => {
    it('should create BuilderIONavigator for BUILDER_IO type', () => {
      const navigator = createToolNavigator(mockPage, BuilderType.BUILDER_IO);
      expect(navigator).toBeInstanceOf(BuilderIONavigator);
    });

    it('should create FirebaseStudioNavigator for FIREBASE_STUDIO type', () => {
      const navigator = createToolNavigator(mockPage, BuilderType.FIREBASE_STUDIO);
      expect(navigator).toBeInstanceOf(FirebaseStudioNavigator);
    });

    it('should create LovableNavigator for LOVABLE type', () => {
      const navigator = createToolNavigator(mockPage, BuilderType.LOVABLE);
      expect(navigator).toBeInstanceOf(LovableNavigator);
    });

    it('should create BoltNewNavigator for BOLT_NEW type', () => {
      const navigator = createToolNavigator(mockPage, BuilderType.BOLT_NEW);
      expect(navigator).toBeInstanceOf(BoltNewNavigator);
    });

    it('should create ReplitNavigator for REPLIT type', () => {
      const navigator = createToolNavigator(mockPage, BuilderType.REPLIT);
      expect(navigator).toBeInstanceOf(ReplitNavigator);
    });

    it('should throw error for unsupported tool type', () => {
      expect(() => createToolNavigator(mockPage, 'unsupported' as BuilderType))
        .toThrow('Unsupported tool type: unsupported');
    });
  });

  describe('BuilderIONavigator', () => {
    let navigator: BuilderIONavigator;

    beforeEach(() => {
      navigator = new BuilderIONavigator(mockPage);
    });

    describe('navigateToBuilder', () => {
      it('should navigate to Builder.io URL', async () => {
        await navigator.navigateToBuilder();
        expect(mockPage.goto).toHaveBeenCalledWith('https://builder.io', { waitUntil: 'networkidle' });
      });
    });

    describe('authenticateUser', () => {
      it('should return true if already authenticated', async () => {
        // Mock user menu element exists
        mockPage.locator.mockReturnValue({
          first: jest.fn().mockReturnValue({
            waitFor: jest.fn().mockResolvedValue(undefined)
          })
        } as any);

        const credentials: AuthCredentials = { email: 'test@example.com', password: 'password' };
        const result = await navigator.authenticateUser(credentials);
        expect(result).toBe(true);
      });

      it('should handle email/password authentication', async () => {
        // Mock authentication flow
        let callCount = 0;
        mockPage.locator.mockImplementation((selector) => {
          callCount++;
          if (callCount === 1) {
            // First call - user menu not found
            throw new Error('Element not found');
          }
          return {
            first: jest.fn().mockReturnValue({
              waitFor: jest.fn().mockResolvedValue(undefined),
              click: jest.fn().mockResolvedValue(undefined),
              fill: jest.fn().mockResolvedValue(undefined)
            })
          } as any;
        });

        const credentials: AuthCredentials = { 
          email: 'test@example.com', 
          password: 'password' 
        };
        
        const result = await navigator.authenticateUser(credentials);
        expect(result).toBe(true);
      });

      it('should handle Google authentication', async () => {
        let callCount = 0;
        mockPage.locator.mockImplementation((selector) => {
          callCount++;
          if (callCount === 1) {
            throw new Error('Element not found');
          }
          return {
            first: jest.fn().mockReturnValue({
              waitFor: jest.fn().mockResolvedValue(undefined),
              click: jest.fn().mockResolvedValue(undefined)
            })
          } as any;
        });

        const credentials: AuthCredentials = { provider: 'google' };
        const result = await navigator.authenticateUser(credentials);
        expect(result).toBe(true);
      });
    });

    describe('createNewProject', () => {
      it('should create a new project successfully', async () => {
        mockPage.evaluate.mockResolvedValue('project-123');
        
        const projectConfig: ProjectConfig = {
          name: 'Test Project',
          type: 'website',
          description: 'A test project'
        };

        const projectId = await navigator.createNewProject(projectConfig);
        expect(projectId).toBe('project-123');
      });

      it('should handle project creation with template', async () => {
        mockPage.evaluate.mockResolvedValue('project-456');
        
        const projectConfig: ProjectConfig = {
          name: 'Template Project',
          type: 'website',
          template: 'ecommerce'
        };

        const projectId = await navigator.createNewProject(projectConfig);
        expect(projectId).toBe('project-456');
      });
    });

    describe('deployProject', () => {
      it('should deploy project successfully', async () => {
        mockPage.url.mockReturnValue('https://builder.io/projects/test-project');
        mockPage.evaluate.mockResolvedValue('https://test-project.builder.io');

        const result = await navigator.deployProject('test-project');
        
        expect(result.success).toBe(true);
        expect(result.url).toBe('https://test-project.builder.io');
        expect(result.deploymentId).toBeDefined();
      });

      it('should handle deployment failure', async () => {
        mockPage.locator.mockImplementation(() => {
          throw new Error('Deploy button not found');
        });

        const result = await navigator.deployProject('test-project');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Builder.io deployment failed');
      });
    });

    describe('getCurrentProject', () => {
      it('should return current project info', async () => {
        mockPage.url.mockReturnValue('https://builder.io/projects/current-project');
        mockPage.evaluate.mockResolvedValue('My Current Project');

        const project = await navigator.getCurrentProject();
        
        expect(project).toBeDefined();
        expect(project?.id).toBe('current-project');
        expect(project?.name).toBe('My Current Project');
        expect(project?.type).toBe('builder.io');
        expect(project?.status).toBe(ProjectStatus.IN_PROGRESS);
      });

      it('should return null if not in a project', async () => {
        mockPage.url.mockReturnValue('https://builder.io/dashboard');

        const project = await navigator.getCurrentProject();
        expect(project).toBeNull();
      });
    });
  });

  describe('FirebaseStudioNavigator', () => {
    let navigator: FirebaseStudioNavigator;

    beforeEach(() => {
      navigator = new FirebaseStudioNavigator(mockPage);
    });

    describe('navigateToBuilder', () => {
      it('should navigate to Firebase Console URL', async () => {
        await navigator.navigateToBuilder();
        expect(mockPage.goto).toHaveBeenCalledWith('https://console.firebase.google.com', { waitUntil: 'networkidle' });
      });
    });

    describe('createNewProject', () => {
      it('should create a new Firebase project', async () => {
        mockPage.evaluate.mockResolvedValue('firebase-project-123');
        
        const projectConfig: ProjectConfig = {
          name: 'Firebase Test Project',
          type: 'web'
        };

        const projectId = await navigator.createNewProject(projectConfig);
        expect(projectId).toBe('firebase-project-123');
      });
    });

    describe('deployProject', () => {
      it('should deploy to Firebase Hosting', async () => {
        const result = await navigator.deployProject('firebase-project');
        
        expect(result.success).toBe(true);
        expect(result.url).toBe('https://firebase-project.web.app');
      });
    });
  });

  describe('LovableNavigator', () => {
    let navigator: LovableNavigator;

    beforeEach(() => {
      navigator = new LovableNavigator(mockPage);
    });

    describe('navigateToBuilder', () => {
      it('should navigate to Lovable URL', async () => {
        await navigator.navigateToBuilder();
        expect(mockPage.goto).toHaveBeenCalledWith('https://lovable.dev', { waitUntil: 'networkidle' });
      });
    });

    describe('authenticateUser', () => {
      it('should handle GitHub authentication', async () => {
        let callCount = 0;
        mockPage.locator.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            throw new Error('Element not found');
          }
          return {
            first: jest.fn().mockReturnValue({
              waitFor: jest.fn().mockResolvedValue(undefined),
              click: jest.fn().mockResolvedValue(undefined)
            })
          } as any;
        });

        const credentials: AuthCredentials = { provider: 'github' };
        const result = await navigator.authenticateUser(credentials);
        expect(result).toBe(true);
      });
    });
  });

  describe('BoltNewNavigator', () => {
    let navigator: BoltNewNavigator;

    beforeEach(() => {
      navigator = new BoltNewNavigator(mockPage);
    });

    describe('navigateToBuilder', () => {
      it('should navigate to Bolt.new URL', async () => {
        await navigator.navigateToBuilder();
        expect(mockPage.goto).toHaveBeenCalledWith('https://bolt.new', { waitUntil: 'networkidle' });
      });
    });

    describe('createNewProject', () => {
      it('should create project via chat interface', async () => {
        const projectConfig: ProjectConfig = {
          name: 'Chat Project',
          type: 'react',
          description: 'A project created via chat'
        };

        const projectId = await navigator.createNewProject(projectConfig);
        expect(projectId).toBeDefined();
        expect(typeof projectId).toBe('string');
      });
    });
  });

  describe('ReplitNavigator', () => {
    let navigator: ReplitNavigator;

    beforeEach(() => {
      navigator = new ReplitNavigator(mockPage);
    });

    describe('navigateToBuilder', () => {
      it('should navigate to Replit URL', async () => {
        await navigator.navigateToBuilder();
        expect(mockPage.goto).toHaveBeenCalledWith('https://replit.com', { waitUntil: 'networkidle' });
      });
    });

    describe('createNewProject', () => {
      it('should create a new repl', async () => {
        mockPage.evaluate.mockResolvedValue('my-repl');
        
        const projectConfig: ProjectConfig = {
          name: 'My Repl',
          type: 'javascript',
          template: 'html-css-js'
        };

        const projectId = await navigator.createNewProject(projectConfig);
        expect(projectId).toBe('my-repl');
      });
    });

    describe('deployProject', () => {
      it('should run and get preview URL', async () => {
        mockPage.evaluate.mockResolvedValue('https://my-repl.username.repl.co');

        const result = await navigator.deployProject('my-repl');
        
        expect(result.success).toBe(true);
        expect(result.url).toBe('https://my-repl.username.repl.co');
      });
    });

    describe('getCurrentProject', () => {
      it('should return current repl info', async () => {
        mockPage.url.mockReturnValue('https://replit.com/@username/my-repl');
        mockPage.evaluate.mockResolvedValue('My Repl');

        const project = await navigator.getCurrentProject();
        
        expect(project).toBeDefined();
        expect(project?.id).toBe('my-repl');
        expect(project?.name).toBe('My Repl');
        expect(project?.type).toBe('replit');
      });
    });
  });

  describe('BaseToolNavigator', () => {
    let navigator: BuilderIONavigator;

    beforeEach(() => {
      navigator = new BuilderIONavigator(mockPage);
    });

    describe('handleToolSpecificError', () => {
      it('should handle recoverable errors', async () => {
        const error = {
          type: BrowserErrorType.NETWORK_ERROR,
          message: 'Network error',
          timestamp: new Date(),
          recoverable: true
        };

        const result = await navigator.handleToolSpecificError(error);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe(error);
        expect(result.actualResult).toContain('Tool-specific error handled');
        expect(result.actualResult).toContain('Page reloaded for recovery');
      });

      it('should handle non-recoverable errors', async () => {
        const error = {
          type: BrowserErrorType.PERMISSION_ERROR,
          message: 'Permission denied',
          timestamp: new Date(),
          recoverable: false
        };

        const result = await navigator.handleToolSpecificError(error);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe(error);
        expect(result.actualResult).toContain('Tool-specific error handled');
        expect(result.actualResult).not.toContain('Page reloaded');
      });
    });
  });
});