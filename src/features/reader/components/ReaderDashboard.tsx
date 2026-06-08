"use client";

import React, { useState, useEffect } from "react";
import { Book, Bookmark, Highlight, VocabularyItem, ReaderSettings } from "../types";
import {
  getAllBooks,
  getBook,
  saveBook,
  getBookmarks,
  saveBookmark,
  deleteBookmark,
  getHighlights,
  saveHighlight,
  deleteHighlight,
  getVocabulary,
  addVocabulary,
  deleteVocabulary,
  getReaderSettings,
  saveReaderSettings
} from "../utils/db";
import { LibraryView } from "./LibraryView";
import { ReaderCanvas } from "./ReaderCanvas";

export function ReaderDashboard() {
  const [mounted, setMounted] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);

  // Reader Settings State
  const [settings, setSettings] = useState<ReaderSettings>(() => getReaderSettings());

  // Active book data lists
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);

  // Load all books on mount
  useEffect(() => {
    setMounted(true);
    refreshBooks();
    refreshVocabulary();
  }, []);

  // Sync settings updates to localStorage
  const handleUpdateSettings = (newSettings: ReaderSettings) => {
    setSettings(newSettings);
    saveReaderSettings(newSettings);
  };

  const refreshBooks = async () => {
    try {
      const list = await getAllBooks();
      setBooks(list);
      
      // Update active book reference if open
      if (activeBook) {
        const updated = await getBook(activeBook.id);
        setActiveBook(updated);
      }
    } catch (err) {
      console.error("Failed to load books from IndexedDB:", err);
    }
  };

  const refreshVocabulary = async () => {
    try {
      const list = await getVocabulary();
      setVocabulary(list);
    } catch (err) {
      console.error("Failed to load vocabulary:", err);
    }
  };

  // Fetch book-specific lists when a book is selected
  useEffect(() => {
    if (!activeBook) {
      setBookmarks([]);
      setHighlights([]);
      return;
    }

    const loadBookData = async () => {
      try {
        const [bmList, hlList] = await Promise.all([
          getBookmarks(activeBook.id),
          getHighlights(activeBook.id),
        ]);
        setBookmarks(bmList);
        setHighlights(hlList);
      } catch (err) {
        console.error("Failed to load book annotations:", err);
      }
    };

    loadBookData();
  }, [activeBook]);

  // Update book reading progress
  const handleUpdateProgress = async (
    bookId: string,
    chapterIndex: number,
    columnIndex: number,
    progressPercent: number
  ) => {
    try {
      const book = await getBook(bookId);
      if (!book) return;

      const updatedBook: Book = {
        ...book,
        currentChapterIndex: chapterIndex,
        currentColumnIndex: columnIndex,
        currentProgress: progressPercent,
        lastReadAt: Date.now(),
      };

      await saveBook(updatedBook);
      // Silently update list (avoid refreshing full page and breaking states)
      setBooks((prev) =>
        prev.map((b) => (b.id === bookId ? updatedBook : b))
      );
    } catch (err) {
      console.error("Failed to save progress update:", err);
    }
  };

  // Bookmark actions
  const handleAddBookmark = async (bmData: Omit<Bookmark, "id" | "createdAt">) => {
    if (!activeBook) return;
    const newBookmark: Bookmark = {
      ...bmData,
      id: `bm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    try {
      await saveBookmark(newBookmark);
      setBookmarks((prev) => [...prev, newBookmark]);
    } catch (err) {
      console.error("Failed to save bookmark:", err);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      await deleteBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Failed to delete bookmark:", err);
    }
  };

  // Highlight actions
  const handleAddHighlight = async (hlData: Omit<Highlight, "id" | "createdAt">) => {
    if (!activeBook) return;
    const newHighlight: Highlight = {
      ...hlData,
      id: `hl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    try {
      await saveHighlight(newHighlight);
      setHighlights((prev) => [...prev, newHighlight]);
    } catch (err) {
      console.error("Failed to save highlight:", err);
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    try {
      await deleteHighlight(id);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Failed to delete highlight:", err);
    }
  };

  // Vocabulary notebook actions
  const handleAddVocab = async (vocabData: Omit<VocabularyItem, "id" | "createdAt">) => {
    const newVocab: VocabularyItem = {
      ...vocabData,
      id: `vocab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    try {
      await addVocabulary(newVocab);
      setVocabulary((prev) => [newVocab, ...prev]);
    } catch (err) {
      console.error("Failed to save vocabulary:", err);
    }
  };

  const handleDeleteVocab = async (id: string) => {
    try {
      await deleteVocabulary(id);
      setVocabulary((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error("Failed to delete vocabulary:", err);
    }
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black text-neutral-450 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-blue-500 border-neutral-900 rounded-full animate-spin" />
          <span className="text-xs font-mono">Booting Reader Workspace...</span>
        </div>
      </div>
    );
  }

  // RENDER CANVAS (If reading a book)
  if (activeBook) {
    return (
      <ReaderCanvas
        book={activeBook}
        onClose={() => {
          setActiveBook(null);
          refreshBooks(); // Update main library dashboard listings
        }}
        onUpdateProgress={handleUpdateProgress}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        bookmarks={bookmarks}
        onAddBookmark={handleAddBookmark}
        onDeleteBookmark={handleDeleteBookmark}
        highlights={highlights}
        onAddHighlight={handleAddHighlight}
        onDeleteHighlight={handleDeleteHighlight}
        vocabulary={vocabulary}
        onAddVocab={handleAddVocab}
        onDeleteVocab={handleDeleteVocab}
      />
    );
  }

  // RENDER LIBRARY GRID
  return (
    <div className="flex-1 flex flex-col justify-between bg-black text-neutral-300 font-sans min-h-screen relative overflow-hidden select-none">
      
      {/* Background ambient lighting */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-5 md:px-12 flex items-center justify-between border-b border-neutral-900/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="p-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50 text-neutral-400 hover:text-white transition flex items-center justify-center cursor-pointer"
            title="Back to Desktop"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </a>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/10 font-serif">
              書
            </div>
            <span className="font-bold tracking-tight text-zinc-100 font-sans text-sm">JapanOS Reader</span>
          </div>
        </div>
        <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">Immersive Ebooks</span>
      </header>

      {/* Main Library Dashboard Workspace */}
      <main className="flex-1 flex z-10 overflow-hidden relative">
        <LibraryView
          books={books}
          onSelectBook={setActiveBook}
          onRefreshBooks={refreshBooks}
        />
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 md:px-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-neutral-900/50 backdrop-blur-sm z-10 text-[10px] text-neutral-600 font-mono">
        <span>&copy; 2026 JapanOS Reader. Immersive reading environment.</span>
        <span>Aozora Bunko classics preloaded. Import custom EPUB and TXT files.</span>
      </footer>
    </div>
  );
}
export default ReaderDashboard;
