import { Page } from 'playwright';
import { ActionExplainer, ExplanationContext, PageContext } from '../ActionExplainer';
import { 
  BrowserAction, 
  BrowserActionType, 
  SelectorType, 
  ActionResult 
} from '../../types/browser';
import { v4 as uuidv4 } from 'uuid';

// Mock Playwright Page
const createMockPage = (): jest.Mocked<Page> => ({
  screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-screenshot')),
  locator: jest.fn().mockReturnValue({
    first: jest.fn().mockReturnValue({
      boundingBox: jest.fn().mockResolvedValue({
        x: 100,
        y: 200,
        width: 150,
        height: 40
      })
    })
  }),
  getByText: jest.fn().mockReturnValue({
    first: jest.fn().mockReturnValue({
      boundingBox: jest.fn().mockResolvedValue({
        x: 100,
        y: 200,
        width: 150,
        height: 40
      })
    })
  })
} as any);

describe('ActionExplainer', () => {
  let mockPage: jest.Mocked<Page>;
  let explainer: ActionExplainer;
  let mockAction: BrowserAction;
  let mockContext: ExplanationContext;
  let mockPageContext: PageContext;

  beforeEach(() => {
    mockPage = createMockPage();
    explainer = new ActionExplainer(mockPage);

    mockPageContext = {
      url: 'https://builder.io/projects/123',
      title: 'Builder.io - Project Editor',
      domain: 'builder.io',
      toolType: 'builder.io',
      currentSection: 'editor'
    };

    mockAction = {
      id: uuidv4(),
      type: BrowserActionType.CLICK,
      target: {
        type: SelectorType.CSS,
        value: '.submit-btn',
        description: 'Submit button'
      },
      explanation: 'Click the submit button to save changes',
      reasoning: 'Saving changes is required to persist the modifications',
      expectedResult: 'Changes should be saved successfully',
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    mockContext = {
      currentAction: mockAction,
      previousActions: [],
      userIntent: 'Save the project changes',
      pageContext: mockPageContext,
      learningObjective: 'Learn how to save projects in Builder.io'
    };
  });

  describe('explainAction', () => {
    it('should generate complete action explanation', async () => {
      const explanation = await explainer.explainAction(mockAction, mockContext);

      expect(explanation).toBeDefined();
      expect(explanation.id).toBe(mockAction.id);
      expect(explanation.action).toBe(mockAction);
      expect(explanation.realTimeExplanation).toBeDefined();
      expect(explanation.detailedReasoning).toBeDefined();
      expect(explanation.learningPoints).toBeInstanceOf(Array);
      expect(explanation.nextSteps).toBeInstanceOf(Array);
      expect(explanation.visualContext).toBeDefined();
      expect(explanation.timestamp).toBeInstanceOf(Date);
    });

    it('should include visual context with screenshot', async () => {
      const explanation = await explainer.explainAction(mockAction, mockContext);

      expect(explanation.visualContext.screenshot).toBeDefined();
      expect(explanation.visualContext.annotations).toBeInstanceOf(Array);
    });

    it('should handle errors gracefully', async () => {
      mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));

      const explanation = await explainer.explainAction(mockAction, mockContext);
      
      // Should still return explanation even if screenshot fails
      expect(explanation).toBeDefined();
      expect(explanation.visualContext.screenshot).toBeUndefined();
      expect(explanation.visualContext.annotations).toEqual([]);
    });
  });

  describe('explainActionSequence', () => {
    it('should explain empty action sequence', async () => {
      const explanation = await explainer.explainActionSequence([], 'Test intent');
      expect(explanation).toBe('No actions to explain.');
    });

    it('should explain single action sequence', async () => {
      const explanation = await explainer.explainActionSequence([mockAction], 'Save project');

      expect(explanation).toContain('Save project');
      expect(explanation).toContain('1 actions');
      expect(explanation).toContain('1. Click');
    });

    it('should explain multiple action sequence', async () => {
      const actions = [
        mockAction,
        {
          ...mockAction,
          id: uuidv4(),
          type: BrowserActionType.TYPE,
          value: 'Project Name',
          target: {
            type: SelectorType.CSS,
            value: 'input[name="name"]',
            description: 'Project name input'
          }
        }
      ];

      const explanation = await explainer.explainActionSequence(actions, 'Create project');

      expect(explanation).toContain('Create project');
      expect(explanation).toContain('2 actions');
      expect(explanation).toContain('1. Click');
      expect(explanation).toContain('2. Type into');
    });
  });

  describe('generateRealTimeExplanation', () => {
    it('should generate success explanation', () => {
      const result: ActionResult = {
        actionId: mockAction.id,
        success: true,
        elementFound: true,
        executionTime: 150,
        actualResult: 'Button clicked successfully',
        adaptations: []
      };

      const explanation = explainer.generateRealTimeExplanation(mockAction, result);

      expect(explanation).toContain('✅');
      expect(explanation).toContain('Click');
      expect(explanation).toContain('Submit button');
    });

    it('should generate failure explanation', () => {
      const result: ActionResult = {
        actionId: mockAction.id,
        success: false,
        elementFound: false,
        executionTime: 0,
        actualResult: '',
        adaptations: [],
        error: {
          type: 'element_not_found' as any,
          message: 'Element not found',
          timestamp: new Date(),
          recoverable: true
        }
      };

      const explanation = explainer.generateRealTimeExplanation(mockAction, result);

      expect(explanation).toContain('❌');
      expect(explanation).toContain('Failed to');
      expect(explanation).toContain('Element not found');
    });

    it('should handle different action types', () => {
      const actions = [
        { ...mockAction, type: BrowserActionType.CLICK },
        { ...mockAction, type: BrowserActionType.TYPE },
        { ...mockAction, type: BrowserActionType.NAVIGATE },
        { ...mockAction, type: BrowserActionType.SCROLL },
        { ...mockAction, type: BrowserActionType.HOVER }
      ];

      const result: ActionResult = {
        actionId: mockAction.id,
        success: true,
        elementFound: true,
        executionTime: 150,
        actualResult: 'Success',
        adaptations: []
      };

      actions.forEach(action => {
        const explanation = explainer.generateRealTimeExplanation(action, result);
        expect(explanation).toContain('✅');
        expect(explanation).toBeDefined();
      });
    });
  });

  describe('generateLearningPoints', () => {
    it('should generate learning points for click action', () => {
      const points = explainer.generateLearningPoints(mockAction, mockContext);

      expect(points).toBeInstanceOf(Array);
      expect(points.length).toBeGreaterThan(0);
      expect(points.some(point => point.includes('Clicking'))).toBe(true);
      expect(points.some(point => point.includes('builder.io'))).toBe(true);
    });

    it('should generate learning points for type action', () => {
      const typeAction: BrowserAction = {
        ...mockAction,
        type: BrowserActionType.TYPE,
        value: 'test input'
      };

      const points = explainer.generateLearningPoints(typeAction, mockContext);

      expect(points.some(point => point.includes('Text input'))).toBe(true);
      expect(points.some(point => point.includes('focused'))).toBe(true);
    });

    it('should include learning objective in points', () => {
      const points = explainer.generateLearningPoints(mockAction, mockContext);

      expect(points.some(point => 
        point.includes(mockContext.learningObjective)
      )).toBe(true);
    });

    it('should include workflow context for sequential actions', () => {
      const contextWithPrevious = {
        ...mockContext,
        previousActions: [mockAction]
      };

      const points = explainer.generateLearningPoints(mockAction, contextWithPrevious);

      expect(points.some(point => point.includes('step 2'))).toBe(true);
    });
  });

  describe('captureVisualContext', () => {
    it('should capture screenshot and element bounds', async () => {
      const visualContext = await explainer.captureVisualContext(mockAction);

      expect(visualContext.screenshot).toBeDefined();
      expect(visualContext.elementHighlight).toBeDefined();
      expect(visualContext.elementHighlight?.bounds).toEqual({
        x: 100,
        y: 200,
        width: 150,
        height: 40
      });
      expect(visualContext.annotations).toBeInstanceOf(Array);
    });

    it('should handle screenshot failure gracefully', async () => {
      mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));

      const visualContext = await explainer.captureVisualContext(mockAction);

      expect(visualContext.screenshot).toBeUndefined();
      expect(visualContext.annotations).toEqual([]);
    });

    it('should handle element not found gracefully', async () => {
      mockPage.locator.mockReturnValue({
        first: jest.fn().mockReturnValue({
          boundingBox: jest.fn().mockResolvedValue(null)
        })
      } as any);

      const visualContext = await explainer.captureVisualContext(mockAction);

      expect(visualContext.elementHighlight).toBeUndefined();
      expect(visualContext.annotations).toBeInstanceOf(Array);
    });

    it('should generate appropriate annotations', async () => {
      const visualContext = await explainer.captureVisualContext(mockAction);

      expect(visualContext.annotations.length).toBeGreaterThan(0);
      expect(visualContext.annotations[0].type).toBe('arrow');
      expect(visualContext.annotations[0].content).toContain('Click here');
    });
  });

  describe('action verb mapping', () => {
    it('should return correct verbs for different action types', () => {
      const testCases = [
        { type: BrowserActionType.CLICK, expectedVerb: 'Click' },
        { type: BrowserActionType.TYPE, expectedVerb: 'Type into' },
        { type: BrowserActionType.NAVIGATE, expectedVerb: 'Navigate to' },
        { type: BrowserActionType.SCROLL, expectedVerb: 'Scroll to' },
        { type: BrowserActionType.HOVER, expectedVerb: 'Hover over' },
        { type: BrowserActionType.WAIT, expectedVerb: 'Wait' }
      ];

      testCases.forEach(({ type, expectedVerb }) => {
        const action = { ...mockAction, type };
        const result: ActionResult = {
          actionId: action.id,
          success: true,
          elementFound: true,
          executionTime: 150,
          actualResult: 'Success',
          adaptations: []
        };

        const explanation = explainer.generateRealTimeExplanation(action, result);
        expect(explanation).toContain(expectedVerb);
      });
    });
  });

  describe('tool-specific context', () => {
    it('should provide tool-specific learning points', () => {
      const points = explainer.generateLearningPoints(mockAction, mockContext);

      expect(points.some(point => 
        point.includes('builder.io') || point.includes('Builder.io')
      )).toBe(true);
    });

    it('should handle different tool types', () => {
      const toolTypes = ['firebase', 'lovable', 'bolt.new', 'replit'];

      toolTypes.forEach(toolType => {
        const context = {
          ...mockContext,
          pageContext: { ...mockPageContext, toolType }
        };

        const points = explainer.generateLearningPoints(mockAction, context);
        expect(points).toBeInstanceOf(Array);
        expect(points.length).toBeGreaterThan(0);
      });
    });
  });

  describe('purpose inference', () => {
    it('should infer purpose from action explanation', () => {
      const testCases = [
        { explanation: 'Click submit button', expectedPurpose: 'to submit the form' },
        { explanation: 'Click create new project', expectedPurpose: 'to create something new' },
        { explanation: 'Click login button', expectedPurpose: 'to authenticate' },
        { explanation: 'Click search button', expectedPurpose: 'to search for content' }
      ];

      testCases.forEach(({ explanation, expectedPurpose }) => {
        const action = { ...mockAction, explanation };
        const result: ActionResult = {
          actionId: action.id,
          success: true,
          elementFound: true,
          executionTime: 150,
          actualResult: 'Success',
          adaptations: []
        };

        const realTimeExplanation = explainer.generateRealTimeExplanation(action, result);
        expect(realTimeExplanation).toContain(expectedPurpose);
      });
    });
  });
});