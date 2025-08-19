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
