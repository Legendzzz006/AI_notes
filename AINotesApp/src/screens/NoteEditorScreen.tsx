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
