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
