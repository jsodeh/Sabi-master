/**
 * Main interface controller that orchestrates all UI components
 */
import { LearningInterface } from './LearningInterface';
import { SessionProgress } from './SessionProgress';
import { SettingsPanel } from './SettingsPanel';
export class MainInterface {
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
    async initialize() {
        try {
            // Initialize components
            const learningContainer = document.querySelector('.learning-interface');
            const progressContainer = document.getElementById('sessionProgressContainer');
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
        }
        catch (error) {
            console.error('Failed to initialize main interface:', error);
            this.showError('Failed to initialize the learning interface. Please refresh the page.');
        }
    }
    setupComponentCallbacks() {
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
    setupEventListeners() {
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
                window.electronAPI?.closeWindow();
            });
        }
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                window.electronAPI?.minimizeWindow();
            });
        }
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => {
                window.electronAPI?.maximizeWindow();
            });
        }
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }
    handleKeyboardShortcuts(e) {
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
    onLearningRequest(callback) {
        this.callbacks.onLearningRequest = callback;
    }
    onSessionControl(callback) {
        this.callbacks.onSessionControl = callback;
    }
    onPreferencesChange(callback) {
        this.callbacks.onPreferencesChange = callback;
    }
    showLearningInterface() {
        this.state.currentView = 'learning';
        this.learningInterface.showInterface();
    }
    showWelcome() {
        this.state.currentView = 'welcome';
        this.learningInterface.hideInterface();
    }
    showSettings() {
        this.state.currentView = 'settings';
        this.settingsPanel.open();
    }
    startLearningSession(sessionId, totalSteps) {
        this.state.sessionActive = true;
        this.sessionProgress.startSession(sessionId, totalSteps);
        this.learningInterface.updateState({ isSessionActive: true });
        this.showLearningInterface();
    }
    updateSessionProgress(updates) {
        this.sessionProgress.updateProgress(updates);
    }
    completeStep(stepTitle, skillsAcquired = []) {
        this.sessionProgress.completeStep(stepTitle, skillsAcquired);
    }
    endLearningSession() {
        this.state.sessionActive = false;
        this.sessionProgress.endSession();
        this.learningInterface.updateState({
            isSessionActive: false,
            sessionProgress: 0,
            currentStep: ''
        });
    }
    updateLearningInterface(updates) {
        this.learningInterface.updateState(updates);
    }
    showError(message) {
        this.learningInterface.updateState({ error: message });
    }
    clearError() {
        this.learningInterface.updateState({ error: null });
    }
    handleSessionControl(action) {
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
    updatePreferences(updates) {
        this.state.preferences = { ...this.state.preferences, ...updates };
        this.applyPreferences(this.state.preferences);
        this.settingsPanel.updatePreferences(this.state.preferences);
    }
    applyPreferences(preferences) {
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
    getDefaultPreferences() {
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
    getState() {
        return { ...this.state };
    }
    isInitialized() {
        return this.state.isInitialized;
    }
    getCurrentView() {
        return this.state.currentView;
    }
    isSessionActive() {
        return this.state.sessionActive;
    }
    getPreferences() {
        return { ...this.state.preferences };
    }
}
