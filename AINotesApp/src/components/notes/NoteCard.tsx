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
