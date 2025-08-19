# Complete AI Note-Taking App Development Guide

## Project Overview
Build a React Native AI-powered note-taking app with local storage, multiple AI providers (OpenAI, Gemini, Anthropic), and intelligent text processing features.

## Prerequisites
- Node.js (v16+)
- React Native CLI
- Android Studio with Android SDK
- Code editor (VS Code recommended)
- Basic knowledge of React Native and JavaScript

## Project Setup

### 1. Initialize React Native Project
```bash
npx react-native init AINotesApp --template react-native-template-typescript
cd AINotesApp
```

### 2. Install Required Dependencies
```bash
# Core navigation and UI
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated

# Storage and database
npm install @react-native-async-storage/async-storage
npm install react-native-sqlite-storage

# UI Components and styling
npm install react-native-elements react-native-vector-icons
npm install styled-components
npm install react-native-paper

# AI and text processing
npm install axios
npm install react-native-text-input-mask
npm install react-native-highlight-words

# Utilities
npm install uuid
npm install date-fns
npm install react-native-device-info

# Development
npm install --save-dev @types/uuid
```

### 3. Android Setup
```bash
# Link vector icons for Android
cd android && ./gradlew clean && cd ..
npx react-native link react-native-vector-icons
```

## Project Structure
```
src/
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── LoadingSpinner.tsx
│   ├── notes/
│   │   ├── NoteEditor.tsx
│   │   ├── NoteList.tsx
│   │   ├── NoteCard.tsx
│   │   └── TextSelector.tsx
│   └── ai/
│       ├── AIProviderSelector.tsx
│       ├── WordSuggestions.tsx
│       └── HardWordsAnalyzer.tsx
├── screens/
│   ├── HomeScreen.tsx
│   ├── NoteEditorScreen.tsx
│   ├── SettingsScreen.tsx
│   └── AISettingsScreen.tsx
├── services/
│   ├── ai/
│   │   ├── AIService.ts
│   │   ├── OpenAIService.ts
│   │   ├── GeminiService.ts
│   │   └── AnthropicService.ts
│   ├── storage/
│   │   ├── DatabaseService.ts
│   │   └── StorageService.ts
│   └── text/
│       ├── TextAnalyzer.ts
│       └── WordProcessor.ts
├── types/
│   ├── Note.ts
│   ├── AIProvider.ts
│   └── TextAnalysis.ts
├── utils/
│   ├── constants.ts
│   ├── helpers.ts
│   └── validators.ts
└── styles/
    ├── colors.ts
    ├── typography.ts
    └── spacing.ts
```

## Core Implementation

### 1. Types and Interfaces

#### src/types/Note.ts
```typescript
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  hardWords: string[];
  tags: string[];
}

export interface NoteCreation {
  title: string;
  content: string;
}
```

#### src/types/AIProvider.ts
```typescript
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
```

#### src/types/TextAnalysis.ts
```typescript
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
```

### 2. Database Service

#### src/services/storage/DatabaseService.ts
```typescript
import SQLite from 'react-native-sqlite-storage';
import { Note } from '../../types/Note';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initializeDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'AINotesApp.db',
        location: 'default',
      });

      await this.createTables();
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const queries = [
      `CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        hard_words TEXT,
        tags TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS hard_words_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        replacement TEXT NOT NULL,
        context TEXT,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS ai_providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        api_key TEXT NOT NULL,
        model TEXT NOT NULL,
        is_active INTEGER DEFAULT 0
      )`
    ];

    for (const query of queries) {
      await this.db!.executeSql(query);
    }
  }

  async saveNote(note: Note): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO notes 
      (id, title, content, created_at, updated_at, hard_words, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db!.executeSql(query, [
      note.id,
      note.title,
      note.content,
      note.createdAt.getTime(),
      note.updatedAt.getTime(),
      JSON.stringify(note.hardWords),
      JSON.stringify(note.tags)
    ]);
  }

  async getAllNotes(): Promise<Note[]> {
    const [results] = await this.db!.executeSql('SELECT * FROM notes ORDER BY updated_at DESC');
    const notes: Note[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      notes.push({
        id: row.id,
        title: row.title,
        content: row.content,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        hardWords: JSON.parse(row.hard_words || '[]'),
        tags: JSON.parse(row.tags || '[]')
      });
    }

    return notes;
  }

  async deleteNote(id: string): Promise<void> {
    await this.db!.executeSql('DELETE FROM notes WHERE id = ?', [id]);
  }

  async saveHardWordReplacement(word: string, replacement: string, context: string): Promise<void> {
    const query = `
      INSERT INTO hard_words_history (word, replacement, context, created_at)
      VALUES (?, ?, ?, ?)
    `;
    
    await this.db!.executeSql(query, [word, replacement, context, Date.now()]);
  }

  async getHardWordsHistory(): Promise<Array<{word: string, replacement: string, context: string}>> {
    const [results] = await this.db!.executeSql('SELECT * FROM hard_words_history ORDER BY created_at DESC');
    const history = [];

    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      history.push({
        word: row.word,
        replacement: row.replacement,
        context: row.context
      });
    }

    return history;
  }
}

export default new DatabaseService();
```

### 3. AI Services

#### src/services/ai/AIService.ts
```typescript
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
```

#### src/services/ai/OpenAIService.ts
```typescript
import axios from 'axios';
import { AIProvider, AIResponse } from '../../types/AIProvider';

class OpenAIService {
  private baseURL = 'https://api.openai.com/v1/chat/completions';

  private async makeRequest(prompt: string, provider: AIProvider): Promise<AIResponse> {
    try {
      const response = await axios.post(
        this.baseURL,
        {
          model: provider.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        data: response.data.choices[0].message.content,
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

export default new OpenAIService();
```

#### src/services/ai/GeminiService.ts
```typescript
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
```

#### src/services/ai/AnthropicService.ts
```typescript
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
```

### 4. Main Components

#### src/components/notes/NoteEditor.tsx
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Note } from '../../types/Note';
import { HardWord } from '../../types/TextAnalysis';
import WordSuggestions from '../ai/WordSuggestions';
import HardWordsAnalyzer from '../ai/HardWordsAnalyzer';

interface Props {
  note?: Note;
  onSave: (note: Note) => void;
  onCancel: () => void;
}

const NoteEditor: React.FC<Props> = ({ note, onSave, onCancel }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [showWordSuggestions, setShowWordSuggestions] = useState(false);
  const [hardWords, setHardWords] = useState<HardWord[]>([]);
  const [showHardWordsAnalysis, setShowHardWordsAnalysis] = useState(false);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    const savedNote: Note = {
      id: note?.id || generateId(),
      title: title.trim(),
      content,
      createdAt: note?.createdAt || new Date(),
      updatedAt: new Date(),
      hardWords: hardWords.map(hw => hw.word),
      tags: note?.tags || [],
    };

    onSave(savedNote);
  };

  const handleTextSelection = (event: any) => {
    const { selection } = event.nativeEvent;
    setSelectionStart(selection.start);
    setSelectionEnd(selection.end);
    
    if (selection.start !== selection.end) {
      const selected = content.substring(selection.start, selection.end);
      setSelectedText(selected);
      if (selected.trim().split(' ').length === 1) {
        setShowWordSuggestions(true);
      }
    } else {
      setSelectedText('');
      setShowWordSuggestions(false);
    }
  };

  const replaceSelectedText = (newText: string) => {
    const newContent = 
      content.substring(0, selectionStart) + 
      newText + 
      content.substring(selectionEnd);
    
    setContent(newContent);
    setSelectedText('');
    setShowWordSuggestions(false);
  };

  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <TextInput
          style={styles.titleInput}
          placeholder="Note title..."
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.contentInput}
          placeholder="Start writing your note..."
          value={content}
          onChangeText={setContent}
          multiline
          onSelectionChange={handleTextSelection}
          textAlignVertical="top"
          placeholderTextColor="#999"
        />

        <View style={styles.aiActions}>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => setShowHardWordsAnalysis(true)}
          >
            <Text style={styles.aiButtonText}>Analyze Hard Words</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showWordSuggestions && selectedText && (
        <WordSuggestions
          word={selectedText}
          context={content}
          onWordReplace={replaceSelectedText}
          onClose={() => setShowWordSuggestions(false)}
        />
      )}

      {showHardWordsAnalysis && (
        <HardWordsAnalyzer
          text={content}
          onHardWordsFound={setHardWords}
          onClose={() => setShowHardWordsAnalysis(false)}
          onWordReplace={(original, replacement) => {
            const newContent = content.replaceAll(original, replacement);
            setContent(newContent);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 400,
    color: '#333',
  },
  aiActions: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  aiButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  aiButtonText: {
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
});

export default NoteEditor;
```

#### src/components/ai/WordSuggestions.tsx
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import AIService from '../../services/ai/AIService';
import { AIProvider } from '../../types/AIProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  word: string;
  context: string;
  onWordReplace: (newWord: string) => void;
  onClose: () => void;
}

const WordSuggestions: React.FC<Props> = ({ word, context, onWordReplace, onClose }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, [word, context]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get active AI provider
      const providerData = await AsyncStorage.getItem('activeAIProvider');
      if (!providerData) {
        setError('No AI provider configured');
        return;
      }

      const provider: AIProvider = JSON.parse(providerData);
      const response = await AIService.findSimilarWords(word, context, provider);

      if (response.success && response.data) {
        const words = response.data.split(',').map(w => w.trim()).filter(w => w);
        setSuggestions(words);
      } else {
        setError(response.error || 'Failed to get suggestions');
      }
    } catch (err) {
      setError('An error occurred while fetching suggestions');
    } finally {
      setLoading(false);
    }
  };

  const renderSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => {
        onWordReplace(item);
        onClose();
      }}
    >
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Suggestions for "{word}"</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Finding suggestions...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchSuggestions} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item, index) => index.toString()}
              style={styles.suggestionsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: '#666',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
});

export default WordSuggestions;
```

### 5. Main Screen Implementation

#### src/screens/HomeScreen.tsx
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { Note } from '../types/Note';
import DatabaseService from '../services/storage/DatabaseService';
import NoteCard from '../components/notes/NoteCard';

interface Props {
  navigation: any;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      await DatabaseService.initializeDatabase();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      Alert.alert('Error', 'Failed to initialize database');
    }
  };

  const loadNotes = async () => {
    try {
      setLoading(true);
      const loadedNotes = await DatabaseService.getAllNotes();
      setNotes(loadedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteNote(noteId);
              await loadNotes();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  const renderNote = ({ item }: { item: Note }) => (
    <NoteCard
      note={item}
      onPress={() => navigation.navigate('NoteEditor', { note: item })}
      onDelete={() => handleDeleteNote(item.id)}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Notes</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
          >
            <Text style={styles.settingsText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('NoteEditor')}
            style={styles.addButton}
          >
            <Text style={styles.addText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading notes...</Text>
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notes yet</Text>
          <Text style={styles.emptySubtext}>Tap + to create your first note</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNote}
          keyExtractor={(item) => item.id}
          style={styles.notesList}
          showsVerticalScrollIndicator={false}
          onRefresh={loadNotes}
          refreshing={loading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    marginRight: 16,
    padding: 8,
  },
  settingsText: {
    fontSize: 20,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
  },
  notesList: {
    flex: 1,
    padding: 16,
  },
});

export default HomeScreen;

#### src/components/notes/NoteCard.tsx
```typescript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Note } from '../../types/Note';
import { format } from 'date-fns';

interface Props {
  note: Note;
  onPress: () => void;
  onDelete: () => void;
}

const NoteCard: React.FC<Props> = ({ note, onPress, onDelete }) => {
  const handleLongPress = () => {
    Alert.alert(
      'Note Actions',
      `What would you like to do with "${note.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress },
        { text: 'Delete', onPress: onDelete, style: 'destructive' },
      ]
    );
  };

  const getPreviewText = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <Text style={styles.title} numberOfLines={1}>
        {note.title}
      </Text>
      
      <Text style={styles.content} numberOfLines={3}>
        {getPreviewText(note.content)}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.date}>
          {format(note.updatedAt, 'MMM dd, yyyy')}
        </Text>
        
        {note.hardWords.length > 0 && (
          <View style={styles.hardWordsIndicator}>
            <Text style={styles.hardWordsText}>
              {note.hardWords.length} hard words
            </Text>
          </View>
        )}
      </View>

      {note.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {note.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {note.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{note.tags.length - 3}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  hardWordsIndicator: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hardWordsText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#1976d2',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default NoteCard;
```

#### src/screens/NoteEditorScreen.tsx
```typescript
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import NoteEditor from '../components/notes/NoteEditor';
import { Note } from '../types/Note';
import DatabaseService from '../services/storage/DatabaseService';

interface Props {
  navigation: any;
  route: any;
}

const NoteEditorScreen: React.FC<Props> = ({ navigation, route }) => {
  const existingNote: Note | undefined = route.params?.note;
  const [saving, setSaving] = useState(false);

  const handleSave = async (note: Note) => {
    try {
      setSaving(true);
      await DatabaseService.saveNote(note);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save note:', error);
      Alert.alert('Error', 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <NoteEditor
        note={existingNote}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default NoteEditorScreen;
```

#### src/components/ai/HardWordsAnalyzer.tsx
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import AIService from '../../services/ai/AIService';
import DatabaseService from '../../services/storage/DatabaseService';
import { AIProvider } from '../../types/AIProvider';
import { HardWord } from '../../types/TextAnalysis';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  text: string;
  onHardWordsFound: (hardWords: HardWord[]) => void;
  onClose: () => void;
  onWordReplace: (original: string, replacement: string) => void;
}

interface AnalyzedWord {
  word: string;
  alternatives: string[];
  context: string;
}

const HardWordsAnalyzer: React.FC<Props> = ({
  text,
  onHardWordsFound,
  onClose,
  onWordReplace,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzedWords, setAnalyzedWords] = useState<AnalyzedWord[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  useEffect(() => {
    analyzeText();
  }, [text]);

  const analyzeText = async () => {
    try {
      setLoading(true);
      setError(null);

      const providerData = await AsyncStorage.getItem('activeAIProvider');
      if (!providerData) {
        setError('No AI provider configured');
        return;
      }

      const provider: AIProvider = JSON.parse(providerData);
      const response = await AIService.analyzeHardWords(text, provider);

      if (response.success && response.data) {
        try {
          const parsed = JSON.parse(response.data);
          if (parsed.hardWords && Array.isArray(parsed.hardWords)) {
            setAnalyzedWords(parsed.hardWords);
            
            // Convert to HardWord format for parent component
            const hardWords: HardWord[] = parsed.hardWords.map((word: any, index: number) => ({
              word: word.word,
              position: text.indexOf(word.word),
              context: word.context,
              suggestions: word.alternatives || [],
              difficulty: 1, // Default difficulty
            }));
            
            onHardWordsFound(hardWords);
          }
        } catch (parseError) {
          setError('Failed to parse AI response');
        }
      } else {
        setError(response.error || 'Failed to analyze text');
      }
    } catch (err) {
      setError('An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleWordReplace = async (original: string, replacement: string, context: string) => {
    try {
      // Save the replacement to history
      await DatabaseService.saveHardWordReplacement(original, replacement, context);
      
      // Replace in the text
      onWordReplace(original, replacement);
      
      // Update the analyzed words list
      setAnalyzedWords(prev => prev.filter(word => word.word !== original));
      
      Alert.alert('Success', `Replaced "${original}" with "${replacement}"`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save word replacement');
    }
  };

  const renderWordItem = ({ item }: { item: AnalyzedWord }) => (
    <View style={styles.wordItem}>
      <View style={styles.wordHeader}>
        <Text style={styles.hardWord}>{item.word}</Text>
        <Text style={styles.context}>"{item.context}"</Text>
      </View>
      
      <View style={styles.alternatives}>
        <Text style={styles.alternativesLabel}>Simpler alternatives:</Text>
        <View style={styles.alternativesList}>
          {item.alternatives.map((alt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.alternativeButton}
              onPress={() => handleWordReplace(item.word, alt, item.context)}
            >
              <Text style={styles.alternativeText}>{alt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Hard Words Analysis</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Analyzing text...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={analyzeText} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : analyzedWords.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>🎉 No hard words found!</Text>
              <Text style={styles.emptySubtext}>Your text is easy to understand.</Text>
            </View>
          ) : (
            <FlatList
              data={analyzedWords}
              renderItem={renderWordItem}
              keyExtractor={(item, index) => `${item.word}-${index}`}
              style={styles.wordsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: '#666',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  wordsList: {
    maxHeight: 400,
  },
  wordItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  wordHeader: {
    marginBottom: 12,
  },
  hardWord: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 4,
  },
  context: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  alternatives: {
    marginTop: 8,
  },
  alternativesLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  alternativesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  alternativeButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  alternativeText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HardWordsAnalyzer;
```

#### src/screens/SettingsScreen.tsx
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from '../services/storage/DatabaseService';
import { AIProviderType } from '../types/AIProvider';

interface Props {
  navigation: any;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [showDifficulty, setShowDifficulty] = useState(true);
  const [activeProvider, setActiveProvider] = useState<AIProviderType | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.multiGet([
        'autoAnalyzeEnabled',
        'showDifficultyEnabled',
        'activeAIProvider',
      ]);

      const autoAnalyzeValue = settings[0][1];
      const showDifficultyValue = settings[1][1];
      const activeProviderValue = settings[2][1];

      if (autoAnalyzeValue !== null) {
        setAutoAnalyze(JSON.parse(autoAnalyzeValue));
      }
      if (showDifficultyValue !== null) {
        setShowDifficulty(JSON.parse(showDifficultyValue));
      }
      if (activeProviderValue !== null) {
        const provider = JSON.parse(activeProviderValue);
        setActiveProvider(provider.type);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save setting:', error);
    }
  };

  const handleAutoAnalyzeToggle = (value: boolean) => {
    setAutoAnalyze(value);
    saveSettings('autoAnalyzeEnabled', value);
  };

  const handleShowDifficultyToggle = (value: boolean) => {
    setShowDifficulty(value);
    saveSettings('showDifficultyEnabled', value);
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your notes and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear database
              await DatabaseService.initializeDatabase();
              // Clear AsyncStorage
              await AsyncStorage.clear();
              Alert.alert('Success', 'All data has been cleared');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const exportNotes = async () => {
    try {
      const notes = await DatabaseService.getAllNotes();
      const notesData = JSON.stringify(notes, null, 2);
      
      // In a real app, you would use react-native-share or similar
      Alert.alert(
        'Export Notes',
        `Found ${notes.length} notes. In a real app, this would open a share dialog.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export notes');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Features</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Auto-analyze new notes</Text>
            <Text style={styles.settingDescription}>
              Automatically find hard words when creating notes
            </Text>
          </View>
          <Switch
            value={autoAnalyze}
            onValueChange={handleAutoAnalyzeToggle}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={autoAnalyze ? '#007AFF' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Show word difficulty</Text>
            <Text style={styles.settingDescription}>
              Display difficulty indicators for hard words
            </Text>
          </View>
          <Switch
            value={showDifficulty}
            onValueChange={handleShowDifficultyToggle}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showDifficulty ? '#007AFF' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity
          style={styles.settingButton}
          onPress={() => navigation.navigate('AISettings')}
        >
          <Text style={styles.settingTitle}>AI Providers</Text>
          <Text style={styles.settingValue}>
            {activeProvider ? activeProvider.toUpperCase() : 'Not configured'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity style={styles.settingButton} onPress={exportNotes}>
          <Text style={styles.settingTitle}>Export Notes</Text>
          <Text style={styles.settingDescription}>
            Save your notes to external storage
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingButton, styles.dangerButton]}
          onPress={clearAllData}
        >
          <Text style={[styles.settingTitle, styles.dangerText]}>
            Clear All Data
          </Text>
          <Text style={styles.settingDescription}>
            Delete all notes and settings
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          AI Notes App v1.0.0{'\n'}
          Built with React Native
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  settingButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingValue: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  dangerButton: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#ff4444',
  },
  aboutText: {
    paddingHorizontal: 20,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default SettingsScreen;
```

### 6. Navigation Setup

#### src/navigation/AppNavigator.tsx
```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import NoteEditorScreen from '../screens/NoteEditorScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AISettingsScreen from '../screens/AISettingsScreen';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="AISettings" component={AISettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
```

### 7. Main App Component

#### App.tsx
```typescript
import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

const App: React.FC = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppNavigator />
    </>
  );
};

export default App;

### 8. AI Settings Screen

#### src/screens/AISettingsScreen.tsx
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIProvider, AIProviderType } from '../types/AIProvider';

interface Props {
  navigation: any;
}

const AISettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [providers, setProviders] = useState<AIProvider[]>([
    { type: AIProviderType.OPENAI, apiKey: '', model: 'gpt-3.5-turbo', isActive: false },
    { type: AIProviderType.GEMINI, apiKey: '', model: 'gemini-pro', isActive: false },
    { type: AIProviderType.ANTHROPIC, apiKey: '', model: 'claude-3-sonnet-20240229', isActive: false },
  ]);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const saved = await AsyncStorage.getItem('aiProviders');
      if (saved) {
        setProviders(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load AI providers:', error);
    }
  };

  const saveProviders = async (updatedProviders: AIProvider[]) => {
    try {
      await AsyncStorage.setItem('aiProviders', JSON.stringify(updatedProviders));
      setProviders(updatedProviders);
      
      // Save active provider separately
      const activeProvider = updatedProviders.find(p => p.isActive);
      if (activeProvider) {
        await AsyncStorage.setItem('activeAIProvider', JSON.stringify(activeProvider));
      }
    } catch (error) {
      console.error('Failed to save AI providers:', error);
    }
  };

  const handleProviderEdit = (provider: AIProvider) => {
    setEditingProvider({ ...provider });
    setShowEditModal(true);
  };

  const handleProviderSave = () => {
    if (!editingProvider) return;

    if (!editingProvider.apiKey.trim()) {
      Alert.alert('Error', 'API Key is required');
      return;
    }

    const updatedProviders = providers.map(p => 
      p.type === editingProvider.type ? editingProvider : p
    );

    saveProviders(updatedProviders);
    setShowEditModal(false);
    setEditingProvider(null);
  };

  const handleSetActive = (type: AIProviderType) => {
    const provider = providers.find(p => p.type === type);
    if (!provider?.apiKey.trim()) {
      Alert.alert('Error', 'Please configure the API key first');
      return;
    }

    const updatedProviders = providers.map(p => ({
      ...p,
      isActive: p.type === type,
    }));

    saveProviders(updatedProviders);
  };

  const testProvider = async (provider: AIProvider) => {
    if (!provider.apiKey.trim()) {
      Alert.alert('Error', 'Please configure the API key first');
      return;
    }

    Alert.alert('Test', `Testing ${provider.type.toUpperCase()} connection...`);
    // In a real app, you would make a test API call here
  };

  const getProviderDescription = (type: AIProviderType) => {
    switch (type) {
      case AIProviderType.OPENAI:
        return 'GPT models from OpenAI';
      case AIProviderType.GEMINI:
        return 'Gemini models from Google';
      case AIProviderType.ANTHROPIC:
        return 'Claude models from Anthropic';
      default:
        return '';
    }
  };

  const getProviderStatus = (provider: AIProvider) => {
    if (provider.isActive) return 'Active';
    if (provider.apiKey.trim()) return 'Configured';
    return 'Not configured';
  };

  const getStatusColor = (provider: AIProvider) => {
    if (provider.isActive) return '#4CAF50';
    if (provider.apiKey.trim()) return '#FF9800';
    return '#999';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AI Providers</Text>
      </View>

      <View style={styles.description}>
        <Text style={styles.descriptionText}>
          Configure your AI providers to enable smart text analysis and suggestions.
          You'll need API keys from the respective providers.
        </Text>
      </View>

      {providers.map((provider) => (
        <View key={provider.type} style={styles.providerCard}>
          <View style={styles.providerHeader}>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>
                {provider.type.toUpperCase()}
              </Text>
              <Text style={styles.providerDescription}>
                {getProviderDescription(provider.type)}
              </Text>
            </View>
            <View style={styles.providerStatus}>
              <Text 
                style={[
                  styles.statusText, 
                  { color: getStatusColor(provider) }
                ]}
              >
                {getProviderStatus(provider)}
              </Text>
            </View>
          </View>

          <View style={styles.providerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleProviderEdit(provider)}
            >
              <Text style={styles.actionButtonText}>Configure</Text>
            </TouchableOpacity>

            {provider.apiKey.trim() && (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => testProvider(provider)}
                >
                  <Text style={styles.actionButtonText}>Test</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    provider.isActive && styles.activeButton,
                  ]}
                  onPress={() => handleSetActive(provider.type)}
                >
                  <Text 
                    style={[
                      styles.actionButtonText,
                      provider.isActive && styles.activeButtonText,
                    ]}
                  >
                    {provider.isActive ? 'Active' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ))}

      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>Getting API Keys:</Text>
        <Text style={styles.helpText}>
          • OpenAI: Visit platform.openai.com{'\n'}
          • Google Gemini: Visit makersuite.google.com{'\n'}
          • Anthropic: Visit console.anthropic.com
        </Text>
      </View>

      {/* Edit Provider Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Configure {editingProvider?.type.toUpperCase()}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>API Key</Text>
              <TextInput
                style={styles.input}
                value={editingProvider?.apiKey || ''}
                onChangeText={(text) => 
                  setEditingProvider(prev => prev ? {...prev, apiKey: text} : null)
                }
                placeholder="Enter your API key"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Model</Text>
              <TextInput
                style={styles.input}
                value={editingProvider?.model || ''}
                onChangeText={(text) => 
                  setEditingProvider(prev => prev ? {...prev, model: text} : null)
                }
                placeholder="Model name"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleProviderSave}
              >
                <Text style={[styles.modalButtonText, styles.saveButtonText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  providerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  providerDescription: {
    fontSize: 14,
    color: '#666',
  },
  providerStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  providerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  actionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  activeButtonText: {
    color: '#fff',
  },
  helpSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
  },
});

export default AISettingsScreen;
```

## Build and Deployment Instructions

### 1. Android Build Setup

#### android/app/build.gradle
Add these permissions and configurations:

```gradle
android {
    ...
    defaultConfig {
        ...
        multiDexEnabled true
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'androidx.multidex:multidex:2.0.1'
    ...
}
```

#### android/app/src/main/AndroidManifest.xml
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### 2. Build Commands

```bash
# Development build
npx react-native run-android

# Release build
cd android
./gradlew assembleRelease

# The APK will be located at:
# android/app/build/outputs/apk/release/app-release.apk
```

### 3. Signing for Release (Optional)

Create a keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Add to `android/gradle.properties`:
```
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=*****
MYAPP_UPLOAD_KEY_PASSWORD=*****
```

Update `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            ...
            signingConfig signingConfigs.release
        }
    }
}
```

## Additional Features Implementation

### 1. Text Simplification Feature

Add to `NoteEditor.tsx`:

```typescript
const simplifySelectedText = async () => {
  if (!selectedText.trim()) return;

  try {
    const providerData = await AsyncStorage.getItem('activeAIProvider');
    if (!providerData) {
      Alert.alert('Error', 'No AI provider configured');
      return;
    }

    const provider: AIProvider = JSON.parse(providerData);
    const response = await AIService.simplifyText(selectedText, provider);

    if (response.success && response.data) {
      Alert.alert(
        'Simplified Text',
        response.data,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', onPress: () => replaceSelectedText(response.data!) },
        ]
      );
    } else {
      Alert.alert('Error', response.error || 'Failed to simplify text');
    }
  } catch (error) {
    Alert.alert('Error', 'An error occurred while simplifying text');
  }
};
```

### 2. Export/Import Functionality

Add to utilities:

```typescript
// src/utils/exportImport.ts
import { Note } from '../types/Note';
import DatabaseService from '../services/storage/DatabaseService';
import RNFS from 'react-native-fs';

export const exportNotes = async (): Promise<string> => {
  const notes = await DatabaseService.getAllNotes();
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    notes,
  };

  const jsonData = JSON.stringify(exportData, null, 2);
  const fileName = `notes_export_${Date.now()}.json`;
  const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

  await RNFS.writeFile(filePath, jsonData, 'utf8');
  return filePath;
};

export const importNotes = async (filePath: string): Promise<number> => {
  const fileContent = await RNFS.readFile(filePath, 'utf8');
  const importData = JSON.parse(fileContent);

  if (!importData.notes || !Array.isArray(importData.notes)) {
    throw new Error('Invalid import file format');
  }

  let importedCount = 0;
  for (const note of importData.notes) {
    try {
      await DatabaseService.saveNote(note);
      importedCount++;
    } catch (error) {
      console.error('Failed to import note:', note.title, error);
    }
  }

  return importedCount;
};
```

### 3. Dark Mode Support

Add to your styles:

```typescript
// src/styles/themes.ts
export const lightTheme = {
  background: '#ffffff',
  surface: '#f5f5f5',
  primary: '#007AFF',
  text: '#333333',
  textSecondary: '#666666',
  border: '#eeeeee',
};

export const darkTheme = {
  background: '#1a1a1a',
  surface: '#2d2d2d',
  primary: '#0a84ff',
  text: '#ffffff',
  textSecondary: '#cccccc',
  border: '#444444',
};
```

## Testing

### 1. Unit Tests Setup

```bash
npm install --save-dev jest @testing-library/react-native
```

### 2. Sample Test Files

```typescript
// __tests__/DatabaseService.test.ts
import DatabaseService from '../src/services/storage/DatabaseService';

describe('DatabaseService', () => {
  beforeEach(async () => {
    await DatabaseService.initializeDatabase();
  });

  test('should save and retrieve notes', async () => {
    const note = {
      id: 'test-1',
      title: 'Test Note',
      content: 'This is a test note',
      createdAt: new Date(),
      updatedAt: new Date(),
      hardWords: [],
      tags: [],
    };

    await DatabaseService.saveNote(note);
    const notes = await DatabaseService.getAllNotes();
    
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe('Test Note');
  });
});
```

## Performance Optimization

### 1. React Native Performance

```typescript
// Use React.memo for components
const NoteCard = React.memo<Props>(({ note, onPress, onDelete }) => {
  // Component implementation
});

// Use useMemo and useCallback for expensive operations
const NoteEditor = ({ note, onSave, onCancel }) => {
  const expensiveValue = useMemo(() => {
    return someExpensiveCalculation(note);
  }, [note]);

  const handleSave = useCallback(() => {
    // Save logic
  }, [note]);

  // Component implementation
};
```

### 2. Database Optimization

```typescript
// Add indexes for better query performance
const optimizeDatabase = async () => {
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at)');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title)');
};
```

## Security Best Practices

### 1. API Key Storage

```typescript
// Use react-native-keychain for secure storage
import * as Keychain from 'react-native-keychain';

const storeAPIKey = async (provider: string, apiKey: string) => {
  await Keychain.setInternetCredentials(
    `ai_provider_${provider}`,
    provider,
    apiKey
  );
};

const getAPIKey = async (provider: string): Promise<string | null> => {
  try {
    const credentials = await Keychain.getInternetCredentials(`ai_provider_${provider}`);
    if (credentials) {
      return credentials.password;
    }
  } catch (error) {
    console.error('Failed to retrieve API key:', error);
  }
  return null;
};
```

### 2. Input Validation

```typescript
// src/utils/validators.ts
export const validateNote = (note: Partial<Note>): string[] => {
  const errors: string[] = [];
  
  if (!note.title?.trim()) {
    errors.push('Title is required');
  }
  
  if (note.title && note.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }
  
  if (note.content && note.content.length > 50000) {
    errors.push('Content must be less than 50,000 characters');
  }
  
  return errors;
};

export const validateAPIKey = (apiKey: string, provider: AIProviderType): boolean => {
  if (!apiKey.trim()) return false;
  
  switch (provider) {
    case AIProviderType.OPENAI:
      return apiKey.startsWith('sk-');
    case AIProviderType.GEMINI:
      return apiKey.length > 20; // Basic length check
    case AIProviderType.ANTHROPIC:
      return apiKey.startsWith('sk-ant-');
    default:
      return false;
  }
};
```

## Troubleshooting Common Issues

### 1. Metro Bundler Issues
```bash
npx react-native start --reset-cache
```

### 2. Android Build Issues
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### 3. Network Issues
Add network security config in `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">10.0.3.2</domain>
    </domain-config>
</network-security-config>
```

## Future Enhancements

1. **Voice-to-Text**: Add speech recognition for note input
2. **OCR Integration**: Extract text from images
3. **Collaboration**: Share notes with other users
4. **Sync**: Cloud synchronization across devices
5. **Themes**: More customization options
6. **Widgets**: Android home screen widgets
7. **Search**: Full-text search capabilities
8. **Categories**: Organize notes into folders
9. **Reminders**: Set reminders for notes
10. **Analytics**: Track reading difficulty improvements over time

This comprehensive guide provides everything needed to build your AI-powered note-taking app. The app includes all the features you requested: multiple AI providers, local storage, text simplification, word suggestions, hard word analysis, and a modern UI design.
```