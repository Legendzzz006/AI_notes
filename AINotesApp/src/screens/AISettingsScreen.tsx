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
