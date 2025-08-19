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
