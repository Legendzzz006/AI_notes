export interface HardWord {
  word: string;
  position: number;
  context: string;
  suggestions: string[];
  difficulty: number;
}

export interface TextAnalysis {
  hardWords: HardWord[];
  readabilityScore: number;
  suggestions: string[];
}
