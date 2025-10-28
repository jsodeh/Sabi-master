import { v4 as uuidv4 } from 'uuid';
import * as speech from '@google-cloud/speech';
import { 
  AudioInput, 
  ProcessedInput, 
  AIResponse,
  AIResponseType
} from '../../types/ai';
import { LearningContext } from '../../types/learning';

/**
 * SpeechProcessor handles speech-to-text conversion and voice input processing
 */
export class SpeechProcessor {
  private speechClient: speech.SpeechClient | null = null;
  private isGoogleCloudConfigured: boolean;

  constructor() {
    try {
      // Initialize Google Cloud Speech client if credentials are available
      this.speechClient = new speech.SpeechClient();
      this.isGoogleCloudConfigured = true;
    } catch (error) {
      console.warn('Google Cloud Speech not configured, using fallback transcription');
      this.isGoogleCloudConfigured = false;
    }
  }

  /**
   * Transcribe audio input to text using Google Cloud Speech-to-Text
   */
  async transcribeAudio(audioInput: AudioInput): Promise<string> {
    try {
      if (this.isGoogleCloudConfigured) {
        return await this.transcribeWithGoogleCloud(audioInput);
      } else {
        return await this.transcribeWithFallback(audioInput);
      }
    } catch (error) {
      console.error('Speech transcription failed:', error);
      throw new Error(`Speech transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe audio using Google Cloud Speech-to-Text API
   */
  private async transcribeWithGoogleCloud(audioInput: AudioInput): Promise<string> {
    if (!this.speechClient) {
      throw new Error('Google Cloud Speech client not initialized');
    }

    const request: speech.protos.google.cloud.speech.v1.IRecognizeRequest = {
      config: {
        encoding: this.getGoogleCloudEncoding(audioInput.format),
        sampleRateHertz: audioInput.sampleRate,
        audioChannelCount: audioInput.channels,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        model: 'latest_long', // Use latest model for better accuracy
        useEnhanced: true,
        // Enable profanity filter for educational content
        profanityFilter: true,
        maxAlternatives: 1
      },
      audio: {
        content: audioInput.data.toString('base64')
      }
    };

    const [response] = await this.speechClient.recognize(request);
    
    if (!response.results || response.results.length === 0) {
      throw new Error('No speech detected in audio');
    }

    // Get the best transcription result
    const transcription = response.results
      .map(result => result.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();

    if (!transcription) {
      throw new Error('Unable to transcribe audio content');
    }

    // Update audio input with transcription and confidence
    const confidence = response.results[0]?.alternatives?.[0]?.confidence || 0.5;
    audioInput.transcription = transcription;
    audioInput.confidence = confidence;

    return transcription;
  }

  /**
   * Fallback transcription method when Google Cloud is not available
   */
  private async transcribeWithFallback(audioInput: AudioInput): Promise<string> {
    // This is a placeholder for fallback transcription
    // In a real implementation, you might use:
    // - Web Speech API (browser-based)
    // - OpenAI Whisper API
    // - Other speech recognition services
    
    console.warn('Using fallback transcription - limited accuracy');
    
    // Simulate transcription delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return a placeholder transcription
    // In production, this should be replaced with actual transcription logic
    const fallbackTranscription = "I'd like to learn web development"; // Placeholder
    
    audioInput.transcription = fallbackTranscription;
    audioInput.confidence = 0.3; // Low confidence for fallback
    
    return fallbackTranscription;
  }

  /**
   * Convert audio format to Google Cloud Speech encoding
   */
  private getGoogleCloudEncoding(format: string): speech.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding {
    switch (format.toLowerCase()) {
      case 'wav':
        return speech.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16;
      case 'flac':
        return speech.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.FLAC;
      case 'ogg':
        return speech.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.OGG_OPUS;
      case 'mp3':
        return speech.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MP3;
      default:
        return speech.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16;
    }
  }

  /**
   * Generate AI response for voice input
   */
  async generateResponse(input: ProcessedInput, context: LearningContext): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Voice responses should be more conversational and encouraging
      let content = '';
      
      switch (input.intent.primary) {
        case 'learn_skill':
          content = `I heard you'd like to learn ${input.intent.parameters.targetSkill || 'something new'}! That's fantastic. I'll create an interactive learning experience where I guide you through everything step by step. You can continue speaking to me or switch to typing whenever you prefer.`;
          break;
        case 'build_project':
          content = `Great! Let's build ${input.intent.parameters.projectType || 'your project'} together. I'll walk you through each step and explain everything as we go. Feel free to ask questions anytime - I'm here to help!`;
          break;
        case 'get_help':
          content = `I'm here to help! I can teach you new skills, guide you through building projects, or help you understand any concepts. Just tell me what you'd like to work on, and I'll create a personalized learning experience for you.`;
          break;
        default:
          content = `I understand you want to ${input.intent.primary.replace('_', ' ')}. Let me help you with that! I'll guide you through everything step by step.`;
      }

      // Add encouragement for voice interaction
      if (input.confidence && input.confidence < 0.7) {
        content += " If I misunderstood something, please feel free to repeat or clarify - I'm getting better at understanding you!";
      }

      return {
        id: uuidv4(),
        type: AIResponseType.INSTRUCTION,
        content,
        confidence: input.confidence || 0.7,
        processingTime: Date.now() - startTime,
        model: 'speech-processor-v1',
        timestamp: new Date(),
        metadata: {
          inputTokens: Math.ceil(input.processedText.length / 4),
          outputTokens: Math.ceil(content.length / 4),
          modelVersion: '1.0.0',
          temperature: 0.8, // Slightly higher for more conversational tone
          topP: 0.9,
          contextLength: input.processedText.length,
          reasoningSteps: [
            'Processed voice input',
            `Transcription confidence: ${input.confidence || 'unknown'}`,
            `Detected intent: ${input.intent.primary}`,
            'Generated conversational response'
          ]
        }
      };
    } catch (error) {
      throw new Error(`Voice response generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate audio input format and quality
   */
  validateAudioInput(audioInput: AudioInput): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check duration
    if (audioInput.duration < 0.5) {
      issues.push('Audio too short (minimum 0.5 seconds)');
    }
    if (audioInput.duration > 60) {
      issues.push('Audio too long (maximum 60 seconds)');
    }
    
    // Check sample rate
    if (audioInput.sampleRate < 8000) {
      issues.push('Sample rate too low (minimum 8kHz)');
    }
    
    // Check channels
    if (audioInput.channels < 1 || audioInput.channels > 2) {
      issues.push('Invalid channel count (1-2 channels supported)');
    }
    
    // Check data size
    if (audioInput.data.length === 0) {
      issues.push('Empty audio data');
    }
    
    // Check format support
    const supportedFormats = ['wav', 'flac', 'ogg', 'mp3'];
    if (!supportedFormats.includes(audioInput.format.toLowerCase())) {
      issues.push(`Unsupported format: ${audioInput.format}`);
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Preprocess audio for better transcription quality
   */
  async preprocessAudio(audioInput: AudioInput): Promise<AudioInput> {
    // This is a placeholder for audio preprocessing
    // In a real implementation, you might:
    // - Normalize audio levels
    // - Remove background noise
    // - Enhance speech clarity
    // - Convert to optimal format
    
    return audioInput;
  }

  /**
   * Get transcription alternatives for ambiguous speech
   */
  async getTranscriptionAlternatives(audioInput: AudioInput): Promise<string[]> {
    if (!this.isGoogleCloudConfigured || !this.speechClient) {
      return [audioInput.transcription || ''];
    }

    try {
      const request: speech.protos.google.cloud.speech.v1.IRecognizeRequest = {
        config: {
          encoding: this.getGoogleCloudEncoding(audioInput.format),
          sampleRateHertz: audioInput.sampleRate,
          audioChannelCount: audioInput.channels,
          languageCode: 'en-US',
          maxAlternatives: 3, // Get up to 3 alternatives
          enableAutomaticPunctuation: true
        },
        audio: {
          content: audioInput.data.toString('base64')
        }
      };

      const [response] = await this.speechClient.recognize(request);
      
      if (!response.results || response.results.length === 0) {
        return [audioInput.transcription || ''];
      }

      // Extract all alternatives
      const alternatives = response.results[0]?.alternatives || [];
      return alternatives
        .map(alt => alt.transcript || '')
        .filter(text => text.trim().length > 0);
        
    } catch (error) {
      console.error('Failed to get transcription alternatives:', error);
      return [audioInput.transcription || ''];
    }
  }
}