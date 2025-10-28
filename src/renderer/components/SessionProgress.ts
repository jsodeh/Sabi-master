/**
 * Session progress component for tracking learning session progress
 */

import { LearningProgress } from '../../types/user';

export interface SessionProgressState {
  sessionId: string | null;
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  currentStepTitle: string;
  estimatedTimeRemaining: number; // in minutes
  skillsAcquired: string[];
  progress: LearningProgress | null;
}

export class SessionProgress {
  private state: SessionProgressState;
  private container: HTMLElement;
  private callbacks: {
    onStepNavigation?: (stepIndex: number) => void;
    onSessionEnd?: () => void;
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.state = {
      sessionId: null,
      isActive: false,
      currentStep: 0,
      totalSteps: 0,
      completedSteps: 0,
      currentStepTitle: '',
      estimatedTimeRemaining: 0,
      skillsAcquired: [],
      progress: null
    };
    this.callbacks = {};
    this.initialize();
  }

  private initialize(): void {
    this.render();
    this.attachEventListeners();
  }

  public onStepNavigation(callback: (stepIndex: number) => void): void {
    this.callbacks.onStepNavigation = callback;
  }

  public onSessionEnd(callback: () => void): void {
    this.callbacks.onSessionEnd = callback;
  }

  public updateProgress(updates: Partial<SessionProgressState>): void {
    this.state = { ...this.state, ...updates };
    this.render();
  }

  public startSession(sessionId: string, totalSteps: number): void {
    this.state = {
      ...this.state,
      sessionId,
      isActive: true,
      totalSteps,
      currentStep: 0,
      completedSteps: 0,
      currentStepTitle: 'Initializing...',
      skillsAcquired: []
    };
    this.render();
  }

  public completeStep(stepTitle: string, skillsAcquired: string[] = []): void {
    this.state.completedSteps += 1;
    this.state.currentStep += 1;
    this.state.currentStepTitle = stepTitle;
    this.state.skillsAcquired = [...this.state.skillsAcquired, ...skillsAcquired];
    this.render();
  }

  public endSession(): void {
    this.state.isActive = false;
    this.state.sessionId = null;
    this.render();
  }

  private render(): void {
    if (!this.state.isActive) {
      this.container.innerHTML = '';
      return;
    }

    const progressPercentage = this.state.totalSteps > 0 
      ? (this.state.completedSteps / this.state.totalSteps) * 100 
      : 0;

    this.container.innerHTML = `
      <div class="session-progress">
        <div class="progress-header">
          <div class="session-info">
            <h3>Learning Session Progress</h3>
            <div class="session-stats">
              <span class="stat">
                <span class="stat-label">Steps:</span>
                <span class="stat-value">${this.state.completedSteps}/${this.state.totalSteps}</span>
              </span>
              <span class="stat">
                <span class="stat-label">Skills:</span>
                <span class="stat-value">${this.state.skillsAcquired.length}</span>
              </span>
              ${this.state.estimatedTimeRemaining > 0 ? `
                <span class="stat">
                  <span class="stat-label">Time left:</span>
                  <span class="stat-value">${this.formatTime(this.state.estimatedTimeRemaining)}</span>
                </span>
              ` : ''}
            </div>
          </div>
          <button class="end-session-btn" id="endSession">End Session</button>
        </div>

        <div class="progress-visualization">
          <div class="progress-bar-container">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercentage}%"></div>
            </div>
            <div class="progress-percentage">${Math.round(progressPercentage)}%</div>
          </div>

          <div class="current-step-info">
            <div class="step-indicator">
              <span class="step-number">${this.state.currentStep + 1}</span>
              <span class="step-total">of ${this.state.totalSteps}</span>
            </div>
            <div class="step-title">${this.state.currentStepTitle}</div>
          </div>
        </div>

        ${this.renderStepNavigation()}
        ${this.renderSkillsAcquired()}
      </div>
    `;
  }

  private renderStepNavigation(): string {
    if (this.state.totalSteps <= 1) return '';

    const steps = Array.from({ length: this.state.totalSteps }, (_, i) => i);
    
    return `
      <div class="step-navigation">
        <div class="step-dots">
          ${steps.map(stepIndex => `
            <button 
              class="step-dot ${stepIndex < this.state.completedSteps ? 'completed' : ''} 
                              ${stepIndex === this.state.currentStep ? 'current' : ''}"
              data-step="${stepIndex}"
              ${stepIndex > this.state.currentStep ? 'disabled' : ''}
            >
              ${stepIndex + 1}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderSkillsAcquired(): string {
    if (this.state.skillsAcquired.length === 0) return '';

    return `
      <div class="skills-acquired">
        <h4>Skills Acquired</h4>
        <div class="skills-list">
          ${this.state.skillsAcquired.map(skill => `
            <span class="skill-badge">${skill}</span>
          `).join('')}
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target.id === 'endSession') {
        this.handleEndSession();
      } else if (target.classList.contains('step-dot') && !target.hasAttribute('disabled')) {
        const stepIndex = parseInt(target.dataset.step || '0');
        this.handleStepNavigation(stepIndex);
      }
    });
  }

  private handleEndSession(): void {
    if (confirm('Are you sure you want to end this learning session?')) {
      this.callbacks.onSessionEnd?.();
      this.endSession();
    }
  }

  private handleStepNavigation(stepIndex: number): void {
    this.callbacks.onStepNavigation?.(stepIndex);
  }

  private formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  }
}