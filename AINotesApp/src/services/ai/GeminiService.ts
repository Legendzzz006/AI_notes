import axios from 'axios';
import { AIProvider, AIResponse } from '../../types/AIProvider';

class GeminiService {
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';

  private async makeRequest(prompt: string, provider: AIProvider): Promise<AIResponse> {
    try {
      const model = provider.model || 'gemini-pro';
      const response = await axios.post(
        `${this.baseURL}/${model}:generateContent?key=${provider.apiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        data: response.data.candidates[0].content.parts[0].text,
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

export default new GeminiService();
