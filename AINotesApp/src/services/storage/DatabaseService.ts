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
