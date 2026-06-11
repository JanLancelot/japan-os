"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Book, ReaderSettings } from "../types";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAllBooks,
  getBook,
  saveBook,
  deleteBook,
  getReaderSettings,
  saveReaderSettings
} from "../utils/db";
import { LibraryView } from "./LibraryView";
import { ReaderCanvas } from "./ReaderCanvas";

export function ReaderDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookId = searchParams?.get("bookId") || null;

  const [mounted, setMounted] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);

  // Reader Settings State
  const [settings, setSettings] = useState<ReaderSettings>(() => getReaderSettings());

  const activeBook = useMemo(() => {
    return books.find((b) => b.id === bookId) || null;
  }, [books, bookId]);

  const hasPushedBookRef = useRef(false);

  // Selection handler to sync state to browser URL and history
  const handleSelectBook = (book: Book | null) => {
    if (book) {
      router.push(`/reader?bookId=${book.id}`);
      hasPushedBookRef.current = true;
    } else {
      if (hasPushedBookRef.current) {
        router.back();
      } else {
        router.replace(`/reader`);
      }
      hasPushedBookRef.current = false;
    }
  };

  // Load all books on mount and perform database initialization
  useEffect(() => {
    setMounted(true);
    const initializeDashboard = async () => {
      try {
        const list = await getAllBooks();
        const hasSampleBooks = list.some(
          (b) => b.id === "sample-cat-book" || b.id === "sample-melos-book"
        );
        if (hasSampleBooks) {
          await deleteBook("sample-cat-book");
          await deleteBook("sample-melos-book");
          await refreshBooks();
        } else {
          setBooks(list);
        }
      } catch (err) {
        console.error("Failed to load books from IndexedDB:", err);
      }
    };
    initializeDashboard();
  }, []);

  // Sync with global theme
  useEffect(() => {
    const syncTheme = () => {
      const globalTheme = localStorage.getItem("japanos-global-theme") || "dark";
      setSettings((prev) => ({ ...prev, theme: globalTheme as any }));
    };
    syncTheme();
    window.addEventListener("japanos-theme-change", syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener("japanos-theme-change", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  // Sync settings updates to localStorage
  const handleUpdateSettings = (newSettings: ReaderSettings) => {
    if (newSettings.theme !== settings.theme) {
      localStorage.setItem("japanos-global-theme", newSettings.theme);
      window.dispatchEvent(new Event("japanos-theme-change"));
    }
    setSettings(newSettings);
    saveReaderSettings(newSettings);
  };

  const refreshBooks = async () => {
    try {
      const list = await getAllBooks();
      setBooks(list);
    } catch (err) {
      console.error("Failed to load books from IndexedDB:", err);
    }
  };

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
          handleSelectBook(null);
          refreshBooks(); // Update main library dashboard listings
        }}
        onUpdateProgress={handleUpdateProgress}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    );
  }

  // RENDER LIBRARY GRID
  return (
    <div className="flex-1 flex flex-col justify-between bg-black text-neutral-300 font-sans min-h-screen relative overflow-hidden select-none">
      
      {/* Background ambient lighting */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none" />

      {/* Main Library Dashboard Workspace */}
      <main className="flex-1 flex z-10 overflow-hidden relative pt-6">
        <LibraryView
          books={books}
          onSelectBook={handleSelectBook}
          onRefreshBooks={refreshBooks}
        />
      </main>
    </div>
  );
}
export default ReaderDashboard;
