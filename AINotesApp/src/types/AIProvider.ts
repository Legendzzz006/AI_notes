export enum AIProviderType {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  ANTHROPIC = 'anthropic'
}

export interface AIProvider {
  type: AIProviderType;
  apiKey: string;
  model: string;
  isActive: boolean;
}

export interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
}

export interface WordSuggestion {
  original: string;
  suggestions: string[];
  context: string;
}
