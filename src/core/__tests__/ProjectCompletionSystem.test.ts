import { ProjectCompletionSystem } from '../ProjectCompletionSystem';
import { 
  ProjectConfig,
} from '../../types/deployment';
import { 
  CompletionMetrics,
  SkillAssessment,
  PortfolioProject,
  NextStepsRecommendation
} from '../../types/learning';
import { BuilderType } from '../../types/common';
import { UserProfile, AdaptationType } from '../../types/user';
import { SkillLevel, LearningStyle } from '../../types/common';

describe('ProjectCompletionSystem', () => {
  let completionSystem: ProjectCompletionSystem;
  let mockUserProfile: UserProfile;
  let mockProjectConfig: ProjectConfig;
  let mockCompletionMetrics: CompletionMetrics;

  beforeEach(() => {
    completionSystem = new ProjectCompletionSystem();
    
    mockUserProfile = {
      id: 'user-123',
      learningStyle: LearningStyle.VISUAL,
      skillLevel: SkillLevel.INTERMEDIATE,
      completedProjects: [],
      preferences: {
        explanationDetail: 'moderate',
        learningPace: 'normal',
        preferredInputMethod: 'text',
        enableVoiceGuidance: false,
        showCueCards: true,
        autoAdvance: false,
        theme: 'light',
        fontSize: 'medium',
        notifications: {
          stepCompletion: true,
          errorAlerts: true,
          progressMilestones: true,
          sessionReminders: false,
          soundEnabled: true,
          vibrationEnabled: false
        },
        accessibility: {
          highContrast: false,
          screenReader: false,
          keyboardNavigation: true,
          reducedMotion: false,
          largeClickTargets: false,
          voiceCommands: false
        }
      },
      progressHistory: [],
      adaptationData: {
        userId: 'user-123',
        adaptationHistory: [],
        currentAdaptations: [],
        adaptationEffectiveness: {
          overallScore: 0.85,
          byType: {
            [AdaptationType.DIFFICULTY]: 0.8,
            [AdaptationType.PACE]: 0.9,
            [AdaptationType.EXPLANATION_DETAIL]: 0.85,
            [AdaptationType.INPUT_METHOD]: 0.7,
            [AdaptationType.TOOL_SELECTION]: 0.8,
            [AdaptationType.INTERFACE_LAYOUT]: 0.75
          },
          successRate: 0.9,
          userSatisfaction: 4,
          learningImprovement: 0.8
        },
        personalizedSettings: {
          optimalLearningTime: {
            preferredDuration: 60,
            optimalStartTime: '09:00',
            breakFrequency: 15,
            peakPerformanceHours: ['09:00', '14:00']
          },
          preferredComplexityProgression: {
            startingLevel: 0.3,
            progressionRate: 0.5,
            adaptationSensitivity: 0.7,
            fallbackThreshold: 0.4
          },
          effectiveMotivationTechniques: ['progress_tracking', 'achievements'],
          adaptiveThresholds: {
            errorRateThreshold: 0.3,
            frustrationThreshold: 3,
            boredomThreshold: 2,
            helpRequestThreshold: 5,
            timeoutThreshold: 30
          },
          customizedInterface: {
            layout: 'standard',
            colorScheme: 'blue',
            fontFamily: 'Arial',
            animationSpeed: 'normal',
            overlayOpacity: 0.8,
            cueCardPosition: 'top'
          }
        },
        lastUpdated: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockProjectConfig = {
      id: 'project-123',
      name: 'Test Fashion Website',
      builderType: BuilderType.BUILDER_IO,
      buildCommand: 'npm run build',
      outputDirectory: 'dist'
    };

    mockCompletionMetrics = {
      totalTimeSpent: 3600, // 1 hour
      completionPercentage: 100,
      qualityScore: 85,
      complexityScore: 7,
      challengesEncountered: ['responsive design', 'image optimization'],
      solutionsImplemented: ['CSS Grid', 'WebP format'],
      deploymentUrl: 'https://test-fashion-website.vercel.app'
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateProjectSummary', () => {
    it('should generate a comprehensive project summary', async () => {
      const summary = await completionSystem.generateProjectSummary(
        mockProjectConfig,
        mockCompletionMetrics
      );

      expect(summary.id).toBeDefined();
      expect(summary.projectId).toBe(mockProjectConfig.id);
      expect(summary.projectName).toBe(mockProjectConfig.name);
      expect(summary.builderType).toBe(mockProjectConfig.builderType);
      expect(summary.totalTimeSpent).toBe(mockCompletionMetrics.totalTimeSpent);
      expect(summary.learningOutcomes.length).toBeGreaterThan(0);
      expect(summary.technicalSkills.length).toBeGreaterThan(0);
      expect(summary.achievements.length).toBeGreaterThan(0);
      expect(summary.portfolioReady).toBe(true);
      expect(summary.shareableUrl).toBe(mockCompletionMetrics.deploymentUrl);
    });

    it('should include builder-specific learning outcomes', async () => {
      const summary = await completionSystem.generateProjectSummary(
        mockProjectConfig,
        mockCompletionMetrics
      );

      const visualDevOutcome = summary.learningOutcomes.find(
        outcome => outcome.skill === 'Visual Development'
      );
      expect(visualDevOutcome).toBeDefined();
      expect(visualDevOutcome?.description).toContain('visual development tools');
    });

    it('should mark project as not portfolio ready if quality is low', async () => {
      const lowQualityMetrics = {
        ...mockCompletionMetrics,
        qualityScore: 60
      };

      const summary = await completionSystem.generateProjectSummary(
        mockProjectConfig,
        lowQualityMetrics
      );

      expect(summary.portfolioReady).toBe(false);
    });

    it('should include achievements based on metrics', async () => {
      const summary = await completionSystem.generateProjectSummary(
        mockProjectConfig,
        mockCompletionMetrics
      );

      expect(summary.achievements).toContain('Project Completed Successfully');
      expect(summary.achievements).toContain('Successfully Deployed to Production');
      expect(summary.achievements).toContain('High Quality Implementation');
    });
  });

  describe('assessSkillDevelopment', () => {
    it('should assess skill development based on project completion', async () => {
      const assessment = await completionSystem.assessSkillDevelopment(
        mockUserProfile,
        mockProjectConfig,
        mockCompletionMetrics
      );

      expect(assessment.id).toBeDefined();
      expect(assessment.userId).toBe(mockUserProfile.id);
      expect(assessment.projectId).toBe(mockProjectConfig.id);
      expect(assessment.skillsAssessed.length).toBeGreaterThan(0);
      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(assessment.strengths.length).toBeGreaterThan(0);
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify improvement areas for intermediate skills', async () => {
      const assessment = await completionSystem.assessSkillDevelopment(
        mockUserProfile,
        mockProjectConfig,
        mockCompletionMetrics
      );

      expect(assessment.improvementAreas.length).toBeGreaterThan(0);
      expect(assessment.recommendations.some(rec => 
        rec.type === 'skill_improvement'
      )).toBe(true);
    });

    it('should calculate progress from previous assessments', async () => {
      const assessment = await completionSystem.assessSkillDevelopment(
        mockUserProfile,
        mockProjectConfig,
        mockCompletionMetrics
      );

      expect(Object.keys(assessment.progressFromPrevious).length).toBeGreaterThan(0);
      for (const progress of Object.values(assessment.progressFromPrevious)) {
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      }
    });

    it('should throw error when skill assessment is disabled', async () => {
      const disabledSystem = new ProjectCompletionSystem({
        enableSkillAssessment: false
      });

      await expect(disabledSystem.assessSkillDevelopment(
        mockUserProfile,
        mockProjectConfig,
        mockCompletionMetrics
      )).rejects.toThrow('Skill assessment is disabled');
    });
  });

  describe('generateNextStepsRecommendations', () => {
    let mockPortfolioProject: PortfolioProject;
    let mockSkillAssessment: SkillAssessment;

    beforeEach(() => {
      mockPortfolioProject = {
        id: 'portfolio-123',
        projectId: mockProjectConfig.id,
        userId: mockUserProfile.id,
        projectName: mockProjectConfig.name,
        description: 'A fashion website built with Builder.io',
        builderType: mockProjectConfig.builderType,
        completionDate: new Date(),
        tags: ['fashion', 'e-commerce', 'responsive'],
        skillsUsed: ['Visual Development', 'Component Design'],
        achievements: ['Project Completed Successfully'],
        liveUrl: mockCompletionMetrics.deploymentUrl,
        screenshots: [],
        featured: false,
        visibility: 'public'
      };

      mockSkillAssessment = {
        id: 'assessment-123',
        userId: mockUserProfile.id,
        projectId: mockProjectConfig.id,
        assessmentDate: new Date(),
        skillsAssessed: ['Visual Development', 'Component Design'],
        skillLevels: {
          'Visual Development': SkillLevel.INTERMEDIATE,
          'Component Design': SkillLevel.BEGINNER
        },
        overallScore: 75,
        strengths: ['Visual Development'],
        improvementAreas: ['Component Design'],
        progressFromPrevious: {
          'Visual Development': 15,
          'Component Design': 25
        },
        recommendations: []
      };
    });

    it('should generate personalized next steps recommendations', async () => {
      const recommendations = await completionSystem.generateNextStepsRecommendations(
        mockUserProfile,
        mockPortfolioProject,
        mockSkillAssessment
      );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(10);
      
      // Should include skill-based recommendations
      expect(recommendations.some(rec => rec.type === 'skill_development')).toBe(true);
      
      // Should include project-based recommendations
      expect(recommendations.some(rec => rec.type === 'project')).toBe(true);
      
      // Should be sorted by priority and relevance
      for (let i = 0; i < recommendations.length - 1; i++) {
        const current = recommendations[i];
        const next = recommendations[i + 1];
        
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const currentPriority = priorityOrder[current.priority];
        const nextPriority = priorityOrder[next.priority];
        
        if (currentPriority !== nextPriority) {
          expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
        } else {
          expect(current.relevanceScore).toBeGreaterThanOrEqual(next.relevanceScore);
        }
      }
    });

    it('should include improvement area recommendations', async () => {
      const recommendations = await completionSystem.generateNextStepsRecommendations(
        mockUserProfile,
        mockPortfolioProject,
        mockSkillAssessment
      );

      const componentDesignRec = recommendations.find(rec => 
        rec.title.includes('Component Design')
      );
      expect(componentDesignRec).toBeDefined();
      expect(componentDesignRec?.type).toBe('skill_development');
    });

    it('should return empty array when recommendations are disabled', async () => {
      const disabledSystem = new ProjectCompletionSystem({
        enableRecommendations: false
      });

      const recommendations = await disabledSystem.generateNextStepsRecommendations(
        mockUserProfile,
        mockPortfolioProject,
        mockSkillAssessment
      );

      expect(recommendations).toEqual([]);
    });
  });

  describe('portfolio management', () => {
    let mockPortfolioProject: PortfolioProject;

    beforeEach(() => {
      mockPortfolioProject = {
        id: 'portfolio-123',
        projectId: mockProjectConfig.id,
        userId: mockUserProfile.id,
        projectName: mockProjectConfig.name,
        description: 'A fashion website built with Builder.io',
        builderType: mockProjectConfig.builderType,
        completionDate: new Date(),
        tags: ['fashion', 'e-commerce'],
        skillsUsed: ['Visual Development'],
        achievements: ['Project Completed Successfully'],
        liveUrl: mockCompletionMetrics.deploymentUrl,
        screenshots: [],
        featured: false,
        visibility: 'public'
      };
    });

    it('should add project to portfolio', async () => {
      await completionSystem.addToPortfolio(mockUserProfile, mockPortfolioProject);

      const portfolioProjects = await completionSystem.getPortfolioProjects(mockUserProfile.id);
      expect(portfolioProjects.length).toBe(1);
      expect(portfolioProjects[0].projectId).toBe(mockProjectConfig.id);
      expect(portfolioProjects[0].addedToPortfolioDate).toBeInstanceOf(Date);
      expect(portfolioProjects[0].lastUpdated).toBeInstanceOf(Date);
    });

    it('should prevent duplicate projects in portfolio', async () => {
      await completionSystem.addToPortfolio(mockUserProfile, mockPortfolioProject);

      await expect(completionSystem.addToPortfolio(mockUserProfile, mockPortfolioProject))
        .rejects.toThrow('already exists in portfolio');
    });

    it('should get portfolio projects sorted by completion date', async () => {
      const project1 = { ...mockPortfolioProject, id: 'portfolio-1', completionDate: new Date('2023-01-01') };
      const project2 = { ...mockPortfolioProject, id: 'portfolio-2', completionDate: new Date('2023-02-01') };

      await completionSystem.addToPortfolio(mockUserProfile, project1);
      await completionSystem.addToPortfolio(mockUserProfile, project2);

      const portfolioProjects = await completionSystem.getPortfolioProjects(mockUserProfile.id);
      expect(portfolioProjects.length).toBe(2);
      expect(portfolioProjects[0].completionDate.getTime()).toBeGreaterThan(
        portfolioProjects[1].completionDate.getTime()
      );
    });

    it('should update portfolio project', async () => {
      await completionSystem.addToPortfolio(mockUserProfile, mockPortfolioProject);

      const updates = {
        description: 'Updated description',
        featured: true
      };

      await completionSystem.updatePortfolioProject(mockPortfolioProject.projectId, updates);

      const portfolioProjects = await completionSystem.getPortfolioProjects(mockUserProfile.id);
      const updatedProject = portfolioProjects[0];
      
      expect(updatedProject.description).toBe(updates.description);
      expect(updatedProject.featured).toBe(updates.featured);
      expect(updatedProject.lastUpdated).toBeInstanceOf(Date);
    });

    it('should throw error when updating non-existent project', async () => {
      await expect(completionSystem.updatePortfolioProject('non-existent', {}))
        .rejects.toThrow('Portfolio project non-existent not found');
    });

    it('should throw error when portfolio management is disabled', async () => {
      const disabledSystem = new ProjectCompletionSystem({
        enablePortfolioManagement: false
      });

      await expect(disabledSystem.addToPortfolio(mockUserProfile, mockPortfolioProject))
        .rejects.toThrow('Portfolio management is disabled');
    });
  });

  describe('generateLearningPath', () => {
    it('should generate a learning path for target skills', async () => {
      const targetSkills = ['Advanced JavaScript', 'React', 'Node.js'];
      const currentLevel = SkillLevel.INTERMEDIATE;

      const learningPath = await completionSystem.generateLearningPath(
        mockUserProfile,
        targetSkills,
        currentLevel
      );

      expect(learningPath.id).toBeDefined();
      expect(learningPath.userId).toBe(mockUserProfile.id);
      expect(learningPath.targetSkills).toEqual(targetSkills);
      expect(learningPath.currentLevel).toBe(currentLevel);
      expect(learningPath.targetLevel).toBe(SkillLevel.ADVANCED);
      expect(learningPath.steps.length).toBe(targetSkills.length);
      expect(learningPath.estimatedDuration).toBeDefined();
      expect(learningPath.progress.totalSteps).toBe(targetSkills.length);
      expect(learningPath.progress.completedSteps).toBe(0);
      expect(learningPath.progress.percentComplete).toBe(0);
    });

    it('should include prerequisites for complex skills', async () => {
      const targetSkills = ['React'];
      const currentLevel = SkillLevel.BEGINNER;

      const learningPath = await completionSystem.generateLearningPath(
        mockUserProfile,
        targetSkills,
        currentLevel
      );

      expect(learningPath.prerequisites).toContain('JavaScript');
      expect(learningPath.prerequisites).toContain('HTML');
      expect(learningPath.prerequisites).toContain('CSS');
    });

    it('should set appropriate target level based on current level', async () => {
      const targetSkills = ['JavaScript'];
      
      // Test beginner to intermediate
      let learningPath = await completionSystem.generateLearningPath(
        mockUserProfile,
        targetSkills,
        SkillLevel.BEGINNER
      );
      expect(learningPath.targetLevel).toBe(SkillLevel.INTERMEDIATE);

      // Test advanced to expert
      learningPath = await completionSystem.generateLearningPath(
        mockUserProfile,
        targetSkills,
        SkillLevel.ADVANCED
      );
      expect(learningPath.targetLevel).toBe(SkillLevel.ADVANCED);
    });
  });

  describe('event emission', () => {
    it('should emit events for major operations', async () => {
      const projectSummarySpy = jest.fn();
      const skillAssessmentSpy = jest.fn();
      const recommendationsSpy = jest.fn();
      const portfolioSpy = jest.fn();

      completionSystem.on('projectSummaryGenerated', projectSummarySpy);
      completionSystem.on('skillAssessmentCompleted', skillAssessmentSpy);
      completionSystem.on('recommendationsGenerated', recommendationsSpy);
      completionSystem.on('projectAddedToPortfolio', portfolioSpy);

      // Generate project summary
      await completionSystem.generateProjectSummary(mockProjectConfig, mockCompletionMetrics);
      expect(projectSummarySpy).toHaveBeenCalled();

      // Assess skills
      await completionSystem.assessSkillDevelopment(
        mockUserProfile,
        mockProjectConfig,
        mockCompletionMetrics
      );
      expect(skillAssessmentSpy).toHaveBeenCalled();

      // Add to portfolio
      const portfolioProject: PortfolioProject = {
        id: 'portfolio-123',
        projectId: mockProjectConfig.id,
        userId: mockUserProfile.id,
        projectName: mockProjectConfig.name,
        description: 'Test project',
        builderType: mockProjectConfig.builderType,
        completionDate: new Date(),
        tags: [],
        skillsUsed: [],
        achievements: [],
        screenshots: [],
        featured: false,
        visibility: 'public'
      };

      await completionSystem.addToPortfolio(mockUserProfile, portfolioProject);
      expect(portfolioSpy).toHaveBeenCalled();
    });
  });

  describe('comprehensive integration tests', () => {
    it('should handle complete project completion workflow', async () => {
      // Test the full workflow from project completion to portfolio addition
      const summary = await completionSystem.generateProjectSummary(mockProjectConfig, mockCompletionMetrics);
      const assessment = await completionSystem.assessSkillDevelopment(mockUserProfile, mockProjectConfig, mockCompletionMetrics);
      
      const portfolioProject: PortfolioProject = {
        id: 'portfolio-integration-test',
        projectId: mockProjectConfig.id,
        userId: mockUserProfile.id,
        projectName: mockProjectConfig.name,
        description: summary.keyInsights.join('. '),
        builderType: mockProjectConfig.builderType,
        completionDate: new Date(),
        tags: summary.technicalSkills,
        skillsUsed: assessment.skillsAssessed,
        achievements: summary.achievements,
        screenshots: [],
        featured: summary.portfolioReady,
        visibility: 'public'
      };

      await completionSystem.addToPortfolio(mockUserProfile, portfolioProject);
      const recommendations = await completionSystem.generateNextStepsRecommendations(mockUserProfile, portfolioProject, assessment);

      // Verify complete workflow
      expect(summary.portfolioReady).toBe(true);
      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(recommendations.length).toBeGreaterThan(0);
      
      const portfolioProjects = await completionSystem.getPortfolioProjects(mockUserProfile.id);
      expect(portfolioProjects).toHaveLength(1);
      expect(portfolioProjects[0].featured).toBe(true);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test with invalid project config
      const invalidConfig: ProjectConfig = {
        id: '',
        name: '',
        builderType: 'invalid' as BuilderType
      };

      // Should not throw but handle gracefully
      const summary = await completionSystem.generateProjectSummary(invalidConfig, mockCompletionMetrics);
      expect(summary).toBeDefined();
      expect(summary.portfolioReady).toBe(false);
    });

    it('should maintain data consistency across operations', async () => {
      // Add multiple projects and verify consistency
      const projects = [
        { ...mockProjectConfig, id: 'project-1', name: 'Project 1' },
        { ...mockProjectConfig, id: 'project-2', name: 'Project 2' },
        { ...mockProjectConfig, id: 'project-3', name: 'Project 3' }
      ];

      for (const project of projects) {
        const portfolioProject: PortfolioProject = {
          id: `portfolio-${project.id}`,
          projectId: project.id,
          userId: mockUserProfile.id,
          projectName: project.name,
          description: `Description for ${project.name}`,
          builderType: project.builderType,
          completionDate: new Date(),
          tags: [],
          skillsUsed: [],
          achievements: [],
          screenshots: [],
          featured: false,
          visibility: 'public'
        };

        await completionSystem.addToPortfolio(mockUserProfile, portfolioProject);
      }

      const portfolioProjects = await completionSystem.getPortfolioProjects(mockUserProfile.id);
      expect(portfolioProjects).toHaveLength(3);
      
      // Verify all projects are properly stored
      const projectIds = portfolioProjects.map(p => p.projectId);
      expect(projectIds).toContain('project-1');
      expect(projectIds).toContain('project-2');
      expect(projectIds).toContain('project-3');
    });
  });
});