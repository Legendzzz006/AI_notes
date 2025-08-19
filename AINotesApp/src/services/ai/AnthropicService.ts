import axios from 'axios';
import { AIProvider, AIResponse } from '../../types/AIProvider';

class AnthropicService {
  private baseURL = 'https://api.anthropic.com/v1/messages';

  private async makeRequest(prompt: string, provider: AIProvider): Promise<AIResponse> {
    try {
      const response = await axios.post(
        this.baseURL,
        {
          model: provider.model || 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'x-api-key': provider.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
        }
      );

      return {
        success: true,
        data: response.data.content[0].text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async simplifyText(text: string, provider: AIProvider): Promise<AIResponse> {
    const prompt = `Please simplify the following text while maintaining its meaning and context. Make it easier to understand without losing important information:\n\n${text}`;
    return this.makeRequest(prompt, provider);
  }

  async findSimilarWords(word: string, context: string, provider: AIProvider): Promise<AIResponse> {
    const prompt = `Find 3-5 simpler alternative words for "${word}" that would fit perfectly in this context: "${context}". Provide only the words separated by commas, no explanations.`;
    return this.makeRequest(prompt, provider);
  }

  async analyzeHardWords(text: string, provider: AIProvider): Promise<AIResponse> {
    const prompt = `Analyze this text and identify words that might be difficult to understand. For each hard word, provide simpler alternatives that fit the context. Format your response as JSON with this structure:
    {
      "hardWords": [
        {
          "word": "original word",
          "alternatives": ["simpler word 1", "simpler word 2"],
          "context": "sentence containing the word"
        }
      ]
    }

    Text to analyze: ${text}`;

    return this.makeRequest(prompt, provider);
  }
}

export default new AnthropicService();
