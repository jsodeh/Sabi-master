import { v4 as uuidv4 } from 'uuid';
import { 
  MultimodalInput, 
  ProcessedInput, 
  AudioInput, 
  ImageInput,
  AIResponse,
  ProcessingMetadata,
  ProcessingStep,
  Entity,
  InputIntent,
  SentimentAnalysis,
  EntityType,
  IntentType,
  SentimentType,
  EmotionType
} from '../types/ai';
import { LearningContext } from '../types/learning';
import { InputType } from '../types/common';
import { TextProcessor } from './processors/TextProcessor';
import { SpeechProcessor } from './processors/SpeechProcessor';
import { ImageProcessor } from './processors/ImageProcessor';

/**
 * MultimodalProcessor handles the processing of text, voice, and image inputs
 * into a unified format for the learning system.
 */
export class MultimodalProcessor {
  private textProcessor: TextProcessor;
  private speechProcessor: SpeechProcessor;
  private imageProcessor: ImageProcessor;

  constructor() {
    this.textProcessor = new TextProcessor();
    this.speechProcessor = new SpeechProcessor();
    this.imageProcessor = new ImageProcessor();
  }

  /**
   * Process text input with natural language understanding
   */
  async processTextInput(text: string, context?: LearningContext): Promise<ProcessedInput> {
    const startTime = Date.now();
    const processingSteps: ProcessingStep[] = [];
    
    try {
      // Step 1: Basic text processing
      const textProcessingStart = Date.now();
      const processedText = await this.textProcessor.processText(text);
      processingSteps.push({
        step: 'text_processing',
        duration: Date.now() - textProcessingStart,
        success: true,
        output: { processedText }
      });

      // Step 2: Entity extraction
      const entityExtractionStart = Date.now();
      const extractedEntities = await this.textProcessor.extractEntities(text);
      processingSteps.push({
        step: 'entity_extraction',
        duration: Date.now() - entityExtractionStart,
        success: true,
        output: { entityCount: extractedEntities.length }
      });

      // Step 3: Intent analysis
      const intentAnalysisStart = Date.now();
      const intent = await this.textProcessor.analyzeIntent(text, context);
      processingSteps.push({
        step: 'intent_analysis',
        duration: Date.now() - intentAnalysisStart,
        success: true,
        output: { primaryIntent: intent.primary }
      });

      // Step 4: Sentiment analysis
      const sentimentAnalysisStart = Date.now();
      const sentiment = await this.textProcessor.analyzeSentiment(text);
      processingSteps.push({
        step: 'sentiment_analysis',
        duration: Date.now() - sentimentAnalysisStart,
        success: true,
        output: { sentiment: sentiment.overall }
      });

      const totalProcessingTime = Date.now() - startTime;

      return {
        id: uuidv4(),
        originalInput: text,
        inputType: InputType.TEXT,
        processedText,
        extractedEntities,
        intent,
        sentiment,
        confidence: this.calculateOverallConfidence(extractedEntities, intent, sentiment),
        processingTime: totalProcessingTime,
        metadata: {
          processingSteps,
          modelUsed: 'text-processor-v1',
          apiCalls: 4,
          cacheHit: false,
          errorCount: 0,
          warnings: []
        }
      };
    } catch (error) {
      processingSteps.push({
        step: 'error_handling',
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process voice input with speech-to-text conversion
   */
  async processVoiceInput(audioInput: AudioInput, context?: LearningContext): Promise<ProcessedInput> {
    const startTime = Date.now();
    const processingSteps: ProcessingStep[] = [];

    try {
      // Step 1: Speech-to-text conversion
      const speechToTextStart = Date.now();
      const transcription = await this.speechProcessor.transcribeAudio(audioInput);
      processingSteps.push({
        step: 'speech_to_text',
        duration: Date.now() - speechToTextStart,
        success: true,
        output: { transcription, confidence: audioInput.confidence }
      });

      // Step 2: Process the transcribed text
      const textProcessingStart = Date.now();
      const textResult = await this.processTextInput(transcription, context);
      processingSteps.push({
        step: 'text_processing_from_speech',
        duration: Date.now() - textProcessingStart,
        success: true,
        output: { processedText: textResult.processedText }
      });

      const totalProcessingTime = Date.now() - startTime;

      return {
        ...textResult,
        id: uuidv4(),
        originalInput: audioInput.data,
        inputType: InputType.VOICE,
        processingTime: totalProcessingTime,
        metadata: {
          processingSteps: [...processingSteps, ...textResult.metadata.processingSteps],
          modelUsed: 'speech-processor-v1',
          apiCalls: textResult.metadata.apiCalls + 1,
          cacheHit: false,
          errorCount: 0,
          warnings: audioInput.confidence && audioInput.confidence < 0.8 ? 
            ['Low transcription confidence detected'] : []
        }
      };
    } catch (error) {
      processingSteps.push({
        step: 'error_handling',
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Voice processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process image input with visual analysis
   */
  async processImageInput(imageInput: ImageInput, context?: LearningContext): Promise<ProcessedInput> {
    const startTime = Date.now();
    const processingSteps: ProcessingStep[] = [];

    try {
      // Step 1: Image analysis
      const imageAnalysisStart = Date.now();
      const imageAnalysis = await this.imageProcessor.analyzeImage(imageInput);
      processingSteps.push({
        step: 'image_analysis',
        duration: Date.now() - imageAnalysisStart,
        success: true,
        output: { 
          description: imageAnalysis.description,
          objectCount: imageAnalysis.detectedObjects?.length || 0
        }
      });

      // Step 2: Extract text from image if present
      const ocrStart = Date.now();
      const extractedText = await this.imageProcessor.extractText(imageInput);
      processingSteps.push({
        step: 'ocr_extraction',
        duration: Date.now() - ocrStart,
        success: true,
        output: { extractedText }
      });

      // Step 3: Process combined text (description + extracted text)
      const combinedText = `${imageAnalysis.description || ''} ${extractedText || ''}`.trim();
      const textProcessingStart = Date.now();
      
      let textResult: ProcessedInput;
      if (combinedText) {
        textResult = await this.processTextInput(combinedText, context);
      } else {
        // Create minimal processed input for images without text
        textResult = await this.createMinimalProcessedInput(combinedText);
      }
      
      processingSteps.push({
        step: 'text_processing_from_image',
        duration: Date.now() - textProcessingStart,
        success: true,
        output: { processedText: textResult.processedText }
      });

      const totalProcessingTime = Date.now() - startTime;

      return {
        ...textResult,
        id: uuidv4(),
        originalInput: imageInput.data,
        inputType: InputType.IMAGE,
        processingTime: totalProcessingTime,
        metadata: {
          processingSteps: [...processingSteps, ...textResult.metadata.processingSteps],
          modelUsed: 'image-processor-v1',
          apiCalls: textResult.metadata.apiCalls + 2,
          cacheHit: false,
          errorCount: 0,
          warnings: !combinedText ? ['No text content extracted from image'] : []
        }
      };
    } catch (error) {
      processingSteps.push({
        step: 'error_handling',
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process multimodal input combining multiple input types
   */
  async processMultimodalInput(input: MultimodalInput): Promise<ProcessedInput> {
    const startTime = Date.now();
    const processingSteps: ProcessingStep[] = [];
    const results: ProcessedInput[] = [];

    try {
      // Process each input type
      if (input.textInput) {
        const textResult = await this.processTextInput(input.textInput, input.context);
        results.push(textResult);
        processingSteps.push({
          step: 'multimodal_text_processing',
          duration: textResult.processingTime,
          success: true,
          output: { inputType: 'text' }
        });
      }

      if (input.audioInput) {
        const audioResult = await this.processVoiceInput(input.audioInput, input.context);
        results.push(audioResult);
        processingSteps.push({
          step: 'multimodal_audio_processing',
          duration: audioResult.processingTime,
          success: true,
          output: { inputType: 'audio' }
        });
      }

      if (input.imageInput) {
        const imageResult = await this.processImageInput(input.imageInput, input.context);
        results.push(imageResult);
        processingSteps.push({
          step: 'multimodal_image_processing',
          duration: imageResult.processingTime,
          success: true,
          output: { inputType: 'image' }
        });
      }

      // Combine results
      const combinationStart = Date.now();
      const combinedResult = await this.combineProcessedInputs(results);
      processingSteps.push({
        step: 'multimodal_combination',
        duration: Date.now() - combinationStart,
        success: true,
        output: { combinedInputs: results.length }
      });

      const totalProcessingTime = Date.now() - startTime;

      return {
        ...combinedResult,
        id: uuidv4(),
        originalInput: input.textInput || input.audioInput?.data || input.imageInput?.data || '',
        processingTime: totalProcessingTime,
        metadata: {
          processingSteps,
          modelUsed: 'multimodal-processor-v1',
          apiCalls: results.reduce((sum, result) => sum + result.metadata.apiCalls, 0),
          cacheHit: false,
          errorCount: 0,
          warnings: results.flatMap(result => result.metadata.warnings)
        }
      };
    } catch (error) {
      processingSteps.push({
        step: 'error_handling',
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Multimodal processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate AI response based on processed input
   */
  async generateResponse(input: ProcessedInput, context: LearningContext): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Use the appropriate processor based on input type
      let response: AIResponse;
      
      switch (input.inputType) {
        case InputType.TEXT:
          response = await this.textProcessor.generateResponse(input, context);
          break;
        case InputType.VOICE:
          response = await this.speechProcessor.generateResponse(input, context);
          break;
        case InputType.IMAGE:
          response = await this.imageProcessor.generateResponse(input, context);
          break;
        default:
          throw new Error(`Unsupported input type: ${input.inputType}`);
      }

      return {
        ...response,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(`Response generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate overall confidence score from various analysis results
   */
  private calculateOverallConfidence(
    entities: Entity[], 
    intent: InputIntent, 
    sentiment: SentimentAnalysis
  ): number {
    const entityConfidence = entities.length > 0 ? 
      entities.reduce((sum, entity) => sum + entity.confidence, 0) / entities.length : 0.5;
    
    const intentConfidence = intent.confidence;
    const sentimentConfidence = sentiment.confidence;

    // Weighted average
    return (entityConfidence * 0.3 + intentConfidence * 0.5 + sentimentConfidence * 0.2);
  }

  /**
   * Create minimal processed input for cases with no extractable text
   */
  private async createMinimalProcessedInput(text: string): Promise<ProcessedInput> {
    return {
      id: uuidv4(),
      originalInput: text,
      inputType: InputType.TEXT,
      processedText: text,
      extractedEntities: [],
      intent: {
        primary: IntentType.GET_HELP,
        confidence: 0.5,
        parameters: {},
        clarificationNeeded: true,
        suggestedQuestions: ['What would you like to learn?', 'How can I help you?']
      },
      sentiment: {
        overall: SentimentType.NEUTRAL,
        confidence: 0.5,
        emotions: [],
        frustrationLevel: 0,
        engagementLevel: 0.5,
        motivationLevel: 0.5
      },
      confidence: 0.5,
      processingTime: 0,
      metadata: {
        processingSteps: [],
        modelUsed: 'minimal-processor',
        apiCalls: 0,
        cacheHit: false,
        errorCount: 0,
        warnings: ['Minimal processing applied - no content to analyze']
      }
    };
  }

  /**
   * Combine multiple processed inputs into a single result
   */
  private async combineProcessedInputs(results: ProcessedInput[]): Promise<ProcessedInput> {
    if (results.length === 0) {
      throw new Error('No processed inputs to combine');
    }

    if (results.length === 1) {
      return results[0];
    }

    // Combine text content
    const combinedText = results.map(r => r.processedText).join(' ').trim();

    // Merge entities (remove duplicates)
    const allEntities = results.flatMap(r => r.extractedEntities);
    const uniqueEntities = allEntities.filter((entity, index, self) => 
      index === self.findIndex(e => e.type === entity.type && e.value === entity.value)
    );

    // Use the intent with highest confidence
    const bestIntent = results.reduce((best, current) => 
      current.intent.confidence > best.intent.confidence ? current : best
    ).intent;

    // Average sentiment scores
    const avgSentiment: SentimentAnalysis = {
      overall: results[0].sentiment.overall, // Use first as primary
      confidence: results.reduce((sum, r) => sum + r.sentiment.confidence, 0) / results.length,
      emotions: results.flatMap(r => r.sentiment.emotions),
      frustrationLevel: results.reduce((sum, r) => sum + r.sentiment.frustrationLevel, 0) / results.length,
      engagementLevel: results.reduce((sum, r) => sum + r.sentiment.engagementLevel, 0) / results.length,
      motivationLevel: results.reduce((sum, r) => sum + r.sentiment.motivationLevel, 0) / results.length
    };

    return {
      id: uuidv4(),
      originalInput: combinedText,
      inputType: InputType.TEXT, // Combined result is treated as text
      processedText: combinedText,
      extractedEntities: uniqueEntities,
      intent: bestIntent,
      sentiment: avgSentiment,
      confidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
      processingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
      metadata: {
        processingSteps: results.flatMap(r => r.metadata.processingSteps),
        modelUsed: 'multimodal-combiner-v1',
        apiCalls: results.reduce((sum, r) => sum + r.metadata.apiCalls, 0),
        cacheHit: false,
        errorCount: results.reduce((sum, r) => sum + r.metadata.errorCount, 0),
        warnings: results.flatMap(r => r.metadata.warnings)
      }
    };
  }
}