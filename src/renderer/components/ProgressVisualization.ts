import { AnalyticsEngine, ComprehensiveAnalytics, EfficiencyMetrics } from '../../core/AnalyticsEngine';
import { LearningProgress, SkillAcquisition, ToolProficiency } from '../../types/user';

/**
 * Progress visualization component for displaying learning analytics
 * Provides visual dashboards, charts, and reporting functionality
 */
export class ProgressVisualization {
  private analyticsEngine: AnalyticsEngine;
  private container: HTMLElement;
  private currentUserId: string | null = null;

  constructor(analyticsEngine: AnalyticsEngine, container: HTMLElement) {
    this.analyticsEngine = analyticsEngine;
    this.container = container;
    this.initializeStyles();
  }

  /**
   * Display comprehensive dashboard for a user
   */
  async displayDashboard(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    try {
      const analytics = await this.analyticsEngine.getComprehensiveAnalytics(userId);
      
      this.container.innerHTML = '';
      
      // Create dashboard layout
      const dashboard = this.createDashboardLayout();
      
      // Add dashboard sections
      dashboard.appendChild(this.createOverviewSection(analytics));
      dashboard.appendChild(this.createProgressChartsSection(analytics));
      dashboard.appendChild(this.createSkillAnalysisSection(analytics));
      dashboard.appendChild(this.createPerformanceMetricsSection(analytics));
      dashboard.appendChild(this.createInsightsSection(analytics));
      dashboard.appendChild(this.createExportSection(analytics));
      
      this.container.appendChild(dashboard);
      
    } catch (error) {
      console.error('Error displaying dashboard:', error);
      this.displayError('Failed to load analytics dashboard');
    }
  }

  /**
   * Create learning progress chart
   */
  createProgressChart(progressData: LearningProgress[]): HTMLElement {
    const chartContainer = document.createElement('div');
    chartContainer.className = 'progress-chart';
    
    const title = document.createElement('h3');
    title.textContent = 'Learning Progress Over Time';
    title.className = 'chart-title';
    chartContainer.appendChild(title);
    
    if (progressData.length === 0) {
      const noData = document.createElement('div');
      noData.textContent = 'No progress data available';
      noData.className = 'no-data';
      chartContainer.appendChild(noData);
      return chartContainer;
    }
    
    // Create SVG chart
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '300');
    svg.setAttribute('viewBox', '0 0 800 300');
    svg.setAttribute('class', 'progress-chart-svg');
    
    // Chart dimensions
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    // Create chart group
    const chartGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    chartGroup.setAttribute('transform', `translate(${margin.left},${margin.top})`);
    
    // Calculate scales
    const maxSteps = Math.max(...progressData.map(p => p.completedSteps));
    const xScale = width / (progressData.length - 1 || 1);
    const yScale = height / (maxSteps || 1);
    
    // Create line path
    let pathData = '';
    progressData.forEach((progress, index) => {
      const x = index * xScale;
      const y = height - (progress.completedSteps * yScale);
      pathData += index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    
    // Add line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', pathData);
    line.setAttribute('stroke', '#4CAF50');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('fill', 'none');
    chartGroup.appendChild(line);
    
    // Add data points
    progressData.forEach((progress, index) => {
      const x = index * xScale;
      const y = height - (progress.completedSteps * yScale);
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x.toString());
      circle.setAttribute('cy', y.toString());
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', '#4CAF50');
      circle.setAttribute('class', 'data-point');
      
      // Add tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `Session ${index + 1}: ${progress.completedSteps} steps completed`;
      circle.appendChild(title);
      
      chartGroup.appendChild(circle);
    });
    
    // Add axes
    this.addAxes(chartGroup, width, height, maxSteps, progressData.length);
    
    svg.appendChild(chartGroup);
    chartContainer.appendChild(svg);
    
    return chartContainer;
  }

  /**
   * Create skill proficiency radar chart
   */
  createSkillRadarChart(skills: SkillAcquisition[]): HTMLElement {
    const chartContainer = document.createElement('div');
    chartContainer.className = 'skill-radar-chart';
    
    const title = document.createElement('h3');
    title.textContent = 'Skill Proficiency';
    title.className = 'chart-title';
    chartContainer.appendChild(title);
    
    if (skills.length === 0) {
      const noData = document.createElement('div');
      noData.textContent = 'No skill data available';
      noData.className = 'no-data';
      chartContainer.appendChild(noData);
      return chartContainer;
    }
    
    // Create SVG radar chart
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '300');
    svg.setAttribute('viewBox', '0 0 300 300');
    svg.setAttribute('class', 'radar-chart-svg');
    
    const centerX = 150;
    const centerY = 150;
    const radius = 100;
    
    // Create radar grid
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.setAttribute('class', 'radar-grid');
    
    // Add concentric circles
    for (let i = 1; i <= 5; i++) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', centerX.toString());
      circle.setAttribute('cy', centerY.toString());
      circle.setAttribute('r', (radius * i / 5).toString());
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', '#e0e0e0');
      circle.setAttribute('stroke-width', '1');
      gridGroup.appendChild(circle);
    }
    
    // Add skill data (limit to top 6 skills for readability)
    const topSkills = skills.slice(0, 6);
    const angleStep = (2 * Math.PI) / topSkills.length;
    
    // Create skill polygon
    let polygonPoints = '';
    topSkills.forEach((skill, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const skillRadius = radius * skill.proficiencyLevel;
      const x = centerX + skillRadius * Math.cos(angle);
      const y = centerY + skillRadius * Math.sin(angle);
      polygonPoints += `${x},${y} `;
      
      // Add skill labels
      const labelRadius = radius + 20;
      const labelX = centerX + labelRadius * Math.cos(angle);
      const labelY = centerY + labelRadius * Math.sin(angle);
      
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', labelX.toString());
      label.setAttribute('y', labelY.toString());
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'middle');
      label.setAttribute('font-size', '12');
      label.setAttribute('fill', '#333');
      label.textContent = skill.skillName;
      gridGroup.appendChild(label);
    });
    
    // Add skill polygon
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', polygonPoints.trim());
    polygon.setAttribute('fill', 'rgba(76, 175, 80, 0.3)');
    polygon.setAttribute('stroke', '#4CAF50');
    polygon.setAttribute('stroke-width', '2');
    gridGroup.appendChild(polygon);
    
    svg.appendChild(gridGroup);
    chartContainer.appendChild(svg);
    
    return chartContainer;
  }

  /**
   * Create performance metrics bar chart
   */
  createPerformanceChart(metrics: EfficiencyMetrics): HTMLElement {
    const chartContainer = document.createElement('div');
    chartContainer.className = 'performance-chart';
    
    const title = document.createElement('h3');
    title.textContent = 'Performance Metrics';
    title.className = 'chart-title';
    chartContainer.appendChild(title);
    
    const metricsData = [
      { label: 'Learning Velocity', value: metrics.learningVelocity / 10, unit: 'steps/hr' }, // Normalize for display
      { label: 'Concept Retention', value: metrics.conceptRetention, unit: '%' },
      { label: 'Tool Mastery', value: metrics.toolMastery, unit: '%' },
      { label: 'Engagement Level', value: metrics.engagementLevel, unit: '%' },
      { label: 'Time Optimization', value: metrics.timeOptimization, unit: '%' }
    ];
    
    const barsContainer = document.createElement('div');
    barsContainer.className = 'performance-bars';
    
    metricsData.forEach(metric => {
      const barRow = document.createElement('div');
      barRow.className = 'performance-bar-row';
      
      const label = document.createElement('div');
      label.className = 'performance-label';
      label.textContent = metric.label;
      
      const barContainer = document.createElement('div');
      barContainer.className = 'performance-bar-container';
      
      const bar = document.createElement('div');
      bar.className = 'performance-bar';
      bar.style.width = `${Math.min(metric.value * 100, 100)}%`;
      
      const value = document.createElement('div');
      value.className = 'performance-value';
      value.textContent = `${(metric.value * 100).toFixed(1)}${metric.unit === '%' ? '%' : ''}`;
      
      barContainer.appendChild(bar);
      barRow.appendChild(label);
      barRow.appendChild(barContainer);
      barRow.appendChild(value);
      
      barsContainer.appendChild(barRow);
    });
    
    chartContainer.appendChild(barsContainer);
    return chartContainer;
  }

  /**
   * Generate learning report
   */
  async generateReport(userId: string): Promise<LearningReport> {
    const analytics = await this.analyticsEngine.getComprehensiveAnalytics(userId);
    
    const report: LearningReport = {
      userId,
      generatedAt: new Date(),
      summary: {
        totalSessions: analytics.progressSummary.totalSessions,
        totalStepsCompleted: analytics.progressSummary.totalStepsCompleted,
        averageSessionDuration: analytics.progressSummary.averageSessionDuration,
        overallSatisfaction: analytics.progressSummary.overallSatisfaction
      },
      skillAnalysis: {
        totalSkillsAcquired: analytics.skillAnalysis.totalSkills,
        averageProficiency: analytics.skillAnalysis.averageProficiency,
        topSkills: this.getTopSkills(analytics),
        improvementAreas: this.getImprovementAreas(analytics)
      },
      performanceMetrics: {
        learningVelocity: analytics.performanceMetrics.learningVelocity,
        errorRate: analytics.performanceMetrics.errorRate,
        engagementLevel: analytics.performanceMetrics.engagementLevel,
        adaptationEffectiveness: analytics.performanceMetrics.adaptationEffectiveness
      },
      insights: analytics.insights,
      recommendations: analytics.recommendations,
      trends: this.analyzeTrends(analytics),
      achievements: this.identifyAchievements(analytics)
    };
    
    return report;
  }

  /**
   * Export progress data in various formats
   */
  async exportData(userId: string, format: 'json' | 'csv' | 'pdf'): Promise<Blob> {
    const analytics = await this.analyticsEngine.getComprehensiveAnalytics(userId);
    
    switch (format) {
      case 'json':
        return this.exportAsJSON(analytics);
      case 'csv':
        return this.exportAsCSV(analytics);
      case 'pdf':
        return this.exportAsPDF(analytics);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private helper methods

  private initializeStyles(): void {
    const styles = `
      .progress-dashboard {
        padding: 20px;
        background: #f5f5f5;
        min-height: 100vh;
      }
      
      .dashboard-section {
        background: white;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .section-title {
        font-size: 1.5em;
        font-weight: bold;
        margin-bottom: 15px;
        color: #333;
      }
      
      .chart-title {
        font-size: 1.2em;
        font-weight: 600;
        margin-bottom: 10px;
        color: #555;
      }
      
      .progress-chart-svg {
        border: 1px solid #e0e0e0;
        border-radius: 4px;
      }
      
      .data-point:hover {
        r: 6;
        fill: #2196F3;
      }
      
      .performance-bars {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      
      .performance-bar-row {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      .performance-label {
        min-width: 150px;
        font-weight: 500;
        color: #555;
      }
      
      .performance-bar-container {
        flex: 1;
        height: 20px;
        background: #e0e0e0;
        border-radius: 10px;
        overflow: hidden;
      }
      
      .performance-bar {
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #8BC34A);
        transition: width 0.3s ease;
      }
      
      .performance-value {
        min-width: 60px;
        text-align: right;
        font-weight: 600;
        color: #333;
      }
      
      .overview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
      }
      
      .overview-card {
        text-align: center;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px;
      }
      
      .overview-value {
        font-size: 2em;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .overview-label {
        font-size: 0.9em;
        opacity: 0.9;
      }
      
      .insights-list {
        list-style: none;
        padding: 0;
      }
      
      .insights-list li {
        padding: 10px;
        margin-bottom: 8px;
        background: #f8f9fa;
        border-left: 4px solid #4CAF50;
        border-radius: 4px;
      }
      
      .export-buttons {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      
      .export-button {
        padding: 10px 20px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.3s ease;
      }
      
      .export-button:hover {
        background: #1976D2;
      }
      
      .no-data {
        text-align: center;
        color: #999;
        font-style: italic;
        padding: 40px;
      }
      
      .error-message {
        color: #f44336;
        background: #ffebee;
        padding: 15px;
        border-radius: 4px;
        border-left: 4px solid #f44336;
      }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  private createDashboardLayout(): HTMLElement {
    const dashboard = document.createElement('div');
    dashboard.className = 'progress-dashboard';
    return dashboard;
  }

  private createOverviewSection(analytics: ComprehensiveAnalytics): HTMLElement {
    const section = document.createElement('div');
    section.className = 'dashboard-section';
    
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Learning Overview';
    section.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'overview-grid';
    
    const overviewData = [
      { label: 'Total Sessions', value: analytics.progressSummary.totalSessions },
      { label: 'Steps Completed', value: analytics.progressSummary.totalStepsCompleted },
      { label: 'Skills Acquired', value: analytics.skillAnalysis.totalSkills },
      { label: 'Avg Satisfaction', value: `${(analytics.progressSummary.overallSatisfaction * 20).toFixed(1)}%` }
    ];
    
    overviewData.forEach(item => {
      const card = document.createElement('div');
      card.className = 'overview-card';
      
      const value = document.createElement('div');
      value.className = 'overview-value';
      value.textContent = item.value.toString();
      
      const label = document.createElement('div');
      label.className = 'overview-label';
      label.textContent = item.label;
      
      card.appendChild(value);
      card.appendChild(label);
      grid.appendChild(card);
    });
    
    section.appendChild(grid);
    return section;
  }

  private createProgressChartsSection(analytics: ComprehensiveAnalytics): HTMLElement {
    const section = document.createElement('div');
    section.className = 'dashboard-section';
    
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Progress Charts';
    section.appendChild(title);
    
    // For demo purposes, create sample progress data
    const sampleProgress: LearningProgress[] = [
      {
        id: '1', userId: analytics.userId, sessionId: '1', startTime: new Date(),
        totalSteps: 5, completedSteps: 3, skippedSteps: 0, failedSteps: 2,
        averageStepTime: 15, skillsAcquired: [], challengesEncountered: [],
        overallSatisfaction: 4, learningEfficiency: 0.6, adaptationsMade: 1,
        toolsUsed: [], outcomes: [], analytics: {
          learningVelocity: 12, errorRate: 0.4, helpRequestFrequency: 2,
          conceptRetention: 0.7, toolProficiency: [], learningPatterns: [],
          improvementAreas: [], strengths: []
        }
      }
    ];
    
    section.appendChild(this.createProgressChart(sampleProgress));
    return section;
  }

  private createSkillAnalysisSection(analytics: ComprehensiveAnalytics): HTMLElement {
    const section = document.createElement('div');
    section.className = 'dashboard-section';
    
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Skill Analysis';
    section.appendChild(title);
    
    // Create sample skills data for visualization
    const sampleSkills: SkillAcquisition[] = [
      { skillName: 'UI Design', category: 'design', proficiencyLevel: 0.8, acquisitionTime: 30, practiceCount: 5, lastPracticed: new Date(), retentionScore: 0.9, relatedSkills: [] },
      { skillName: 'Project Setup', category: 'technical', proficiencyLevel: 0.6, acquisitionTime: 20, practiceCount: 3, lastPracticed: new Date(), retentionScore: 0.7, relatedSkills: [] },
      { skillName: 'Deployment', category: 'technical', proficiencyLevel: 0.4, acquisitionTime: 45, practiceCount: 2, lastPracticed: new Date(), retentionScore: 0.5, relatedSkills: [] }
    ];
    
    section.appendChild(this.createSkillRadarChart(sampleSkills));
    return section;
  }

  private createPerformanceMetricsSection(analytics: ComprehensiveAnalytics): HTMLElement {
    const section = document.createElement('div');
    section.className = 'dashboard-section';
    
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Performance Metrics';
    section.appendChild(title);
    
    section.appendChild(this.createPerformanceChart(analytics.performanceMetrics));
    return section;
  }

  private createInsightsSection(analytics: ComprehensiveAnalytics): HTMLElement {
    const section = document.createElement('div');
    section.className = 'dashboard-section';
    
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Insights & Recommendations';
    section.appendChild(title);
    
    const insightsList = document.createElement('ul');
    insightsList.className = 'insights-list';
    
    [...analytics.insights, ...analytics.recommendations].forEach(insight => {
      const listItem = document.createElement('li');
      listItem.textContent = insight;
      insightsList.appendChild(listItem);
    });
    
    section.appendChild(insightsList);
    return section;
  }

  private createExportSection(analytics: ComprehensiveAnalytics): HTMLElement {
    const section = document.createElement('div');
    section.className = 'dashboard-section';
    
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Export Data';
    section.appendChild(title);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'export-buttons';
    
    const formats = [
      { format: 'json', label: 'Export as JSON' },
      { format: 'csv', label: 'Export as CSV' },
      { format: 'pdf', label: 'Export as PDF' }
    ];
    
    formats.forEach(({ format, label }) => {
      const button = document.createElement('button');
      button.className = 'export-button';
      button.textContent = label;
      button.addEventListener('click', async () => {
        try {
          const blob = await this.exportData(analytics.userId, format as any);
          this.downloadBlob(blob, `learning-report.${format}`);
        } catch (error) {
          console.error('Export failed:', error);
          alert('Export failed. Please try again.');
        }
      });
      buttonsContainer.appendChild(button);
    });
    
    section.appendChild(buttonsContainer);
    return section;
  }

  private addAxes(group: SVGGElement, width: number, height: number, maxValue: number, dataPoints: number): void {
    // Y-axis
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', '0');
    yAxis.setAttribute('y1', '0');
    yAxis.setAttribute('x2', '0');
    yAxis.setAttribute('y2', height.toString());
    yAxis.setAttribute('stroke', '#666');
    yAxis.setAttribute('stroke-width', '1');
    group.appendChild(yAxis);
    
    // X-axis
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', '0');
    xAxis.setAttribute('y1', height.toString());
    xAxis.setAttribute('x2', width.toString());
    xAxis.setAttribute('y2', height.toString());
    xAxis.setAttribute('stroke', '#666');
    xAxis.setAttribute('stroke-width', '1');
    group.appendChild(xAxis);
  }

  private getTopSkills(analytics: ComprehensiveAnalytics): string[] {
    // Placeholder - would extract from actual skill data
    return ['UI Design', 'Project Setup', 'Component Creation'];
  }

  private getImprovementAreas(analytics: ComprehensiveAnalytics): string[] {
    // Placeholder - would extract from actual analytics
    return ['Deployment', 'Testing', 'Performance Optimization'];
  }

  private analyzeTrends(analytics: ComprehensiveAnalytics): string[] {
    // Placeholder for trend analysis
    return ['Improving learning velocity', 'Consistent engagement levels'];
  }

  private identifyAchievements(analytics: ComprehensiveAnalytics): string[] {
    // Placeholder for achievement identification
    return ['Completed first project', 'Mastered UI design basics'];
  }

  private exportAsJSON(analytics: ComprehensiveAnalytics): Blob {
    const jsonData = JSON.stringify(analytics, null, 2);
    return new Blob([jsonData], { type: 'application/json' });
  }

  private exportAsCSV(analytics: ComprehensiveAnalytics): Blob {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Sessions', analytics.progressSummary.totalSessions],
      ['Steps Completed', analytics.progressSummary.totalStepsCompleted],
      ['Average Session Duration', analytics.progressSummary.averageSessionDuration],
      ['Overall Satisfaction', analytics.progressSummary.overallSatisfaction],
      ['Learning Velocity', analytics.performanceMetrics.learningVelocity],
      ['Error Rate', analytics.performanceMetrics.errorRate],
      ['Engagement Level', analytics.performanceMetrics.engagementLevel]
    ];
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return new Blob([csvContent], { type: 'text/csv' });
  }

  private exportAsPDF(analytics: ComprehensiveAnalytics): Blob {
    // Simplified PDF export - in a real implementation, you'd use a PDF library
    const pdfContent = `
Learning Analytics Report
Generated: ${analytics.generatedAt.toLocaleDateString()}

OVERVIEW
Total Sessions: ${analytics.progressSummary.totalSessions}
Steps Completed: ${analytics.progressSummary.totalStepsCompleted}
Skills Acquired: ${analytics.skillAnalysis.totalSkills}

PERFORMANCE METRICS
Learning Velocity: ${analytics.performanceMetrics.learningVelocity.toFixed(2)}
Error Rate: ${(analytics.performanceMetrics.errorRate * 100).toFixed(1)}%
Engagement Level: ${(analytics.performanceMetrics.engagementLevel * 100).toFixed(1)}%

INSIGHTS
${analytics.insights.join('\n')}

RECOMMENDATIONS
${analytics.recommendations.join('\n')}
    `;
    
    return new Blob([pdfContent], { type: 'text/plain' });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private displayError(message: string): void {
    this.container.innerHTML = `
      <div class="error-message">
        <strong>Error:</strong> ${message}
      </div>
    `;
  }
}

// Supporting interfaces
export interface LearningReport {
  userId: string;
  generatedAt: Date;
  summary: {
    totalSessions: number;
    totalStepsCompleted: number;
    averageSessionDuration: number;
    overallSatisfaction: number;
  };
  skillAnalysis: {
    totalSkillsAcquired: number;
    averageProficiency: number;
    topSkills: string[];
    improvementAreas: string[];
  };
  performanceMetrics: {
    learningVelocity: number;
    errorRate: number;
    engagementLevel: number;
    adaptationEffectiveness: number;
  };
  insights: string[];
  recommendations: string[];
  trends: string[];
  achievements: string[];
}