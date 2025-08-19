import { AIProvider, AIProviderType, AIResponse } from '../../types/AIProvider';
import OpenAIService from './OpenAIService';
import GeminiService from './GeminiService';
import AnthropicService from './AnthropicService';

class AIService {
  private providers: Map<AIProviderType, any> = new Map();

  constructor() {
    this.providers.set(AIProviderType.OPENAI, OpenAIService);
    this.providers.set(AIProviderType.GEMINI, GeminiService);
    this.providers.set(AIProviderType.ANTHROPIC, AnthropicService);
  }

  async simplifyText(text: string, provider: AIProvider): Promise<AIResponse> {
    const service = this.providers.get(provider.type);
    if (!service) {
      return { success: false, error: 'Provider not supported' };
    }

    return await service.simplifyText(text, provider);
  }

  async findSimilarWords(word: string, context: string, provider: AIProvider): Promise<AIResponse> {
    const service = this.providers.get(provider.type);
    if (!service) {
      return { success: false, error: 'Provider not supported' };
    }

    return await service.findSimilarWords(word, context, provider);
  }

  async analyzeHardWords(text: string, provider: AIProvider): Promise<AIResponse> {
    const service = this.providers.get(provider.type);
    if (!service) {
      return { success: false, error: 'Provider not supported' };
    }

    return await service.analyzeHardWords(text, provider);
  }
}

export default new AIService();
