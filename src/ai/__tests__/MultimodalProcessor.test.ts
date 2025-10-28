import { MultimodalProcessor } from '../MultimodalProcessor';
import { TextProcessor } from '../processors/TextProcessor';
import { SpeechProcessor } from '../processors/SpeechProcessor';
import { ImageProcessor } from '../processors/ImageProcessor';
import { 
  MultimodalInput, 
  AudioInput, 
  ImageInput, 
  AudioFormat, 
  ImageFormat
} from '../../types/ai';
import { InputType } from '../../types/common';
import { LearningContext } from '../../types/learning';

// Mock the processor classes
jest.mock('../processors/TextProcessor');
jest.mock('../processors/SpeechProcessor');
jest.mock('../processors/ImageProcessor');

describe('MultimodalProcessor', () => {
  let processor: MultimodalProcessor;
  let mockTextProcessor: jest.Mocked<TextProcessor>;
  let mockSpeechProcessor: jest.Mocked<SpeechProcessor>;
  let mockImageProcessor: jest.Mocked<ImageProcessor>;

  const mockLearningContext: LearningContext = {
    sessionId: 'test-session-123',
    previousSteps: [],
    currentTool: 'builder.io',
    userPreferences: {
      explanationDetail: 'moderate',
      learningPace: 'normal',
      preferredInputMethod: InputType.TEXT,
      enableVoiceGuidance: true,
      showCueCards: true,
      autoAdvance: false
    },
    environmentState: {
      activeBrowsers: ['chrome'],
      openTools: ['builder.io'],
      currentScreen: {
        width: 1920,
        height: 1080,
        scaleFactor: 1,
        colorDepth: 24
      },
      systemResources: {
        memoryUsage: 45,
        cpuUsage: 20,
        availableMemory: 8192
      }
    }
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create processor instance
    processor = new MultimodalProcessor();
    
    // Get mocked instances
    mockTextProcessor = (processor as any).textProcessor;
    mockSpeechProcessor = (processor as any).speechProcessor;
    mockImageProcessor = (processor as any).imageProcessor;
  });

  describe('processTextInput', () => {
    it('should process text input successfully', async () => {
      const inputText = 'I want to learn React development';
      
      // Mock text processor methods
      mockTextProcessor.processText.mockResolvedValue('i want to learn react development');
      mockTextProcessor.extractEntities.mockResolvedValue([
        {
          type: 'SKILL' as any,
          value: 'react development',
          confidence: 0.9,
          startIndex: 17,
          endIndex: 33
        }
      ]);
      mockTextProcessor.analyzeIntent.mockResolvedValue({
        primary: 'LEARN_SKILL' as any,
        confidence: 0.8,
        parameters: { targetSkill: 'react development' },
        clarificationNeeded: false
      });
      mockTextProcessor.analyzeSentiment.mockResolvedValue({
        overall: 'POSITIVE' as any,
        confidence: 0.7,
        emotions: [],
        frustrationLevel: 0,
        engagementLevel: 0.8,
        motivationLevel: 0.9
      });

      const result = await processor.processTextInput(inputText, mockLearningContext);

      expect(result).toBeDefined();
      expect(result.inputType).toBe(InputType.TEXT);
      expect(result.originalInput).toBe(inputText);
      expect(result.processedText).toBe('i want to learn react development');
      expect(result.extractedEntities).toHaveLength(1);
      expect(result.intent.primary).toBe('LEARN_SKILL');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle text processing errors gracefully', async () => {
      const inputText = 'test input';
      
      mockTextProcessor.processText.mockRejectedValue(new Error('Processing failed'));

      await expect(processor.processTextInput(inputText)).rejects.toThrow('Text processing failed');
    });
  });

  describe('processVoiceInput', () => {
    it('should process voice input successfully', async () => {
      const audioInput: AudioInput = {
        data: Buffer.from('mock audio data'),
        format: AudioFormat.WAV,
        duration: 5.0,
        sampleRate: 16000,
        channels: 1,
        transcription: 'I want to build a website',
        confidence: 0.85
      };

      // Mock speech processor
      mockSpeechProcessor.transcribeAudio.mockResolvedValue('I want to build a website');
      
      // Mock text processing for transcribed text
      mockTextProcessor.processText.mockResolvedValue('i want to build a website');
      mockTextProcessor.extractEntities.mockResolvedValue([
        {
          type: 'PROJECT_TYPE' as any,
          value: 'website',
          confidence: 0.8,
          startIndex: 15,
          endIndex: 22
        }
      ]);
      mockTextProcessor.analyzeIntent.mockResolvedValue({
        primary: 'BUILD_PROJECT' as any,
        confidence: 0.9,
        parameters: { projectType: 'website' },
        clarificationNeeded: false
      });
      mockTextProcessor.analyzeSentiment.mockResolvedValue({
        overall: 'POSITIVE' as any,
        confidence: 0.8,
        emotions: [],
        frustrationLevel: 0,
        engagementLevel: 0.7,
        motivationLevel: 0.8
      });

      const result = await processor.processVoiceInput(audioInput, mockLearningContext);

      expect(result).toBeDefined();
      expect(result.inputType).toBe(InputType.VOICE);
      expect(result.originalInput).toBe(audioInput.data);
      expect(result.processedText).toBe('i want to build a website');
      expect(result.intent.primary).toBe('BUILD_PROJECT');
      expect(mockSpeechProcessor.transcribeAudio).toHaveBeenCalledWith(audioInput);
    });

    it('should handle voice processing errors gracefully', async () => {
      const audioInput: AudioInput = {
        data: Buffer.from('mock audio data'),
        format: AudioFormat.WAV,
        duration: 5.0,
        sampleRate: 16000,
        channels: 1
      };

      mockSpeechProcessor.transcribeAudio.mockRejectedValue(new Error('Transcription failed'));

      await expect(processor.processVoiceInput(audioInput)).rejects.toThrow('Voice processing failed');
    });
  });

  describe('processImageInput', () => {
    it('should process image input successfully', async () => {
      const imageInput: ImageInput = {
        data: Buffer.from('mock image data'),
        format: ImageFormat.JPEG,
        dimensions: { width: 800, height: 600 },
        description: 'A screenshot of a React component',
        textContent: 'function MyComponent() { return <div>Hello</div>; }'
      };

      // Mock image processor
      mockImageProcessor.analyzeImage.mockResolvedValue({
        ...imageInput,
        description: 'A screenshot of a React component'
      });
      mockImageProcessor.extractText.mockResolvedValue('function MyComponent() { return <div>Hello</div>; }');

      // Mock text processing for combined content
      const combinedText = 'A screenshot of a React component function MyComponent() { return <div>Hello</div>; }';
      mockTextProcessor.processText.mockResolvedValue(combinedText.toLowerCase());
      mockTextProcessor.extractEntities.mockResolvedValue([
        {
          type: 'TECHNOLOGY' as any,
          value: 'react',
          confidence: 0.9,
          startIndex: 17,
          endIndex: 22
        }
      ]);
      mockTextProcessor.analyzeIntent.mockResolvedValue({
        primary: 'UNDERSTAND_CONCEPT' as any,
        confidence: 0.8,
        parameters: {},
        clarificationNeeded: false
      });
      mockTextProcessor.analyzeSentiment.mockResolvedValue({
        overall: 'NEUTRAL' as any,
        confidence: 0.6,
        emotions: [],
        frustrationLevel: 0,
        engagementLevel: 0.5,
        motivationLevel: 0.5
      });

      const result = await processor.processImageInput(imageInput, mockLearningContext);

      expect(result).toBeDefined();
      expect(result.inputType).toBe(InputType.IMAGE);
      expect(result.originalInput).toBe(imageInput.data);
      expect(mockImageProcessor.analyzeImage).toHaveBeenCalledWith(imageInput);
      expect(mockImageProcessor.extractText).toHaveBeenCalledWith(imageInput);
    });

    it('should handle image processing errors gracefully', async () => {
      const imageInput: ImageInput = {
        data: Buffer.from('mock image data'),
        format: ImageFormat.JPEG,
        dimensions: { width: 800, height: 600 }
      };

      mockImageProcessor.analyzeImage.mockRejectedValue(new Error('Image analysis failed'));

      await expect(processor.processImageInput(imageInput)).rejects.toThrow('Image processing failed');
    });
  });

  describe('processMultimodalInput', () => {
    it('should process multimodal input with text and image', async () => {
      const multimodalInput: MultimodalInput = {
        id: 'test-multimodal-123',
        textInput: 'Can you help me understand this code?',
        imageInput: {
          data: Buffer.from('mock image data'),
          format: ImageFormat.JPEG,
          dimensions: { width: 800, height: 600 }
        },
        combinedProcessing: true,
        timestamp: new Date(),
        context: mockLearningContext
      };

      // Mock text processing
      mockTextProcessor.processText.mockResolvedValue('can you help me understand this code?');
      mockTextProcessor.extractEntities.mockResolvedValue([]);
      mockTextProcessor.analyzeIntent.mockResolvedValue({
        primary: 'UNDERSTAND_CONCEPT' as any,
        confidence: 0.8,
        parameters: {},
        clarificationNeeded: false
      });
      mockTextProcessor.analyzeSentiment.mockResolvedValue({
        overall: 'NEUTRAL' as any,
        confidence: 0.6,
        emotions: [],
        frustrationLevel: 0,
        engagementLevel: 0.7,
        motivationLevel: 0.6
      });

      // Mock image processing
      mockImageProcessor.analyzeImage.mockResolvedValue({
        ...multimodalInput.imageInput!,
        description: 'Code snippet showing a function'
      });
      mockImageProcessor.extractText.mockResolvedValue('function example() {}');

      const result = await processor.processMultimodalInput(multimodalInput);

      expect(result).toBeDefined();
      expect(result.inputType).toBe(InputType.TEXT); // Combined result is treated as text
      expect(result.metadata.processingSteps.length).toBeGreaterThan(0);
      expect(result.metadata.warnings).toBeDefined();
    });

    it('should handle empty multimodal input', async () => {
      const multimodalInput: MultimodalInput = {
        id: 'test-empty-123',
        combinedProcessing: false,
        timestamp: new Date(),
        context: mockLearningContext
      };

      await expect(processor.processMultimodalInput(multimodalInput)).rejects.toThrow();
    });
  });

  describe('generateResponse', () => {
    it('should generate response for text input', async () => {
      const processedInput = {
        id: 'test-input-123',
        originalInput: 'I want to learn React',
        inputType: InputType.TEXT,
        processedText: 'i want to learn react',
        extractedEntities: [],
        intent: {
          primary: 'LEARN_SKILL' as any,
          confidence: 0.8,
          parameters: { targetSkill: 'react' },
          clarificationNeeded: false
        },
        sentiment: {
          overall: 'POSITIVE' as any,
          confidence: 0.7,
          emotions: [],
          frustrationLevel: 0,
          engagementLevel: 0.8,
          motivationLevel: 0.9
        },
        confidence: 0.8,
        processingTime: 100,
        metadata: {
          processingSteps: [],
          modelUsed: 'test-model',
          apiCalls: 1,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };

      mockTextProcessor.generateResponse.mockResolvedValue({
        id: 'response-123',
        type: 'INSTRUCTION' as any,
        content: 'I\'ll help you learn React!',
        confidence: 0.8,
        processingTime: 50,
        model: 'text-processor-v1',
        timestamp: new Date(),
        metadata: {
          inputTokens: 10,
          outputTokens: 15,
          modelVersion: '1.0.0',
          temperature: 0.7,
          topP: 0.9,
          contextLength: 20,
          reasoningSteps: ['Generated response']
        }
      });

      const result = await processor.generateResponse(processedInput, mockLearningContext);

      expect(result).toBeDefined();
      expect(result.content).toBe('I\'ll help you learn React!');
      expect(mockTextProcessor.generateResponse).toHaveBeenCalledWith(processedInput, mockLearningContext);
    });

    it('should handle unsupported input type', async () => {
      const processedInput = {
        id: 'test-input-123',
        originalInput: 'test',
        inputType: 'UNSUPPORTED' as any,
        processedText: 'test',
        extractedEntities: [],
        intent: {
          primary: 'GET_HELP' as any,
          confidence: 0.5,
          parameters: {},
          clarificationNeeded: true
        },
        sentiment: {
          overall: 'NEUTRAL' as any,
          confidence: 0.5,
          emotions: [],
          frustrationLevel: 0,
          engagementLevel: 0.5,
          motivationLevel: 0.5
        },
        confidence: 0.5,
        processingTime: 100,
        metadata: {
          processingSteps: [],
          modelUsed: 'test-model',
          apiCalls: 1,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };

      await expect(processor.generateResponse(processedInput, mockLearningContext))
        .rejects.toThrow('Unsupported input type');
    });
  });

  describe('confidence calculation', () => {
    it('should calculate overall confidence correctly', async () => {
      const inputText = 'I want to learn web development';
      
      mockTextProcessor.processText.mockResolvedValue('i want to learn web development');
      mockTextProcessor.extractEntities.mockResolvedValue([
        {
          type: 'SKILL' as any,
          value: 'web development',
          confidence: 0.9,
          startIndex: 17,
          endIndex: 32
        }
      ]);
      mockTextProcessor.analyzeIntent.mockResolvedValue({
        primary: 'LEARN_SKILL' as any,
        confidence: 0.8,
        parameters: { targetSkill: 'web development' },
        clarificationNeeded: false
      });
      mockTextProcessor.analyzeSentiment.mockResolvedValue({
        overall: 'POSITIVE' as any,
        confidence: 0.7,
        emotions: [],
        frustrationLevel: 0,
        engagementLevel: 0.8,
        motivationLevel: 0.9
      });

      const result = await processor.processTextInput(inputText);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      // Confidence should be weighted average: (0.9 * 0.3) + (0.8 * 0.5) + (0.7 * 0.2) = 0.81
      expect(result.confidence).toBeCloseTo(0.81, 1);
    });
  });
});