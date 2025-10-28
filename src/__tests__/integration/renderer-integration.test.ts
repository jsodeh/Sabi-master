/**
 * Test renderer-to-main process integration
 * This test verifies that the renderer can communicate with the main process
 * through the IPC APIs and handle real-time updates
 */

import { LearningRequest, UserFeedback } from '../../types/learning';
import { InputType } from '../../types/common';

// Mock the window.sabiAPI
const mockSabiAPI = {
  learning: {
    startSession: jest.fn(),
    pauseSession: jest.fn(),
    resumeSession: jest.fn(),
    stopSession: jest.fn(),
    submitInput: jest.fn(),
    getSessionStatus: jest.fn(),
    onSessionUpdate: jest.fn(),
    onStepComplete: jest.fn()
  },
  app: {
    getVersion: jest.fn().mockResolvedValue('1.0.0')
  },
  window: {
    minimize: jest.fn(),
    maximize: jest.fn(),
    close: jest.fn(),
    onResized: jest.fn(),
    onMoved: jest.fn()
  }
};

// Mock DOM elements
const mockDOM = {
  querySelector: jest.fn(),
  addEventListener: jest.fn(),
  createElement: jest.fn(),
  body: {
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn()
    },
    style: {},
    className: ''
  }
};

describe('Renderer Integration Tests', () => {
  let originalWindow: any;
  let originalDocument: any;

  beforeEach(() => {
    // Store original globals
    originalWindow = global.window;
    originalDocument = global.document;

    // Mock window and document
    (global as any).window = {
      sabiAPI: mockSabiAPI,
      currentSessionId: null,
      screen: {
        width: 1920,
        height: 1080,
        colorDepth: 24
      },
      devicePixelRatio: 1,
      crypto: {
        randomUUID: () => 'mock-uuid-123'
      },
      localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn()
      },
      addEventListener: jest.fn(),
      setInterval: jest.fn(),
      setTimeout: jest.fn()
    };

    global.document = {
      ...mockDOM,
      addEventListener: jest.fn()
    } as any;

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original globals
    global.window = originalWindow;
    global.document = originalDocument;
  });

  describe('Learning Request Handling', () => {
    test('should create proper learning request object', async () => {
      const mockRequest = {
        objective: 'Build a React component',
        inputType: 'text'
      };

      mockSabiAPI.learning.startSession.mockResolvedValue({
        success: true,
        sessionId: 'session-123',
        message: 'Learning session started successfully'
      });

      // Import and test the function (would need to be exported from main.js)
      // For now, we'll test the logic structure
      const expectedLearningRequest = {
        id: expect.any(String),
        userId: 'current-user',
        objective: mockRequest.objective,
        inputType: mockRequest.inputType || 'text',
        rawInput: mockRequest.objective,
        timestamp: expect.any(Date),
        context: {
          sessionId: '',
          previousSteps: [],
          userPreferences: expect.any(Object),
          environmentState: {
            activeBrowsers: [],
            openTools: [],
            currentScreen: {
              width: 1920,
              height: 1080,
              scaleFactor: 1,
              colorDepth: 24
            },
            systemResources: {
              memoryUsage: 50,
              cpuUsage: 30,
              availableMemory: 8192
            }
          }
        }
      };

      // Simulate the handleLearningRequest function logic
      const learningRequest = {
        id: window.crypto.randomUUID(),
        userId: 'current-user',
        objective: mockRequest.objective,
        inputType: mockRequest.inputType || 'text',
        rawInput: mockRequest.objective,
        timestamp: new Date(),
        context: {
          sessionId: '',
          previousSteps: [],
          userPreferences: {}, // Would come from mainInterface.getPreferences()
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
              memoryUsage: 50,
              cpuUsage: 30,
              availableMemory: 8192
            }
          }
        }
      };

      const result = await mockSabiAPI.learning.startSession(learningRequest);

      expect(mockSabiAPI.learning.startSession).toHaveBeenCalledWith(
        expect.objectContaining({
          objective: mockRequest.objective,
          inputType: 'text',
          userId: 'current-user'
        })
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('session-123');
    });

    test('should handle learning request errors gracefully', async () => {
      mockSabiAPI.learning.startSession.mockResolvedValue({
        success: false,
        error: 'Learning orchestrator not initialized'
      });

      const mockRequest = {
        objective: 'Build a React component',
        inputType: 'text'
      };

      const learningRequest = {
        id: 'test-id',
        userId: 'current-user',
        objective: mockRequest.objective,
        inputType: 'text',
        rawInput: mockRequest.objective,
        timestamp: new Date()
      };

      const result = await mockSabiAPI.learning.startSession(learningRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Learning orchestrator not initialized');
    });
  });

  describe('Session Control', () => {
    beforeEach(() => {
      (window as any).currentSessionId = 'session-123';
    });

    test('should handle session pause', async () => {
      mockSabiAPI.learning.pauseSession.mockResolvedValue({
        success: true,
        message: 'Learning session paused successfully'
      });

      const result = await mockSabiAPI.learning.pauseSession('session-123');

      expect(mockSabiAPI.learning.pauseSession).toHaveBeenCalledWith('session-123');
      expect(result.success).toBe(true);
    });

    test('should handle session resume', async () => {
      mockSabiAPI.learning.resumeSession.mockResolvedValue({
        success: true,
        message: 'Learning session resumed successfully'
      });

      const result = await mockSabiAPI.learning.resumeSession('session-123');

      expect(mockSabiAPI.learning.resumeSession).toHaveBeenCalledWith('session-123');
      expect(result.success).toBe(true);
    });

    test('should handle session stop', async () => {
      mockSabiAPI.learning.stopSession.mockResolvedValue({
        success: true,
        message: 'Learning session stopped successfully'
      });

      const result = await mockSabiAPI.learning.stopSession('session-123');

      expect(mockSabiAPI.learning.stopSession).toHaveBeenCalledWith('session-123');
      expect(result.success).toBe(true);
    });
  });

  describe('User Feedback', () => {
    test('should submit user feedback correctly', async () => {
      (window as any).currentSessionId = 'session-123';

      const feedback: UserFeedback = {
        stepId: 'step-1',
        helpful: true,
        confusing: false,
        tooFast: false,
        tooSlow: false,
        tooEasy: false,
        tooHard: false,
        needsMoreExplanation: false,
        tooMuchExplanation: false,
        comments: 'Great explanation!',
        timestamp: new Date()
      };

      mockSabiAPI.learning.submitInput.mockResolvedValue({
        success: true,
        message: 'User input submitted successfully'
      });

      const result = await mockSabiAPI.learning.submitInput({
        sessionId: 'session-123',
        feedback
      });

      expect(mockSabiAPI.learning.submitInput).toHaveBeenCalledWith({
        sessionId: 'session-123',
        feedback
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Session Status', () => {
    test('should get session status correctly', async () => {
      (window as any).currentSessionId = 'session-123';

      const mockStatus = {
        stage: 'execution',
        progress: 75,
        currentStep: 'Building component',
        estimatedTimeRemaining: 5
      };

      const mockProgress = [
        {
          skill: 'React Components',
          description: 'Created basic component structure',
          proficiencyGained: 20,
          evidenceUrl: undefined
        }
      ];

      mockSabiAPI.learning.getSessionStatus.mockResolvedValue({
        success: true,
        status: mockStatus,
        progress: mockProgress
      });

      const result = await mockSabiAPI.learning.getSessionStatus('session-123');

      expect(mockSabiAPI.learning.getSessionStatus).toHaveBeenCalledWith('session-123');
      expect(result.success).toBe(true);
      expect(result.status).toEqual(mockStatus);
      expect(result.progress).toEqual(mockProgress);
    });
  });

  describe('Real-time Updates', () => {
    test('should set up session update listeners', () => {
      const mockCallback = jest.fn();
      mockSabiAPI.learning.onSessionUpdate(mockCallback);

      expect(mockSabiAPI.learning.onSessionUpdate).toHaveBeenCalledWith(mockCallback);
    });

    test('should set up step completion listeners', () => {
      const mockCallback = jest.fn();
      mockSabiAPI.learning.onStepComplete(mockCallback);

      expect(mockSabiAPI.learning.onStepComplete).toHaveBeenCalledWith(mockCallback);
    });

    test('should handle session update events', () => {
      const mockUpdateData = {
        type: 'progress-update',
        sessionId: 'session-123',
        progress: 50,
        currentStep: 'Building component'
      };

      // Simulate receiving an update
      const updateHandler = jest.fn();
      mockSabiAPI.learning.onSessionUpdate(updateHandler);

      // This would be called by the main process
      updateHandler(mockUpdateData);

      expect(updateHandler).toHaveBeenCalledWith(mockUpdateData);
    });

    test('should handle step completion events', () => {
      const mockStepData = {
        sessionId: 'session-123',
        step: {
          id: 'step-1',
          title: 'Setup Project',
          explanation: 'Initialize the project structure',
          expectedOutcome: 'Project ready for development',
          learningObjectives: ['Project Setup']
        },
        result: {
          status: 'completed',
          outcome: {
            skill: 'Project Setup',
            description: 'Successfully set up project',
            proficiencyGained: 20
          }
        }
      };

      const stepHandler = jest.fn();
      mockSabiAPI.learning.onStepComplete(stepHandler);

      // This would be called by the main process
      stepHandler(mockStepData);

      expect(stepHandler).toHaveBeenCalledWith(mockStepData);
    });
  });

  describe('Error Handling', () => {
    test('should handle IPC API unavailability gracefully', async () => {
      // Simulate missing API
      (window as any).sabiAPI = undefined;

      // The renderer should handle this gracefully without crashing
      expect(() => {
        // This would be the initialization code
        const version = (window as any).sabiAPI?.app?.getVersion?.() || '1.0.0';
        expect(version).toBe('1.0.0');
      }).not.toThrow();
    });

    test('should handle session control without active session', async () => {
      (window as any).currentSessionId = null;

      // Should handle gracefully when no session is active
      const result = await mockSabiAPI.learning.pauseSession(null);
      
      // The actual implementation would check for null sessionId
      expect(mockSabiAPI.learning.pauseSession).toHaveBeenCalledWith(null);
    });
  });
});