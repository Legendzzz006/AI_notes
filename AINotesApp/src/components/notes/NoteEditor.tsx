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
