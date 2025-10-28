import { Page } from 'playwright';
import { ActionRecorder, ActionRecord, ActionContext } from '../ActionRecorder';
import { 
  BrowserAction, 
  BrowserActionType, 
  SelectorType, 
  ActionResult 
} from '../../types/browser';
import { v4 as uuidv4 } from 'uuid';

// Mock Playwright Page
const createMockPage = (): jest.Mocked<Page> => ({
  url: jest.fn().mockReturnValue('https://example.com'),
  title: jest.fn().mockResolvedValue('Test Page'),
  locator: jest.fn().mockReturnValue({
    first: jest.fn().mockReturnValue({
      evaluate: jest.fn().mockResolvedValue({
        elementType: 'button',
        elementText: 'Submit',
        elementAttributes: { type: 'submit', class: 'btn-primary' },
        parentElements: ['form', 'div.container'],
        siblingElements: ['input: Email', 'input: Password']
      })
    })
  }),
  getByText: jest.fn().mockReturnValue({
    first: jest.fn().mockReturnValue({
      evaluate: jest.fn().mockResolvedValue({
        elementType: 'button',
        elementText: 'Submit',
        elementAttributes: {},
        parentElements: [],
        siblingElements: []
      })
    })
  })
} as any);

describe('ActionRecorder', () => {
  let mockPage: jest.Mocked<Page>;
  let recorder: ActionRecorder;
  let mockAction: BrowserAction;
  let mockResult: ActionResult;

  beforeEach(() => {
    mockPage = createMockPage();
    recorder = new ActionRecorder(mockPage);
    
    mockAction = {
      id: uuidv4(),
      type: BrowserActionType.CLICK,
      target: {
        type: SelectorType.CSS,
        value: '.submit-btn',
        description: 'Submit button'
      },
      explanation: 'Click the submit button to submit the form',
      reasoning: 'Form submission is required to proceed',
      expectedResult: 'Form should be submitted successfully',
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    mockResult = {
      actionId: mockAction.id,
      success: true,
      elementFound: true,
      executionTime: 150,
      actualResult: 'Form submitted successfully',
      adaptations: []
    };
  });

  describe('startRecording', () => {
    it('should start recording with session ID', () => {
      const sessionId = 'test-session-123';
      recorder.startRecording(sessionId);
      
      // Verify recording state (we can't directly access private properties, 
      // but we can test the behavior)
      expect(() => recorder.stopRecording()).not.toThrow();
    });
  });

  describe('stopRecording', () => {
    it('should stop recording', () => {
      const sessionId = 'test-session-123';
      recorder.startRecording(sessionId);
      recorder.stopRecording();
      
      // Should not be able to record actions after stopping
      expect(async () => {
        await recorder.recordAction(mockAction, mockResult, 'Test intent');
      }).rejects.toThrow('Recording not started');
    });
  });

  describe('recordAction', () => {
    beforeEach(() => {
      recorder.startRecording('test-session');
    });

    it('should record action successfully', async () => {
      const userIntent = 'Submit the login form';
      const record = await recorder.recordAction(mockAction, mockResult, userIntent);

      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.action).toBe(mockAction);
      expect(record.result).toBe(mockResult);
      expect(record.context.userIntent).toBe(userIntent);
      expect(record.context.sessionId).toBe('test-session');
      expect(record.explanation).toBeDefined();
      expect(record.reasoning).toBeDefined();
      expect(record.timestamp).toBeInstanceOf(Date);
    });

    it('should generate appropriate explanation for click action', async () => {
      const record = await recorder.recordAction(mockAction, mockResult, 'Submit form');

      expect(record.explanation).toContain('Clicked on');
      expect(record.explanation).toContain('Submit');
    });

    it('should generate appropriate explanation for type action', async () => {
      const typeAction: BrowserAction = {
        ...mockAction,
        type: BrowserActionType.TYPE,
        value: 'test@example.com',
        target: {
          type: SelectorType.CSS,
          value: 'input[type="email"]',
          description: 'Email input field'
        }
      };

      const record = await recorder.recordAction(typeAction, mockResult, 'Enter email');

      expect(record.explanation).toContain('Entered');
      expect(record.explanation).toContain('test@example.com');
    });

    it('should handle failed actions', async () => {
      const failedResult: ActionResult = {
        ...mockResult,
        success: false,
        error: {
          type: 'element_not_found' as any,
          message: 'Element not found',
          timestamp: new Date(),
          recoverable: true
        }
      };

      const record = await recorder.recordAction(mockAction, failedResult, 'Submit form');

      expect(record.explanation).toContain('Failed to');
      expect(record.explanation).toContain('Element not found');
    });

    it('should throw error if recording not started', async () => {
      recorder.stopRecording();

      await expect(recorder.recordAction(mockAction, mockResult, 'Test'))
        .rejects.toThrow('Recording not started');
    });
  });

  describe('getActionHistory', () => {
    it('should return empty array initially', () => {
      const history = recorder.getActionHistory();
      expect(history).toEqual([]);
    });

    it('should return recorded actions', async () => {
      recorder.startRecording('test-session');
      await recorder.recordAction(mockAction, mockResult, 'Test intent');

      const history = recorder.getActionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe(mockAction);
    });

    it('should return copy of history (not reference)', async () => {
      recorder.startRecording('test-session');
      await recorder.recordAction(mockAction, mockResult, 'Test intent');

      const history1 = recorder.getActionHistory();
      const history2 = recorder.getActionHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe('getActionsBySession', () => {
    it('should return actions for specific session', async () => {
      // Record actions in different sessions
      recorder.startRecording('session-1');
      await recorder.recordAction(mockAction, mockResult, 'Session 1 action');
      recorder.stopRecording();

      recorder.startRecording('session-2');
      const action2 = { ...mockAction, id: uuidv4() };
      await recorder.recordAction(action2, mockResult, 'Session 2 action');
      recorder.stopRecording();

      const session1Actions = recorder.getActionsBySession('session-1');
      const session2Actions = recorder.getActionsBySession('session-2');

      expect(session1Actions).toHaveLength(1);
      expect(session2Actions).toHaveLength(1);
      expect(session1Actions[0].action.id).toBe(mockAction.id);
      expect(session2Actions[0].action.id).toBe(action2.id);
    });

    it('should return empty array for non-existent session', () => {
      const actions = recorder.getActionsBySession('non-existent');
      expect(actions).toEqual([]);
    });
  });

  describe('exportRecording', () => {
    it('should export recording as JSON string', async () => {
      recorder.startRecording('test-session');
      await recorder.recordAction(mockAction, mockResult, 'Test intent');

      const exported = recorder.exportRecording();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('totalActions', 1);
      expect(parsed).toHaveProperty('sessions');
      expect(parsed).toHaveProperty('actions');
      expect(parsed.actions).toHaveLength(1);
    });

    it('should export empty recording', () => {
      const exported = recorder.exportRecording();
      const parsed = JSON.parse(exported);

      expect(parsed.totalActions).toBe(0);
      expect(parsed.actions).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('should clear all recorded actions', async () => {
      recorder.startRecording('test-session');
      await recorder.recordAction(mockAction, mockResult, 'Test intent');

      expect(recorder.getActionHistory()).toHaveLength(1);

      recorder.clearHistory();

      expect(recorder.getActionHistory()).toHaveLength(0);
    });
  });

  describe('action explanation generation', () => {
    beforeEach(() => {
      recorder.startRecording('test-session');
    });

    it('should generate different explanations for different action types', async () => {
      const actions = [
        { ...mockAction, type: BrowserActionType.CLICK },
        { ...mockAction, type: BrowserActionType.TYPE, value: 'test input' },
        { ...mockAction, type: BrowserActionType.NAVIGATE, value: 'https://example.com' },
        { ...mockAction, type: BrowserActionType.SCROLL },
        { ...mockAction, type: BrowserActionType.HOVER }
      ];

      const records = await Promise.all(
        actions.map(action => recorder.recordAction(action, mockResult, 'Test intent'))
      );

      expect(records[0].explanation).toContain('Clicked');
      expect(records[1].explanation).toContain('Entered');
      expect(records[2].explanation).toContain('Navigated');
      expect(records[3].explanation).toContain('Scrolled');
      expect(records[4].explanation).toContain('Hovered');
    });

    it('should infer purpose from element context', async () => {
      // Mock different element contexts
      mockPage.locator.mockReturnValue({
        first: jest.fn().mockReturnValue({
          evaluate: jest.fn().mockResolvedValue({
            elementType: 'button',
            elementText: 'Create New Project',
            elementAttributes: { type: 'button' },
            parentElements: [],
            siblingElements: []
          })
        })
      } as any);

      const record = await recorder.recordAction(mockAction, mockResult, 'Create project');

      expect(record.explanation).toContain('create');
    });
  });

  describe('reasoning generation', () => {
    beforeEach(() => {
      recorder.startRecording('test-session');
    });

    it('should include user intent in reasoning', async () => {
      const userIntent = 'Complete user registration';
      const record = await recorder.recordAction(mockAction, mockResult, userIntent);

      expect(record.reasoning).toContain(userIntent);
    });

    it('should provide action-specific reasoning', async () => {
      const typeAction: BrowserAction = {
        ...mockAction,
        type: BrowserActionType.TYPE,
        value: 'user@example.com'
      };

      const record = await recorder.recordAction(typeAction, mockResult, 'Enter email');

      expect(record.reasoning).toContain('provides the required input');
    });
  });
});