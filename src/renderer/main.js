/**
 * Main renderer process script for Sabi application
 */

import { MainInterface } from './components/MainInterface.js';

// Global state
let mainInterface = null;
let isInitialized = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApplication();
        
        // Initialize the main interface controller
        mainInterface = new MainInterface();
        
        // Set up main interface callbacks
        setupMainInterfaceCallbacks();
        
        // Simulate initialization process
        setTimeout(() => {
            completeInitialization();
        }, 2000);

    } catch (error) {
        console.error('Failed to initialize application:', error);
        showInitializationError();
    }
});

async function initializeApplication() {
    // Get and display version info
    try {
        const version = await window.sabiAPI?.app?.getVersion?.() || '1.0.0';
        const versionElement = document.querySelector('.version-info');
        if (versionElement) {
            versionElement.textContent = `v${version}`;
        }
    } catch (error) {
        console.warn('Could not get version info:', error);
    }

    // Listen for window events if available
    try {
        window.sabiAPI?.window?.onResized?.((data) => {
            console.log('Window resized:', data);
        });

        window.sabiAPI?.window?.onMoved?.((data) => {
            console.log('Window moved:', data);
        });
    } catch (error) {
        console.warn('Window event listeners not available:', error);
    }

    // Set up learning session event listeners
    setupLearningEventListeners();
}

function setupLearningEventListeners() {
    try {
        // Listen for session updates
        window.sabiAPI?.learning?.onSessionUpdate?.((data) => {
            console.log('Session update received:', data);
            handleSessionUpdate(data);
        });

        // Listen for step completion
        window.sabiAPI?.learning?.onStepComplete?.((data) => {
            console.log('Step completed:', data);
            handleStepComplete(data);
        });
    } catch (error) {
        console.warn('Learning event listeners not available:', error);
    }
}

function handleSessionUpdate(data) {
    if (!mainInterface) return;

    const { type, sessionId, progress, currentStep, error } = data;

    switch (type) {
        case 'session-started':
            console.log('Session started event received:', sessionId);
            break;

        case 'session-completed':
            console.log('Session completed event received:', sessionId);
            mainInterface.updateLearningInterface({
                currentStep: 'Learning session completed! 🎉',
                sessionProgress: 100,
                isProcessing: false
            });
            
            // Show completion milestone
            setTimeout(() => {
                mainInterface.showLearningMilestone({
                    title: 'Congratulations!',
                    message: 'You have successfully completed your learning session.',
                    skillsLearned: data.data?.skillsLearned || [],
                    nextSteps: [
                        'Review what you learned',
                        'Practice the new skills',
                        'Start a new learning session'
                    ]
                });
            }, 1000);
            break;

        case 'session-paused':
            console.log('Session paused event received:', sessionId);
            mainInterface.updateLearningInterface({
                currentStep: 'Learning session paused',
                isProcessing: false
            });
            break;

        case 'session-resumed':
            console.log('Session resumed event received:', sessionId);
            mainInterface.updateLearningInterface({
                currentStep: 'Learning session resumed',
                isProcessing: true
            });
            break;

        case 'progress-update':
            console.log('Progress update received:', progress, currentStep);
            if (progress !== undefined) {
                mainInterface.updateLearningInterface({
                    sessionProgress: progress,
                    currentStep: currentStep || 'Processing...',
                    isProcessing: progress < 100
                });
            }
            break;

        case 'session-error':
        case 'session-failed':
            console.error('Session error received:', error);
            mainInterface.updateLearningInterface({
                error: `Session error: ${error}`,
                isProcessing: false
            });
            break;

        case 'feedback-received':
            console.log('Feedback received confirmation:', sessionId);
            break;
    }
}

function handleStepComplete(data) {
    if (!mainInterface) return;

    const { sessionId, step, result } = data;
    
    console.log('Step completed:', step.title);
    
    // Update the interface with step completion
    mainInterface.executeStepWithExplanation(step.title, 'complete', {
        reasoning: step.explanation || 'Step completed successfully',
        expectedResult: step.expectedOutcome || 'Learning objective achieved',
        skillsAcquired: step.learningObjectives || []
    });
    
    // Update progress
    mainInterface.completeStep(step.title, step.learningObjectives || []);
}

function setupMainInterfaceCallbacks() {
    if (!mainInterface) return;

    // Handle learning requests
    mainInterface.onLearningRequest((request) => {
        console.log('Learning request received:', request);
        handleLearningRequest(request);
    });

    // Handle session control
    mainInterface.onSessionControl((action) => {
        console.log('Session control action:', action);
        handleSessionControl(action);
    });

    // Handle preferences changes
    mainInterface.onPreferencesChange((preferences) => {
        console.log('Preferences updated:', preferences);
        // Save to persistent storage
        localStorage.setItem('sabiPreferences', JSON.stringify(preferences));
    });

    // Handle user feedback submission
    mainInterface.onUserFeedback?.((feedback) => {
        console.log('User feedback received:', feedback);
        submitUserFeedback(feedback);
    });

    // Handle requests for session status
    mainInterface.onStatusRequest?.(() => {
        return getSessionStatus();
    });
}

function completeInitialization() {
    const statusElement = document.querySelector('.status');
    const getStartedBtn = document.querySelector('.get-started-btn');
    
    if (statusElement) {
        statusElement.innerHTML = '✓ Learning environment ready';
        statusElement.style.background = 'rgba(40, 202, 66, 0.2)';
        statusElement.style.borderColor = 'rgba(40, 202, 66, 0.4)';
    }
    
    if (getStartedBtn) {
        getStartedBtn.style.display = 'block';
    }
    
    isInitialized = true;
    console.log('Sabi application initialized successfully');
    
    // Show welcome guidance
    if (mainInterface) {
        mainInterface.showContextualGuidance('welcome');
    }
}

function showInitializationError() {
    const statusElement = document.querySelector('.status');
    if (statusElement) {
        statusElement.innerHTML = '⚠ Initialization failed';
        statusElement.style.background = 'rgba(255, 95, 87, 0.2)';
        statusElement.style.borderColor = 'rgba(255, 95, 87, 0.4)';
    }
}

async function handleLearningRequest(request) {
    if (!mainInterface) return;

    // Show processing modal
    const progressModalId = mainInterface.showProgress('Processing your learning request...', {
        cancelable: true,
        onCancel: () => {
            console.log('Learning request cancelled');
            // TODO: Cancel the actual learning session if started
        }
    });

    // Update interface to show processing
    mainInterface.updateLearningInterface({
        isProcessing: true,
        error: null
    });

    try {
        // Create learning request object
        const learningRequest = {
            id: crypto.randomUUID(),
            userId: 'current-user', // TODO: Get from user profile
            objective: request.objective,
            inputType: request.inputType || 'text',
            rawInput: request.objective,
            timestamp: new Date(),
            context: {
                sessionId: '',
                previousSteps: [],
                userPreferences: mainInterface.getPreferences(),
                environmentState: {
                    activeBrowsers: [],
                    openTools: [],
                    currentScreen: {
                        width: window.screen.width,
                        height: window.screen.height,
                        scaleFactor: window.devicePixelRatio,
                        colorDepth: window.screen.colorDepth
                    },
                    systemResources: {
                        memoryUsage: 50, // Placeholder values
                        cpuUsage: 30,
                        availableMemory: 8192
                    }
                }
            }
        };

        console.log('Starting learning session with request:', learningRequest);

        // Call the actual IPC API to start learning session
        const result = await window.sabiAPI.learning.startSession(learningRequest);

        // Close progress modal
        mainInterface.closeModal(progressModalId);

        if (result.success) {
            console.log('Learning session started successfully:', result.sessionId);
            
            // Store current session ID
            window.currentSessionId = result.sessionId;
            
            // Start the learning session in the UI
            mainInterface.startLearningSession(result.sessionId, 5); // Default to 5 steps, will be updated
            
            // Connect to action systems
            mainInterface.connectToActionSystems();
            
            // Update interface to show session is active
            mainInterface.updateLearningInterface({
                isProcessing: false,
                currentStep: 'Learning session started',
                sessionProgress: 0
            });
            
        } else {
            console.error('Failed to start learning session:', result.error);
            mainInterface.updateLearningInterface({
                isProcessing: false,
                error: `Failed to start learning session: ${result.error}`
            });
        }

    } catch (error) {
        console.error('Error starting learning session:', error);
        
        // Close progress modal
        mainInterface.closeModal(progressModalId);
        
        // Show error in interface
        mainInterface.updateLearningInterface({
            isProcessing: false,
            error: `Error starting learning session: ${error.message}`
        });
    }
}

// Function to submit user feedback to the learning system
async function submitUserFeedback(feedback) {
    const sessionId = window.currentSessionId;
    if (!sessionId) {
        console.warn('No active session to submit feedback for');
        return;
    }

    try {
        const result = await window.sabiAPI.learning.submitInput({
            sessionId,
            feedback
        });

        if (result.success) {
            console.log('User feedback submitted successfully');
        } else {
            console.error('Failed to submit feedback:', result.error);
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
    }
}

// Function to get current session status
async function getSessionStatus() {
    const sessionId = window.currentSessionId;
    if (!sessionId) {
        console.warn('No active session to get status for');
        return null;
    }

    try {
        const result = await window.sabiAPI.learning.getSessionStatus(sessionId);
        
        if (result.success) {
            return {
                status: result.status,
                progress: result.progress
            };
        } else {
            console.error('Failed to get session status:', result.error);
            return null;
        }
    } catch (error) {
        console.error('Error getting session status:', error);
        return null;
    }
}

async function handleSessionControl(action) {
    if (!mainInterface) return;

    const sessionId = window.currentSessionId;
    if (!sessionId && action !== 'start') {
        console.warn('No active session ID for action:', action);
        return;
    }

    try {
        switch (action) {
            case 'start':
                console.log('Starting new learning session');
                // This is handled by handleLearningRequest
                break;
                
            case 'pause':
                console.log('Pausing learning session:', sessionId);
                const pauseResult = await window.sabiAPI.learning.pauseSession(sessionId);
                
                if (pauseResult.success) {
                    mainInterface.updateLearningInterface({
                        currentStep: 'Learning session paused',
                        isProcessing: false
                    });
                } else {
                    console.error('Failed to pause session:', pauseResult.error);
                    mainInterface.showError(`Failed to pause session: ${pauseResult.error}`);
                }
                break;
                
            case 'resume':
                console.log('Resuming learning session:', sessionId);
                const resumeResult = await window.sabiAPI.learning.resumeSession(sessionId);
                
                if (resumeResult.success) {
                    mainInterface.updateLearningInterface({
                        currentStep: 'Learning session resumed',
                        isProcessing: true
                    });
                } else {
                    console.error('Failed to resume session:', resumeResult.error);
                    mainInterface.showError(`Failed to resume session: ${resumeResult.error}`);
                }
                break;
                
            case 'stop':
                console.log('Stopping learning session:', sessionId);
                const stopResult = await window.sabiAPI.learning.stopSession(sessionId);
                
                if (stopResult.success) {
                    mainInterface.endLearningSession();
                    window.currentSessionId = null;
                } else {
                    console.error('Failed to stop session:', stopResult.error);
                    mainInterface.showError(`Failed to stop session: ${stopResult.error}`);
                }
                break;
        }
    } catch (error) {
        console.error(`Error handling session control action "${action}":`, error);
        mainInterface.showError(`Error ${action}ing session: ${error.message}`);
    }
}

// Load saved preferences on startup
function loadSavedPreferences() {
    try {
        const saved = localStorage.getItem('sabiPreferences');
        if (saved && mainInterface) {
            const preferences = JSON.parse(saved);
            mainInterface.updatePreferences(preferences);
        }
    } catch (error) {
        console.warn('Could not load saved preferences:', error);
    }
}

// Load preferences after initialization
setTimeout(() => {
    if (isInitialized) {
        loadSavedPreferences();
    }
}, 3000);

// Expose API for debugging and external access
window.sabiApp = {
    mainInterface: () => mainInterface,
    isInitialized: () => isInitialized,
    showLearningInterface: () => mainInterface?.showLearningInterface(),
    showWelcome: () => mainInterface?.showWelcome(),
    showSettings: () => mainInterface?.showSettings(),
    getCurrentView: () => mainInterface?.getCurrentView(),
    getPreferences: () => mainInterface?.getPreferences(),
    getCurrentSessionId: () => window.currentSessionId,
    submitFeedback: submitUserFeedback,
    getSessionStatus: getSessionStatus,
    handleLearningRequest: handleLearningRequest,
    handleSessionControl: handleSessionControl
};

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (mainInterface) {
        mainInterface.showError('An unexpected error occurred. Please try again.');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (mainInterface) {
        const errorMessage = event.reason?.message || 'An unexpected error occurred. Please try again.';
        mainInterface.showError(errorMessage);
    }
});

// Add periodic session status checking for active sessions
function startSessionStatusMonitoring() {
    setInterval(async () => {
        if (window.currentSessionId && mainInterface) {
            try {
                const status = await getSessionStatus();
                if (status) {
                    // Update UI with current status if needed
                    if (status.status.progress !== undefined) {
                        mainInterface.updateLearningInterface({
                            sessionProgress: status.status.progress,
                            currentStep: status.status.currentStep || 'Processing...'
                        });
                    }
                }
            } catch (error) {
                console.warn('Failed to get session status during monitoring:', error);
            }
        }
    }, 5000); // Check every 5 seconds
}

// Start monitoring after initialization
setTimeout(() => {
    if (isInitialized) {
        startSessionStatusMonitoring();
    }
}, 5000);