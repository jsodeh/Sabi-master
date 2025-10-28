/**
 * Main interface controller that orchestrates all UI components
 */

import { LearningInterface } from './LearningInterface.js';
import { SessionProgress } from './SessionProgress.js';
import { SettingsPanel } from './SettingsPanel.js';
import { CueCardSystem } from './CueCardSystem.js';
import { TooltipManager } from './TooltipManager.js';
import { ModalController } from './ModalController.js';
import { ExplanationInterface } from './ExplanationInterface.js';

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
            
            // Initialize overlay systems
            this.cueCardSystem = new CueCardSystem();
            this.tooltipManager = new TooltipManager();
            this.modalController = new ModalController();
            this.explanationInterface = new ExplanationInterface();

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
                window.sabiAPI?.window?.close?.();
            });
        }

        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                window.sabiAPI?.window?.minimize?.();
            });
        }

        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => {
                window.sabiAPI?.window?.maximize?.();
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

    // Explanation interface methods
    showExplanation() {
        this.explanationInterface.show();
    }

    hideExplanation() {
        this.explanationInterface.hide();
    }

    explainAction(actionType, context = {}) {
        this.explanationInterface.explainAction(actionType, context);
    }

    updateCurrentAction(updates) {
        this.explanationInterface.updateCurrentAction(updates);
    }

    completeCurrentAction(result = null) {
        this.explanationInterface.completeCurrentAction(result);
    }

    failCurrentAction(error = null) {
        this.explanationInterface.failCurrentAction(error);
    }

    setExplanationLevel(level) {
        this.explanationInterface.setExplanationLevel(level);
    }

    // Enhanced session methods with real-time explanations
    startLearningSessionWithExplanations(sessionId, totalSteps) {
        this.startLearningSessionWithGuidance(sessionId, totalSteps);
        
        // Show explanation interface
        this.explanationInterface.show();
        
        // Explain the session start
        this.explainAction('analyze', {
            description: 'Starting your personalized learning session',
            reasoning: 'We are initializing the learning environment and preparing the first step based on your request.',
            expectedResult: 'The learning session will begin with step-by-step guidance',
            progress: 0,
            status: 'in_progress'
        });
    }

    executeStepWithExplanation(stepTitle, actionType, context = {}) {
        // Explain the action before executing
        this.explainAction(actionType, {
            description: `Executing: ${stepTitle}`,
            reasoning: context.reasoning || 'This step is necessary to progress in your learning journey.',
            expectedResult: context.expectedResult || 'The step will complete successfully and move you forward.',
            ...context
        });

        // Simulate step execution
        setTimeout(() => {
            // Update progress
            this.updateCurrentAction({
                progress: 50,
                status: 'executing'
            });

            // Complete after another delay
            setTimeout(() => {
                this.completeCurrentAction(`Successfully completed: ${stepTitle}`);
                
                // Move to next step
                setTimeout(() => {
                    this.completeStepWithGuidance(stepTitle, context.skillsAcquired || []);
                }, 500);
            }, 1500);
        }, 1000);
    }

    // Integration with existing ActionExplainer and ActionRecorder
    connectToActionSystems() {
        // This would integrate with the existing ActionExplainer and ActionRecorder
        // For now, we'll simulate the connection
        
        // Set up explanation interface callbacks
        this.explanationInterface.onQuestionRequest(() => {
            this.showModal('prompt', {
                title: 'Ask a Question',
                message: 'What would you like to know about the current action?',
                placeholder: 'Type your question here...',
                onConfirm: (question) => {
                    if (question) {
                        this.handleUserQuestion(question);
                    }
                }
            });
        });

        this.explanationInterface.onLevelChange((level) => {
            // Update user preferences
            this.updatePreferences({ explanationDetail: level });
        });
    }

    handleUserQuestion(question) {
        // Show processing
        this.explainAction('question_response', {
            description: `Processing your question: "${question}"`,
            reasoning: 'Analyzing your question to provide the most helpful response.',
            expectedResult: 'You will receive a clear explanation.',
            progress: 0,
            status: 'processing'
        });

        // Simulate AI processing
        setTimeout(() => {
            this.updateCurrentAction({ progress: 100 });
            
            setTimeout(() => {
                // Generate response (in real implementation, this would use AI)
                const response = this.generateQuestionResponse(question);
                
                this.completeCurrentAction(response);
                
                // Show response in a modal as well
                this.alert(response, {
                    title: 'Answer to Your Question',
                    icon: '💡'
                });
            }, 500);
        }, 2000);
    }

    generateQuestionResponse(question) {
        // Simple response generation - in real implementation, this would use AI
        const responses = {
            'why': 'This action is necessary because it follows the optimal learning path designed specifically for your objectives and current skill level.',
            'what': 'This action performs a specific operation that teaches you a key concept or skill needed for your learning goal.',
            'how': 'The action is executed by carefully interacting with the interface elements in a sequence that demonstrates best practices.',
            'when': 'This action happens at the perfect time in your learning sequence to build upon previous knowledge and prepare for future steps.',
            'where': 'The action takes place in the current tool or interface, which was selected as the best environment for learning this particular skill.',
            'help': 'If you need additional help, you can pause the session, ask more questions, or adjust the explanation detail level in the settings.'
        };

        const questionLower = question.toLowerCase();
        for (const [key, response] of Object.entries(responses)) {
            if (questionLower.includes(key)) {
                return response;
            }
        }

        return `Great question! This action is part of your personalized learning path. It's designed to help you understand key concepts while building practical skills. Each step builds upon the previous ones to ensure you develop a solid foundation in your chosen topic.`;
    }

    // Overlay system methods
    showCueCard(concept, context, options = {}) {
        return this.cueCardSystem.displayCueCard(concept, context, options);
    }

    hideCueCard(cardId) {
        this.cueCardSystem.hideCueCard(cardId);
    }

    showTooltip(element, content, options = {}) {
        this.tooltipManager.addTooltip(element, content, options);
    }

    hideTooltip(element) {
        this.tooltipManager.removeTooltip(element);
    }

    showModal(type, options = {}) {
        return this.modalController.showModal(type, options);
    }

    closeModal(modalId) {
        this.modalController.closeModal(modalId);
    }

    // Convenience methods for common modals
    confirm(message, options = {}) {
        return this.modalController.confirm(message, options);
    }

    alert(message, options = {}) {
        return this.modalController.alert(message, options);
    }

    prompt(message, options = {}) {
        return this.modalController.prompt(message, options);
    }

    showProgress(message, options = {}) {
        return this.modalController.showProgress(message, options);
    }

    showLearningMilestone(options = {}) {
        return this.modalController.showLearningMilestone(options);
    }

    showHelp(options = {}) {
        return this.modalController.showHelp(options);
    }

    // Context-aware guidance
    showContextualGuidance(context) {
        switch (context) {
            case 'welcome':
                this.showWelcomeGuidance();
                break;
            case 'learning-input':
                this.showLearningInputGuidance();
                break;
            case 'session-active':
                this.showSessionGuidance();
                break;
            case 'settings':
                this.showSettingsGuidance();
                break;
        }
    }

    showWelcomeGuidance() {
        this.showCueCard('welcome', {}, {
            position: 'center',
            priority: 'normal',
            autoHide: false
        });
    }

    showLearningInputGuidance() {
        // Show cue card for input guidance
        this.showCueCard('text-input', {}, {
            position: 'top-right',
            priority: 'normal'
        });

        // Enable contextual tooltips
        this.tooltipManager.showContextualTooltips('learning-input');
    }

    showSessionGuidance() {
        // Show session progress guidance
        this.showCueCard('session-progress', {}, {
            position: 'bottom-right',
            priority: 'low'
        });

        // Enable session tooltips
        this.tooltipManager.showContextualTooltips('session-active');
    }

    showSettingsGuidance() {
        this.tooltipManager.showContextualTooltips('settings');
    }

    // Enhanced learning session methods with guidance
    startLearningSessionWithGuidance(sessionId, totalSteps) {
        this.startLearningSession(sessionId, totalSteps);
        
        // Show welcome milestone
        this.showLearningMilestone({
            title: 'Learning Session Started!',
            message: 'Your personalized learning journey begins now.',
            skillsLearned: [],
            nextSteps: [
                'Follow the step-by-step instructions',
                'Ask for help if you get stuck',
                'Take your time to understand each concept'
            ]
        });

        // Show contextual guidance
        this.showContextualGuidance('session-active');
    }

    completeStepWithGuidance(stepTitle, skillsAcquired = []) {
        this.completeStep(stepTitle, skillsAcquired);
        
        // Show step completion cue card
        this.showCueCard('learning-step', {
            stepTitle,
            skillsAcquired
        }, {
            position: 'top-right',
            priority: 'normal',
            autoHide: true,
            autoHideDelay: 3000
        });

        // Show milestone for significant progress
        const progress = this.sessionProgress.getState();
        if (progress && progress.completedSteps % 2 === 0) { // Every 2 steps
            this.showLearningMilestone({
                title: 'Great Progress!',
                message: `You've completed ${progress.completedSteps} steps.`,
                skillsLearned: skillsAcquired
            });
        }
    }

    showErrorWithGuidance(message, details = null, suggestions = []) {
        this.showError(message);
        
        // Show error modal with guidance
        this.modalController.showError(message, {
            title: 'Learning Session Error',
            details,
            suggestions: suggestions.length > 0 ? suggestions : [
                'Try refreshing the page',
                'Check your internet connection',
                'Contact support if the problem persists'
            ],
            retry: true,
            onRetry: () => {
                // Handle retry logic
                console.log('Retrying after error');
            }
        });
    }
}