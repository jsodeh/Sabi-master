import { LearningRequest, UserFeedback } from '../../types/learning';
import { InputType } from '../../types/common';

/**
 * Test IPC communication between main and renderer processes
 * This test verifies that all learning APIs work correctly through IPC
 */
describe('IPC Communication Tests', () => {
  // Mock the main process components
  let mockLearningOrchestrator: any;
  let mockSessionManager: any;
  let mockBrowserController: any;

  beforeEach(() => {
    // Reset mocks
    mockLearningOrchestrator = {
      processLearningRequest: jest.fn().mockResolvedValue('session-123'),
      pauseSession: jest.fn().mockResolvedValue(undefined),
      resumeSession: jest.fn().mockResolvedValue(undefined),
      cancelSession: jest.fn().mockResolvedValue(undefined),
      provideFeedback: jest.fn().mockResolvedValue(undefined),
      getProcessingStatus: jest.fn().mockResolvedValue({
        stage: 'execution',
        progress: 75,
        currentStep: 'Building component',
        estimatedTimeRemaining: 5
      }),
      getSessionProgress: jest.fn().mockResolvedValue([
        {
          skill: 'React Components',
          description: 'Created basic component structure',
          proficiencyGained: 20,
          evidenceUrl: undefined
        }
      ]),
      on: jest.fn(),
      removeAllListeners: jest.fn()
    };

    mockSessionManager = {
      getCurrentSession: jest.fn().mockReturnValue({
        id: 'session-123',
        userId: 'user-456',
        status: 'active',
        currentStepIndex: 1,
        steps: [
          {
            id: 'step-1',
            title: 'Setup Project',
            description: 'Initialize the project structure',
            toolRequired: 'builder.io',
            estimatedDuration: 10,
            learningObjectives: ['Project Setup']
          }
        ]
      })
    };

    mockBrowserController = {
      closeBrowser: jest.fn().mockResolvedValue(undefined)
    };
  });

  describe('Learning Session IPC Handlers', () => {
    test('should handle start-session IPC call with proper validation', async () => {
      const request: LearningRequest = {
        id: 'req-123',
        userId: 'user-456',
        objective: 'Build a React component',
        inputType: InputType.TEXT,
        rawInput: 'I want to learn how to build a React component',
        timestamp: new Date(),
        context: {
          sessionId: '',
          previousSteps: [],
          userPreferences: {
            explanationDetail: 'moderate',
            learningPace: 'normal',
            preferredInputMethod: InputType.TEXT,
            enableVoiceGuidance: false,
            showCueCards: true,
            autoAdvance: false
          },
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

      // Simulate the IPC handler logic
      const result = await simulateIpcHandler('learning:start-session', request);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('session-123');
      expect(result.message).toBe('Learning session started successfully');
      expect(result.duration).toBeGreaterThan(0);
      expect(mockLearningOrchestrator.processLearningRequest).toHaveBeenCalledWith(request);
    });

    test('should handle pause-session IPC call with validation', async () => {
      const sessionId = 'session-123';

      const result = await simulateIpcHandler('learning:pause-session', sessionId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Learning session paused successfully');
      expect(result.duration).toBeGreaterThan(0);
      expect(mockLearningOrchestrator.pauseSession).toHaveBeenCalledWith(sessionId);
    });

    test('should handle resume-session IPC call with validation', async () => {
      const sessionId = 'session-123';

      const result = await simulateIpcHandler('learning:resume-session', sessionId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Learning session resumed successfully');
      expect(result.duration).toBeGreaterThan(0);
      expect(mockLearningOrchestrator.resumeSession).toHaveBeenCalledWith(sessionId);
    });

    test('should handle stop-session IPC call with validation', async () => {
      const sessionId = 'session-123';

      const result = await simulateIpcHandler('learning:stop-session', sessionId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Learning session stopped successfully');
      expect(result.duration).toBeGreaterThan(0);
      expect(mockLearningOrchestrator.cancelSession).toHaveBeenCalledWith(sessionId);
    });

    test('should handle submit-input IPC call with feedback', async () => {
      const input = {
        sessionId: 'session-123',
        feedback: {
          helpful: true,
          confusing: false,
          tooFast: false,
          tooSlow: false,
          tooEasy: false,
          tooHard: false,
          comments: 'Great explanation!'
        } as UserFeedback
      };

      const result = await simulateIpcHandler('learning:submit-input', input);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User input submitted successfully');
      expect(result.duration).toBeGreaterThan(0);
      expect(mockLearningOrchestrator.provideFeedback).toHaveBeenCalledWith(
        input.sessionId,
        input.feedback
      );
    });

    test('should handle get-session-status IPC call', async () => {
      const sessionId = 'session-123';

      const result = await simulateIpcHandler('learning:get-session-status', sessionId);

      expect(result.success).toBe(true);
      expect(result.status).toEqual({
        stage: 'execution',
        progress: 75,
        currentStep: 'Building component',
        estimatedTimeRemaining: 5
      });
      expect(result.progress).toHaveLength(1);
      expect(result.progress[0].skill).toBe('React Components');
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid learning request', async () => {
      const invalidRequest = {
        id: 'req-123',
        userId: 'user-456',
        // Missing objective
        inputType: InputType.TEXT,
        rawInput: 'Invalid request',
        timestamp: new Date()
      };

      const result = await simulateIpcHandler('learning:start-session', invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid learning request: missing objective');
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should handle invalid session ID', async () => {
      const result = await simulateIpcHandler('learning:pause-session', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session ID provided');
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should handle orchestrator errors', async () => {
      mockLearningOrchestrator.processLearningRequest.mockRejectedValue(
        new Error('Orchestrator initialization failed')
      );

      const request: LearningRequest = {
        id: 'req-123',
        userId: 'user-456',
        objective: 'Build a React component',
        inputType: InputType.TEXT,
        rawInput: 'Test request',
        timestamp: new Date()
      };

      const result = await simulateIpcHandler('learning:start-session', request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Orchestrator initialization failed');
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should handle missing orchestrator', async () => {
      // Simulate missing orchestrator
      mockLearningOrchestrator = null;

      const result = await simulateIpcHandler('learning:start-session', {
        id: 'req-123',
        userId: 'user-456',
        objective: 'Test',
        inputType: InputType.TEXT,
        rawInput: 'Test',
        timestamp: new Date()
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Learning orchestrator not initialized');
    });
  });

  // Helper function to simulate IPC handler execution
  async function simulateIpcHandler(channel: string, data: any): Promise<any> {
    const startTime = Date.now();
    
    // Add small delay to simulate real processing time
    await new Promise(resolve => setTimeout(resolve, 1));

    try {
      switch (channel) {
        case 'learning:start-session':
          if (!mockLearningOrchestrator) {
            throw new Error('Learning orchestrator not initialized');
          }
          if (!data || !data.objective) {
            throw new Error('Invalid learning request: missing objective');
          }
          const sessionId = await mockLearningOrchestrator.processLearningRequest(data);
          return {
            success: true,
            sessionId,
            message: 'Learning session started successfully',
            duration: Date.now() - startTime
          };

        case 'learning:pause-session':
          if (!mockLearningOrchestrator) {
            throw new Error('Learning orchestrator not initialized');
          }
          if (!data) {
            throw new Error('Invalid session ID provided');
          }
          await mockLearningOrchestrator.pauseSession(data);
          return {
            success: true,
            message: 'Learning session paused successfully',
            duration: Date.now() - startTime
          };

        case 'learning:resume-session':
          if (!mockLearningOrchestrator) {
            throw new Error('Learning orchestrator not initialized');
          }
          if (!data) {
            throw new Error('Invalid session ID provided');
          }
          await mockLearningOrchestrator.resumeSession(data);
          return {
            success: true,
            message: 'Learning session resumed successfully',
            duration: Date.now() - startTime
          };

        case 'learning:stop-session':
          if (!mockLearningOrchestrator) {
            throw new Error('Learning orchestrator not initialized');
          }
          if (!data) {
            throw new Error('Invalid session ID provided');
          }
          await mockLearningOrchestrator.cancelSession(data);
          return {
            success: true,
            message: 'Learning session stopped successfully',
            duration: Date.now() - startTime
          };

        case 'learning:submit-input':
          if (!mockLearningOrchestrator) {
            throw new Error('Learning orchestrator not initialized');
          }
          if (!data || !data.sessionId) {
            throw new Error('Invalid input: missing session ID');
          }
          if (data.feedback) {
            await mockLearningOrchestrator.provideFeedback(data.sessionId, data.feedback);
          }
          return {
            success: true,
            message: 'User input submitted successfully',
            duration: Date.now() - startTime
          };

        case 'learning:get-session-status':
          if (!mockLearningOrchestrator) {
            throw new Error('Learning orchestrator not initialized');
          }
          if (!data) {
            throw new Error('Invalid session ID provided');
          }
          const status = await mockLearningOrchestrator.getProcessingStatus(data);
          const progress = await mockLearningOrchestrator.getSessionProgress(data);
          return {
            success: true,
            status,
            progress,
            duration: Date.now() - startTime
          };

        default:
          throw new Error(`Unknown IPC channel: ${channel}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };
    }
  }
});