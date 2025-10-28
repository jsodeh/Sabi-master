import { EventEmitter } from 'events';
import {
  ProjectSummary,
  LearningOutcome,
  SkillAssessment,
  LearningRecommendation,
  PortfolioProject,
  CompletionMetrics,
  NextStepsRecommendation,
  LearningPath
} from '../types/learning';
import { ProjectConfig } from '../types/deployment';
import { BuilderType, SkillLevel } from '../types/common';
import { UserProfile } from '../types/user';

export interface ProjectCompletionConfig {
  enableSkillAssessment?: boolean;
  enablePortfolioManagement?: boolean;
  enableRecommendations?: boolean;
  assessmentWeights?: {
    timeSpent: number;
    complexity: number;
    completion: number;
    quality: number;
  };
}

export interface IProjectCompletionSystem {
  // Project summary generation
  generateProjectSummary(projectConfig: ProjectConfig, metrics: CompletionMetrics): Promise<ProjectSummary>;
  
  // Skill assessment
  assessSkillDevelopment(
    userProfile: UserProfile,
    projectConfig: ProjectConfig,
    metrics: CompletionMetrics
  ): Promise<SkillAssessment>;
  
  // Recommendation engine
  generateNextStepsRecommendations(
    userProfile: UserProfile,
    completedProject: PortfolioProject,
    skillAssessment: SkillAssessment
  ): Promise<NextStepsRecommendation[]>;
  
  // Portfolio management
  addToPortfolio(userProfile: UserProfile, project: PortfolioProject): Promise<void>;
  getPortfolioProjects(userId: string): Promise<PortfolioProject[]>;
  updatePortfolioProject(projectId: string, updates: Partial<PortfolioProject>): Promise<void>;
  
  // Learning path generation
  generateLearningPath(
    userProfile: UserProfile,
    targetSkills: string[],
    currentLevel: SkillLevel
  ): Promise<LearningPath>;
}

/**
 * ProjectCompletionSystem handles project completion workflows,
 * skill assessment, and next steps recommendations
 */
export class ProjectCompletionSystem extends EventEmitter implements IProjectCompletionSystem {
  private config: ProjectCompletionConfig;
  private portfolioProjects: Map<string, PortfolioProject[]> = new Map();
  
  constructor(config: ProjectCompletionConfig = {}) {
    super();
    
    this.config = {
      enableSkillAssessment: true,
      enablePortfolioManagement: true,
      enableRecommendations: true,
      assessmentWeights: {
        timeSpent: 0.2,
        complexity: 0.3,
        completion: 0.3,
        quality: 0.2
      },
      ...config
    };
  }

  /**
   * Generate a comprehensive project summary with learning outcomes
   */
  async generateProjectSummary(
    projectConfig: ProjectConfig,
    metrics: CompletionMetrics
  ): Promise<ProjectSummary> {
    const learningOutcomes = await this.extractLearningOutcomes(projectConfig, metrics);
    const technicalSkills = await this.identifyTechnicalSkills(projectConfig);
    const achievements = await this.identifyAchievements(projectConfig, metrics);
    
    const summary: ProjectSummary = {
      id: this.generateId(),
      projectId: projectConfig.id,
      projectName: projectConfig.name,
      builderType: projectConfig.builderType,
      completionDate: new Date(),
      totalTimeSpent: metrics.totalTimeSpent,
      learningOutcomes,
      technicalSkills,
      achievements,
      challenges: metrics.challengesEncountered || [],
      solutions: metrics.solutionsImplemented || [],
      keyInsights: await this.generateKeyInsights(projectConfig, metrics),
      recommendedNextSteps: [], // Will be populated by recommendation engine
      portfolioReady: this.isPortfolioReady(metrics),
      shareableUrl: metrics.deploymentUrl
    };
    
    this.emit('projectSummaryGenerated', { summary });
    
    return summary;
  }

  /**
   * Assess skill development based on completed project
   */
  async assessSkillDevelopment(
    userProfile: UserProfile,
    projectConfig: ProjectConfig,
    metrics: CompletionMetrics
  ): Promise<SkillAssessment> {
    if (!this.config.enableSkillAssessment) {
      throw new Error('Skill assessment is disabled');
    }
    
    const skillsAssessed = await this.identifySkillsFromProject(projectConfig);
    const skillLevels = await this.calculateSkillLevels(userProfile, projectConfig, metrics);
    const improvementAreas = await this.identifyImprovementAreas(skillLevels, metrics);
    const strengths = await this.identifyStrengths(skillLevels, metrics);
    
    const overallScore = this.calculateOverallScore(metrics);
    
    const assessment: SkillAssessment = {
      id: this.generateId(),
      userId: userProfile.id,
      projectId: projectConfig.id,
      assessmentDate: new Date(),
      skillsAssessed,
      skillLevels,
      overallScore,
      strengths,
      improvementAreas,
      progressFromPrevious: await this.calculateProgressFromPrevious(userProfile, skillsAssessed),
      recommendations: await this.generateSkillRecommendations(skillLevels, improvementAreas)
    };
    
    this.emit('skillAssessmentCompleted', { assessment });
    
    return assessment;
  }

  /**
   * Generate personalized next steps recommendations
   */
  async generateNextStepsRecommendations(
    userProfile: UserProfile,
    completedProject: PortfolioProject,
    skillAssessment: SkillAssessment
  ): Promise<NextStepsRecommendation[]> {
    if (!this.config.enableRecommendations) {
      return [];
    }
    
    const recommendations: NextStepsRecommendation[] = [];
    
    // Skill-based recommendations
    recommendations.push(...await this.generateSkillBasedRecommendations(skillAssessment));
    
    // Project-based recommendations
    recommendations.push(...await this.generateProjectBasedRecommendations(completedProject));
    
    // Career-based recommendations
    recommendations.push(...await this.generateCareerBasedRecommendations(userProfile, skillAssessment));
    
    // Learning path recommendations
    recommendations.push(...await this.generateLearningPathRecommendations(userProfile, skillAssessment));
    
    // Sort by priority and relevance
    recommendations.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.relevanceScore - a.relevanceScore;
    });
    
    this.emit('recommendationsGenerated', { 
      userProfile, 
      completedProject, 
      recommendations: recommendations.slice(0, 10) // Top 10 recommendations
    });
    
    return recommendations.slice(0, 10);
  }

  /**
   * Add completed project to user's portfolio
   */
  async addToPortfolio(userProfile: UserProfile, project: PortfolioProject): Promise<void> {
    if (!this.config.enablePortfolioManagement) {
      throw new Error('Portfolio management is disabled');
    }
    
    const userProjects = this.portfolioProjects.get(userProfile.id) || [];
    
    // Check for duplicates
    const existingProject = userProjects.find(p => p.projectId === project.projectId);
    if (existingProject) {
      throw new Error(`Project ${project.projectId} already exists in portfolio`);
    }
    
    // Add timestamps and metadata
    project.addedToPortfolioDate = new Date();
    project.lastUpdated = new Date();
    
    userProjects.push(project);
    this.portfolioProjects.set(userProfile.id, userProjects);
    
    this.emit('projectAddedToPortfolio', { userProfile, project });
  }

  /**
   * Get all portfolio projects for a user
   */
  async getPortfolioProjects(userId: string): Promise<PortfolioProject[]> {
    const projects = this.portfolioProjects.get(userId) || [];
    
    // Sort by completion date (most recent first)
    return projects.sort((a, b) => 
      new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime()
    );
  }

  /**
   * Update an existing portfolio project
   */
  async updatePortfolioProject(projectId: string, updates: Partial<PortfolioProject>): Promise<void> {
    for (const [userId, projects] of this.portfolioProjects.entries()) {
      const projectIndex = projects.findIndex(p => p.projectId === projectId);
      if (projectIndex !== -1) {
        projects[projectIndex] = {
          ...projects[projectIndex],
          ...updates,
          lastUpdated: new Date()
        };
        
        this.emit('portfolioProjectUpdated', { 
          userId, 
          projectId, 
          updates 
        });
        
        return;
      }
    }
    
    throw new Error(`Portfolio project ${projectId} not found`);
  }

  /**
   * Generate a learning path based on target skills and current level
   */
  async generateLearningPath(
    userProfile: UserProfile,
    targetSkills: string[],
    currentLevel: SkillLevel
  ): Promise<LearningPath> {
    const pathSteps = await this.generateLearningPathSteps(targetSkills, currentLevel);
    const estimatedDuration = this.calculatePathDuration(pathSteps);
    const prerequisites = await this.identifyPrerequisites(targetSkills, userProfile);
    
    const learningPath: LearningPath = {
      id: this.generateId(),
      userId: userProfile.id,
      title: `Path to ${targetSkills.join(', ')} Mastery`,
      description: `Personalized learning path to develop ${targetSkills.join(', ')} skills`,
      targetSkills,
      currentLevel,
      targetLevel: this.determineTargetLevel(currentLevel),
      steps: pathSteps,
      estimatedDuration,
      prerequisites,
      createdDate: new Date(),
      lastUpdated: new Date(),
      progress: {
        completedSteps: 0,
        totalSteps: pathSteps.length,
        percentComplete: 0,
        currentStepId: pathSteps[0]?.id
      }
    };
    
    this.emit('learningPathGenerated', { userProfile, learningPath });
    
    return learningPath;
  }

  /**
   * Private helper methods
   */
  
  private async extractLearningOutcomes(
    projectConfig: ProjectConfig,
    metrics: CompletionMetrics
  ): Promise<LearningOutcome[]> {
    const outcomes: LearningOutcome[] = [];
    
    // Builder-specific outcomes
    switch (projectConfig.builderType) {
      case BuilderType.BUILDER_IO:
        outcomes.push({
          skill: 'Visual Development',
          description: 'Learned to create applications using visual development tools',
          proficiencyGained: this.calculateProficiencyGain(metrics, 'visual-development'),
          evidenceUrl: metrics.deploymentUrl
        });
        outcomes.push({
          skill: 'Component-Based Architecture',
          description: 'Understanding of reusable component design patterns',
          proficiencyGained: this.calculateProficiencyGain(metrics, 'component-architecture'),
          evidenceUrl: metrics.deploymentUrl
        });
        break;
        
      case BuilderType.LOVABLE:
        outcomes.push({
          skill: 'AI-Assisted Development',
          description: 'Experience with AI-powered development workflows',
          proficiencyGained: this.calculateProficiencyGain(metrics, 'ai-development'),
          evidenceUrl: metrics.deploymentUrl
        });
        outcomes.push({
          skill: 'Rapid Prototyping',
          description: 'Ability to quickly create functional prototypes',
          proficiencyGained: this.calculateProficiencyGain(metrics, 'rapid-prototyping'),
          evidenceUrl: metrics.deploymentUrl
        });
        break;
        
      case BuilderType.BOLT_NEW:
        outcomes.push({
          skill: 'Full-Stack Development',
          description: 'Understanding of full-stack application architecture',
          proficiencyGained: this.calculateProficiencyGain(metrics, 'fullstack-development'),
          evidenceUrl: metrics.deploymentUrl
        });
        break;
    }
    
    // General outcomes based on project complexity
    if (metrics.complexityScore && metrics.complexityScore > 7) {
      outcomes.push({
        skill: 'Problem Solving',
        description: 'Advanced problem-solving skills through complex project challenges',
        proficiencyGained: this.calculateProficiencyGain(metrics, 'problem-solving'),
        evidenceUrl: metrics.deploymentUrl
      });
    }
    
    return outcomes;
  }

  private async identifyTechnicalSkills(projectConfig: ProjectConfig): Promise<string[]> {
    const skills: string[] = [];
    
    // Builder-specific skills
    switch (projectConfig.builderType) {
      case BuilderType.BUILDER_IO:
        skills.push('Visual Development', 'Component Design', 'Responsive Design');
        break;
      case BuilderType.LOVABLE:
        skills.push('AI-Assisted Development', 'Prompt Engineering', 'Rapid Prototyping');
        break;
      case BuilderType.BOLT_NEW:
        skills.push('Full-Stack Development', 'API Integration', 'Database Design');
        break;
      case BuilderType.FIREBASE_STUDIO:
        skills.push('Backend Development', 'Database Management', 'Authentication');
        break;
      case BuilderType.REPLIT:
        skills.push('Collaborative Development', 'Version Control', 'Deployment');
        break;
    }
    
    // Common skills
    skills.push('Web Development', 'User Interface Design', 'Project Management');
    
    return skills;
  }

  private async identifyAchievements(
    projectConfig: ProjectConfig,
    metrics: CompletionMetrics
  ): Promise<string[]> {
    const achievements: string[] = [];
    
    // Completion-based achievements
    if (metrics.completionPercentage >= 100) {
      achievements.push('Project Completed Successfully');
    }
    
    // Time-based achievements
    if (metrics.totalTimeSpent < 3600) { // Less than 1 hour
      achievements.push('Speed Developer - Completed in under 1 hour');
    }
    
    // Quality-based achievements
    if (metrics.qualityScore && metrics.qualityScore >= 90) {
      achievements.push('High Quality Implementation');
    }
    
    // Deployment achievements
    if (metrics.deploymentUrl) {
      achievements.push('Successfully Deployed to Production');
    }
    
    // Complexity achievements
    if (metrics.complexityScore && metrics.complexityScore >= 8) {
      achievements.push('Complex Project Mastery');
    }
    
    return achievements;
  }

  private async generateKeyInsights(
    projectConfig: ProjectConfig,
    metrics: CompletionMetrics
  ): Promise<string[]> {
    const insights: string[] = [];
    
    // Performance insights
    if (metrics.totalTimeSpent > 7200) { // More than 2 hours
      insights.push('This project required significant time investment, indicating complex problem-solving');
    }
    
    // Learning curve insights
    if (metrics.challengesEncountered && metrics.challengesEncountered.length > 3) {
      insights.push('Multiple challenges encountered demonstrate resilience and learning agility');
    }
    
    // Quality insights
    if (metrics.qualityScore && metrics.qualityScore >= 85) {
      insights.push('High attention to detail and quality standards demonstrated');
    }
    
    // Builder-specific insights
    switch (projectConfig.builderType) {
      case BuilderType.BUILDER_IO:
        insights.push('Visual development approach accelerated the design-to-implementation process');
        break;
      case BuilderType.LOVABLE:
        insights.push('AI-assisted development enhanced productivity and creativity');
        break;
    }
    
    return insights;
  }

  private isPortfolioReady(metrics: CompletionMetrics): boolean {
    return (
      metrics.completionPercentage >= 90 &&
      !!metrics.deploymentUrl &&
      (metrics.qualityScore || 0) >= 70
    );
  }

  private async identifySkillsFromProject(projectConfig: ProjectConfig): Promise<string[]> {
    return this.identifyTechnicalSkills(projectConfig);
  }

  private async calculateSkillLevels(
    userProfile: UserProfile,
    projectConfig: ProjectConfig,
    metrics: CompletionMetrics
  ): Promise<Record<string, SkillLevel>> {
    const skills = await this.identifySkillsFromProject(projectConfig);
    const skillLevels: Record<string, SkillLevel> = {};
    
    for (const skill of skills) {
      // Calculate skill level based on project complexity and performance
      const baseLevel = this.getBaseSkillLevel(userProfile, skill);
      const projectBonus = this.calculateProjectSkillBonus(metrics, skill);
      
      skillLevels[skill] = this.combineSkillLevels(baseLevel, projectBonus);
    }
    
    return skillLevels;
  }

  private async identifyImprovementAreas(
    skillLevels: Record<string, SkillLevel>,
    metrics: CompletionMetrics
  ): Promise<string[]> {
    const improvementAreas: string[] = [];
    
    // Identify skills with lower levels
    for (const [skill, level] of Object.entries(skillLevels)) {
      if (level === SkillLevel.BEGINNER || level === SkillLevel.INTERMEDIATE) {
        improvementAreas.push(skill);
      }
    }
    
    // Add areas based on challenges encountered
    if (metrics.challengesEncountered) {
      for (const challenge of metrics.challengesEncountered) {
        if (challenge.toLowerCase().includes('performance')) {
          improvementAreas.push('Performance Optimization');
        }
        if (challenge.toLowerCase().includes('design')) {
          improvementAreas.push('UI/UX Design');
        }
      }
    }
    
    return [...new Set(improvementAreas)]; // Remove duplicates
  }

  private async identifyStrengths(
    skillLevels: Record<string, SkillLevel>,
    metrics: CompletionMetrics
  ): Promise<string[]> {
    const strengths: string[] = [];
    
    // Identify skills with higher levels
    for (const [skill, level] of Object.entries(skillLevels)) {
      if (level === SkillLevel.ADVANCED) {
        strengths.push(skill);
      }
    }
    
    // Add strengths based on performance metrics
    if (metrics.qualityScore && metrics.qualityScore >= 90) {
      strengths.push('Quality Focus');
    }
    
    if (metrics.totalTimeSpent < 3600) {
      strengths.push('Efficiency');
    }
    
    return [...new Set(strengths)];
  }

  private calculateOverallScore(metrics: CompletionMetrics): number {
    const weights = this.config.assessmentWeights!;
    
    const timeScore = this.normalizeTimeScore(metrics.totalTimeSpent);
    const complexityScore = metrics.complexityScore || 50;
    const completionScore = metrics.completionPercentage || 0;
    const qualityScore = metrics.qualityScore || 70;
    
    return Math.round(
      timeScore * weights.timeSpent +
      complexityScore * weights.complexity +
      completionScore * weights.completion +
      qualityScore * weights.quality
    );
  }

  private normalizeTimeScore(timeSpent: number): number {
    // Convert time spent to a score (less time = higher score for efficiency)
    // Assuming optimal time is around 2 hours (7200 seconds)
    const optimalTime = 7200;
    if (timeSpent <= optimalTime) {
      return 100;
    } else {
      return Math.max(50, 100 - ((timeSpent - optimalTime) / optimalTime) * 50);
    }
  }

  private async calculateProgressFromPrevious(
    userProfile: UserProfile,
    skillsAssessed: string[]
  ): Promise<Record<string, number>> {
    const progress: Record<string, number> = {};
    
    // In a real implementation, this would compare with previous assessments
    // For now, simulate some progress
    for (const skill of skillsAssessed) {
      progress[skill] = Math.floor(Math.random() * 20) + 5; // 5-25% improvement
    }
    
    return progress;
  }

  private async generateSkillRecommendations(
    skillLevels: Record<string, SkillLevel>,
    improvementAreas: string[]
  ): Promise<LearningRecommendation[]> {
    const recommendations: LearningRecommendation[] = [];
    
    for (const area of improvementAreas) {
      recommendations.push({
        id: this.generateId(),
        type: 'skill_improvement',
        title: `Improve ${area} Skills`,
        description: `Focus on developing stronger ${area} capabilities`,
        priority: 'medium',
        estimatedTime: '2-4 weeks',
        resources: [
          {
            title: `${area} Fundamentals Course`,
            url: `https://example.com/courses/${area.toLowerCase().replace(/\s+/g, '-')}`,
            type: 'course'
          }
        ],
        prerequisites: [],
        expectedOutcome: `Advance from ${skillLevels[area] || SkillLevel.BEGINNER} to next level in ${area}`
      });
    }
    
    return recommendations;
  }

  private async generateSkillBasedRecommendations(
    skillAssessment: SkillAssessment
  ): Promise<NextStepsRecommendation[]> {
    const recommendations: NextStepsRecommendation[] = [];
    
    for (const area of skillAssessment.improvementAreas) {
      recommendations.push({
        id: this.generateId(),
        type: 'skill_development',
        category: 'learning',
        title: `Master ${area}`,
        description: `Take your ${area} skills to the next level`,
        priority: 'medium',
        relevanceScore: 80,
        estimatedTimeToComplete: '3-4 weeks',
        difficulty: 'intermediate',
        resources: [
          {
            title: `Advanced ${area} Techniques`,
            url: `https://example.com/advanced-${area.toLowerCase().replace(/\s+/g, '-')}`,
            type: 'tutorial'
          }
        ],
        expectedBenefits: [`Improved ${area} proficiency`, 'Better project outcomes'],
        prerequisites: [`Basic ${area} knowledge`]
      });
    }
    
    return recommendations;
  }

  private async generateProjectBasedRecommendations(
    completedProject: PortfolioProject
  ): Promise<NextStepsRecommendation[]> {
    const recommendations: NextStepsRecommendation[] = [];
    
    // Suggest similar but more complex projects
    recommendations.push({
      id: this.generateId(),
      type: 'project',
      category: 'practice',
      title: `Advanced ${completedProject.builderType} Project`,
      description: `Build a more complex application using ${completedProject.builderType}`,
      priority: 'high',
      relevanceScore: 90,
      estimatedTimeToComplete: '1-2 weeks',
      difficulty: 'advanced',
      resources: [
        {
          title: `${completedProject.builderType} Advanced Tutorial`,
          url: `https://example.com/${completedProject.builderType.toLowerCase()}-advanced`,
          type: 'tutorial'
        }
      ],
      expectedBenefits: ['Enhanced technical skills', 'Portfolio expansion'],
      prerequisites: [`Completed ${completedProject.projectName}`]
    });
    
    return recommendations;
  }

  private async generateCareerBasedRecommendations(
    userProfile: UserProfile,
    skillAssessment: SkillAssessment
  ): Promise<NextStepsRecommendation[]> {
    const recommendations: NextStepsRecommendation[] = [];
    
    // Career advancement recommendations based on skills
    if (skillAssessment.strengths.includes('Full-Stack Development')) {
      recommendations.push({
        id: this.generateId(),
        type: 'career',
        category: 'advancement',
        title: 'Explore Full-Stack Developer Roles',
        description: 'Your full-stack skills make you a strong candidate for developer positions',
        priority: 'high',
        relevanceScore: 95,
        estimatedTimeToComplete: 'Ongoing',
        difficulty: 'intermediate',
        resources: [
          {
            title: 'Full-Stack Developer Job Guide',
            url: 'https://example.com/fullstack-jobs',
            type: 'guide'
          }
        ],
        expectedBenefits: ['Career advancement', 'Higher earning potential'],
        prerequisites: ['Strong portfolio', 'Interview preparation']
      });
    }
    
    return recommendations;
  }

  private async generateLearningPathRecommendations(
    userProfile: UserProfile,
    skillAssessment: SkillAssessment
  ): Promise<NextStepsRecommendation[]> {
    const recommendations: NextStepsRecommendation[] = [];
    
    // Suggest structured learning paths
    recommendations.push({
      id: this.generateId(),
      type: 'learning_path',
      category: 'structured_learning',
      title: 'Complete Web Development Path',
      description: 'Follow a structured path to become a proficient web developer',
      priority: 'medium',
      relevanceScore: 85,
      estimatedTimeToComplete: '3-6 months',
      difficulty: 'intermediate',
      resources: [
        {
          title: 'Web Development Learning Path',
          url: 'https://example.com/web-dev-path',
          type: 'course'
        }
      ],
      expectedBenefits: ['Comprehensive skill development', 'Structured learning approach'],
      prerequisites: ['Basic programming knowledge']
    });
    
    return recommendations;
  }

  private async generateLearningPathSteps(
    targetSkills: string[],
    currentLevel: SkillLevel
  ): Promise<any[]> {
    // Generate learning path steps based on target skills
    // This is a simplified implementation
    return targetSkills.map((skill, index) => ({
      id: this.generateId(),
      title: `Learn ${skill}`,
      description: `Master ${skill} fundamentals and advanced concepts`,
      order: index + 1,
      estimatedDuration: '1-2 weeks',
      resources: [
        {
          title: `${skill} Course`,
          url: `https://example.com/${skill.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'course'
        }
      ],
      completed: false
    }));
  }

  private calculatePathDuration(steps: any[]): string {
    const totalWeeks = steps.length * 1.5; // Average 1.5 weeks per step
    if (totalWeeks < 4) {
      return `${Math.ceil(totalWeeks)} weeks`;
    } else {
      return `${Math.ceil(totalWeeks / 4)} months`;
    }
  }

  private async identifyPrerequisites(
    targetSkills: string[],
    userProfile: UserProfile
  ): Promise<string[]> {
    const prerequisites: string[] = [];
    
    // Add basic prerequisites based on target skills
    if (targetSkills.includes('Advanced JavaScript')) {
      prerequisites.push('Basic JavaScript');
    }
    
    if (targetSkills.includes('React')) {
      prerequisites.push('JavaScript', 'HTML', 'CSS');
    }
    
    return [...new Set(prerequisites)];
  }

  private determineTargetLevel(currentLevel: SkillLevel): SkillLevel {
    switch (currentLevel) {
      case SkillLevel.BEGINNER:
        return SkillLevel.INTERMEDIATE;
      case SkillLevel.INTERMEDIATE:
        return SkillLevel.ADVANCED;
      case SkillLevel.ADVANCED:
        return SkillLevel.ADVANCED;
      default:
        return SkillLevel.ADVANCED;
    }
  }

  private calculateProficiencyGain(metrics: CompletionMetrics, skillType: string): number {
    // Calculate proficiency gain based on project metrics
    let gain = 10; // Base gain
    
    if (metrics.complexityScore && metrics.complexityScore > 7) {
      gain += 15;
    }
    
    if (metrics.qualityScore && metrics.qualityScore > 85) {
      gain += 10;
    }
    
    if (metrics.totalTimeSpent > 3600) { // More than 1 hour
      gain += 5;
    }
    
    return Math.min(gain, 40); // Cap at 40% gain
  }

  private getBaseSkillLevel(userProfile: UserProfile, skill: string): SkillLevel {
    // In a real implementation, this would check user's existing skill levels
    return SkillLevel.BEGINNER;
  }

  private calculateProjectSkillBonus(metrics: CompletionMetrics, skill: string): SkillLevel {
    // Calculate skill level bonus from this project
    if (metrics.complexityScore && metrics.complexityScore >= 8) {
      return SkillLevel.INTERMEDIATE;
    }
    return SkillLevel.BEGINNER;
  }

  private combineSkillLevels(baseLevel: SkillLevel, bonus: SkillLevel): SkillLevel {
    const levels = [SkillLevel.BEGINNER, SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED];
    const baseIndex = levels.indexOf(baseLevel);
    const bonusIndex = levels.indexOf(bonus);
    
    const combinedIndex = Math.min(baseIndex + bonusIndex, levels.length - 1);
    return levels[combinedIndex];
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}