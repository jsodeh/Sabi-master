import { ProgressVisualization, LearningReport } from '../ProgressVisualization';
import { AnalyticsEngine, ComprehensiveAnalytics } from '../../../core/AnalyticsEngine';
import { LearningProgress, SkillAcquisition } from '../../../types/user';

// Mock AnalyticsEngine
jest.mock('../../../core/AnalyticsEngine');

describe('ProgressVisualization', () => {
  let progressVisualization: ProgressVisualization;
  let mockAnalyticsEngine: jest.Mocked<AnalyticsEngine>;
  let mockContainer: HTMLElement;
  let mockAnalytics: ComprehensiveAnalytics;

  beforeEach(() => {
    // Create mock container
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    // Create mock analytics engine
    mockAnalyticsEngine = new AnalyticsEngine() as jest.Mocked<AnalyticsEngine>;

    // Create mock analytics data
    mockAnalytics = {
      userId: 'user-123',
      generatedAt: new Date(),
      progressSummary: {
        totalSessions: 5,
        totalStepsCompleted: 25,
        averageSessionDuration: 30,
        overallSatisfaction: 4.2
      },
      skillAnalysis: {
        totalSkills: 8,
        averageProficiency: 0.7,
        skillCategories: ['design', 'technical'],
        recentlyAcquired: 3
      },
      learningPatterns: [],
      performanceMetrics: {
        userId: 'user-123',
        calculationDate: new Date(),
        learningVelocity: 12,
        errorRate: 0.2,
        adaptationEffectiveness: 0.8,
        conceptRetention: 0.75,
        toolMastery: 0.6,
        timeOptimization: 0.85,
        engagementLevel: 0.9,
        knowledgeTransfer: 0.65,
        historicalData: []
      },
      insights: ['Strong performance in design tasks', 'Consistent learning pace'],
      predictions: ['Likely to excel in advanced design courses'],
      recommendations: ['Try more complex projects', 'Focus on deployment skills']
    };

    mockAnalyticsEngine.getComprehensiveAnalytics.mockResolvedValue(mockAnalytics);

    progressVisualization = new ProgressVisualization(mockAnalyticsEngine, mockContainer);
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
    jest.clearAllMocks();
  });

  describe('Dashboard Display', () => {
    test('should display comprehensive dashboard', async () => {
      await progressVisualization.displayDashboard('user-123');

      expect(mockAnalyticsEngine.getComprehensiveAnalytics).toHaveBeenCalledWith('user-123');
      expect(mockContainer.children.length).toBeGreaterThan(0);
      expect(mockContainer.querySelector('.progress-dashboard')).toBeTruthy();
    });

    test('should create overview section', async () => {
      await progressVisualization.displayDashboard('user-123');

      const overviewSection = mockContainer.querySelector('.dashboard-section');
      expect(overviewSection).toBeTruthy();
      
      const overviewCards = mockContainer.querySelectorAll('.overview-card');
      expect(overviewCards.length).toBe(4); // Total Sessions, Steps Completed, Skills Acquired, Avg Satisfaction
    });

    test('should display correct overview values', async () => {
      await progressVisualization.displayDashboard('user-123');

      const overviewValues = Array.from(mockContainer.querySelectorAll('.overview-value'))
        .map(el => el.textContent);

      expect(overviewValues).toContain('5'); // Total Sessions
      expect(overviewValues).toContain('25'); // Steps Completed
      expect(overviewValues).toContain('8'); // Skills Acquired
      expect(overviewValues).toContain('84.0%'); // Avg Satisfaction (4.2 * 20)
    });

    test('should handle analytics loading errors', async () => {
      mockAnalyticsEngine.getComprehensiveAnalytics.mockRejectedValue(new Error('Analytics failed'));

      await progressVisualization.displayDashboard('user-123');

      expect(mockContainer.querySelector('.error-message')).toBeTruthy();
      expect(mockContainer.textContent).toContain('Failed to load analytics dashboard');
    });
  });

  describe('Progress Chart Creation', () => {
    test('should create progress chart with data', () => {
      const progressData: LearningProgress[] = [
        {
          id: '1', userId: 'user-123', sessionId: 'session-1', startTime: new Date(),
          totalSteps: 10, completedSteps: 8, skippedSteps: 1, failedSteps: 1,
          averageStepTime: 15, skillsAcquired: [], challengesEncountered: [],
          overallSatisfaction: 4, learningEfficiency: 0.8, adaptationsMade: 2,
          toolsUsed: ['builder.io'], outcomes: [], analytics: {
            learningVelocity: 12, errorRate: 0.1, helpRequestFrequency: 1,
            conceptRetention: 0.9, toolProficiency: [], learningPatterns: [],
            improvementAreas: [], strengths: []
          }
        },
        {
          id: '2', userId: 'user-123', sessionId: 'session-2', startTime: new Date(),
          totalSteps: 12, completedSteps: 10, skippedSteps: 0, failedSteps: 2,
          averageStepTime: 18, skillsAcquired: [], challengesEncountered: [],
          overallSatisfaction: 4.5, learningEfficiency: 0.83, adaptationsMade: 1,
          toolsUsed: ['lovable'], outcomes: [], analytics: {
            learningVelocity: 15, errorRate: 0.17, helpRequestFrequency: 0,
            conceptRetention: 0.85, toolProficiency: [], learningPatterns: [],
            improvementAreas: [], strengths: []
          }
        }
      ];

      const chart = progressVisualization.createProgressChart(progressData);

      expect(chart.className).toBe('progress-chart');
      expect(chart.querySelector('.chart-title')).toBeTruthy();
      expect(chart.querySelector('.progress-chart-svg')).toBeTruthy();
      expect(chart.querySelector('path')).toBeTruthy(); // Line path
      expect(chart.querySelectorAll('circle').length).toBe(2); // Data points
    });

    test('should handle empty progress data', () => {
      const chart = progressVisualization.createProgressChart([]);

      expect(chart.className).toBe('progress-chart');
      expect(chart.querySelector('.no-data')).toBeTruthy();
      expect(chart.querySelector('.no-data')?.textContent).toBe('No progress data available');
    });

    test('should add tooltips to data points', () => {
      const progressData: LearningProgress[] = [
        {
          id: '1', userId: 'user-123', sessionId: 'session-1', startTime: new Date(),
          totalSteps: 5, completedSteps: 3, skippedSteps: 0, failedSteps: 2,
          averageStepTime: 20, skillsAcquired: [], challengesEncountered: [],
          overallSatisfaction: 3.5, learningEfficiency: 0.6, adaptationsMade: 1,
          toolsUsed: [], outcomes: [], analytics: {
            learningVelocity: 9, errorRate: 0.4, helpRequestFrequency: 2,
            conceptRetention: 0.7, toolProficiency: [], learningPatterns: [],
            improvementAreas: [], strengths: []
          }
        }
      ];

      const chart = progressVisualization.createProgressChart(progressData);
      const dataPoint = chart.querySelector('circle');
      const tooltip = dataPoint?.querySelector('title');

      expect(tooltip).toBeTruthy();
      expect(tooltip?.textContent).toContain('Session 1: 3 steps completed');
    });
  });

  describe('Skill Radar Chart Creation', () => {
    test('should create skill radar chart with data', () => {
      const skillsData: SkillAcquisition[] = [
        {
          skillName: 'UI Design',
          category: 'design',
          proficiencyLevel: 0.8,
          acquisitionTime: 30,
          practiceCount: 5,
          lastPracticed: new Date(),
          retentionScore: 0.9,
          relatedSkills: []
        },
        {
          skillName: 'Project Setup',
          category: 'technical',
          proficiencyLevel: 0.6,
          acquisitionTime: 20,
          practiceCount: 3,
          lastPracticed: new Date(),
          retentionScore: 0.7,
          relatedSkills: []
        }
      ];

      const chart = progressVisualization.createSkillRadarChart(skillsData);

      expect(chart.className).toBe('skill-radar-chart');
      expect(chart.querySelector('.chart-title')).toBeTruthy();
      expect(chart.querySelector('.radar-chart-svg')).toBeTruthy();
      expect(chart.querySelector('polygon')).toBeTruthy(); // Skill polygon
      expect(chart.querySelectorAll('circle').length).toBe(5); // Grid circles
      expect(chart.querySelectorAll('text').length).toBe(2); // Skill labels
    });

    test('should handle empty skills data', () => {
      const chart = progressVisualization.createSkillRadarChart([]);

      expect(chart.className).toBe('skill-radar-chart');
      expect(chart.querySelector('.no-data')).toBeTruthy();
      expect(chart.querySelector('.no-data')?.textContent).toBe('No skill data available');
    });

    test('should limit skills to top 6 for readability', () => {
      const manySkills: SkillAcquisition[] = Array.from({ length: 10 }, (_, i) => ({
        skillName: `Skill ${i + 1}`,
        category: 'general',
        proficiencyLevel: 0.5,
        acquisitionTime: 15,
        practiceCount: 2,
        lastPracticed: new Date(),
        retentionScore: 0.6,
        relatedSkills: []
      }));

      const chart = progressVisualization.createSkillRadarChart(manySkills);
      const skillLabels = chart.querySelectorAll('text');

      expect(skillLabels.length).toBe(6); // Should limit to 6 skills
    });
  });

  describe('Performance Chart Creation', () => {
    test('should create performance metrics bar chart', () => {
      const chart = progressVisualization.createPerformanceChart(mockAnalytics.performanceMetrics);

      expect(chart.className).toBe('performance-chart');
      expect(chart.querySelector('.chart-title')).toBeTruthy();
      expect(chart.querySelector('.performance-bars')).toBeTruthy();
      expect(chart.querySelectorAll('.performance-bar-row').length).toBe(5); // 5 metrics
    });

    test('should display correct performance values', () => {
      const chart = progressVisualization.createPerformanceChart(mockAnalytics.performanceMetrics);
      
      const labels = Array.from(chart.querySelectorAll('.performance-label'))
        .map(el => el.textContent);
      const values = Array.from(chart.querySelectorAll('.performance-value'))
        .map(el => el.textContent);

      expect(labels).toContain('Learning Velocity');
      expect(labels).toContain('Concept Retention');
      expect(labels).toContain('Tool Mastery');
      expect(labels).toContain('Engagement Level');
      expect(labels).toContain('Time Optimization');

      // Check that values are properly formatted as percentages
      expect(values.some(v => v?.includes('%'))).toBe(true);
    });

    test('should set correct bar widths based on values', () => {
      const chart = progressVisualization.createPerformanceChart(mockAnalytics.performanceMetrics);
      
      const bars = Array.from(chart.querySelectorAll('.performance-bar')) as HTMLElement[];
      
      bars.forEach(bar => {
        const width = parseFloat(bar.style.width);
        expect(width).toBeGreaterThanOrEqual(0);
        expect(width).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Report Generation', () => {
    test('should generate comprehensive learning report', async () => {
      const report = await progressVisualization.generateReport('user-123');

      expect(report).toBeDefined();
      expect(report.userId).toBe('user-123');
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.summary).toBeDefined();
      expect(report.skillAnalysis).toBeDefined();
      expect(report.performanceMetrics).toBeDefined();
      expect(report.insights).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.achievements).toBeDefined();
    });

    test('should include correct summary data in report', async () => {
      const report = await progressVisualization.generateReport('user-123');

      expect(report.summary.totalSessions).toBe(5);
      expect(report.summary.totalStepsCompleted).toBe(25);
      expect(report.summary.averageSessionDuration).toBe(30);
      expect(report.summary.overallSatisfaction).toBe(4.2);
    });

    test('should include skill analysis in report', async () => {
      const report = await progressVisualization.generateReport('user-123');

      expect(report.skillAnalysis.totalSkillsAcquired).toBe(8);
      expect(report.skillAnalysis.averageProficiency).toBe(0.7);
      expect(Array.isArray(report.skillAnalysis.topSkills)).toBe(true);
      expect(Array.isArray(report.skillAnalysis.improvementAreas)).toBe(true);
    });

    test('should include performance metrics in report', async () => {
      const report = await progressVisualization.generateReport('user-123');

      expect(report.performanceMetrics.learningVelocity).toBe(12);
      expect(report.performanceMetrics.errorRate).toBe(0.2);
      expect(report.performanceMetrics.engagementLevel).toBe(0.9);
      expect(report.performanceMetrics.adaptationEffectiveness).toBe(0.8);
    });
  });

  describe('Data Export', () => {
    test('should export data as JSON', async () => {
      const blob = await progressVisualization.exportData('user-123', 'json');

      expect(blob.type).toBe('application/json');
      expect(blob.size).toBeGreaterThan(0);

      // Verify JSON content
      const text = await blob.text();
      const data = JSON.parse(text);
      expect(data.userId).toBe('user-123');
    });

    test('should export data as CSV', async () => {
      const blob = await progressVisualization.exportData('user-123', 'csv');

      expect(blob.type).toBe('text/csv');
      expect(blob.size).toBeGreaterThan(0);

      // Verify CSV content
      const text = await blob.text();
      expect(text).toContain('Metric,Value');
      expect(text).toContain('Total Sessions,5');
      expect(text).toContain('Steps Completed,25');
    });

    test('should export data as PDF', async () => {
      const blob = await progressVisualization.exportData('user-123', 'pdf');

      expect(blob.type).toBe('text/plain'); // Simplified PDF implementation
      expect(blob.size).toBeGreaterThan(0);

      // Verify PDF content
      const text = await blob.text();
      expect(text).toContain('Learning Analytics Report');
      expect(text).toContain('OVERVIEW');
      expect(text).toContain('PERFORMANCE METRICS');
    });

    test('should throw error for unsupported export format', async () => {
      await expect(
        progressVisualization.exportData('user-123', 'xml' as any)
      ).rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('UI Interaction', () => {
    test('should create export buttons with click handlers', async () => {
      await progressVisualization.displayDashboard('user-123');

      const exportButtons = mockContainer.querySelectorAll('.export-button');
      expect(exportButtons.length).toBe(3); // JSON, CSV, PDF

      const jsonButton = Array.from(exportButtons).find(btn => 
        btn.textContent === 'Export as JSON'
      ) as HTMLButtonElement;
      
      expect(jsonButton).toBeTruthy();
      expect(jsonButton.onclick).toBeDefined();
    });

    test('should display insights and recommendations', async () => {
      await progressVisualization.displayDashboard('user-123');

      const insightsList = mockContainer.querySelector('.insights-list');
      expect(insightsList).toBeTruthy();

      const listItems = insightsList?.querySelectorAll('li');
      expect(listItems?.length).toBe(4); // 2 insights + 2 recommendations

      const itemTexts = Array.from(listItems || []).map(li => li.textContent);
      expect(itemTexts).toContain('Strong performance in design tasks');
      expect(itemTexts).toContain('Try more complex projects');
    });

    test('should apply correct CSS classes for styling', async () => {
      await progressVisualization.displayDashboard('user-123');

      expect(mockContainer.querySelector('.progress-dashboard')).toBeTruthy();
      expect(mockContainer.querySelectorAll('.dashboard-section').length).toBeGreaterThan(0);
      expect(mockContainer.querySelectorAll('.section-title').length).toBeGreaterThan(0);
      expect(mockContainer.querySelector('.overview-grid')).toBeTruthy();
      expect(mockContainer.querySelectorAll('.overview-card').length).toBe(4);
    });
  });

  describe('Error Handling', () => {
    test('should handle analytics engine errors gracefully', async () => {
      mockAnalyticsEngine.getComprehensiveAnalytics.mockRejectedValue(
        new Error('Analytics service unavailable')
      );

      await progressVisualization.displayDashboard('user-123');

      expect(mockContainer.querySelector('.error-message')).toBeTruthy();
      expect(mockContainer.textContent).toContain('Failed to load analytics dashboard');
    });

    test('should handle export errors gracefully', async () => {
      mockAnalyticsEngine.getComprehensiveAnalytics.mockRejectedValue(
        new Error('Export failed')
      );

      // Mock alert to capture error messages
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      await progressVisualization.displayDashboard('user-123');

      // Try to trigger export (would fail due to analytics error)
      const exportButton = mockContainer.querySelector('.export-button') as HTMLButtonElement;
      if (exportButton) {
        exportButton.click();
        
        // Wait for async operation
        await new Promise(resolve => setTimeout(resolve, 0));
        
        expect(alertSpy).toHaveBeenCalledWith('Export failed. Please try again.');
      }

      alertSpy.mockRestore();
    });

    test('should handle missing container gracefully', () => {
      const invalidContainer = null as any;
      
      expect(() => {
        new ProgressVisualization(mockAnalyticsEngine, invalidContainer);
      }).toThrow();
    });
  });

  describe('Chart Responsiveness', () => {
    test('should create responsive SVG charts', () => {
      const progressData: LearningProgress[] = [{
        id: '1', userId: 'user-123', sessionId: 'session-1', startTime: new Date(),
        totalSteps: 5, completedSteps: 3, skippedSteps: 0, failedSteps: 2,
        averageStepTime: 15, skillsAcquired: [], challengesEncountered: [],
        overallSatisfaction: 4, learningEfficiency: 0.6, adaptationsMade: 1,
        toolsUsed: [], outcomes: [], analytics: {
          learningVelocity: 12, errorRate: 0.4, helpRequestFrequency: 1,
          conceptRetention: 0.8, toolProficiency: [], learningPatterns: [],
          improvementAreas: [], strengths: []
        }
      }];

      const chart = progressVisualization.createProgressChart(progressData);
      const svg = chart.querySelector('svg');

      expect(svg?.getAttribute('width')).toBe('100%');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 800 300');
    });

    test('should handle different screen sizes in radar chart', () => {
      const skills: SkillAcquisition[] = [{
        skillName: 'Test Skill',
        category: 'test',
        proficiencyLevel: 0.5,
        acquisitionTime: 10,
        practiceCount: 1,
        lastPracticed: new Date(),
        retentionScore: 0.6,
        relatedSkills: []
      }];

      const chart = progressVisualization.createSkillRadarChart(skills);
      const svg = chart.querySelector('svg');

      expect(svg?.getAttribute('width')).toBe('100%');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 300 300');
    });
  });
});