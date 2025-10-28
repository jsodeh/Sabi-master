import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import OpenAI from 'openai';
import { 
  ImageInput, 
  ProcessedInput, 
  AIResponse,
  AIResponseType,
  DetectedObject
} from '../../types/ai';
import { LearningContext } from '../../types/learning';

/**
 * ImageProcessor handles image analysis, OCR, and visual input processing
 */
export class ImageProcessor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-development'
    });
  }

  /**
   * Analyze image content using computer vision
   */
  async analyzeImage(imageInput: ImageInput): Promise<ImageInput> {
    try {
      // Validate and preprocess image
      const processedImage = await this.preprocessImage(imageInput);
      
      // Analyze image content using OpenAI Vision API
      const description = await this.generateImageDescription(processedImage);
      
      // Detect objects in the image
      const detectedObjects = await this.detectObjects(processedImage);
      
      // Update image input with analysis results
      processedImage.description = description;
      processedImage.detectedObjects = detectedObjects;
      
      return processedImage;
    } catch (error) {
      console.error('Image analysis failed:', error);
      throw new Error(`Image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from image using OCR
   */
  async extractText(imageInput: ImageInput): Promise<string> {
    try {
      // For now, we'll use a simple approach
      // In production, you might use:
      // - Google Cloud Vision API
      // - AWS Textract
      // - Tesseract.js
      // - Azure Computer Vision
      
      const base64Image = imageInput.data.toString('base64');
      
      // Use OpenAI Vision API to extract text
      const textContent = await this.extractTextWithOpenAI(base64Image);
      
      // Update image input with extracted text
      imageInput.textContent = textContent;
      
      return textContent;
    } catch (error) {
      console.error('Text extraction failed:', error);
      return ''; // Return empty string on failure
    }
  }

  /**
   * Generate AI response for image input
   */
  async generateResponse(input: ProcessedInput, context: LearningContext): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      let content = '';
      
      // Analyze what type of image content we're dealing with
      const hasText = input.processedText && input.processedText.trim().length > 0;
      const hasLearningIntent = input.intent.primary !== 'get_help';
      
      if (hasText && hasLearningIntent) {
        // Image contains text and has clear learning intent
        switch (input.intent.primary) {
          case 'learn_skill':
            content = `I can see you've shared an image related to ${input.intent.parameters.targetSkill || 'learning'}. Let me analyze what's shown here and create a learning experience based on this visual content.`;
            break;
          case 'build_project':
            content = `Great! I can see the design or concept you want to build. Let me help you recreate this using the appropriate tools and guide you through the process step by step.`;
            break;
          case 'troubleshoot':
            content = `I can see the issue you're facing in this image. Let me analyze what's happening and provide you with a solution.`;
            break;
          default:
            content = `I can see what you've shared in this image. Let me help you understand and work with this content.`;
        }
      } else if (hasText) {
        // Image contains text but unclear intent
        content = `I can see there's text and visual content in your image. This looks like it might be related to development or learning. Could you tell me what specifically you'd like to do with this?`;
      } else {
        // Image without clear text content
        content = `I can see your image, but I'd need a bit more context to help you effectively. Could you tell me what you'd like to learn or build based on what you've shown me?`;
      }

      // Add visual analysis context
      if (input.processedText.includes('code') || input.processedText.includes('programming')) {
        content += ` I notice this appears to be code-related. I can help you understand the concepts and guide you through implementing similar functionality.`;
      }
      
      if (input.processedText.includes('design') || input.processedText.includes('ui') || input.processedText.includes('interface')) {
        content += ` This looks like a design or interface. I can help you build something similar using visual development tools.`;
      }

      return {
        id: uuidv4(),
        type: AIResponseType.ANALYSIS,
        content,
        confidence: input.confidence || 0.6,
        processingTime: Date.now() - startTime,
        model: 'image-processor-v1',
        timestamp: new Date(),
        metadata: {
          inputTokens: 0, // Images don't have traditional tokens
          outputTokens: Math.ceil(content.length / 4),
          modelVersion: '1.0.0',
          temperature: 0.7,
          topP: 0.9,
          contextLength: input.processedText.length,
          reasoningSteps: [
            'Analyzed image content',
            `Extracted text: ${hasText ? 'yes' : 'no'}`,
            `Detected intent: ${input.intent.primary}`,
            'Generated contextual response'
          ]
        }
      };
    } catch (error) {
      throw new Error(`Image response generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Preprocess image for better analysis
   */
  private async preprocessImage(imageInput: ImageInput): Promise<ImageInput> {
    try {
      // Use Sharp to optimize and standardize the image
      const processedBuffer = await sharp(imageInput.data)
        .resize(1024, 1024, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Get image metadata
      const metadata = await sharp(processedBuffer).metadata();
      
      return {
        ...imageInput,
        data: processedBuffer,
        format: 'jpeg' as any,
        dimensions: {
          width: metadata.width || imageInput.dimensions.width,
          height: metadata.height || imageInput.dimensions.height
        }
      };
    } catch (error) {
      console.warn('Image preprocessing failed, using original:', error);
      return imageInput;
    }
  }

  /**
   * Generate image description using OpenAI Vision API
   */
  private async generateImageDescription(imageInput: ImageInput): Promise<string> {
    try {
      const base64Image = imageInput.data.toString('base64');
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and describe what you see, focusing on any educational, development, or learning-related content. If there are UI elements, code, designs, or technical concepts, describe them in detail."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      return response.choices[0]?.message?.content || 'Unable to analyze image content';
    } catch (error) {
      console.error('OpenAI Vision API failed:', error);
      return 'Image analysis unavailable';
    }
  }

  /**
   * Extract text from image using OpenAI Vision API
   */
  private async extractTextWithOpenAI(base64Image: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text content from this image. Return only the text that you can read, maintaining the original formatting as much as possible."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Text extraction with OpenAI failed:', error);
      return '';
    }
  }

  /**
   * Detect objects in the image
   */
  private async detectObjects(imageInput: ImageInput): Promise<DetectedObject[]> {
    try {
      const base64Image = imageInput.data.toString('base64');
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify and list the main objects, UI elements, or components visible in this image. For each item, provide a label and estimate its relative position. Focus on development tools, code editors, browsers, design elements, or learning materials."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      const description = response.choices[0]?.message?.content || '';
      
      // Parse the description to create detected objects
      // This is a simplified approach - in production you might use more sophisticated parsing
      const objects: DetectedObject[] = [];
      
      const lines = description.split('\n').filter(line => line.trim());
      lines.forEach((line, index) => {
        if (line.includes(':') || line.includes('-')) {
          const label = line.split(/[:-]/)[0].trim();
          if (label) {
            objects.push({
              label,
              confidence: 0.7,
              boundingBox: {
                x: Math.random() * 0.8, // Placeholder coordinates
                y: (index / lines.length) * 0.8,
                width: 0.2,
                height: 0.1
              },
              attributes: { description: line }
            });
          }
        }
      });

      return objects;
    } catch (error) {
      console.error('Object detection failed:', error);
      return [];
    }
  }

  /**
   * Validate image input format and size
   */
  validateImageInput(imageInput: ImageInput): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (imageInput.data.length > maxSize) {
      issues.push('Image too large (maximum 10MB)');
    }
    
    // Check minimum size
    if (imageInput.data.length < 1024) {
      issues.push('Image too small (minimum 1KB)');
    }
    
    // Check dimensions
    if (imageInput.dimensions.width < 50 || imageInput.dimensions.height < 50) {
      issues.push('Image dimensions too small (minimum 50x50 pixels)');
    }
    
    if (imageInput.dimensions.width > 4096 || imageInput.dimensions.height > 4096) {
      issues.push('Image dimensions too large (maximum 4096x4096 pixels)');
    }
    
    // Check format support
    const supportedFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'bmp'];
    if (!supportedFormats.includes(imageInput.format.toLowerCase())) {
      issues.push(`Unsupported format: ${imageInput.format}`);
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Get image analysis summary
   */
  async getImageSummary(imageInput: ImageInput): Promise<{
    hasText: boolean;
    hasCode: boolean;
    hasUI: boolean;
    hasDesign: boolean;
    complexity: 'low' | 'medium' | 'high';
    suggestedActions: string[];
  }> {
    const description = imageInput.description || '';
    const textContent = imageInput.textContent || '';
    const combinedContent = `${description} ${textContent}`.toLowerCase();
    
    const hasText = textContent.trim().length > 0;
    const hasCode = /code|programming|function|variable|class|import|export/.test(combinedContent);
    const hasUI = /button|interface|ui|menu|form|input|design/.test(combinedContent);
    const hasDesign = /design|layout|color|style|visual|graphic/.test(combinedContent);
    
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (hasCode && hasUI) complexity = 'high';
    else if (hasCode || hasUI || hasDesign) complexity = 'medium';
    
    const suggestedActions: string[] = [];
    if (hasCode) suggestedActions.push('Explain the code concepts');
    if (hasUI) suggestedActions.push('Recreate the interface');
    if (hasDesign) suggestedActions.push('Build similar design');
    if (hasText && !hasCode && !hasUI) suggestedActions.push('Learn about the topic');
    
    return {
      hasText,
      hasCode,
      hasUI,
      hasDesign,
      complexity,
      suggestedActions
    };
  }
}