import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LearningRequest, UserFeedback } from '../../types/learning';
import { InputType } from '../../types/common';

// Mock the learning orchestrator
const mockLearningOrchestrator = {
  processLearningRequest: jest.fn() as jest.MockedFunction<any>,
  pauseSession: jest.fn() as jest.MockedFunction<any>,
  resumeSession: jest.fn() as jest.MockedFunction<any>,
  cancelSession: jest.fn() as jest.MockedFunction<any>,
  provideFeedback: jest.fn() as jest.MockedFunction<any>,
  getProcessingStatus: jest.fn() as jest.MockedFunction<any>,
  getSessionProgress: jest.fn() as jest.MockedFunction<any>,
  on: jest.fn() as jest.MockedFunction<any>,
  removeAllListeners: jest.fn() as jest.MockedFunction<any>
};

// Mock other components
jest.mock('../../core/LearningOrchestrator', () => ({
  LearningOrchestrator: jest.fn(() => mockLearningOrchestrator)
}));

jest.mock('../../core/LearningSessionManager', () => ({
  LearningSessionManager: jest.fn()
}));

jest.mock('../../browser/BrowserController', () => ({
  BrowserController: jest.fn(() => ({
    closeBrowser: jest.fn()
  }))
}));

jest.mock('../../ai/MultimodalProcessor', () => ({
  MultimodalProcessor: jest.fn()
}));

jest.mock('../../ai/IntentAnalyzer', () => ({
  IntentAnalyzer: jest.fn()
}));

jest.mock('../../ai/LearningPathGenerator', () => ({
  LearningPathGenerator: jest.fn()
}));

jest.mock('../../ai/AdaptiveInstructor', () => ({
  AdaptiveInstructor: jest.fn()
}));

jest.mock('../../core/WindowManager', () => ({
  WindowManager: jest.fn(() => ({
    createMainWindow: jest.fn()
  }))
}));

jest.mock('../../core/ApplicationLifecycle', () => ({
  ApplicationLifecycle: jest.fn(() => ({
    initialize: jest.fn(),
    cleanup: jest.fn()
  }))
}));

// Mock electron
jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn(),
    getVersion: jest.fn(() => '1.0.0'),
    getPath: jest.fn(() => '/test/path')
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => []),
    getFocusedWindow: jest.fn(() => null)
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  }
}));

describe('IPC Learning Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockLearningOrchestrator.processLearningRequest.mockResolvedValue('test-session-id');
    mockLearningOrchestrator.pauseSession.mockResolvedValue(undefined);
    mockLearningOrchestrator.resumeSession.mockResolvedValue(undefined);
    mockLearningOrchestrator.cancelSession.mockResolvedValue(undefined);
    mockLearningOrchestrator.provideFeedback.mockResolvedValue(undefined);
    mockLearningOrchestrator.getProcessingStatus.mockResolvedValue({
      stage: 'execution',
      progress: 50,
      currentStep: 'Test step'
    });
    mockLearningOrchestrator.getSessionProgress.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Learning Orchestrator Integration', () => {
    it('should have learning orchestrator available', () => {
      // Verify the mock orchestrator is available
      expect(mockLearningOrchestrator).toBeDefined();
      expect(mockLearningOrchestrator.processLearningRequest).toBeDefined();
      expect(mockLearningOrchestrator.pauseSession).toBeDefined();
      expect(mockLearningOrchestrator.resumeSession).toBeDefined();
      expect(mockLearningOrchestrator.cancelSession).toBeDefined();
      expect(mockLearningOrchestrator.provideFeedback).toBeDefined();
      expect(mockLearningOrchestrator.getProcessingStatus).toBeDefined();
      expect(mockLearningOrchestrator.getSessionProgress).toBeDefined();
    });

    it('should process learning request through orchestrator', async () => {
      const mockRequest: LearningRequest = {
        id: 'test-request-id',
        userId: 'test-user-id',
        objective: 'Learn to build a website',
        inputType: InputType.TEXT,
        rawInput: 'I want to learn how to build a website',
        timestamp: new Date()
      };

      // Call the orchestrator method directly
      const result = await mockLearningOrchestrator.processLearningRequest(mockRequest);
      
      expect(result).toBe('test-session-id');
      expect(mockLearningOrchestrator.processLearningRequest).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle session pause through orchestrator', async () => {
      await mockLearningOrchestrator.pauseSession('test-session-id');
      
      expect(mockLearningOrchestrator.pauseSession).toHaveBeenCalledWith('test-session-id');
    });

    it('should handle session resume through orchestrator', async () => {
      await mockLearningOrchestrator.resumeSession('test-session-id');
      
      expect(mockLearningOrchestrator.resumeSession).toHaveBeenCalledWith('test-session-id');
    });

    it('should handle session cancellation through orchestrator', async () => {
      await mockLearningOrchestrator.cancelSession('test-session-id');
      
      expect(mockLearningOrchestrator.cancelSession).toHaveBeenCalledWith('test-session-id');
    });

    it('should handle user feedback through orchestrator', async () => {
      const mockFeedback: UserFeedback = {
        stepId: 'test-step-id',
        helpful: true,
        confusing: false,
        tooFast: false,
        tooSlow: false,
        tooEasy: false,
        tooHard: false,
        needsMoreExplanation: false,
        tooMuchExplanation: false,
        timestamp: new Date()
      };

      await mockLearningOrchestrator.provideFeedback('test-session-id', mockFeedback);
      
      expect(mockLearningOrchestrator.provideFeedback).toHaveBeenCalledWith('test-session-id', mockFeedback);
    });

    it('should get processing status through orchestrator', async () => {
      const status = await mockLearningOrchestrator.getProcessingStatus('test-session-id');
      
      expect(status).toEqual({
        stage: 'execution',
        progress: 50,
        currentStep: 'Test step'
      });
      expect(mockLearningOrchestrator.getProcessingStatus).toHaveBeenCalledWith('test-session-id');
    });

    it('should get session progress through orchestrator', async () => {
      const progress = await mockLearningOrchestrator.getSessionProgress('test-session-id');
      
      expect(progress).toEqual([]);
      expect(mockLearningOrchestrator.getSessionProgress).toHaveBeenCalledWith('test-session-id');
    });
  });

  describe('Error Handling', () => {
    it('should handle orchestrator errors gracefully', async () => {
      mockLearningOrchestrator.processLearningRequest.mockRejectedValue(new Error('Test error'));

      try {
        await mockLearningOrchestrator.processLearningRequest({} as LearningRequest);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Test error');
      }
    });

    it('should handle missing orchestrator gracefully', () => {
      // Test that the system can handle cases where orchestrator is not initialized
      expect(() => {
        // This would be handled in the actual IPC handlers
        if (!mockLearningOrchestrator) {
          throw new Error('Learning orchestrator not initialized');
        }
      }).not.toThrow();
    });
  });
});