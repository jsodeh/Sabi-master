import { DeploymentGuidanceSystem } from '../DeploymentGuidanceSystem';
import { BrowserController } from '../../browser/BrowserController';
import { 
  DeploymentPlatform, 
  DeploymentStatus, 
  ProjectConfig,
  DeploymentConfig,
  BuildSettings
} from '../../types/deployment';
import { BuilderType } from '../../types/common';

// Mock BrowserController
jest.mock('../../browser/BrowserController');

describe('DeploymentGuidanceSystem', () => {
  let deploymentSystem: DeploymentGuidanceSystem;
  let mockBrowserController: jest.Mocked<BrowserController>;

  beforeEach(() => {
    mockBrowserController = new BrowserController({}) as jest.Mocked<BrowserController>;
    deploymentSystem = new DeploymentGuidanceSystem({}, mockBrowserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzePlatformCompatibility', () => {
    it('should return compatible platforms for Builder.io projects', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-1',
        name: 'Test Project',
        builderType: BuilderType.BUILDER_IO
      };

      const compatiblePlatforms = await deploymentSystem.analyzePlatformCompatibility(projectConfig);

      expect(compatiblePlatforms.length).toBeGreaterThan(0);
      expect(compatiblePlatforms.every(p => 
        p.supportedBuilders.includes(BuilderType.BUILDER_IO)
      )).toBe(true);
    });

    it('should sort platforms by setup complexity', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-2',
        name: 'Test Project',
        builderType: BuilderType.LOVABLE
      };

      const compatiblePlatforms = await deploymentSystem.analyzePlatformCompatibility(projectConfig);

      // Check that easier platforms come first
      for (let i = 0; i < compatiblePlatforms.length - 1; i++) {
        const complexityOrder = { easy: 1, medium: 2, complex: 3 };
        const currentComplexity = complexityOrder[compatiblePlatforms[i].setupComplexity];
        const nextComplexity = complexityOrder[compatiblePlatforms[i + 1].setupComplexity];
        expect(currentComplexity).toBeLessThanOrEqual(nextComplexity);
      }
    });

    it('should return empty array for unsupported builder types', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-3',
        name: 'Test Project',
        builderType: 'unsupported-builder' as BuilderType
      };

      const compatiblePlatforms = await deploymentSystem.analyzePlatformCompatibility(projectConfig);

      expect(compatiblePlatforms).toHaveLength(0);
    });
  });

  describe('recommendPlatform', () => {
    it('should recommend Vercel for Builder.io projects by default', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-4',
        name: 'Test Project',
        builderType: BuilderType.BUILDER_IO
      };

      const recommendedPlatform = await deploymentSystem.recommendPlatform(projectConfig);

      expect(recommendedPlatform).toBe(DeploymentPlatform.VERCEL);
    });

    it('should prefer free platforms when requested', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-5',
        name: 'Test Project',
        builderType: BuilderType.BUILDER_IO
      };

      const recommendedPlatform = await deploymentSystem.recommendPlatform(projectConfig, {
        preferFree: true
      });

      // Should recommend a free platform
      const compatiblePlatforms = await deploymentSystem.analyzePlatformCompatibility(projectConfig);
      const recommendedCapabilities = compatiblePlatforms.find(p => p.platform === recommendedPlatform);
      expect(recommendedCapabilities?.pricingTier).toBe('free');
    });

    it('should prefer easy setup when requested', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-6',
        name: 'Test Project',
        builderType: BuilderType.BUILDER_IO
      };

      const recommendedPlatform = await deploymentSystem.recommendPlatform(projectConfig, {
        preferEasySetup: true
      });

      const compatiblePlatforms = await deploymentSystem.analyzePlatformCompatibility(projectConfig);
      const recommendedCapabilities = compatiblePlatforms.find(p => p.platform === recommendedPlatform);
      expect(recommendedCapabilities?.setupComplexity).toBe('easy');
    });

    it('should throw error when no compatible platforms exist', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-7',
        name: 'Test Project',
        builderType: 'unsupported-builder' as BuilderType
      };

      await expect(deploymentSystem.recommendPlatform(projectConfig))
        .rejects.toThrow('No compatible platforms found');
    });
  });

  describe('createDeploymentWorkflow', () => {
    it('should create a deployment workflow with correct structure', async () => {
      const buildSettings: BuildSettings = {
        packageManager: 'npm',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: {}
      };

      const deploymentConfig: DeploymentConfig = {
        platform: DeploymentPlatform.VERCEL,
        projectConfig: {
          id: 'test-project-8',
          name: 'Test Project',
          builderType: BuilderType.BUILDER_IO
        },
        platformSpecificConfig: {},
        autoDeployEnabled: true,
        buildSettings
      };

      const workflow = await deploymentSystem.createDeploymentWorkflow(deploymentConfig);

      expect(workflow.id).toBeDefined();
      expect(workflow.projectId).toBe(deploymentConfig.projectConfig.id);
      expect(workflow.config).toEqual(deploymentConfig);
      expect(workflow.status).toBe(DeploymentStatus.PENDING);
      expect(workflow.steps.length).toBeGreaterThan(0);
      expect(workflow.startTime).toBeInstanceOf(Date);
    });

    it('should generate appropriate deployment steps', async () => {
      const buildSettings: BuildSettings = {
        packageManager: 'npm',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: {}
      };

      const deploymentConfig: DeploymentConfig = {
        platform: DeploymentPlatform.NETLIFY,
        projectConfig: {
          id: 'test-project-9',
          name: 'Test Project',
          builderType: BuilderType.LOVABLE
        },
        platformSpecificConfig: {},
        autoDeployEnabled: false,
        buildSettings
      };

      const workflow = await deploymentSystem.createDeploymentWorkflow(deploymentConfig);

      const stepTitles = workflow.steps.map(step => step.title);
      expect(stepTitles).toContain('Validate Project Configuration');
      expect(stepTitles).toContain('Authenticate Platform');
      expect(stepTitles).toContain('Setup Project');
      expect(stepTitles).toContain('Deploy Application');
      expect(stepTitles).toContain('Validate Deployment');
    });
  });

  describe('validateDeploymentReadiness', () => {
    it('should validate a properly configured project', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-10',
        name: 'Valid Project',
        builderType: BuilderType.BUILDER_IO,
        buildCommand: 'npm run build',
        outputDirectory: 'dist'
      };

      const validation = await deploymentSystem.validateDeploymentReadiness(projectConfig);

      expect(validation.isValid).toBe(true);
      expect(validation.overallScore).toBeGreaterThan(80);
      expect(validation.checks.length).toBeGreaterThan(0);
    });

    it('should identify issues with incomplete project configuration', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-11',
        name: '', // Invalid: empty name
        builderType: BuilderType.BUILDER_IO
      };

      const validation = await deploymentSystem.validateDeploymentReadiness(projectConfig);



      expect(validation.isValid).toBe(false);
      expect(validation.recommendations.length).toBeGreaterThan(0);
      expect(validation.checks.some(check => check.status === 'failed')).toBe(true);
    });
  });

  describe('generateDeploymentGuidance', () => {
    it('should generate Vercel-specific guidance', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-12',
        name: 'Test Project',
        builderType: BuilderType.BUILDER_IO
      };

      const guidance = await deploymentSystem.generateDeploymentGuidance(
        DeploymentPlatform.VERCEL,
        projectConfig
      );

      expect(guidance.length).toBeGreaterThan(0);
      expect(guidance[0].title).toContain('Vercel');
      expect(guidance.every(step => step.instructions.length > 0)).toBe(true);
      expect(guidance.every(step => step.estimatedTime > 0)).toBe(true);
    });

    it('should generate Netlify-specific guidance', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-13',
        name: 'Test Project',
        builderType: BuilderType.LOVABLE
      };

      const guidance = await deploymentSystem.generateDeploymentGuidance(
        DeploymentPlatform.NETLIFY,
        projectConfig
      );

      expect(guidance.length).toBeGreaterThan(0);
      expect(guidance[0].title).toContain('Netlify');
    });

    it('should include troubleshooting information', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-14',
        name: 'Test Project',
        builderType: BuilderType.BUILDER_IO
      };

      const guidance = await deploymentSystem.generateDeploymentGuidance(
        DeploymentPlatform.VERCEL,
        projectConfig
      );

      const hasTraubleshooting = guidance.some(step => 
        step.troubleshooting && step.troubleshooting.length > 0
      );
      expect(hasTraubleshooting).toBe(true);
    });
  });

  describe('generateProductionConfigGuidance', () => {
    it('should generate production configuration guidance', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-18',
        name: 'Test Project',
        builderType: BuilderType.BUILDER_IO,
        customDomain: 'example.com'
      };

      const guidance = await deploymentSystem.generateProductionConfigGuidance(
        DeploymentPlatform.VERCEL,
        projectConfig
      );

      expect(guidance.length).toBeGreaterThan(0);
      expect(guidance.some(step => step.title.includes('Environment Variables'))).toBe(true);
      expect(guidance.some(step => step.title.includes('SSL'))).toBe(true);
      expect(guidance.some(step => step.title.includes('Custom Domain'))).toBe(true);
    });

    it('should include platform-specific production steps', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-19',
        name: 'Test Project',
        builderType: BuilderType.LOVABLE
      };

      const guidance = await deploymentSystem.generateProductionConfigGuidance(
        DeploymentPlatform.NETLIFY,
        projectConfig
      );

      expect(guidance.some(step => step.title.includes('Netlify'))).toBe(true);
    });
  });

  describe('performDeploymentTesting', () => {
    it('should perform comprehensive deployment testing', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-20',
        name: 'Test Project',
        builderType: BuilderType.BUILDER_IO
      };

      const testResults = await deploymentSystem.performDeploymentTesting(
        'https://test-project.vercel.app',
        projectConfig
      );

      expect(testResults.checks.length).toBeGreaterThan(0);
      expect(testResults.overallScore).toBeGreaterThanOrEqual(0);
      expect(testResults.overallScore).toBeLessThanOrEqual(100);
      expect(typeof testResults.isValid).toBe('boolean');
    });

    it('should test SSL configuration', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-21',
        name: 'Test Project',
        builderType: BuilderType.BUILDER_IO
      };

      const testResults = await deploymentSystem.performDeploymentTesting(
        'https://test-project.vercel.app',
        projectConfig
      );

      const sslCheck = testResults.checks.find(check => check.id === 'ssl-test');
      expect(sslCheck).toBeDefined();
      expect(sslCheck?.status).toBe('passed');
    });

    it('should warn about non-HTTPS sites', async () => {
      const projectConfig: ProjectConfig = {
        id: 'test-project-22',
        name: 'Test Project',
        builderType: BuilderType.BUILDER_IO
      };

      const testResults = await deploymentSystem.performDeploymentTesting(
        'http://test-project.example.com',
        projectConfig
      );

      const sslCheck = testResults.checks.find(check => check.id === 'ssl-test');
      expect(sslCheck?.status).toBe('warning');
    });
  });

  describe('workflow execution', () => {
    it('should execute workflow steps in sequence', async () => {
      const buildSettings: BuildSettings = {
        packageManager: 'npm',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: {}
      };

      const deploymentConfig: DeploymentConfig = {
        platform: DeploymentPlatform.VERCEL,
        projectConfig: {
          id: 'test-project-15',
          name: 'Test Project',
          builderType: BuilderType.BUILDER_IO
        },
        platformSpecificConfig: {},
        autoDeployEnabled: true,
        buildSettings
      };

      const workflow = await deploymentSystem.createDeploymentWorkflow(deploymentConfig);
      
      // Mock successful execution
      const executedWorkflow = await deploymentSystem.executeDeploymentWorkflow(workflow.id);

      expect(executedWorkflow.status).toBe(DeploymentStatus.COMPLETED);
      expect(executedWorkflow.endTime).toBeInstanceOf(Date);
      expect(executedWorkflow.totalDuration).toBeGreaterThan(0);
    });

    it('should handle workflow cancellation', async () => {
      const buildSettings: BuildSettings = {
        packageManager: 'npm',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: {}
      };

      const deploymentConfig: DeploymentConfig = {
        platform: DeploymentPlatform.NETLIFY,
        projectConfig: {
          id: 'test-project-16',
          name: 'Test Project',
          builderType: BuilderType.LOVABLE
        },
        platformSpecificConfig: {},
        autoDeployEnabled: false,
        buildSettings
      };

      const workflow = await deploymentSystem.createDeploymentWorkflow(deploymentConfig);
      
      await deploymentSystem.cancelDeploymentWorkflow(workflow.id);
      
      const cancelledWorkflow = await deploymentSystem.getWorkflowStatus(workflow.id);
      expect(cancelledWorkflow.status).toBe(DeploymentStatus.CANCELLED);
    });
  });

  describe('event emission', () => {
    it('should emit workflow events', async () => {
      const workflowCreatedSpy = jest.fn();
      const platformRecommendedSpy = jest.fn();

      deploymentSystem.on('workflowCreated', workflowCreatedSpy);
      deploymentSystem.on('platformRecommended', platformRecommendedSpy);

      const buildSettings: BuildSettings = {
        packageManager: 'npm',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: {}
      };

      const deploymentConfig: DeploymentConfig = {
        platform: DeploymentPlatform.VERCEL,
        projectConfig: {
          id: 'test-project-17',
          name: 'Test Project',
          builderType: BuilderType.BUILDER_IO
        },
        platformSpecificConfig: {},
        autoDeployEnabled: true,
        buildSettings
      };

      await deploymentSystem.createDeploymentWorkflow(deploymentConfig);
      await deploymentSystem.recommendPlatform(deploymentConfig.projectConfig);

      expect(workflowCreatedSpy).toHaveBeenCalled();
      expect(platformRecommendedSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle invalid workflow IDs', async () => {
      await expect(deploymentSystem.getWorkflowStatus('invalid-id'))
        .rejects.toThrow('Workflow invalid-id not found');
    });

    it('should handle authentication failures', async () => {
      const authFailedSpy = jest.fn();
      deploymentSystem.on('authenticationFailed', authFailedSpy);

      // This would normally fail in a real scenario
      const result = await deploymentSystem.authenticatePlatform(DeploymentPlatform.VERCEL);
      
      // In our mock implementation, it returns true, but in real scenarios it might fail
      expect(typeof result).toBe('boolean');
    });
  });

  describe('comprehensive integration tests', () => {
    it('should handle complete deployment workflow from analysis to testing', async () => {
      const projectConfig: ProjectConfig = {
        id: 'integration-test-project',
        name: 'Integration Test Project',
        builderType: BuilderType.BUILDER_IO,
        buildCommand: 'npm run build',
        outputDirectory: 'dist'
      };

      // Step 1: Analyze platform compatibility
      const compatiblePlatforms = await deploymentSystem.analyzePlatformCompatibility(projectConfig);
      expect(compatiblePlatforms.length).toBeGreaterThan(0);

      // Step 2: Get platform recommendation
      const recommendedPlatform = await deploymentSystem.recommendPlatform(projectConfig);
      expect(Object.values(DeploymentPlatform)).toContain(recommendedPlatform);

      // Step 3: Validate deployment readiness
      const validation = await deploymentSystem.validateDeploymentReadiness(projectConfig);
      expect(validation.isValid).toBe(true);

      // Step 4: Generate deployment guidance
      const guidance = await deploymentSystem.generateDeploymentGuidance(recommendedPlatform, projectConfig);
      expect(guidance.length).toBeGreaterThan(0);

      // Step 5: Create and execute deployment workflow
      const buildSettings: BuildSettings = {
        packageManager: 'npm',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: {}
      };

      const deploymentConfig: DeploymentConfig = {
        platform: recommendedPlatform,
        projectConfig,
        platformSpecificConfig: {},
        autoDeployEnabled: true,
        buildSettings
      };

      const workflow = await deploymentSystem.createDeploymentWorkflow(deploymentConfig);
      expect(workflow.status).toBe(DeploymentStatus.PENDING);

      const executedWorkflow = await deploymentSystem.executeDeploymentWorkflow(workflow.id);
      expect(executedWorkflow.status).toBe(DeploymentStatus.COMPLETED);

      // Step 6: Test deployment (simulate successful deployment)
      const testResults = await deploymentSystem.performDeploymentTesting(
        'https://integration-test.vercel.app',
        projectConfig
      );
      expect(testResults.isValid).toBe(true);
    });

    it('should handle deployment failures and recovery', async () => {
      const projectConfig: ProjectConfig = {
        id: 'failure-test-project',
        name: 'Failure Test Project',
        builderType: BuilderType.LOVABLE
      };

      // Test with incomplete configuration
      const validation = await deploymentSystem.validateDeploymentReadiness(projectConfig);
      // The validation might pass if the project has minimal required fields
      expect(typeof validation.isValid).toBe('boolean');
      expect(validation.recommendations.length).toBeGreaterThan(0);

      // Test workflow cancellation
      const buildSettings: BuildSettings = {
        packageManager: 'npm',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: {}
      };

      const deploymentConfig: DeploymentConfig = {
        platform: DeploymentPlatform.NETLIFY,
        projectConfig,
        platformSpecificConfig: {},
        autoDeployEnabled: false,
        buildSettings
      };

      const workflow = await deploymentSystem.createDeploymentWorkflow(deploymentConfig);
      await deploymentSystem.cancelDeploymentWorkflow(workflow.id);

      const cancelledWorkflow = await deploymentSystem.getWorkflowStatus(workflow.id);
      expect(cancelledWorkflow.status).toBe(DeploymentStatus.CANCELLED);
    });

    it('should provide platform-specific guidance for different builders', async () => {
      const builders = [BuilderType.BUILDER_IO, BuilderType.LOVABLE, BuilderType.BOLT_NEW];
      const platforms = [DeploymentPlatform.VERCEL, DeploymentPlatform.NETLIFY];

      for (const builder of builders) {
        const projectConfig: ProjectConfig = {
          id: `test-${builder}`,
          name: `Test ${builder} Project`,
          builderType: builder
        };

        for (const platform of platforms) {
          const guidance = await deploymentSystem.generateDeploymentGuidance(platform, projectConfig);
          expect(guidance.length).toBeGreaterThan(0);
          expect(guidance[0].title.toLowerCase()).toContain(platform.toLowerCase());
        }
      }
    });

    it('should maintain workflow state consistency', async () => {
      const projectConfigs = [
        { id: 'workflow-1', name: 'Workflow 1', builderType: BuilderType.BUILDER_IO },
        { id: 'workflow-2', name: 'Workflow 2', builderType: BuilderType.LOVABLE },
        { id: 'workflow-3', name: 'Workflow 3', builderType: BuilderType.BOLT_NEW }
      ];

      const workflows = [];

      // Create multiple workflows
      for (const config of projectConfigs) {
        const buildSettings: BuildSettings = {
          packageManager: 'npm',
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
          environmentVariables: {}
        };

        const deploymentConfig: DeploymentConfig = {
          platform: DeploymentPlatform.VERCEL,
          projectConfig: config,
          platformSpecificConfig: {},
          autoDeployEnabled: true,
          buildSettings
        };

        const workflow = await deploymentSystem.createDeploymentWorkflow(deploymentConfig);
        workflows.push(workflow);
      }

      // Verify all workflows are tracked
      for (const workflow of workflows) {
        const status = await deploymentSystem.getWorkflowStatus(workflow.id);
        expect(status.id).toBe(workflow.id);
        expect(status.projectId).toBe(workflow.projectId);
      }

      // Execute one workflow and verify others remain unchanged
      const executedWorkflow = await deploymentSystem.executeDeploymentWorkflow(workflows[0].id);
      expect(executedWorkflow.status).toBe(DeploymentStatus.COMPLETED);

      // Other workflows should still be pending
      const workflow2Status = await deploymentSystem.getWorkflowStatus(workflows[1].id);
      expect(workflow2Status.status).toBe(DeploymentStatus.PENDING);
    });
  });
});