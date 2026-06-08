export interface Chapter {
  id: string;
  title: string;
  href: string; // Relative path inside the EPUB
  content: string; // HTML or Text content
  chapterIndex: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string; // Data URL or object URL
  fileType: "epub" | "txt";
  fileData: ArrayBuffer; // Stored in IndexedDB as ArrayBuffer
  addedAt: number;
  lastReadAt?: number;
  currentChapterIndex: number;
  currentProgress: number; // Character or scroll offset percentage
  currentScrollOffset?: number; // Last scrolled position (for horizontal columns, page offset)
  currentColumnIndex?: number; // Last column index / page index
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterIndex: number;
  columnIndex: number;
  progress: number; // percentage progress in book/chapter
  textSnippet: string;
  createdAt: number;
}

export interface Highlight {
  id: string;
  bookId: string;
  chapterIndex: number;
  text: string;
  color: "yellow" | "pink" | "blue" | "green";
  note?: string;
  rangeData?: string; // Serialized DOM range path
  createdAt: number;
}

export interface VocabularyItem {
  id: string;
  expression: string;
  reading: string;
  definition: string;
  contextSentence?: string;
  bookId?: string;
  bookTitle?: string;
  createdAt: number;
}

export interface ReaderSettings {
  theme: "light" | "sepia" | "dark" | "midnight" | "forest";
  fontSize: number; // in px
  lineHeight: number; // e.g. 1.5, 1.8, 2.0
  fontFamily: "serif" | "sans" | "system";
  writingMode: "horizontal" | "vertical";
  columnsCount: 1 | 2 | "auto";
  marginSize: "compact" | "normal" | "wide";
  hoverLookup: boolean;
  shiftKeyRequired: boolean;
}
