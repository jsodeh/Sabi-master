/**
 * Main interface controller that orchestrates all UI components
 */

import { LearningInterface, LearningInterfaceState } from './LearningInterface';
import { SessionProgress, SessionProgressState } from './SessionProgress';
import { SettingsPanel, SettingsPanelState } from './SettingsPanel';
import { DocumentationAdmin } from './DocumentationAdmin';
import { LearningRequest } from '../../types/learning';
import { ExtendedUserPreferences } from '../../types/user';

export interface MainInterfaceState {
  isInitialized: boolean;
  currentView: 'welcome' | 'learning' | 'settings';
  sessionActive: boolean;
  preferences: ExtendedUserPreferences;
}

export class MainInterface {
  private state: MainInterfaceState;
  private learningInterface!: LearningInterface;
  private sessionProgress!: SessionProgress;
  private settingsPanel!: SettingsPanel;
  private callbacks: {
    onLearningRequest?: (request: LearningRequest) => void;
    onSessionControl?: (action: 'start' | 'pause' | 'resume' | 'stop') => void;
    onPreferencesChange?: (preferences: ExtendedUserPreferences) => void;
  };

  constructor() {
    this.state = {
      isInitialized: false,
      currentView: 'welcome',
      sessionActive: false,
      preferences: this.getDefaultPreferences()
    };
    this.callbacks = {};
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize components
      const learningContainer = document.querySelector('.learning-interface') as HTMLElement;
      const progressContainer = document.getElementById('sessionProgressContainer') as HTMLElement;
      const settingsContainer = document.body; // Settings overlay attaches to body

      if (!learningContainer || !progressContainer) {
        throw new Error('Required DOM elements not found');
      }

      this.learningInterface = new LearningInterface(learningContainer);
      this.sessionProgress = new SessionProgress(progressContainer);
      this.settingsPanel = new SettingsPanel(settingsContainer, this.state.preferences);

      // Set up component callbacks
      this.setupComponentCallbacks();

      // Set up main interface event listeners
      this.setupEventListeners();

      // Apply initial preferences
      this.applyPreferences(this.state.preferences);

      this.state.isInitialized = true;
      console.log('Main interface initialized successfully');

    } catch (error) {
      console.error('Failed to initialize main interface:', error);
      this.showError('Failed to initialize the learning interface. Please refresh the page.');
    }
  }

  private setupComponentCallbacks(): void {
    // Learning interface callbacks
    this.learningInterface.onLearningRequest((request) => {
      this.callbacks.onLearningRequest?.(request);
    });

    this.learningInterface.onInputTypeChange((type) => {
      // Update preferences if needed
      if (this.state.preferences.preferredInputMethod !== type) {
        this.updatePreferences({ preferredInputMethod: type });
      }
    });

    this.learningInterface.onSessionControl((action) => {
      this.handleSessionControl(action);
    });

    // Session progress callbacks
    this.sessionProgress.onStepNavigation((stepIndex) => {
      // Handle step navigation
      console.log('Navigate to step:', stepIndex);
    });

    this.sessionProgress.onSessionEnd(() => {
      this.handleSessionControl('stop');
    });

    // Settings panel callbacks
    this.settingsPanel.onPreferencesChange((preferences) => {
      this.updatePreferences(preferences);
      this.callbacks.onPreferencesChange?.(preferences);
    });

    this.settingsPanel.onClose(() => {
      this.state.currentView = this.state.sessionActive ? 'learning' : 'welcome';
    });
  }

  private setupEventListeners(): void {
    // Get started button
    const getStartedBtn = document.querySelector('.get-started-btn');
    if (getStartedBtn) {
      getStartedBtn.addEventListener('click', () => {
        this.showLearningInterface();
      });
    }

    // Settings button
    const settingsBtn = document.querySelector('.settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.showSettings();
      });
    }

    // Window controls
    const closeBtn = document.querySelector('.control-btn.close');
    const minimizeBtn = document.querySelector('.control-btn.minimize');
    const maximizeBtn = document.querySelector('.control-btn.maximize');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        (window as any).sabiAPI?.window?.close?.();
      });
    }

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        (window as any).sabiAPI?.window?.minimize?.();
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        (window as any).sabiAPI?.window?.maximize?.();
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }

  private handleKeyboardShortcuts(e: KeyboardEvent): void {
    // Cmd/Ctrl + , for settings
    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault();
      this.showSettings();
    }

    // Escape to close modals/settings
    if (e.key === 'Escape') {
      if (this.state.currentView === 'settings') {
        this.settingsPanel.close();
        this.state.currentView = this.state.sessionActive ? 'learning' : 'welcome';
      }
    }

    // Cmd/Ctrl + N for new learning session
    if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !this.state.sessionActive) {
      e.preventDefault();
      this.showLearningInterface();
    }
  }

  // Public API methods
  public onLearningRequest(callback: (request: LearningRequest) => void): void {
    this.callbacks.onLearningRequest = callback;
  }

  public onSessionControl(callback: (action: 'start' | 'pause' | 'resume' | 'stop') => void): void {
    this.callbacks.onSessionControl = callback;
  }

  public onPreferencesChange(callback: (preferences: ExtendedUserPreferences) => void): void {
    this.callbacks.onPreferencesChange = callback;
  }

  public showLearningInterface(): void {
    this.state.currentView = 'learning';
    this.learningInterface.showInterface();
  }

  public showWelcome(): void {
    this.state.currentView = 'welcome';
    this.learningInterface.hideInterface();
  }

  public showSettings(): void {
    this.state.currentView = 'settings';
    this.settingsPanel.open();
  }

  public startLearningSession(sessionId: string, totalSteps: number): void {
    this.state.sessionActive = true;
    this.sessionProgress.startSession(sessionId, totalSteps);
    this.learningInterface.updateState({ isSessionActive: true });
    this.showLearningInterface();
  }

  public updateSessionProgress(updates: Partial<SessionProgressState>): void {
    this.sessionProgress.updateProgress(updates);
  }

  public completeStep(stepTitle: string, skillsAcquired: string[] = []): void {
    this.sessionProgress.completeStep(stepTitle, skillsAcquired);
  }

  public endLearningSession(): void {
    this.state.sessionActive = false;
    this.sessionProgress.endSession();
    this.learningInterface.updateState({ 
      isSessionActive: false,
      sessionProgress: 0,
      currentStep: ''
    });
  }

  public updateLearningInterface(updates: Partial<LearningInterfaceState>): void {
    this.learningInterface.updateState(updates);
  }

  public showError(message: string): void {
    this.learningInterface.updateState({ error: message });
  }

  public clearError(): void {
    this.learningInterface.updateState({ error: null });
  }

  private handleSessionControl(action: 'start' | 'pause' | 'resume' | 'stop'): void {
    this.callbacks.onSessionControl?.(action);
    
    switch (action) {
      case 'start':
        // Session will be started by external controller
        break;
      case 'stop':
        this.endLearningSession();
        break;
      case 'pause':
      case 'resume':
        // Handle pause/resume logic
        break;
    }
  }

  private updatePreferences(updates: Partial<ExtendedUserPreferences>): void {
    this.state.preferences = { ...this.state.preferences, ...updates };
    this.applyPreferences(this.state.preferences);
    this.settingsPanel.updatePreferences(this.state.preferences);
  }

  private applyPreferences(preferences: ExtendedUserPreferences): void {
    this.learningInterface.setPreferences(preferences);
    
    // Apply global theme
    const body = document.body;
    body.className = body.className.replace(/theme-\w+/g, '');
    body.classList.add(`theme-${preferences.theme}`);
    
    // Apply accessibility settings
    body.classList.toggle('high-contrast', preferences.accessibility.highContrast);
    body.classList.toggle('reduced-motion', preferences.accessibility.reducedMotion);
    
    // Apply font size
    const fontSizeMap = { small: '14px', medium: '16px', large: '18px' };
    body.style.fontSize = fontSizeMap[preferences.fontSize];
  }

  private getDefaultPreferences(): ExtendedUserPreferences {
    return {
      explanationDetail: 'moderate',
      learningPace: 'normal',
      preferredInputMethod: 'text',
      enableVoiceGuidance: true,
      showCueCards: true,
      autoAdvance: false,
      theme: 'auto',
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
    };
  }

  // Utility methods
  public getState(): MainInterfaceState {
    return { ...this.state };
  }

  public isInitialized(): boolean {
    return this.state.isInitialized;
  }

  public getCurrentView(): string {
    return this.state.currentView;
  }

  public isSessionActive(): boolean {
    return this.state.sessionActive;
  }

  public getPreferences(): ExtendedUserPreferences {
    return { ...this.state.preferences };
  }
}